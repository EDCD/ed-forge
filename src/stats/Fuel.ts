/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import ShipStateCacheLine from "../helper/ShipStateCacheLine";
import { Ship } from "..";
import { FUEL_CAPACITY_CALCULATOR } from ".";
import { EventEmitter } from "events";

function getFuel(ship: Ship, modified: boolean) {
    return Math.min(
        ship.state.Fuel,
        FUEL_CAPACITY_CALCULATOR.calculate(ship, modified)
    );
}

export default class Fuel {
    private _fuel: ShipStateCacheLine<number> = new ShipStateCacheLine(
        FUEL_CAPACITY_CALCULATOR,
        'Fuel'
    );
    dependencies: EventEmitter[] = [ this._fuel, ];

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._fuel.get(
            ship,
            getFuel,
            [ ship, modified ]
        );
    }
}
