/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { JUMP_BOOST, LADEN_TOTAL_MASS } from '../ship-stats';
import Ship from '../Ship';
import CachedCalculator from './CachedCalculator';

export interface JumpRangeMetrics {
    jumpRange: number;
    totalRange: number;
}

export default class JumpRangeProfile extends CachedCalculator {
    /**
     * Get the jump range metrics of a ship
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Jump range metrics of the ship
     */
    getJumpRangeMetrics(ship: Ship, modified: boolean): JumpRangeMetrics {
        let fsd = ship.getFSD();
        let optMass = fsd.get('optmass', modified);
        let mass = ship.get(LADEN_TOTAL_MASS, modified);

        let maxFuelPerJump = fsd.get('maxfuel', modified);
        let fuelMul = fsd.get('fuelmul', modified);
        let fuelPower = fsd.get('fuelpower', modified);
        let fuel = ship.getFuel(modified);

        let jumpBoost = ship.get(JUMP_BOOST, modified);

        return this.get(maxFuelPerJump, fuelMul, fuelPower, fuel, optMass, mass,
            jumpBoost);
    }

    /**
     * Calculate the jump range metrics of this ship.
     * @param maxFuelPerJump Maximal amount of fuel to be used per jump
     * @param fuelMul Inverted effectiveness multiplier for fuel
     * @param fuelPower Inverted power to the effective fuel used
     * @param fuel Available fuel
     * @param optMass
     * @param mass
     * @param jumpBoost
     * @return Jump range metrics
     */
    get(maxFuelPerJump: number, fuelMul: number, fuelPower: number, fuel: number,
        optMass: number, mass: number, jumpBoost: number): JumpRangeMetrics {
        let jumpRange = 0;
        let totalRange = 0;
        // If there is no fuel, loopCount will be zero so jumpRange will as well
        let loopCount = Math.ceil(fuel / maxFuelPerJump);
        let fuelPerJump = 0;
        for (let i = 0; i < loopCount; i++) {
            // decrease mass and fuel by fuel from last jump
            mass -= fuelPerJump;
            fuel -= fuelPerJump;
            fuelPerJump = Math.min(fuel, maxFuelPerJump);
            let thisJump = Math.pow(fuelPerJump / fuelMul, 1 / fuelPower)
                * optMass / mass + jumpBoost;
            if (i == 0) {
                jumpRange = thisJump;
            }
            totalRange += thisJump;
        }

        return { jumpRange, totalRange };
    }

    /**
     * Get the jump range for the given ship, i.e. how far can it jump at max?
     * @param ship Ship to get the jump range for
     * @param modified True when modifications should be taken into account
     * @returns Jump range
     */
    getJumpRange(ship: Ship, modified: boolean): number {
        return this.getJumpRangeMetrics(ship, modified).jumpRange;
    }

    /**
     * Get the total range for the given ship, i.e. how far can it get when it
     * jumps its maximum jump range subsequently?
     * @param ship Ship to get the total range for
     * @param modified True when modifications should be taken into account
     * @returns Total range
     */
    getTotalRange(ship: Ship, modified: boolean): number {
        return this.getJumpRangeMetrics(ship, modified).totalRange;
    }
}
