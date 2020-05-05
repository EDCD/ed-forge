/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { add, moduleReduceEnabled } from '../helper';
import Ship from '../Ship';
import { getFuel } from './Fuel';
import { getLadenMass } from './Mass';

function getJumpBoost(ship: Ship, modified: boolean): number {
    return moduleReduceEnabled(
        ship.object.Modules,
        'jumpboost',
        modified,
        add,
        0,
    );
}

export interface IJumpRangeMetrics {
    jumpRange: number;
    totalRange: number;
    jumpBoost: number;
}

/**
 * Get the jump range metrics of a ship.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Jump range metrics of the ship
 */
export function getJumpRangeMetrics(
    ship: Ship,
    modified: boolean,
): IJumpRangeMetrics {
    const jumpBoost = getJumpBoost(ship, modified);
    const fsd = ship.getFSD();
    const optMass = fsd.getClean('fsdoptimalmass', modified);
    let mass = getLadenMass(ship, modified);

    const maxFuelPerJump = fsd.getClean('maxfuel', modified);
    const fuelMul = fsd.getClean('fuelmul', modified);
    const fuelPower = fsd.getClean('fuelpower', modified);
    let fuel = getFuel(ship, modified);

    let jumpRange = 0;
    let totalRange = 0;
    // If there is no fuel, loopCount will be zero so jumpRange will as well
    const loopCount = Math.ceil(fuel / maxFuelPerJump);
    let fuelPerJump = 0;
    for (let i = 0; i < loopCount; i++) {
        // decrease mass and fuel by fuel from last jump
        mass -= fuelPerJump;
        fuel -= fuelPerJump;
        fuelPerJump = Math.min(fuel, maxFuelPerJump);
        const thisJump =
            (Math.pow(fuelPerJump / fuelMul, 1 / fuelPower) * optMass) / mass +
            jumpBoost;
        if (i === 0) {
            jumpRange = thisJump;
        }
        totalRange += thisJump;
    }

    return { jumpRange, totalRange, jumpBoost };
}

/**
 * Get the jump range for the given ship, i.e. how far can it jump at max?
 * @param ship Ship to get the jump range for
 * @param modified True when modifications should be taken into account
 * @returns Jump range
 */
export function getJumpRange(ship: Ship, modified: boolean): number {
    return getJumpRangeMetrics(ship, modified).jumpRange;
}

/**
 * Get the total range for the given ship, i.e. how far can it get when it
 * jumps its maximum jump range subsequently?
 * @param ship Ship to get the total range for
 * @param modified True when modifications should be taken into account
 * @returns Total range
 */
export function getTotalRange(ship: Ship, modified: boolean): number {
    return getJumpRangeMetrics(ship, modified).totalRange;
}
