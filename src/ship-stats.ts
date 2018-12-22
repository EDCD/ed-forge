/**
* @module ShipStats
*/

/**
* Ignore
*/
import { values } from 'lodash';
import { Ship } from ".";
import JumpRangeProfile from "./stats/JumpRangeProfile";
import SpeedProfile from "./stats/SpeedProfile";
import ShieldProfile from "./stats/ShieldProfile";
import ArmourProfile from "./stats/ArmourProfile";
import ModuleProtectionProfile from "./stats/ModuleProtectionProfle";

export interface ShipPropertyCalculatorClass {
    calculate(ship: Ship, modified: boolean): number;
}

export interface ShipPropertyCalculator {
    (ship: Ship, modified?: boolean): number
}

export interface ShipStatisticsCalculator {
    (ship: Ship, modified?: boolean): any
}

export function TOTAL_MASS(ship: Ship, modified: boolean): number {
    return ship.getBaseProperty('mass') + values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('mass', modified) || 0),
        0
    );
}

export function LADEN_MASS(ship: Ship, modified: boolean): number {
    return ship.getCargo(modified) + ship.getFuel(modified);
}

export function LADEN_TOTAL_MASS(ship: Ship, modified: boolean): number {
    return ship.get(TOTAL_MASS, modified) + ship.get(LADEN_MASS, modified);
}

export function CARGO_CAPACITY(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('cargo', modified) || 0),
        0
    );
}

export function FUEL_CAPACITY(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('fuel', modified) || 0),
        0
    );
}

export function JUMP_BOOST(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('jumpboost', modified) || 0),
        0
    );
}

const JUMP_CALCULATOR = new JumpRangeProfile();
export const JUMP_RANGE = JUMP_CALCULATOR.getJumpRange;
export const TOTAL_RANGE = JUMP_CALCULATOR.getTotalRange;

const SPEED_CALCULATOR = new SpeedProfile();
export const SPEED = SPEED_CALCULATOR.getSpeed;
export const YAW = SPEED_CALCULATOR.getYaw;
export const ROLL = SPEED_CALCULATOR.getRoll;
export const PITCH = SPEED_CALCULATOR.getPitch;

const SHIELD_METRICS_CALCULATOR = new ShieldProfile();
export const SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getStrength;
export const EXPL_SHIELD_RES = SHIELD_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getExplosiveStrength;
export const KIN_SHIELD_RES = SHIELD_METRICS_CALCULATOR.getKineticResistance;
export const KIN_SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getKineticStrength;
export const THERM_SHIELD_RES = SHIELD_METRICS_CALCULATOR.getThermalResistance;
export const THERM_SHIELD_STRENGTH = SHIELD_METRICS_CALCULATOR.getThermalStrength;

const ARMOUR_METRICS_CALCULATOR = new ArmourProfile();
export const ARMOUR = ARMOUR_METRICS_CALCULATOR.getArmour;
export const EXPL_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_ARMOUR = ARMOUR_METRICS_CALCULATOR.getExplosiveArmour;
export const KIN_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getKineticResistance;
export const KIN_ARMOUR = ARMOUR_METRICS_CALCULATOR.getKineticArmour;
export const THERM_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getThermalResistance;
export const THERM_ARMOUR = ARMOUR_METRICS_CALCULATOR.getThermalArmour;
export const CAUS_ARMOUR_RES = ARMOUR_METRICS_CALCULATOR.getCausticResistance;
export const CAUS_ARMOUR = ARMOUR_METRICS_CALCULATOR.getCausticArmour;

const MODULE_PROTECTION_CALCULATOR = new ModuleProtectionProfile();
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
