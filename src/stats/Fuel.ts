/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { EventEmitter } from 'events';

import { FUEL_CAPACITY_CALCULATOR } from '.';
import { Ship } from '..';
import ShipStateCacheLine from '../helper/ShipStateCacheLine';

function getFuel(ship: Ship, modified: boolean) {
    return Math.min(
        ship.state.Fuel,
        FUEL_CAPACITY_CALCULATOR.calculate(ship, modified),
    );
}

export default class Fuel {
    public fuel: ShipStateCacheLine<number> = new ShipStateCacheLine(
        FUEL_CAPACITY_CALCULATOR,
        'Fuel',
    );
    public dependencies: EventEmitter[] = [this.fuel];

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.fuel.get(ship, getFuel, [ship, modified]);
    }
}
