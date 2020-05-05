/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';

import { Ship } from '..';
import { add, moduleReduce } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';

function getFuelCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'fuel', modified, add, 0);
}

export default class FuelCapacity extends ShipPropsCacheLine<number> {
    constructor() {
        super({
            props: ['fuel'],
            type: [/FuelTank/i],
        });
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.get(ship, getFuelCapacity, [ship, modified]);
    }
}
