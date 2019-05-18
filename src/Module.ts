/**
* @module Module
*/

/**
* Ignore
*/
import {clamp, clone, cloneDeep, set, values} from 'lodash';
import autoBind from 'auto-bind';
import {validateModuleJson, moduleVarIsSpecified} from './validation';
import {compress, decompress} from './compression';
import Factory from './data';
import {itemFitsSlot, getClass, getModuleProperty, getRating, getModuleInfo} from './data/items';
import { getSlotSize, REG_CORE_SLOT } from './data/slots';
import {IllegalStateError, NotImplementedError, UnknownRestrictedError} from './errors';
import Ship from './Ship';
import {getBlueprintProps, calculateModifier, PropertyMap} from './data/blueprints';
import MODULE_STATS, { ModulePropertyCalculator, ModulePropertyCalculatorClass } from './module-stats';
import DiffEmitter from './helper/DiffEmitter';

/**
 * Clones a given module.
 * @param module Module to clone
 * @returns Cloned module object
 */
function cloneModuleToJSON(module: (string | Module | ModuleObject)): ModuleObject {
    if (module instanceof Module) {
        module = module.toJSON();
    } else {
        if (typeof module === 'string') {
            module = decompress<ModuleObject>(module);
        }
        module = cloneDeep(module);

        validateModuleJson(module);
    }

    return module;
}

/**
 * Loadout-event style object describing a module
 */
interface ModuleObjectBase {
    /** Item/actual module that this module represents */
    Item: string;
    /** Power priority group */
    Priority: number;
    /** Slot this module is on (possibly empty string) */
    Slot: string;
    /** True when this module is switched on */
    On: boolean
}

export interface ModuleObject extends ModuleObjectBase {
    /** Blueprint applied to this module */
    Engineering?: BlueprintObject;
}

export interface ModuleObjectHandler extends ModuleObjectBase {
    /** Blueprint applied to this module */
    Engineering?: BlueprintObjectHandler;
}

export type Slot = string | RegExp;

/**
 * Engineer blueprint.
 */
interface BlueprintObjectBase {
    Engineer?: string;
    EngineerID?: number;
    BlueprintID?: number;
    /** Name of the blueprint */
    BlueprintName: string;
    /** Grade of the blueprint from 1 to 5 */
    Level: number;
    /** Progress of the blueprint from 0 to 1 */
    Quality: number;
    /** Name of the experimental effect */
    ExperimentalEffect?: string;
}

export interface BlueprintObject extends BlueprintObjectBase {
    /** Array of all modifiers */
    Modifiers: ModifierObject[]
}

export interface BlueprintObjectHandler extends BlueprintObjectBase {
    /** Array of all modifiers */
    Modifiers: PropertyMap;
}

/**
 * Module property modifier overriding default values.
 */
export interface ModifierObject {
    /** Property name */
    Label: string;
    /** Modified property value */
    Value: number;
    OriginalValue?: number;
    Modifier?: number;
    LessIsGood?: boolean;
    UserSet?: boolean;
}

const DIFF_EVENT = 'diff';

/**
 * A module that belongs to a Ship.
 */
export default class Module extends DiffEmitter {
    public _object: ModuleObjectHandler = { Item: '', Slot: '', On: true, Priority: 1 };
    public _ship: Ship = null;

    /**
     * Create a module by reading a module JSON given in a loadout-event-style
     * ship build. Can be given as a compressed string or plain object.
     * @param buildFrom Module to load
     * @param ship Ship to assign this module to
     */
    constructor(buildFrom: (string | Module | ModuleObject), ship?: Ship) {
        super();
        autoBind(this);

        if (buildFrom) {
            let object = cloneModuleToJSON(buildFrom) as ModuleObject & ModuleObjectHandler;
            let handler = object as ModuleObjectHandler;
            if (object.Engineering) {
                let modifiers = object.Engineering.Modifiers;
                handler.Engineering.Modifiers = {};
                modifiers.forEach(modifier => {
                    let label = modifier.Label.toLowerCase();
                    // Only store stats that don't have a getter
                    let stats = MODULE_STATS[label];
                    if (stats && !stats.getter) {
                        handler.Engineering.Modifiers[label] = modifier;
                    }
                });
            }
            this._object = handler;
        }

        this._trackFor(this._object, DIFF_EVENT);
        if (ship) {
            this._ship = ship;
        }
    }

