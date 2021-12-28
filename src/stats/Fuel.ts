/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';

/**
 * Get a ship's fuel capacity excluding the reserve tank.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Fuel tank capacity
 */
export function getFuelCapacity(ship: Ship, modified: boolean): number {
    return moduleSum(ship.object.Modules, 'fuel', modified);
}

/**
 * Fuel available to the ship taking fuel in state into consideration and
 * including the reserve tank.
 * @param ship Ship
 * @param modified True if modifications should be taken into account.
 * @returns Ship's currently available fuel
 */
export function getFuel(ship: Ship, modified: boolean): number {
    return Math.min(ship.state.Fuel, getFuelCapacity(ship, modified))
        + ship.readProp('reservefuelcapacity');
}

/**
 * Theoretical maximum of fuel available to a ship, taking reserve tank into
 * consideration.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Maximum fuel
 */
export function getMaxFuel(ship: Ship, modified: boolean): number {
    return getFuelCapacity(ship, modified) + ship.readProp('reservefuelcapacity');
}
