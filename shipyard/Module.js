
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
     * @param {boolean} [modified=true]
     * @return {number}
     */
    get(property, modified = true) {}

    /**
     * @param {string} property
     * @param {boolean} [modified=true]
     * @param {number} [value]
     * @return {string}
     */
    getFormatted(property, modified = true, value) {}

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
}
