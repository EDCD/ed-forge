/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { EventEmitter } from 'events';

import { Ship } from '..';
import { add, moduleReduce } from '../helper';
import ShipCacheLine from '../helper/ShipCacheLine';

function getUnladenMass(ship: Ship, modified: boolean): number {
    return moduleReduce(ship.object.Modules, 'mass', modified, add, 0);
}

export default class UnladenMass {
    public moduleMass: ShipCacheLine<number> = new ShipCacheLine();
    public dependencies: EventEmitter[] = [this.moduleMass];

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): number {
        return (
            ship.getBaseProperty('hullmass') +
            this.moduleMass.get(ship, getUnladenMass, [ship, modified])
        );
    }
}
