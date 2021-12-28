/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Module } from '..';
import { add, moduleReduceEnabled } from '../helper';
import Ship from '../Ship';
import { getFuel, getMaxFuel } from './Fuel';
import { getCurrentMass, getLadenMass, getUnladenMass, getMinimumMass } from './Mass';

/**
 * Sums up all jump boost modules for this ship.
 * @param ship Ship to calculate jump boost for
 * @param modified True if modifications should be taken into account
 * @returns Total jump boost
 */
function getJumpBoost(ship: Ship, modified: boolean): number {
    return moduleReduceEnabled(
        ship.object.Modules,
        'jumpboost',
        modified,
        add,
        0,
    );
}

/**
 * Jump range metrics for this ship.
 */
export interface IJumpRangeMetrics {
    /** How far can this ship jump currently? */
    jumpRangeCurrent: number;
    /** How far can this ship jump with full tank and cargo? */
    jumpRangeLaden: number;
    /** How far can this ship jump with full tank and empty cargo? */
    jumpRangeUnladen: number;
    /** How far can this ship jump with fuel for one jump and empty cargo? */
    jumpRangeMax: number;
    /** How far can this ship travel when starting with full tank and cargo? */
    totalRangeLaden: number;
    /** How far can this ship travel when starting with full tank and empty cargo? */
    totalRangeUnladen: number;
    /** How much is this ship's jump boosted per jump? */
    jumpBoost: number;
}

/**
 * Calculates how far a ship can jump.
 * @param fsd Frame shift drive
 * @param boost Jump boost
 * @param mass Mass of ship (including fuel!)
 * @param fuelUsed Maximum fuel available for the jump
 * @param modified True if modifications should be taken into account
 * @returns Jump range
 */
export function calculateJumpRange(
    fsd: Module,
    boost: number,
    mass: number,
    fuelUsed: number,
    modified: boolean,
): number {
    const optMass = fsd.getClean('fsdoptimalmass', modified);
    const maxFuelPerJump = fsd.getClean('maxfuel', modified);
    const fuelMul = fsd.getClean('fuelmul', modified);
    const fuelPower = fsd.getClean('fuelpower', modified);

    const range = (Math.pow(
        Math.min(fuelUsed, maxFuelPerJump) / fuelMul,
        1 / fuelPower,
    ) * optMass) / mass;
    return range > 0 ? range + boost : range;
}

/**
 * Calculates how far a ship can travel.
 * @param fsd Frame shift drive
 * @param boost Jump boost
 * @param baseMass Starting mass of the ship (including fuel!)
 * @param fuel Total fuel available
 * @param modified True if modifications should be taken into account
 * @returns Travel distance
 */
function calculateTotalRange(
    fsd: Module,
    boost: number,
    baseMass: number,
    fuel: number,
    modified: boolean,
): number {
    const maxFuelPerJump = fsd.getClean('maxfuel', modified);
    // If there is no fuel, loopCount will be zero so jumpRange will as well
    const loopCount = Math.ceil(fuel / maxFuelPerJump);
    let totalRange = 0;
    let fuelUsed = 0;
    let mass = baseMass;
    for (let i = 0; i < loopCount; i++) {
        // decrease mass and fuel by fuel from last jump
        mass -= fuelUsed;
        fuel -= fuelUsed;
        fuelUsed = Math.min(fuel, maxFuelPerJump);
        totalRange += calculateJumpRange(fsd, boost, mass, fuelUsed, modified);
    }
    return totalRange;
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
    const maxFuelPerJump = fsd.getClean('maxfuel', modified);
    const maxFuel = getMaxFuel(ship, modified);

    return {
        get jumpRangeCurrent() {
            return calculateJumpRange(fsd, jumpBoost, getCurrentMass(ship, modified), getFuel(ship, modified), modified);
        },
        get jumpRangeLaden() {
            return calculateJumpRange(fsd, jumpBoost, getLadenMass(ship, modified), maxFuel, modified);
        },
        get jumpRangeUnladen() {
            return calculateJumpRange(fsd, jumpBoost, getUnladenMass(ship, modified), maxFuel, modified);
        },
        get jumpRangeMax() {
            return calculateJumpRange(fsd, jumpBoost, getMinimumMass(ship, modified) + maxFuelPerJump, maxFuelPerJump, modified);
        },
        get totalRangeLaden() {
            return calculateTotalRange(fsd, jumpBoost, getLadenMass(ship, modified), maxFuel, modified);
        },
        get totalRangeUnladen() {
            return calculateTotalRange(fsd, jumpBoost, getUnladenMass(ship, modified), maxFuel, modified);
        },
        jumpBoost,
    };
}

/**
 * Get the jump range for the given ship, i.e. how far can it jump at max?
 * @param ship Ship to get the jump range for
 * @param modified True when modifications should be taken into account
 * @returns Jump range
 */
export function getJumpRange(ship: Ship, modified: boolean): number {
    return getJumpRangeMetrics(ship, modified).jumpRangeLaden;
}

/**
 * Get the total range for the given ship, i.e. how far can it get when it
 * jumps its maximum jump range subsequently?
 * @param ship Ship to get the total range for
 * @param modified True when modifications should be taken into account
 * @returns Total range
 */
export function getTotalRange(ship: Ship, modified: boolean): number {
    return getJumpRangeMetrics(ship, modified).totalRangeLaden;
}
