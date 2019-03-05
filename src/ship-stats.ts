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

export const UNLADEN_MASS: ShipPropertyCalculatorClass = UNLADEN_MASS_CALCULATOR;

export const LADEN_MASS: ShipPropertyCalculatorClass = LADEN_MASS_CALCULATOR;

export const CARGO_CAPACITY: ShipPropertyCalculatorClass = CARGO_CAPACITY_CALCULATOR;

export const FUEL_CAPACITY: ShipPropertyCalculatorClass = FUEL_CAPACITY_CALCULATOR;

export const JUMP_RANGE: ShipPropertyCalculator = JUMP_CALCULATOR.getJumpRange;
export const TOTAL_RANGE: ShipPropertyCalculator = JUMP_CALCULATOR.getTotalRange;

export const SPEED: ShipPropertyCalculator = SPEED_CALCULATOR.getSpeed;
export const YAW: ShipPropertyCalculator = SPEED_CALCULATOR.getYaw;
export const ROLL: ShipPropertyCalculator = SPEED_CALCULATOR.getRoll;
export const PITCH: ShipPropertyCalculator = SPEED_CALCULATOR.getPitch;

export const SHIELD_STRENGTH: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getStrength;
export const EXPL_SHIELD_RES: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_SHIELD_STRENGTH: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getExplosiveStrength;
export const KIN_SHIELD_RES: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getKineticResistance;
export const KIN_SHIELD_STRENGTH: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getKineticStrength;
export const THERM_SHIELD_RES: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getThermalResistance;
export const THERM_SHIELD_STRENGTH: ShipPropertyCalculator = SHIELD_METRICS_CALCULATOR.getThermalStrength;

export const ARMOUR: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getArmour;
export const EXPL_ARMOUR_RES: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_ARMOUR: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getExplosiveArmour;
export const KIN_ARMOUR_RES: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getKineticResistance;
export const KIN_ARMOUR: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getKineticArmour;
export const THERM_ARMOUR_RES: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getThermalResistance;
export const THERM_ARMOUR: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getThermalArmour;
export const CAUS_ARMOUR_RES: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getCausticResistance;
export const CAUS_ARMOUR: ShipPropertyCalculator = ARMOUR_METRICS_CALCULATOR.getCausticArmour;

export const MODULE_ARMOUR: ShipPropertyCalculator = MODULE_PROTECTION_CALCULATOR.getModuleProtection;
export const MODULE_PROTECTION: ShipPropertyCalculator = MODULE_PROTECTION_CALCULATOR.getModuleProtection;
