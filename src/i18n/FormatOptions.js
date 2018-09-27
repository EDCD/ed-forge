
/** @module ed-forge/i18n */

/**
 * @typedef {Object} FormattingObject
 * @property {string} format
 * @property {string} unit
 * @property {string} [storedUnit]
 */

 /**
  * Has various properties of type {@link FormattingObject} that define how
  * specific module/ship properties are to be formatted.
  */
export const PROPERTY_FORMATTING = {};

/**
 * Any string that is a concatenation of {@link SI_PREFIXES} and {@link UNITS}
 * or just a value in {@link UNITS}.
 * @typedef {string} SiUnit
 */

/**
 * Holds all units available.
 */
export const UNITS = {};

/**
 * Holds all si prefixes available.
 */
export const SI_PREFIXES = {};
