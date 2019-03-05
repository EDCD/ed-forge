import autoBind from 'auto-bind';
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { Ship } from "..";
import { EventEmitter } from "events";
import { moduleReduce, add } from '../helper';

function getCargoCapacity(ship: Ship, modified: boolean): number {
    return moduleReduce(ship._object.Modules, 'cargo', modified, add, 0);
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
