
import { cloneDeep, pick, assign } from 'lodash';
import autoBind from 'auto-bind';
import { validateModuleJson, moduleVarIsSpecified } from './validation';
import { compress, decompress } from './compression';
import Factory from './data';
import { itemFitsSlot, getClass, getModuleProperty, getRating } from './data/items';
import { getSlotSize } from './data/slots';
import { IllegalStateError, ImportExportError } from './errors';
import Ship from './Ship';

/**
 * @typedef {Object} ModifierObject
 * @property {string} Label
 * @property {number} Value
 */

/**
 * @typedef {Object} BlueprintObject
 * @property {string} BlueprintName
 * @property {number} Level
 * @property {number} Quality
 * @property {ModifierObject[]} Modifiers
 */

/**
 * @typedef {Object} ModuleObject
 * @property {string} Slot
 * @property {boolean} On
 * @property {string} Item
 * @property {number} Priority
 * @property {BlueprintObject} [Engineering]
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

/**
 * A module that belongs to a {@link Ship}.
 */
class Module {

    /**
     * @param {ModuleLike} buildFrom
     * @param {Ship} ship
     */
    constructor(buildFrom, ship) {
        autoBind(this);
        /** @type {ModuleObject} */
        this._object = { Item: '', Slot: '', On: true, Priority: 1 };
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
    read(property) {
        return this._object[property];
    }

    /**
     * @param {string} property
     * @param {*} value
     */
    write(property, value) {
        if (moduleVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`
            );
        }

        this._object[property] = value;
    }

    /**
     * @param {string} property
     * @param {boolean} [modified=true]
     * @return {(number|undefined)}
     */
    get(property, modified = true) {
        let modifierIndex = this._findModifier(property);
        if (modified && modifierIndex) {
            return this._object.Engineering.Modifiers[modifierIndex].value;
        }
        return getModuleProperty(this._object.Item, property);
    }

    /**
     * @param {string} property
     */
    _findModifier(property) {
        if (!this._object.Engineering) {
            return undefined;
        }

        return this._object.Engineering.Modifiers.find(
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
    getFormatted(property, modified = true, unit, value) {}

    /**
     * @param {string} property
     * @param {number} value
     * @throws {IllegalStateError} When no blueprint is applied.
     */
    set(property, value) {
        if (!this._object.Engineering) {
            throw new IllegalStateError(
                `Can't set property ${property} - no blueprint applied`
            );
        }

        let modifierIndex = this._findModifier(property);
        if (modifierIndex) {
            this._object.Engineering.Modifiers[modifierIndex].Value = value;
        } else {
            this._object.Engineering.Modifiers.push({
                Label: property,
                Value: value
            });
        }
    }

    /**
     * @param {string} name
     * @param {number} [grade=1]
     * @param {number} [progress=0]
     */
    setBlueprint(name, grade = 1, progress = 0) {}

    /**
     * @param {string} name
     */
    setSpecial(name) {}

    /**
     * @return {Object}
     */
    toJSON() {
        return cloneDeep(this._object);
    }

    /**
     * @return {string}
     */
    compress() {
        return compress(this._object);
    }

    /**
     * Set the item of this module.
     * @param {String} item Item to set.
     * @throws {IllegalStateError}  When the given item does not fit the slot
     *                              (if present).
     */
    setItem(item, clazz='', rating='') {
        if (clazz && rating) {
            item = Factory.getModuleId(item, clazz, rating);
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
     * @param {(Slot|Slot[])} slot  Slot to check; if string exact match is
     *                              required, if RegExp only a simple match is
     *                              required. If an array, one the given slots
     *                              must match.
     * @return {(boolean|null)} True if the module is on the given slot or the
     *                          RegExp matches, false if none of this holds;
     *                          null if the slot is on no module at all.
     */
    isOnSlot(slot) {
        if (!this._object.Slot) {
            return null;
        }

            if (typeof slot === 'string') {
                return this._object.Slot === slot;
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
     * @param {string} slot
     * @throws {IllegalStateError}  If no ship has been set or slot already has
     *                              been assigned.
     */
    setSlot(slot) {
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
    setShip(ship) {
        if (ship instanceof Ship) {
            ship = ship._object.Ship;
        }

        if (this._ship !== null) {
            throw new IllegalStateError('Cannot reassign ship in Module');
        }

        this._ship = ship;
    }

    /**
     * @return {boolean}
     */
    isEmpty() {
        return this._object.Item === '';
    }

    /**
     * @return {boolean}
     */
    isAssigned() {
        return this._ship && this._object.Slot !== '';
    }

    /**
     * @return {number}
     */
    getClass() {
        if (!this._object.Item) {
            return null;
        }
        return getClass(this._object.Item);
    }

    /**
     * @return {String}
     */
    getRating() {
        if (!this._object.Item) {
            return null;
        }
        return getRating(this._object.Item);
    }

    /**
     * @return {number}
     */
    getSize() {
        if (!this._ship || !this._object.Slot) {
            return null;
        }
        return getSlotSize(this._ship._object.Ship, this._object.Slot);
    }
}

/** @module ed-forge */
export default Module;
