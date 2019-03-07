/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { Ship } from "..";
import { EventEmitter } from "events";
import { moduleReduce, add } from '../helper';

function getFuelCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship._object.Modules, 'fuel', modified, add, 0);
}

export default class FuelCapacity {
    private _capacity: ShipPropsCacheLine<number> = this._capacity = new ShipPropsCacheLine({
        type: [ /FuelTank/i, ],
        props: [ 'fuel', ]
    });
    dependencies: EventEmitter[] = [ this._capacity, ];

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._capacity.get(
            ship,
            getFuelCapacity,
            [ ship, modified ]
        );
    }
}
