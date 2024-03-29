/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';

export function getCargoCapacity(ship: Ship, modified: boolean): number {
    return moduleSum(ship.object.Modules, 'cargo', modified);
}

export function getCargo(ship: Ship, modified: boolean) {
    return Math.min(ship.state.Cargo, getCargoCapacity(ship, modified));
}
