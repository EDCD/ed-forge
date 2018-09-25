
export default class Module {

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
     * @property {BlueprintObject[]}
     */

     /** @type {ModuleObject} */
    object = {};

    /**
     * @param {string} property
     * @param {boolean} modified
     * @return {number}
     */
    get(property, modified) {}

    /**
     * @param {string} property
     * @param {boolean} modified
     * @param {number} value
     * @return {string}
     */
    getFormatted(property, modified, value) {}

    /**
     * @param {string} property
     */
    set(property) {}

    /**
     * @param {string} name
     * @param {number} grade
     * @param {number} progress
     */
    setBlueprint(name, grade, progress) {}

    /**
     * @param {string} name
     */
    setSpecial(name) {}
}
