
import { cloneDeep } from 'lodash';
import { MODULE_VALIDATOR } from './validation/util';
import { compress, decompress } from './compression';

/** @module ed-forge */
export default Module;

/**
 * @typedef {Object} ModifierObject
 * @property {string} Label
 * @property {number} Value
 * @property {string} LessIsGood
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
 * @property {BlueprintObject[]} Engineering
 */

/**
 * @typedef {(string|Module|ModuleObject)} ModuleLike
 */

/**
 * A module that belongs to a {@link Ship}.
 */
class Module {

    /**
     * @param {ModuleLike} buildFrom
     */
    constructor(buildFrom) {
        // TODO: handle instance of class Module
        if (typeof buildFrom === 'string') {
            buildFrom = decompress(buildFrom);
        }

        if (!MODULE_VALIDATOR(buildFrom)) {
            // TODO: Exception handling
            return;
        }

        this._object = cloneDeep(buildFrom);
    }

    /**
     * @param {string} property
     * @return {*}
     */
    read(property) {}

    /**
     * @param {string} property
     * @param {*} value
     */
    write(property, value) {}

    /** @type {ModuleObject} */
    _object = {};

    /**
     * @param {string} property
     * @param {boolean} [modified=true]
     * @return {number}
     */
    get(property, modified = true) {}

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
     */
    set(property) {}

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
     * @param {Slot} slot   Slot to check; if string exact match is required, if
     *                      RegExp only a simple match is required.
     * @return {(boolean|null)} True if the module is on the given slot or the
     *                          RegExp matches, false if none of this holds;
     *                          null if the slot is on no module at all.
     */
    isOnSlot(slot) {
        if (this._object.Slot) {
            if (typeof slot === 'string') {
                return this._object.Slot === slot;
            } else { // RegExp
                return this._object.Slot.match(slot) !== null;
            }
        } else {
            return null;
        }
    }

    setSlot(slot) {}

    /**
     * Turns this module into an empty one.
     */
    clear() {}

    /**
     * @return {boolean}
     */
    isEmpty() {
        return this._object.Item !== '';
    }

    /**
     * @return {number}
     */
    getClass() {}

    /**
     * @return {boolean}
     */
    isHardpoint() {}

    /**
     * @return {boolean}
     */
    isUtility() {}

    /**
     * @return {boolean}
     */
    isInternal() {}

    /**
     * @return {boolean}
     */
    isCore() {}
}
