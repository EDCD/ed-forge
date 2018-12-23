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
    private _fuel: ShipStateCacheLine<number>;
    dependencies: EventEmitter[];

    constructor() {
        this._fuel = new ShipStateCacheLine<number>(
            FUEL_CAPACITY_CALCULATOR,
            'Fuel'
        );
        this.dependencies = [ this._fuel, ];
    }

    calculate(ship: Ship, modified: boolean): number {
        return this._fuel.get(
            ship,
            getFuel,
            [ ship, modified ]
        );
    }
}
