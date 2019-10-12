/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import ArmourProfile from './ArmourProfile';
import Cargo from './Cargo';
import CargoCapacity from './CargoCapacity';
import DamageProfileCalculator from './DamageProfile';
import Fuel from './Fuel';
import FuelCapacity from './FuelCapacity';
import JumpRangeProfile from './JumpRangeProfile';
import LadenMass from './LadenMass';
import MaximumMass from './MaximumMass';
import ModuleProtectionProfile from './ModuleProtectionProfle';
import PowerProfile from './PowerProfile';
import ShieldProfile from './ShieldProfile';
import SpeedProfile from './SpeedProfile';
import UnladenMass from './UnladenMass';

// IMPORTANT: some of these intance rely on other instances in this module if an
// instance depends on others, make sure to export it after its dependencies
export const UNLADEN_MASS_CALCULATOR = new UnladenMass();
export const CARGO_CAPACITY_CALCULATOR = new CargoCapacity();
export const CARGO_CALCULATOR = new Cargo();
export const FUEL_CAPACITY_CALCULATOR = new FuelCapacity();
export const FUEL_CALCULATOR = new Fuel();
export const LADEN_MASS_CALCULATOR = new LadenMass();
export const JUMP_CALCULATOR = new JumpRangeProfile();
export const SPEED_CALCULATOR = new SpeedProfile();
export const SHIELD_METRICS_CALCULATOR = new ShieldProfile();
export const ARMOUR_METRICS_CALCULATOR = new ArmourProfile();
export const MODULE_PROTECTION_CALCULATOR = new ModuleProtectionProfile();
export const DAMAGE_PROFILE_CALCULATOR = new DamageProfileCalculator();
export const POWER_PROFILE_CALCULATOR = new PowerProfile();
export const MAXIMUM_MASS_CALCULATOR = new MaximumMass();
