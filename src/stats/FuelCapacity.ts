import autoBind from 'auto-bind';
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { Ship } from "..";
import { values } from 'lodash';
import { EventEmitter } from "events";

function getFuelCapacity(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('fuel', modified) || 0),
        0
    );
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
