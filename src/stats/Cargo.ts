/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import ShipStateCacheLine from "../helper/ShipStateCacheLine";
import { Ship } from "..";
import { CARGO_CAPACITY_CALCULATOR } from ".";
import { EventEmitter } from "events";

function getCargo(ship: Ship, modified: boolean) {
    return Math.min(
        ship.state.Cargo,
        CARGO_CAPACITY_CALCULATOR.calculate(ship, modified)
    );
}

export default class Cargo {
    private _cargo: ShipStateCacheLine<number> = new ShipStateCacheLine(
        CARGO_CAPACITY_CALCULATOR,
        'Cargo'
    );
    dependencies: EventEmitter[] = [ this._cargo, ];

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._cargo.get(
            ship,
            getCargo,
            [ ship, modified ]
        );
    }
}
