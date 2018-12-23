import ShipCacheLine from "../helper/ShipCacheLine";
import { Ship } from "..";
import { values } from 'lodash';
import { EventEmitter } from "events";

function getUnladenMass(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('mass', modified) || 0),
        0
    );
}

export default class UnladenMass {
    private _moduleMass: ShipCacheLine<number> = new ShipCacheLine<number>();
    dependencies: EventEmitter[] = [ this._moduleMass, ];

    calculate(ship: Ship, modified: boolean): number {
        return ship.getBaseProperty('hullmass') + this._moduleMass.get(
            ship,
            getUnladenMass,
            [ ship, modified ]
        );
    }
}
