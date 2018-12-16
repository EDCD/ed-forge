import {clamp, cloneDeep, keys, values} from 'lodash';
import autoBind from 'auto-bind';
import {validateModuleJson, moduleVarIsSpecified} from './validation';
import {compress, decompress} from './compression';
import Factory from './data';
import {itemFitsSlot, getClass, getModuleProperty, getRating} from './data/items';
import {getSlotSize} from './data/slots';
import {IllegalStateError, ImportExportError, NotImplementedError} from './errors';
import Ship from './Ship';
import {getBlueprintProps, calculateModifier} from './data/blueprints';

/**
 * Clones a given module.
 * @param module Module to clone
 * @returns Cloned module object
 * @throws {ImportExportError} On invalid module json.
 */
function cloneModuleToJSON(module: (string | Module | ModuleObject)): ModuleObject {
    if (module instanceof Module) {
        module = module.toJSON();
    } else {
        if (typeof module === 'string') {
            module = decompress<ModuleObject>(module);
        }
        module = cloneDeep(module);

        if (!validateModuleJson(module)) {
            throw new ImportExportError('Module is not valid');
        }
    }

    return module;
}

/**
 * Loadout-event style object describing a module
 */
export interface ModuleObject {
    /** Item/actual module that this module represents */
    Item: string;
    /** Power priority group */
    Priority: number;
    /** Slot this module is on (possibly empty string) */
    Slot: string;
    /** Blueprint applied to this module */
    Engineering?: BlueprintObject;
    /** True when this module is switched on */
    On: boolean
}

export type Slot = string | RegExp;

/**
 * Engineer blueprint.
 */
export interface BlueprintObject {
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
    /** Array of all modifiers */
    Modifiers: ModifierObject[]
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

/**
 * A module that belongs to a Ship.
 */
export default class Module {
    public _object: ModuleObject = {Item: '', Slot: '', On: true, Priority: 1};
    public _ship: Ship = null;

