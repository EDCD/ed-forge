import autoBind from 'auto-bind';
import ShipCacheLine from "../helper/ShipCacheLine";
import { Ship } from "..";
import { EventEmitter } from "events";
import { moduleReduce, add } from '../helper';

function getUnladenMass(ship: Ship, modified: boolean): number {
    return moduleReduce(ship._object.Modules, 'mass', modified, add, 0);
}

export default class UnladenMass {
    private _moduleMass: ShipCacheLine<number> = new ShipCacheLine();
    dependencies: EventEmitter[] = [ this._moduleMass, ];

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): number {
        return ship.getBaseProperty('hullmass') + this._moduleMass.get(
            ship,
            getUnladenMass,
            [ ship, modified ]
        );
    }
}
