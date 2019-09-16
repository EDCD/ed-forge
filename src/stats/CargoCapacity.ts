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

function getCargoCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'cargo', modified, add, 0);
}

export default class CargoCapacity {
    public capacity: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        props: ['cargo'],
        type: [/CargoRack/i],
    });
    public dependencies: EventEmitter[] = [this.capacity];

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.capacity.get(ship, getCargoCapacity, [ship, modified]);
    }
}
