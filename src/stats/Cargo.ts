/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { add, moduleReduce } from '../helper';

export function getCargoCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'cargo', modified, add, 0);
}

export function getCargo(ship: Ship, modified: boolean) {
    return Math.min(ship.state.Cargo, getCargoCapacity(ship, modified));
}
