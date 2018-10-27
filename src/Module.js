
import { cloneDeep, pick, assign } from 'lodash';
import autoBind from 'auto-bind';
import { validateModuleJson, moduleVarIsSpecified } from './validation';
import { compress, decompress } from './compression';
import { getModuleProperty } from './data';
import { itemFitsSlot, getClass, getRating } from './data/items';
import { getSlotSize } from './data/slots';

/**
 * @typedef {Object} ModifierObject
 * @property {string} Label
 * @property {number} Value
 */

/**
 * @typedef {Object} BlueprintObject
 * @property {string} Engineer
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
            return null;
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
        this._object = null;
        /** @type {Ship} */
        this._ship = null;

        if (!buildFrom) {
            this.clear();
        } else {
            this._object = cloneModuleToJSON(buildFrom);
        }

        if (ship) {
            this._ship = ship;
        }
    }

    /**
     * @param {ModuleLike} buildFrom
     * @param {string[]} keep
     */
    update(buildFrom, keep) {
        let old = this._object;
        this._object = cloneModuleToJSON(buildFrom);
        if (keep) {
            assign(this._object, pick(old, keep));
        }
    }

    /**
     * @param {string} property
     * @return {*}
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
            // TODO: Throw error
            return;
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
     * @return {boolean}
     */
    set(property, value) {
        if (!this._object.Engineering) {
            // Can only set values when a blueprint is applied
            return false;
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

        return true;
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
        if (this._object.Slot) {
            if (typeof slot === 'string') {
                return this._object.Slot === slot;
            } else if (slot instanceof RegExp) {
                return this._object.Slot.match(slot) !== null;
            } else { // Array
                for (let s of slot) {
                    if (this.isOnSlot(s)) {
                        return true;
                    }
                }
                return false;
            }
        } else {
            return null;
        }
    }

    /**
     * @param {string} slot
     * @return {boolean}
     */
    fitsSlot(slot) {
        return itemFitsSlot(this._object.Item, this._ship._object.Ship, slot);
    }

    /**
     * @param {string} slot
     */
    setSlot(slot) {
        if (this._object.Item ||
            !itemFitsSlot(this._object.Item, this._ship._object.Ship, slot)) {
            // TODO: throw
            return;
        }
        this._object.Slot = slot;
    }

    /**
     * Turns this module into an empty one.
     */
    clear() {
        this._object = { Item: '', Slot: '', On: true, Priority: 1 };
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
        return this._object.Slot !== '';
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
