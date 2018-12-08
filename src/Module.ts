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
 * Module property modifier overriding default values.
 * @typedef {Object} ModifierObject
 * @property {string} Label Property name
 * @property {number} Value Modified property value
 * @property {boolean} LessIsGood
 * @property {number} Modifier
 * @property {boolean} UserSet
 */

/**
 * Engineer blueprint.
 * @typedef {Object} BlueprintObject
 * @property {string} BlueprintName Name of the blueprint
 * @property {string} [ExperimentalEffect] Name of the experimental effect
 * @property {number} Level Grade of the blueprint from 1 to 5
 * @property {number} Quality Progress of the blueprint from 0 to 1
 * @property {ModifierObject[]} Modifiers Array of all modifiers
 */

/**
 * Loadout-event style object describing a module
 * @typedef {Object} ModuleObject
 * @property {string} Slot Slot this module is on (possibly empty string)
 * @property {boolean} On True when this module is switched on
 * @property {string} Item Item/actual module that this module represents
 * @property {number} Priority Power priority group
 * @property {BlueprintObject} [Engineering] Blueprint applied to this module
 */

/**
 * @typedef {(string|Module|ModuleObject)} ModuleLike
 */

/**
 * Clones a given module.
 * @param {ModuleLike} module Module to clone
 * @return {ModuleObject} Cloned module object
 * @throws {ImportExportError} On invalid module json.
 */
function cloneModuleToJSON(module) {
    if (module instanceof Module) {
        module = module.toJSON();
    } else {
        if (typeof module === 'string') {
            module = decompress(module);
        }
        module = cloneDeep(module);

        if (!validateModuleJson(module)) {
            throw new ImportExportError('Module is not valid');
        }
    }

    return module;
}

interface Module {
    Item: string;
    Priority: number;
    Slot: string;
    Engineering: ModuleEngineering;
    On: boolean
}

type Slot = string;

interface ModuleEngineering {
    Engineer?: string;
    EngineerID?: number;
    BlueprintID?: number;
    BlueprintName?: string;
    Level?: number;
    Quality?: number;
    ExperimentalEffect?: string;
    ExperimentalEffect_Localised?: string;
    Modifiers: ModuleEngineeringModifiers[]
}

interface ModuleEngineeringModifiers {
    Label: string;
    Value: number;
    OriginalValue?: number;
    Modifier?: number;
    LessIsGood?: number;
    UserSet?: boolean;
}

/**
 * A module that belongs to a {@link Ship}.
 */
class Module {
    private _object: Module;
    private _ship: Ship;

    /**
     * Create a module by reading a module JSON given in a loadout-event-style
     * ship build. Can be given as a compressed string or plain object.
     * @param {(string|ModuleObject)} buildFrom Module to load
     * @param {Ship} [ship] Ship to assign this module to
     */
    constructor(buildFrom: (string | Module), ship?: Ship) {
        autoBind(this);
        /** @type {ModuleObject} */
        this._object = {Item: '', Slot: '', On: true, Priority: 1} as any;
        /** @type {Ship} */
        this._ship = null;

        if (buildFrom) {
            this._object = cloneModuleToJSON(buildFrom);
        }

        if (ship) {
            this._ship = ship;
        }
    }

    /**
     * Read an arbitrary object property of this module's corresponding json.
     * @param {string} property Property name
     * @return {*} Property value
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
     * @param {string} property Property name
     * @param {*} value Property value
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
     * @param {string} property Property name
     * @param {boolean} [modified=true] False to retrieve default value
     * @return {(number|null|undefined)} Property value or `null` when property
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

    getModifier(property: string): any {
        let modifierIndex = this._findModifier(property);
        if (-1 < modifierIndex) {
            return this._object.Engineering.Modifiers[modifierIndex].Modifier;
        } else {
            return null;
        }
    }

    /**
     * Returns index of modifier for given property if present.
     * @param {string} property Property name
     * @return {(number|undefined)} Modifier index or `undefined` if not present
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
     * @param {string} property
     * @param {boolean} [modified=true]
     * @param {i18n.FormatOptions.SiUnit} [unit]
     * @param {number} [value]
     * @return {string}
     */
    getFormatted(property: string, modified: boolean = true, unit: string, value: number): string {
        throw new NotImplementedError();
    }

    /**
     * Sets the value of a property.
     * @param {string} property Property name
     * @param {number} value Property value
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
     * @param {string} property Property name.
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
     * @param {string} name Blueprint name
     * @param {number} [grade=1] Blueprint grade
     * @param {number} [progress=0] Blueprint progress
     * @param {string} [experimental] Experimental effect to apply; if none is
     *      given old experimental (if given) is preserved
     * @throws {IllegalStateError} If this module has no item
     */
    setBlueprint(name: string, grade: number = 1, progress: number = 0, experimental: string) {
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
     * @param {number} [progress] Progress in range from 0 to 1
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
     * @param {string} name Special effect name
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
     * @return {Object} Module
     */
    toJSON(): Module {
        return cloneDeep(this._object);
    }

    /**
     * Returns a compressed string representing the loadout-event-style module.
     * @return {string} Compressed string
     */
    compress(): string {
        return compress(this._object);
    }

    /**
     * Set the item of this module.
     * @param {String} item Item to set.
     * @param {String} clazz
     * @param {String} rating
     * @throws {IllegalStateError} When the given item does not fit the slot
     *      (if present).
     */
    setItem(item: string, clazz = '', rating = '') {
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
     * @param {(Slot|Slot[])} slot Slot to check; if string exact match is
     *      required, if RegExp only a simple match is required. If an array,
     *      one the given slots must match.
     * @return {(boolean|null)} True if the module is on the given slot or the
     *      RegExp matches, false if none of this holds; null if the slot is on
     *      no module at all.
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
     * @param {string} slot Slot to assign.
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
     * @param {(string|Ship)} ship
     */
    setShip(ship: any) {
        if (ship instanceof Ship) {
            ship = ship._object.Ship;
        }

        if (this._ship !== null) {
            throw new IllegalStateError('Cannot reassign ship in Module');
        }

        this._ship = ship;
    }

    /**
     * Checks whether this module is empty, i.e. does not have an item assigned.
     * @return {boolean} True when empty, false otherwise.
     */
    isEmpty(): boolean {
        return this._object.Item === '';
    }

    /**
     * Checks whether this module is assigned to a slot.
     * @return {boolean} True when assigned, false otherwise.
     */
    isAssigned(): boolean {
        return this._ship && this._object.Slot !== '';
    }

    /**
     * Returns the class of this module. Class of utility items or bulkheads is
     * always zero. Class of hardpoints is in range 1 to 4 for small to huge.
     * @return {(number|null)} Item class or `null` if no item has been assigned
     */
    getClass(): (number | null) {
        if (!this._object.Item) {
            return null;
        }
        return getClass(this._object.Item);
    }

    /**
     * Returns the rating of this module.
     * @return {(string|null)} Rating or `null` if no item has been assigned
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
     * @return {(number|null)} Size or `null` if no slot has been assigned
     */
    getSize(): (number | null) {
        if (!this._ship || !this._object.Slot) {
            return null;
        }
        return getSlotSize(this._ship._object.Ship, this._object.Slot);
    }
}

/** @module edforge */
export default Module;
