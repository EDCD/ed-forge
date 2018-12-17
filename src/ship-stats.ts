/**
* @module ShipStats
*/

/**
* Ignore
*/
import { Ship } from ".";

const PASS: ShipPropertyCalculator = (ship, modified) => 0;

export interface ShipPropertyCalculator {
    (ship: Ship, modified?: boolean): number
}

const PASS_STATISTICS: ShipStatisticsCalculator = (ship, modified) => {};

export interface ShipStatisticsCalculator {
    (ship: Ship, modified?: boolean): any
}

export const SHIP_PROPERTIES = {
    SPEED: PASS,
    BOOST_SPEED: PASS,
    LADEN_RANGE: PASS,
    UNLADEN_RANGE: PASS,
    PITCH: PASS,
    YAW: PASS,
    ROLL: PASS,
    SHIELD_STRENGTH: PASS,
    SHIELD_KIN_RES: PASS,
    SHIELD_THERM_RES: PASS,
    SHIELD_EXPL_RES: PASS,
    ARMOUR: PASS,
    ARMOUR_KIN_RES: PASS,
    ARMOUR_THERM_RES: PASS,
    ARMOUR_EXPL_RES: PASS,
    ARMOUR_CAUS_RES: PASS,
};

export const SHIP_STATISTICS = {
    SHIELD_METRICS: PASS_STATISTICS,
    ARMOUR_METRICS: PASS_STATISTICS,
    OFFENCE_METRICS: PASS_STATISTICS,
};
