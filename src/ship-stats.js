
/** @module ed-forge/ship-stats */

/** @type {ShipPropertyCalculator} */
const PASS = (ship, modified) => {};

/**
 * @callback ShipPropertyCalculator
 * @param {Ship} ship
 * @param {boolean} [modified=true]
 * @return {number}
 */

/** @type {ShipStatisticsCalculator} */
const PASS_STATISTICS = (ship, modified) => {};

/**
 * @typedef {Object} ShipStatisticsObject
 */

/**
 * @callback ShipStatisticsCalculator
 * @param {Ship} ship
 * @param {boolean} [modified=true]
 * @return {ShipStatisticsObject}
 */

export const SHIP_PROPERTIES = {
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

export const SHIP_STATISTICS = {
    /** @type {ShipStatisticsCalculator} */
    SHIELD_METRICS: PASS_STATISTICS,
    /** @type {ShipStatisticsCalculator} */
    ARMOUR_METRICS: PASS_STATISTICS,
    /** @type {ShipStatisticsCalculator} */
    OFFENCE_METRICS: PASS_STATISTICS,
};
