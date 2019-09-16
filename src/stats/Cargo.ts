/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { EventEmitter } from 'events';

import { CARGO_CAPACITY_CALCULATOR } from '.';
import { Ship } from '..';
import ShipStateCacheLine from '../helper/ShipStateCacheLine';

function getCargo(ship: Ship, modified: boolean) {
    return Math.min(
        ship.state.Cargo,
        CARGO_CAPACITY_CALCULATOR.calculate(ship, modified),
    );
}

export default class Cargo {
    public cargo: ShipStateCacheLine<number> = new ShipStateCacheLine(
        CARGO_CAPACITY_CALCULATOR,
        'Cargo',
    );
    public dependencies: EventEmitter[] = [this.cargo];

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.cargo.get(ship, getCargo, [ship, modified]);
    }
}
