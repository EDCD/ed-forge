/**
 * @module i18n
 */

/**
 * Ignore
 */
export interface IFormattingObject {
    format: string;
    unit: string;
    storedUnit?: string;
}

/**
 * Has various properties of type [[IFormattingObject]] that define how
 * specific module/ship properties are to be formatted.
 */
export const PROPERTY_FORMATTING = {};

/**
 * Any string that is a concatenation of [[SI_PREFIXES]] and [[UNITS]]
 * or just a value in [[UNITS]].
 */
type SiUnit = string;

/**
 * Holds all units available.
 */
export const UNITS = {};

/**
 * Holds all si prefixes available.
 */
export const SI_PREFIXES = {};
