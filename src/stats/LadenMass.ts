/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { UNLADEN_MASS_CALCULATOR, FUEL_CALCULATOR, CARGO_CALCULATOR } from ".";
import { EventEmitter } from "events";
import { Ship } from "..";

function getLadenMass(ship: Ship, modified: boolean): number {
    return UNLADEN_MASS_CALCULATOR.calculate(ship, modified)
        + FUEL_CALCULATOR.calculate(ship, modified)
        + CARGO_CALCULATOR.calculate(ship, modified);
}

export default class LadenMass {
    private _mass: ShipPropsCacheLine<number> = new ShipPropsCacheLine<number>(
        UNLADEN_MASS_CALCULATOR, FUEL_CALCULATOR, CARGO_CALCULATOR
    );
    dependencies: EventEmitter[] = [ this._mass, ];

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._mass.get(
            ship,
            getLadenMass,
            [ ship, modified ]
        );
    }
}
