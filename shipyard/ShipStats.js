
import Ship from './Ship';

/** @type {ShipPropertyCalculator} */
const PASS = (ship, modified) => {};

/**
 * @name ShipPropertyCalculator
 * @function
 * @param {Ship} ship
 * @param {boolean} [modified=true]
 * @return {number}
 */

export default {
    /** @type {ShipPropertyCalculator} */
    SPEED: PASS,
    /** @type {ShipPropertyCalculator} */
    BOOST_SPEED: PASS,
    /** @type {ShipPropertyCalculator} */
    LADEN_RANGE: PASS,
    /** @type {ShipPropertyCalculator} */
    UNLADEN_RANGE: PASS,
    /** @type {ShipPropertyCalculator} */
    LADEN_RANGE: PASS,
    /** @type {ShipPropertyCalculator} */
    PITCH: PASS,
    /** @type {ShipPropertyCalculator} */
    YAW: PASS,
    /** @type {ShipPropertyCalculator} */
    ROLL: PASS,
    /** @type {ShipPropertyCalculator} */
    SHIELD_STRENGTH: PASS,
    /** @type {ShipPropertyCalculator} */
    SHIELD_KIN_RES: PASS,
    /** @type {ShipPropertyCalculator} */
    SHIELD_THERM_RES: PASS,
    /** @type {ShipPropertyCalculator} */
    SHIELD_EXPL_RES: PASS,
    /** @type {ShipPropertyCalculator} */
    ARMOUR: PASS,
    /** @type {ShipPropertyCalculator} */
    ARMOUR_KIN_RES: PASS,
    /** @type {ShipPropertyCalculator} */
    ARMOUR_THERM_RES: PASS,
    /** @type {ShipPropertyCalculator} */
    ARMOUR_EXPL_RES: PASS,
    /** @type {ShipPropertyCalculator} */
    ARMOUR_CAUS_RES: PASS,
};
