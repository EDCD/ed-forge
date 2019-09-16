/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';

import { FUEL_CALCULATOR, LADEN_MASS_CALCULATOR } from '.';
import { add, moduleReduceEnabled } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
import Ship from '../Ship';

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

function getJumpRangeMetrics(
    jumpBoost: number,
    ship: Ship,
    modified: boolean,
): IJumpRangeMetrics {
    const fsd = ship.getFSD();
    const optMass = fsd.getClean('fsdoptimalmass', modified);
    let mass = LADEN_MASS_CALCULATOR.calculate(ship, modified);

    const maxFuelPerJump = fsd.getClean('maxfuel', modified);
    const fuelMul = fsd.getClean('fuelmul', modified);
    const fuelPower = fsd.getClean('fuelpower', modified);
    let fuel = FUEL_CALCULATOR.calculate(ship, modified);

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

export default class JumpRangeProfile {
    private jumpBoost: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        props: ['jumpboost'],
        type: [/GuardianFSDBooster/i],
    });
    private jumpRangeMetrics: ShipPropsCacheLine<
        IJumpRangeMetrics
    > = new ShipPropsCacheLine(LADEN_MASS_CALCULATOR, FUEL_CALCULATOR, {
        props: ['fsdoptimalmass', 'maxfuel', 'fuelmul', 'fuelpower', 'fuel'],
        type: [/HyperDrive/i],
    });

    constructor() {
        autoBind(this);
    }

    /**
     * Get the jump range metrics of a ship.
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Jump range metrics of the ship
     */
    public getJumpRangeMetrics(
        ship: Ship,
        modified: boolean,
    ): IJumpRangeMetrics {
        const jumpBoost = this.jumpBoost.get(ship, getJumpBoost, [
            ship,
            modified,
        ]);
        return this.jumpRangeMetrics.get(ship, getJumpRangeMetrics, [
            jumpBoost,
            ship,
            modified,
        ]);
    }

    /**
     * Get the jump range for the given ship, i.e. how far can it jump at max?
     * @param ship Ship to get the jump range for
     * @param modified True when modifications should be taken into account
     * @returns Jump range
     */
    public getJumpRange(ship: Ship, modified: boolean): number {
        return this.getJumpRangeMetrics(ship, modified).jumpRange;
    }

    /**
     * Get the total range for the given ship, i.e. how far can it get when it
     * jumps its maximum jump range subsequently?
     * @param ship Ship to get the total range for
     * @param modified True when modifications should be taken into account
     * @returns Total range
     */
    public getTotalRange(ship: Ship, modified: boolean): number {
        return this.getJumpRangeMetrics(ship, modified).totalRange;
    }
}
