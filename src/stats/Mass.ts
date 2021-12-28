/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';
import { getCargo, getCargoCapacity } from './Cargo';
import { getFuel, getFuelCapacity } from './Fuel';

/**
 * Calculate a ship's mass without fuel and cargo.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Minimum mass
 */
export function getMinimumMass(ship: Ship, modified: boolean) {
    return ship.readProp('hullmass')
        + moduleSum(ship.object.Modules, 'mass', modified);
}

/**
 * Calculate a ship's current mass, taking into account fuel and cargo state.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Current mass
 */
export function getCurrentMass(ship: Ship, modified: boolean): number {
    return getMinimumMass(ship, modified) + getFuel(ship, modified)
        + getCargo(ship, modified);
}

/**
 * Calculate a ship's mass with full fuel and empty cargo.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Unladen mass
 */
export function getUnladenMass(ship: Ship, modified: boolean): number {
    return getMinimumMass(ship, modified) + getFuelCapacity(ship, modified)
        + ship.readProp('reservefuelcapacity');
}

/**
 * Calculate a ship's mass with full fuel and cargo.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Laden mass
 */
export function getLadenMass(ship: Ship, modified: boolean): number {
    return getUnladenMass(ship, modified) + getCargoCapacity(ship, modified);
}
