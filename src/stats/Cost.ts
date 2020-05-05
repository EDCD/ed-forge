/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { add } from '../helper';
import { getFuelCapacity } from './Fuel';

export function getCost(ship: Ship, modified: boolean): number {
    return (
        ship.getBaseProperty('hullcost') +
        ship
            .getModules()
            .map((m) => m.readMeta('cost'))
            .reduce(add, 0)
    );
}

export function getRefuelCost(ship: Ship, modified: boolean): number {
    return getFuelCapacity(ship, modified) * 50;
}
