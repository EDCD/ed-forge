/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';
import { getFuelCapacity } from './Fuel';

export function getCost(ship: Ship, modified: boolean): number {
    return (
        ship.readProp('hullcost') +
        moduleSum(ship.getModules(), (m) => m.readMeta('cost'), modified)
    );
}

export function getRefuelCost(ship: Ship, modified: boolean): number {
    return getFuelCapacity(ship, modified) * 50;
}
