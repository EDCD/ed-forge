/**
 * @module ShipStats
 */

/**
 * Ignore
 */
import { Ship } from '.';

import * as Armour from './stats/ArmourProfile';
import * as Damage from './stats/DamageProfile';
import * as JumpRange from './stats/JumpRangeProfile';
import * as ModuleProtection from './stats/ModuleProtectionProfle';
import * as Power from './stats/PowerProfile';
import * as Shield from './stats/ShieldProfile';
import * as Speed from './stats/SpeedProfile';

import { getCargo, getCargoCapacity } from './stats/Cargo';
import { getCost, getRefuelCost } from './stats/Cost';
import { getFuel, getFuelCapacity } from './stats/Fuel';
import { getLadenMass, getMaximumMass, getUnladenMass } from './stats/Mass';
import { getPassengerCapacity } from './stats/PassengerCapacity';

export type ShipPropertyCalculator = (ship: Ship, modified?: boolean) => number;

export type ShipMetricsCalculator<T> = (ship: Ship, modified?: boolean) => T;

export const LADEN_MASS: ShipPropertyCalculator = getLadenMass;
export const MAXIMUM_MASS: ShipPropertyCalculator = getMaximumMass;
export const UNLADEN_MASS: ShipPropertyCalculator = getUnladenMass;

export const CARGO: ShipPropertyCalculator = getCargo;
export const CARGO_CAPACITY: ShipPropertyCalculator = getCargoCapacity;

export const PASSENGER_CAPACITY: ShipPropertyCalculator = getPassengerCapacity;

export const COST: ShipPropertyCalculator = getCost;
export const REFUEL_COST: ShipPropertyCalculator = getRefuelCost;

export const FUEL: ShipPropertyCalculator = getFuel;
export const FUEL_CAPACITY: ShipPropertyCalculator = getFuelCapacity;

export const JUMP_METRICS: ShipMetricsCalculator<JumpRange.IJumpRangeMetrics> =
    JumpRange.getJumpRangeMetrics;
export const JUMP_RANGE: ShipPropertyCalculator = JumpRange.getJumpRange;
export const TOTAL_RANGE: ShipPropertyCalculator = JumpRange.getTotalRange;

export const SPEED_METRICS: ShipMetricsCalculator<Speed.ISpeedMetrics> =
    Speed.getSpeedMetrics;
export const SPEED: ShipPropertyCalculator = Speed.getSpeed;
export const BOOST_SPEED: ShipPropertyCalculator = Speed.getBoostSpeed;
export const YAW: ShipPropertyCalculator = Speed.getYaw;
export const BOOST_YAW: ShipPropertyCalculator = Speed.getBoostYaw;
export const ROLL: ShipPropertyCalculator = Speed.getRoll;
export const BOOST_ROLL: ShipPropertyCalculator = Speed.getBoostRoll;
export const PITCH: ShipPropertyCalculator = Speed.getPitch;
export const BOOST_PITCH: ShipPropertyCalculator = Speed.getBoostPitch;

export const SHIELD_METRICS: ShipMetricsCalculator<
    Shield.IShieldMetricsWithRecharge
> = Shield.getShieldMetrics;
export const SHIELD_STRENGTH: ShipPropertyCalculator = Shield.getStrength;
export const EXPL_SHIELD_RES: ShipPropertyCalculator =
    Shield.getExplosiveResistance;
export const EXPL_SHIELD_STRENGTH: ShipPropertyCalculator =
    Shield.getExplosiveStrength;
export const KIN_SHIELD_RES: ShipPropertyCalculator =
    Shield.getKineticResistance;
export const KIN_SHIELD_STRENGTH: ShipPropertyCalculator =
    Shield.getKineticStrength;
export const THERM_SHIELD_RES: ShipPropertyCalculator =
    Shield.getThermalResistance;
export const THERM_SHIELD_STRENGTH: ShipPropertyCalculator =
    Shield.getThermalStrength;

export const ARMOUR_METRICS: ShipMetricsCalculator<Armour.IArmourMetrics> =
    Armour.getArmourMetrics;
export const ARMOUR: ShipPropertyCalculator = Armour.getArmour;
export const EXPL_ARMOUR_RES: ShipPropertyCalculator =
    Armour.getExplosiveResistance;
export const EXPL_ARMOUR: ShipPropertyCalculator = Armour.getExplosiveArmour;
export const KIN_ARMOUR_RES: ShipPropertyCalculator =
    Armour.getKineticResistance;
export const KIN_ARMOUR: ShipPropertyCalculator = Armour.getKineticArmour;
export const THERM_ARMOUR_RES: ShipPropertyCalculator =
    Armour.getThermalResistance;
export const THERM_ARMOUR: ShipPropertyCalculator = Armour.getThermalArmour;
export const CAUS_ARMOUR_RES: ShipPropertyCalculator =
    Armour.getCausticResistance;
export const CAUS_ARMOUR: ShipPropertyCalculator = Armour.getCausticArmour;

export const MODULE_PROTECTION_METRICS: ShipMetricsCalculator<
    ModuleProtection.IModuleProtectionMetrics
> = ModuleProtection.getModuleProtectionMetrics;
export const MODULE_ARMOUR: ShipPropertyCalculator =
    ModuleProtection.getModuleProtection;
export const MODULE_PROTECTION: ShipPropertyCalculator =
    ModuleProtection.getModuleProtection;

export const DAMAGE_METRICS: ShipMetricsCalculator<Damage.IDamageProfile> =
Damage.getDamageProfile;
export const DPS: ShipPropertyCalculator = Damage.getDps;
export const SDPS: ShipPropertyCalculator = Damage.getDps;
export const EPS: ShipPropertyCalculator = Damage.getDps;
export const DPE: ShipPropertyCalculator = Damage.getDps;
export const HPS: ShipPropertyCalculator = Damage.getDps;
export const ABS_DMG_PORTION: ShipPropertyCalculator =
    Damage.getAbsDamagePortion;
export const EXPL_DMG_PORTION: ShipPropertyCalculator =
    Damage.getExplDamagePortion;
export const KIN_DMG_PORTION: ShipPropertyCalculator =
    Damage.getKinDamagePortion;
export const THERM_DMG_PORTION: ShipPropertyCalculator =
    Damage.getThermDamagePortion;

export const POWER_METRICS: ShipMetricsCalculator<
    Power.IPowerMetrics
> = Power.getPowerMetrics;
export const PRODUCED: ShipPropertyCalculator = Power.getGenerated;
export const CONSUMED_DEPL: ShipPropertyCalculator = Power.getConsumedDeployed;
export const CONSUMED_RETR: ShipPropertyCalculator = Power.getConsumedRetracted;
