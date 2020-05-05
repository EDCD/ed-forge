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

function getCargoCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'cargo', modified, add, 0);
}

export default class CargoCapacity extends ShipPropsCacheLine<number> {
    constructor() {
        super({
            props: ['cargo'],
            type: [/CargoRack/i],
        });
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.get(ship, getCargoCapacity, [ship, modified]);
    }
}
