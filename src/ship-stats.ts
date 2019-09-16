/**
 * @module ShipStats
 */

/**
 * Ignore
 */
import { Ship } from '.';
import {
    ARMOUR_METRICS_CALCULATOR,
    CARGO_CAPACITY_CALCULATOR,
    DAMAGE_PROFILE_CALCULATOR,
    FUEL_CAPACITY_CALCULATOR,
    JUMP_CALCULATOR,
    LADEN_MASS_CALCULATOR,
    MODULE_PROTECTION_CALCULATOR,
    SHIELD_METRICS_CALCULATOR,
    SPEED_CALCULATOR,
    UNLADEN_MASS_CALCULATOR,
} from './stats';
import { IArmourMetrics } from './stats/ArmourProfile';
import { getCost, getRefuelCost } from './stats/Cost';
import { IDamageProfile } from './stats/DamageProfile';
import { IJumpRangeMetrics } from './stats/JumpRangeProfile';
import { IModuleProtectionMetrics } from './stats/ModuleProtectionProfle';
import { IShieldMetricsWithRecharge } from './stats/ShieldProfile';

export interface IShipPropertyCalculatorClass {
    calculate(ship: Ship, modified: boolean): number;
}

export type ShipPropertyCalculator = (ship: Ship, modified?: boolean) => number;

export type ShipMetricsCalculator<T> = (ship: Ship, modified?: boolean) => T;

export const UNLADEN_MASS: IShipPropertyCalculatorClass = UNLADEN_MASS_CALCULATOR;

export const LADEN_MASS: IShipPropertyCalculatorClass = LADEN_MASS_CALCULATOR;

export const CARGO_CAPACITY: IShipPropertyCalculatorClass = CARGO_CAPACITY_CALCULATOR;

export const COST: ShipPropertyCalculator = getCost;
export const REFUEL_COST: ShipPropertyCalculator = getRefuelCost;

export const FUEL_CAPACITY: IShipPropertyCalculatorClass = FUEL_CAPACITY_CALCULATOR;

export const JUMP_METRICS: ShipMetricsCalculator<IJumpRangeMetrics> =
    JUMP_CALCULATOR.getJumpRangeMetrics;
export const JUMP_RANGE: ShipPropertyCalculator = JUMP_CALCULATOR.getJumpRange;
export const TOTAL_RANGE: ShipPropertyCalculator =
    JUMP_CALCULATOR.getTotalRange;

export const SPEED: ShipPropertyCalculator = SPEED_CALCULATOR.getSpeed;
export const YAW: ShipPropertyCalculator = SPEED_CALCULATOR.getYaw;
export const ROLL: ShipPropertyCalculator = SPEED_CALCULATOR.getRoll;
export const PITCH: ShipPropertyCalculator = SPEED_CALCULATOR.getPitch;

export const SHIELD_METRICS: ShipMetricsCalculator<IShieldMetricsWithRecharge> =
    SHIELD_METRICS_CALCULATOR.getShieldMetrics;
export const SHIELD_STRENGTH: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getStrength;
export const EXPL_SHIELD_RES: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_SHIELD_STRENGTH: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getExplosiveStrength;
export const KIN_SHIELD_RES: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getKineticResistance;
export const KIN_SHIELD_STRENGTH: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getKineticStrength;
export const THERM_SHIELD_RES: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getThermalResistance;
export const THERM_SHIELD_STRENGTH: ShipPropertyCalculator =
    SHIELD_METRICS_CALCULATOR.getThermalStrength;

export const ARMOUR_METRICS: ShipMetricsCalculator<IArmourMetrics> =
    ARMOUR_METRICS_CALCULATOR.getArmourMetrics;
export const ARMOUR: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getArmour;
export const EXPL_ARMOUR_RES: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getExplosiveResistance;
export const EXPL_ARMOUR: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getExplosiveArmour;
export const KIN_ARMOUR_RES: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getKineticResistance;
export const KIN_ARMOUR: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getKineticArmour;
export const THERM_ARMOUR_RES: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getThermalResistance;
export const THERM_ARMOUR: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getThermalArmour;
export const CAUS_ARMOUR_RES: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getCausticResistance;
export const CAUS_ARMOUR: ShipPropertyCalculator =
    ARMOUR_METRICS_CALCULATOR.getCausticArmour;

export const MODULE_PROTECTION_METRICS: ShipMetricsCalculator<
    IModuleProtectionMetrics
> = MODULE_PROTECTION_CALCULATOR.getMetrics;
export const MODULE_ARMOUR: ShipPropertyCalculator =
    MODULE_PROTECTION_CALCULATOR.getModuleProtection;
export const MODULE_PROTECTION: ShipPropertyCalculator =
    MODULE_PROTECTION_CALCULATOR.getModuleProtection;

export const DAMAGE_METRICS: ShipMetricsCalculator<IDamageProfile> =
    DAMAGE_PROFILE_CALCULATOR.calculate;
export const DPS: ShipPropertyCalculator = DAMAGE_PROFILE_CALCULATOR.getDps;
export const SDPS: ShipPropertyCalculator = DAMAGE_PROFILE_CALCULATOR.getDps;
export const EPS: ShipPropertyCalculator = DAMAGE_PROFILE_CALCULATOR.getDps;
export const DPE: ShipPropertyCalculator = DAMAGE_PROFILE_CALCULATOR.getDps;
export const HPS: ShipPropertyCalculator = DAMAGE_PROFILE_CALCULATOR.getDps;
export const ABS_DMG_PORTION: ShipPropertyCalculator =
    DAMAGE_PROFILE_CALCULATOR.getAbsDamagePortion;
export const EXPL_DMG_PORTION: ShipPropertyCalculator =
    DAMAGE_PROFILE_CALCULATOR.getExplDamagePortion;
export const KIN_DMG_PORTION: ShipPropertyCalculator =
    DAMAGE_PROFILE_CALCULATOR.getKinDamagePortion;
export const THERM_DMG_PORTION: ShipPropertyCalculator =
    DAMAGE_PROFILE_CALCULATOR.getThermDamagePortion;