    /**
     * Create a module by reading a module JSON given in a loadout-event-style
     * ship build. Can be given as a compressed string or plain object.
     * @param buildFrom Module to load
     * @param ship Ship to assign this module to
     */
    constructor(buildFrom: (string | Module | ModuleObject), ship?: Ship) {
        autoBind(this);

        if (buildFrom) {
            this._object = cloneModuleToJSON(buildFrom);
        }

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
     * Write an arbitrary value to an arbitrary object property of this module's
     * corresponding json. Fields that are required to be set on valid modules
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the module's item you can't invoke
     * `module.write('Item', '...')` but must invoke
     * `module.setItem('...')`.
     * @param property Property name
     * @param value Property value
     * @throws {IllegalStateError} On an attempt to write a protected property
     */
    write(property: string, value: any) {
        if (moduleVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`
            );
        }

        this._object[property] = value;
    }

    /**
     * Return a property of this module, e.g. "mass".
     * @param property Property name
     * @param modified False to retrieve default value
     * @returns Property value or `null` when property
     *      applies to this module but is not given or undefined when property
     *      does not apply to this type of module, e.g. "ammo" on a cargo rack.
     */
    get(property: string, modified: boolean = true): (number | null | undefined) {
        let modifierIndex = this._findModifier(property);
        if (modified && -1 < modifierIndex) {
            return this._object.Engineering.Modifiers[modifierIndex].Value;
        }
        return getModuleProperty(this._object.Item, property);
    }

    getModifier(property: string): number | null {
        let modifierIndex = this._findModifier(property);
        if (-1 < modifierIndex) {
            return this._object.Engineering.Modifiers[modifierIndex].Modifier;
        } else {
            return null;
        }
    }

    /**
     * Returns index of modifier for given property if present.
     * @param property Property name
     * @returns Modifier index or `undefined` if not present
     */
    _findModifier(property: string): (number | undefined) {
        if (!this._object.Engineering) {
            return -1;
        }

        return this._object.Engineering.Modifiers.findIndex(
            modifier => modifier.Label === property
        );
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
     * @throws {IllegalStateError} When no blueprint is applied.
     */
    set(property: string, value: number) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can't set property ${property} - no blueprint applied`
            );
        }

        let modifierIndex = this._findModifier(property);
        if (-1 < modifierIndex) {
            this._object.Engineering.Modifiers[modifierIndex].Value = value;
        } else {
            this._object.Engineering.Modifiers.push({
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
     * @throws {IllegalStateError} When no blueprint has been applied.
     */
    clear(property: string) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can't clear property ${property} - no blueprint allied`
            );
        }

        let modifierIndex = this._findModifier(property);
        if (-1 < modifierIndex) {
            delete this._object.Engineering.Modifiers[modifierIndex];
        }
    }

    /**
     * Apply a blueprint to this module preserving user set properties.
     * @param name Blueprint name
     * @param grade Blueprint grade
     * @param progress Blueprint progress
     * @param experimental Experimental effect to apply; if none is given old
     * experimental (if given) is preserved
     * @throws {IllegalStateError} If this module has no item
     */
    setBlueprint(name: string, grade: number = 1, progress: number = 0, experimental?: string) {
        if (!this._object.Item) {
            throw new IllegalStateError(`Can't set blueprint ${name} without item`);
        }

        let oldExperimental, oldUserSet;
        if (this._object.Engineering) {
            oldExperimental = this._object.Engineering.ExperimentalEffect;
            oldUserSet = this._object.Engineering.Modifiers.filter(
                modifier => modifier.UserSet
            );
        }

        this._object.Engineering = Factory.newBlueprint(name, grade);
        if (experimental) {
            this._object.Engineering.ExperimentalEffect = experimental;
        } else if (oldExperimental) {
            this._object.Engineering.ExperimentalEffect = oldExperimental;
        }
        if (oldUserSet) {
            this._object.Engineering.Modifiers = oldUserSet;
        }
        this.setBlueprintProgress(progress);
    }

    /**
     * Set the progress of the current blueprint.
     * @param progress Progress in range from 0 to 1
     * @throws {IllegalStateError} When no blueprint has been applied
     */
    setBlueprintProgress(progress?: number) {
        if (!this._object.Engineering) {
            throw new IllegalStateError('Can\'t set progress of no blueprint');
        }

        if (progress === undefined) {
            progress = this._object.Engineering.Quality;
        }
        progress = clamp(progress, 0, 1);
        this._object.Engineering.Quality = progress;

        let modifiedProperties = getBlueprintProps(
            this._object.Item,
            this._object.Engineering.BlueprintName,
            this._object.Engineering.Level,
            this._object.Engineering.Quality,
            this._object.Engineering.ExperimentalEffect
        );
        let modifiedLabels = keys(modifiedProperties);
        this._object.Engineering.Modifiers = this._object.Engineering.Modifiers
            .filter(modifier => !modifiedLabels.includes(modifier.Label))
            .concat(values(modifiedProperties));
    }

    /**
     * Apply a special effect to this module.
     * @param name Special effect name
     * @throws {IllegalStateError} When no blueprint has been applied
     */
    setSpecial(name: string) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can only set experimental ${name} when a blueprint has been applied.`
            );
        }

        this._object.Engineering.ExperimentalEffect = name;
        this.setBlueprintProgress();
    }

    /**
     * Returns a copy of this module as a loadout-event-style module.
     * @returns Module
     */
    toJSON(): ModuleObject {
        return cloneDeep(this._object);
    }

    /**
     * Returns a compressed string representing the loadout-event-style module.
     * @returns Compressed string
     */
    compress(): string {
        return compress(this._object);
    }

    /**
     * Set the item of this module.
     * @param item Item to set.
     * @param clazz
     * @param rating
     * @throws {IllegalStateError} When the given item does not fit the slot
     *      (if present).
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

        this._object.Item = item;
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
            return this._object.Slot === slot.toLocaleLowerCase();
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
     * @throws {IllegalStateError} If no ship has been set or slot already has
     *      been assigned.
     */
    setSlot(slot: string) {
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

        this._object.Slot = slot;
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
}
