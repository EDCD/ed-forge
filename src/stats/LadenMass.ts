/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';

import { CARGO_CALCULATOR, FUEL_CALCULATOR, UNLADEN_MASS_CALCULATOR } from '.';
import { Ship } from '..';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';

function getLadenMass(ship: Ship, modified: boolean): number {
    return (
        UNLADEN_MASS_CALCULATOR.calculate(ship, modified) +
        FUEL_CALCULATOR.calculate(ship, modified) +
        CARGO_CALCULATOR.calculate(ship, modified)
    );
}

export default class LadenMass extends ShipPropsCacheLine<number> {
    constructor() {
        super(UNLADEN_MASS_CALCULATOR, FUEL_CALCULATOR, CARGO_CALCULATOR);
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.get(ship, getLadenMass, [ship, modified]);
    }
}
