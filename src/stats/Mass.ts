/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { moduleSum } from '../helper';
import { getCargo, getCargoCapacity } from './Cargo';
import { getFuel, getFuelCapacity } from './Fuel';

export function getUnladenMass(ship: Ship, modified: boolean): number {
    return ship.getBaseProperty('hullmass')
        + moduleSum(ship.object.Modules, 'mass', modified);
}

export function getLadenMass(ship: Ship, modified: boolean): number {
    return (
        getUnladenMass(ship, modified) +
        getCargo(ship, modified) +
        getFuel(ship, modified)
    );
}

export function getMaximumMass(ship: Ship, modified: boolean): number {
    return (
        getUnladenMass(ship, modified) +
        getCargoCapacity(ship, modified) +
        getFuelCapacity(ship, modified)
    );
}
