/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';

export function getPassengerCapacity(ship: Ship, modified: boolean): number {
    return moduleSum(ship.object.Modules, 'cabincapacity', modified);
}
