/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { EventEmitter } from 'events';

import { Ship } from '..';
import { add, moduleReduce } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';

function getFuelCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'fuel', modified, add, 0);
}

export default class FuelCapacity {
    public capacity: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        props: ['fuel'],
        type: [/FuelTank/i],
    });
    public dependencies: EventEmitter[] = [this.capacity];

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.capacity.get(ship, getFuelCapacity, [ship, modified]);
    }
}
