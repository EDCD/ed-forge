
import Ship from './Ship';

/** @type {ShipStatCalculator} */
const PASS = (ship, modified) => {};

/**
 * @name ShipStatCalculator
 * @function
 * @param {Ship} ship
 * @param {boolean} modified
 * @return {number}
 */

export default {
    /** @type {ShipStatCalculator} */
    SPEED: PASS,
    /** @type {ShipStatCalculator} */
    BOOST_SPEED: PASS,
    /** @type {ShipStatCalculator} */
    LADEN_RANGE: PASS,
    /** @type {ShipStatCalculator} */
    UNLADEN_RANGE: PASS,
    /** @type {ShipStatCalculator} */
    LADEN_RANGE: PASS,
    /** @type {ShipStatCalculator} */
    PITCH: PASS,
    /** @type {ShipStatCalculator} */
    YAW: PASS,
    /** @type {ShipStatCalculator} */
    ROLL: PASS,
    /** @type {ShipStatCalculator} */
    SHIELD_STRENGTH: PASS,
    /** @type {ShipStatCalculator} */
    SHIELD_KIN_RES: PASS,
    /** @type {ShipStatCalculator} */
    SHIELD_THERM_RES: PASS,
    /** @type {ShipStatCalculator} */
    SHIELD_EXPL_RES: PASS,
    /** @type {ShipStatCalculator} */
    ARMOUR: PASS,
    /** @type {ShipStatCalculator} */
    ARMOUR_KIN_RES: PASS,
    /** @type {ShipStatCalculator} */
    ARMOUR_THERM_RES: PASS,
    /** @type {ShipStatCalculator} */
    ARMOUR_EXPL_RES: PASS,
    /** @type {ShipStatCalculator} */
    ARMOUR_CAUS_RES: PASS
};
