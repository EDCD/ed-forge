/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';

export function getFuelCapacity(ship: Ship, modified: boolean): number {
    return moduleSum(ship.object.Modules, 'fuel', modified);
}

export function getFuel(ship: Ship, modified: boolean): number {
    return Math.min(ship.state.Fuel, getFuelCapacity(ship, modified));
}
