/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { add, moduleReduce } from '../helper';

export function getFuelCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'fuel', modified, add, 0);
}

export function getFuel(ship: Ship, modified: boolean): number {
    return Math.min(ship.state.Fuel, getFuelCapacity(ship, modified));
}
