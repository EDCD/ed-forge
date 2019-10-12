import autoBind = require('auto-bind');
import { EventEmitter } from 'events';

import {
    CARGO_CAPACITY_CALCULATOR,
    FUEL_CAPACITY_CALCULATOR,
    UNLADEN_MASS_CALCULATOR,
} from '.';
import { Ship } from '..';
import ShipCacheLine from '../helper/ShipCacheLine';

function getMaximumMass(ship: Ship, modified: boolean): number {
    return (
        CARGO_CAPACITY_CALCULATOR.calculate(ship, modified) +
        FUEL_CAPACITY_CALCULATOR.calculate(ship, modified) +
        UNLADEN_MASS_CALCULATOR.calculate(ship, modified)
    );
}

export default class MaximumMass {
    public mass = new ShipCacheLine<number>(
        CARGO_CAPACITY_CALCULATOR,
        FUEL_CAPACITY_CALCULATOR,
        UNLADEN_MASS_CALCULATOR,
    );
    public dependencies: EventEmitter[] = [this.mass];

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return this.mass.get(ship, getMaximumMass, [ship, modified]);
    }
}