    /**
     * Read an arbitrary object property of this module's corresponding json.
     * @param property Property name
     * @returns Property value
     */
    read(property: string): any {
        return this._object[property];
    }

    /**
     * Read an arbitrary object property of this module's corresponding meta
     * properties, e.g. eddbID, edID.
     * @param property Property name
     * @returns Property value
     */
    readMeta(property: string): any {
        return getModuleInfo(this._object.Item).meta[property] || '';
    }

    /**
     * Write an arbitrary value to an arbitrary object property of this module's
     * corresponding json. Fields that are required to be set on valid modules
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the module's item you can't invoke
     * `module.write('Item', '...')` but must invoke
     * `module.setItem('...')`.
     * @param property Property name
     * @param value Property value
     */
    write(property: string, value: any) {
        if (moduleVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`
            );
        }

        this._writeObject(property, value);
    }

    /**
     * Return a property of this module, e.g. "mass".
     * @param property Property name
     * @param modified False to retrieve default value
     * @returns Property value or `null` when property
     *      applies to this module but is not given or undefined when property
     *      does not apply to this type of module, e.g. "ammo" on a cargo rack.
     */
    get(property: string | ModulePropertyCalculator | ModulePropertyCalculatorClass, modified: boolean = true): (number | null | undefined) {
        if (typeof property === 'string') {
            property = property.toLowerCase();
            let stats = MODULE_STATS[property];
            if (!stats) {
                throw new UnknownRestrictedError(`Don't know property ${property}`);
            }

            let getter = MODULE_STATS[property].getter;
            if (getter) {
                property = getter;
            } else {
                if (this._object.Engineering && this._object.Engineering.Modifiers[property]) {
                    return this._object.Engineering.Modifiers[property].Value;
                }
                return getModuleProperty(this._object.Item, property);
            }
        }
        if (typeof property === 'object') {
            return property.calculate(this, modified);
        } // else: function
        return property(this, modified);
    }

    getModifier(property: string): number | null {
        if (this._object.Engineering && this._object.Engineering.Modifiers[property]) {
            return this._object.Engineering.Modifiers[property].Modifier;
        } else {
            return null;
        }
    }

    /**
     * @param property
     * @param modified
     * @param unit
     * @param value
     * @returns
     */
    getFormatted(property: string, modified: boolean = true, unit: string, value: number): string {
        throw new NotImplementedError();
    }

    /**
     * Sets the value of a property.
     * @param property Property name
     * @param value Property value
     */
    set(property: string, value: number) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can't set property ${property} - no blueprint applied`
            );
        }

        property = property.toLowerCase();
        let propertyPath = `Engineering.Modifiers.${property}`;
        if (this._object.Engineering.Modifiers[property]) {
            this._writeObject(`${propertyPath}.Value`, value);
        } else {
            this._writeObject(propertyPath, {
                Label: property,
                Value: value,
                Modifier: calculateModifier(this._object.Item, property, value),
                UserSet: true
            });
        }
    }

    /**
     * Remove a modifier for a property and reset it to default values.
     * @param property Property name.
     */
    clear(property: string) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can't clear property ${property} - no blueprint allied`
            );
        }

        property = property.toLowerCase();
        this._prepare(DIFF_EVENT, `Engineering.Modifiers.${property}`);
        delete this._object.Engineering.Modifiers[property];
        this._commitObjectChanges();
    }

    /**
     * Apply a blueprint to this module preserving user set properties.
     * @param name Blueprint name
     * @param grade Blueprint grade
     * @param progress Blueprint progress
     * @param experimental Experimental effect to apply; if none is given old
     * experimental (if given) is preserved
     */
    setBlueprint(name: string, grade: number = 1, progress: number = 0, experimental?: string) {
        if (!this._object.Item) {
            throw new IllegalStateError(`Can't set blueprint ${name} without item`);
        }

        this._prepareObjectChange('Engineering', Factory.newBlueprint(name, grade, experimental));
        this.setBlueprintProgress(progress); // this will commit prepare changes
    }

    /**
     * Set the progress of the current blueprint.
     * @param progress Progress in range from 0 to 1
     */
    setBlueprintProgress(progress?: number) {
        if (!this._object.Engineering) {
            throw new IllegalStateError('Can\'t set progress of no blueprint');
        }

        if (progress === undefined) {
            progress = this._object.Engineering.Quality;
        }
        progress = clamp(progress, 0, 1);
        this._prepareObjectChange('Engineering.Quality', progress);
        this._prepareObjectChange('Engineering.Modifiers', getBlueprintProps(
            this._object.Item,
            this._object.Engineering.BlueprintName,
            this._object.Engineering.Level,
            this._object.Engineering.Quality,
            this._object.Engineering.ExperimentalEffect
        ));
        this._commitObjectChanges();
    }

    /**
     * Apply a special effect to this module.
     * @param name Special effect name
     */
    setSpecial(name: string) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can only set experimental ${name} when a blueprint has been applied.`
            );
        }

        this._prepareObjectChange('Engineering.ExperimentalEffect', name);
        this.setBlueprintProgress(); // this will commit prepare changes
    }

    /**
     * Clear all modifications and resets the slot completely. If the slot is a
     * core internal slot, the item won't get changed.
     */
    reset() {
        if (!this._object.Slot.match(REG_CORE_SLOT)) {
            this._object.Item = '';
        }
        this._object.Priority = 1;
        this._object.On = true;
        delete this._object.Engineering;
    }

    /**
     * Returns a copy of this module as a loadout-event-style module.
     * @returns Module
     */
    toJSON(): ModuleObject {
        let r = clone(this._object) as (ModuleObject & ModuleObjectHandler) as ModuleObject;
        if (this._object.Engineering) {
            r.Engineering = clone(this._object.Engineering) as (BlueprintObject & BlueprintObjectHandler) as BlueprintObject;
            r.Engineering.Modifiers = values(this._object.Engineering.Modifiers);
            for (let stat in MODULE_STATS) {
                let getter = MODULE_STATS[stat].getter
                if (getter) {
                    r.Engineering.Modifiers[stat] = this.get(getter, true);
                }
            }
        }
        return r;
    }

    /**
     * Returns a compressed string representing the loadout-event-style module.
     * @returns Compressed string
     */
    compress(): string {
        return compress(this._object);
    }

    /**
     * Check whether the item of this slot is of the given type. If a string
     * is given as argument, it will be checked for equality. If it is an regex
     * it will be checked whether the regex matches this item.
     * @param type Item type to check
     * @returns True if the item matches the type provided
     */
    itemIsOfType(type: (string | RegExp)): boolean {
        if (typeof type === 'string') {
            return this._object.Item === type.toLowerCase();
        }
        return Boolean(this._object.Item.match(type));
    }

    /**
     * Returns the actual item of this module, e.g. `int_powerplant_size5_class1`.
     * @returns The item
     */
    getItem(): string {
        return this._object.Item;
    }

    /**
     * Set the item of this module.
     * @param item Item to set.
     * @param clazz
     * @param rating
     */
    setItem(item: string, clazz: string = '', rating: string = '') {
        if (clazz && rating) {
            item = Factory.getModuleId(item, clazz, rating);
        } else {
            item = item.toLowerCase();
        }

        if (this._ship && this._object.Slot &&
            !itemFitsSlot(item, this._ship._object.Ship, this._object.Slot)
        ) {
            throw new IllegalStateError(
                `Item ${item} does not fit ${this._object.Slot}`
            );
        }

        this._prepare(DIFF_EVENT, 'Engineering');
        delete this._object.Engineering;
        this._writeObject('Item', item); // this will commit changes
    }

    /**
     * Checks whether this module is on a matching slot.
     * @param slot Slot to check; if string exact match is required, if RegExp
     * only a simple match is required. If an array, one the given slots must
     * match.
     * @returns True if the module is on the given slot or the RegExp matches,
     *  false if none of this holds; null if the slot is on no module at all.
     */
    isOnSlot(slot: (Slot | Slot[])): (boolean | null) {
        if (!this._object.Slot) {
            return null;
        }

        if (typeof slot === 'string') {
            return this._object.Slot === slot.toLowerCase();
        } else if (slot instanceof RegExp) {
            return Boolean(this._object.Slot.match(slot));
        } else { // Array
            for (let s of slot) {
                if (this.isOnSlot(s)) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Sets the slot of this module. Slots can only be set once (includes
     * constructor) to prevent bad states. A slot can only be assigned when a
     * ship already has been assigned.
     * @param slot Slot to assign.
     */
    setSlot(slot: string) {
        slot = slot.toLowerCase();
        if (!this._ship) {
            throw new IllegalStateError(
                `Can't assign slot to ${slot} for unknown ship`
            );
        }

        if (this._object.Slot) {
            throw new IllegalStateError(`Can't reassign slot to ${slot}`);
        }

        if (this._object.Item && itemFitsSlot(this._object.Item, this._ship._object.Ship, slot)) {
            throw new IllegalStateError(
                `Can't assign slot current item ${this._object.Item} does not fit on ${slot}`
            );
        }

        this._writeObject('Slot', slot);
    }

    /**
     * Is the module currently enabled?
     * @returns True when enabled
     */
    isEnabled(): boolean {
        return this._object.On;
    }

    /**
     * Turn this module on/off. If the module does not consume power, this
     * method hasn't any effect.
     * @param on True to turn the module on
     */
    setEnabled(on: boolean) {
        // if an module does not consume power, it is always on
        if (this.get('PowerDraw')) {
            this._writeObject('On', on);
        }
    }

    /**
     * Sets the ship of this module. A ship can only be assigned once to prevent
     * bad states.
     * @param ship
     */
    setShip(ship: Ship) {
        if (this._ship !== null) {
            throw new IllegalStateError('Cannot reassign ship in Module');
        }

        this._ship = ship;
    }

    /**
     * Checks whether this module is empty, i.e. does not have an item assigned.
     * @returns True when empty, false otherwise.
     */
    isEmpty(): boolean {
        return this._object.Item === '';
    }

    /**
     * Checks whether this module is assigned to a slot.
     * @returns True when assigned, false otherwise.
     */
    isAssigned(): boolean {
        return this._ship && this._object.Slot !== '';
    }

    /**
     * Returns the class of this module. Class of utility items or bulkheads is
     * always zero. Class of hardpoints is in range 1 to 4 for small to huge.
     * @returns Item class or `null` if no item has been assigned
     */
    getClass(): (number | null) {
        if (!this._object.Item) {
            return null;
        }
        return getClass(this._object.Item);
    }

    /**
     * Returns the rating of this module.
     * @returns Rating or `null` if no item has been assigned
     */
    getRating(): (string | null) {
        if (!this._object.Item) {
            return null;
        }
        return getRating(this._object.Item);
    }

    /**
     * Returns the size of the slot of this module. Size of utility slots and
     * bulkheads is always zero. Size of hardpoint slots is in range 1 to 4 for
     * small to huge.
     * @returns Size or `null` if no slot has been assigned
     */
    getSize(): (number | null) {
        if (!this._ship || !this._object.Slot) {
            return null;
        }
        return getSlotSize(this._ship._object.Ship, this._object.Slot);
    }

    /**
     * Write a value to [[_object]] and emit the changes as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _writeObject(path: string, value: any) {
        this._prepareObjectChange(path, value);
        this._commitObjectChanges();
    }

    /**
     * Write a value to [[_object]] and prepare the changes to be emitted
     * as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _prepareObjectChange(path: string, value: any) {
        this._prepare(DIFF_EVENT, path);
        set(this._object, path, value);
    }

    /**
     * Emit all saved changes to [[_object]] as `'diff'` event.
     */
    private _commitObjectChanges() {
        this._commit(DIFF_EVENT);
    }
}
