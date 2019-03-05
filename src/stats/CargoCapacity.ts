import autoBind from 'auto-bind';
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { Ship } from "..";
import { values } from 'lodash';
import { EventEmitter } from "events";

function getCargoCapacity(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('cargo', modified) || 0),
        0
    );
}

export default class CargoCapacity {
    private _capacity: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        type: [ /CargoRack/i, ],
        props: [ 'cargo', ]
    });
    dependencies: EventEmitter[] = [ this._capacity, ];

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._capacity.get(
            ship,
            getCargoCapacity,
            [ ship, modified ]
        );
    }
}
