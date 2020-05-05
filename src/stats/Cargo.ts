/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';

import { CARGO_CAPACITY_CALCULATOR } from '.';
import { Ship } from '..';
import ShipStateCacheLine from '../helper/ShipStateCacheLine';

function getCargo(ship: Ship, modified: boolean) {
    return Math.min(
        ship.state.Cargo,
        CARGO_CAPACITY_CALCULATOR.calculate(ship, modified),
    );
}

export default class Cargo extends ShipStateCacheLine<number> {
    constructor() {
        super(CARGO_CAPACITY_CALCULATOR, 'Cargo');
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.get(ship, getCargo, [ship, modified]);
    }
}
