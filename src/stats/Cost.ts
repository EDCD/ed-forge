/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from "..";
import { add } from '../helper';
import { FUEL_CALCULATOR } from '.';

export function getCost(ship: Ship, modified: boolean): number {
    return ship.getBaseProperty('hullcost') +
        ship.getModules()
            .map(m => m.readMeta('cost'))
            .reduce(add, 0);
}

export function getRefuelCost(ship: Ship, modified: boolean): number {
    return FUEL_CALCULATOR.calculate(ship, modified) * 50;
}
