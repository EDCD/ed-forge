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
    private _capacity: ShipPropsCacheLine<number>;
    dependencies: EventEmitter[];

    constructor() {
        this._capacity = new ShipPropsCacheLine<number>({
            type: [ /FuelTank/i, ],
            props: [ 'fuel', ]
        });
        this.dependencies = [ this._capacity, ];
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._capacity.get(
            ship,
            getFuelCapacity,
            [ ship, modified ]
        );
    }
}
