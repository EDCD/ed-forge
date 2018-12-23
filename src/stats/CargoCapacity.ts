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
    private _capacity: ShipPropsCacheLine<number>;
    dependencies: EventEmitter[];

    constructor() {
        this._capacity = new ShipPropsCacheLine<number>({
            type: [ /CargoRack/i, ],
            props: [ 'cargo', ]
        });
        this.dependencies = [ this._capacity, ];
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._capacity.get(
            ship,
            getCargoCapacity,
            [ ship, modified ]
        );
    }
}
