/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import Ship from '../Ship';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
import { values } from 'lodash';
import { FUEL_CALCULATOR, LADEN_MASS_CALCULATOR } from '.';

function getJumpBoost(ship: Ship, modified: boolean): number {
    return values(ship._object.Modules).reduce(
        (reduced, module) => reduced + (module.get('jumpboost', modified) || 0),
        0
    );
}

export interface JumpRangeMetrics {
    jumpRange: number;
    totalRange: number;
    jumpBoost: number;
}

function getJumpRangeMetrics(jumpBoost: number, ship: Ship, modified: boolean): JumpRangeMetrics {
    let fsd = ship.getFSD();
    let optMass = fsd.get('optmass', modified);
    let mass = LADEN_MASS_CALCULATOR.calculate(ship, modified);

    let maxFuelPerJump = fsd.get('maxfuel', modified);
    let fuelMul = fsd.get('fuelmul', modified);
    let fuelPower = fsd.get('fuelpower', modified);
    let fuel = FUEL_CALCULATOR.calculate(ship, modified);

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

    return { jumpRange, totalRange, jumpBoost };
}

export default class JumpRangeProfile {
    private _jumpBoost: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        type: [ /GuardianFSDBooster/i, ],
        props: [ 'jumpboost', ]
    });
    private _jumpRangeMetrics: ShipPropsCacheLine<JumpRangeMetrics> = new ShipPropsCacheLine(
        LADEN_MASS_CALCULATOR, FUEL_CALCULATOR, {
            type: [ /HyperDrive/i, ],
            props: [ 'optmass', 'maxfuel', 'fuelmul', 'fuelpower', 'Fuel', ],
        }
    );

    constructor() {
        autoBind(this);
    }

    /**
     * Get the jump range metrics of a ship.
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Jump range metrics of the ship
     */
    getJumpRangeMetrics(ship: Ship, modified: boolean): JumpRangeMetrics {
        let jumpBoost = this._jumpBoost.get(
            ship,
            getJumpBoost,
            [ ship, modified ]
        );
        return this._jumpRangeMetrics.get(
            ship,
            getJumpRangeMetrics,
            [ jumpBoost, ship, modified ]
        );
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
