/**
* @module ShipStats
*/

/**
* Ignore
*/
import { Ship } from ".";
import {
    CARGO_CAPACITY_CALCULATOR, FUEL_CAPACITY_CALCULATOR, JUMP_CALCULATOR,
    SPEED_CALCULATOR, SHIELD_METRICS_CALCULATOR, ARMOUR_METRICS_CALCULATOR,
    MODULE_PROTECTION_CALCULATOR,
    UNLADEN_MASS_CALCULATOR,
    LADEN_MASS_CALCULATOR
} from './stats';

export interface ShipPropertyCalculatorClass {
    calculate(ship: Ship, modified: boolean): number;
}

export interface ShipPropertyCalculator {
    (ship: Ship, modified?: boolean): number
}

export interface ShipStatisticsCalculator {
    (ship: Ship, modified?: boolean): any
}

export const UNLADEN_MASS = UNLADEN_MASS_CALCULATOR;

export const LADEN_MASS = LADEN_MASS_CALCULATOR;

export const CARGO_CAPACITY = CARGO_CAPACITY_CALCULATOR;

export const FUEL_CAPACITY = FUEL_CAPACITY_CALCULATOR;

export const JUMP_RANGE = JUMP_CALCULATOR.getJumpRange;
export const TOTAL_RANGE = JUMP_CALCULATOR.getTotalRange;

export const SPEED = SPEED_CALCULATOR.getSpeed;
export const YAW = SPEED_CALCULATOR.getYaw;
export const ROLL = SPEED_CALCULATOR.getRoll;
export const PITCH = SPEED_CALCULATOR.getPitch;

export const SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getStrength;
export const EXPL_SHIELD_RES = SHIELD_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getExplosiveStrength;
export const KIN_SHIELD_RES = SHIELD_METRICS_CALCULATOR.getKineticResistance;
export const KIN_SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getKineticStrength;
export const THERM_SHIELD_RES = SHIELD_METRICS_CALCULATOR.getThermalResistance;
export const THERM_SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getThermalStrength;

export const ARMOUR = ARMOUR_METRICS_CALCULATOR.getArmour;
export const EXPL_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_ARMOUR = ARMOUR_METRICS_CALCULATOR.getExplosiveArmour;
export const KIN_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getKineticResistance;
export const KIN_ARMOUR = ARMOUR_METRICS_CALCULATOR.getKineticArmour;
export const THERM_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getThermalResistance;
export const THERM_ARMOUR = ARMOUR_METRICS_CALCULATOR.getThermalArmour;
export const CAUS_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getCausticResistance;
export const CAUS_ARMOUR = ARMOUR_METRICS_CALCULATOR.getCausticArmour;

export const MODULE_ARMOUR = MODULE_PROTECTION_CALCULATOR.getModuleProtection;
export const MODULE_PROTECTION = MODULE_PROTECTION_CALCULATOR.getModuleProtection;

const PASS: ShipPropertyCalculator = (ship, modified) => 0;
const PASS_STATISTICS: ShipStatisticsCalculator = (ship, modified) => {};

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
