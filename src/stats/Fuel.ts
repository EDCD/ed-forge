/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';

import { FUEL_CAPACITY_CALCULATOR } from '.';
import { Ship } from '..';
import ShipStateCacheLine from '../helper/ShipStateCacheLine';

function getFuel(ship: Ship, modified: boolean) {
    return Math.min(
        ship.state.Fuel,
        FUEL_CAPACITY_CALCULATOR.calculate(ship, modified),
    );
}

export default class Fuel extends ShipStateCacheLine<number> {
    constructor() {
        super(FUEL_CAPACITY_CALCULATOR, 'Fuel');
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.get(ship, getFuel, [ship, modified]);
    }
}
