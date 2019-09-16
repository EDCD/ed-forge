/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';

import { LADEN_MASS_CALCULATOR } from '.';
import { scaleMul } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
import Ship from '../Ship';

/**
 * Calculate the speed multiplier provided by pips to eng.
 * @param ship Ship to get the multiplier for
 * @returns Speed multiplier
 */
function getEngMultiplier(ship: Ship): number {
    const engPips = ship.getDistributorSettings().Eng;
    const pipEffect = ship.getBaseProperty('pipspeed');
    return 1 - pipEffect * (4 - engPips);
}

/**
 * Calculate the speed multiplier provided by boosting taking into account
 * whether or not the ship is currently boosting.
 * @param ship Ship to get the multiplier for
 * @returns Speed multiplier provided by the current boost state
 */
function getBoostMultiplier(ship: Ship): number {
    if (!ship.state.BoostActive) {
        return 1;
    }

    return ship.getBaseProperty('boost');
}

/**
 * Calculate the speed multiplier for the given ship which can be applied to
 * base-speed values.
 * @param ship Ship to get the speed multiplier for
 * @param modified True when modifications should be taken into account
 * @returns Speed multiplier
 */
function getSpeedMultiplier(ship: Ship, modified: boolean): number {
    const thrusters = ship.getThrusters();
    return scaleMul(
        thrusters.getClean('engineminperformance', modified),
        thrusters.getClean('engineoptperformance', modified),
        thrusters.getClean('enginemaxperformance', modified),
        thrusters.getClean('engineminimalmass', modified),
        thrusters.getClean('engineoptimalmass', modified),
        thrusters.getClean('enginemaximalmass', modified),
        LADEN_MASS_CALCULATOR.calculate(ship, modified),
    );
}

export default class SpeedProfile {
    private multiplier: ShipPropsCacheLine<number> = new ShipPropsCacheLine<
        number
    >(LADEN_MASS_CALCULATOR, {
        props: [
            'engineminperformance',
            'engineoptperformance',
            'enginemaxperformance',
            'engineminimalmass',
            'engineoptimalmass',
            'enginemaximalmass',
        ],
        type: [/Engine/i],
    });

    constructor() {
        autoBind(this);
    }

    /**
     * Prepare the arguments to calculate the speed multiplier for this ship
     * which can be applied to base-speed values.
     * @param ship Ship to get the speed multiplier for
     * @param modified True when modifications should be taken into account
     * @returns Speed multiplier
     */
    public getMultiplier(ship: Ship, modified: boolean): number {
        return (
            this.multiplier.get(ship, getSpeedMultiplier, [ship, modified]) *
            getEngMultiplier(ship) *
            getBoostMultiplier(ship)
        );
    }

    /**
     * Get the top speed of this ship taking into account whether it's currently
     * boosting.
     * @param ship Ship to get the speed for
     * @param modified True when modifications should be taken into account
     * @returns Top speed
     */
    public getSpeed(ship: Ship, modified: boolean): number {
        return (
            this.getMultiplier(ship, modified) * ship.getBaseProperty('speed')
        );
    }

    /**
     * Get the max pitch speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the pitch speed for
     * @param modified True when modifications should be taken into account
     * @returns Max pitch speed
     */
    public getPitch(ship: Ship, modified: boolean) {
        return (
            this.getMultiplier(ship, modified) * ship.getBaseProperty('pitch')
        );
    }

    /**
     * Get the max yaw speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the yaw speed for
     * @param modified True when modifications should be taken into account
     * @returns Max yaw speed
     */
    public getYaw(ship: Ship, modified: boolean) {
        return this.getMultiplier(ship, modified) * ship.getBaseProperty('yaw');
    }

    /**
     * Get the max roll speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the roll speed for
     * @param modified True when modifications should be taken into account
     * @returns Max roll speed
     */
    public getRoll(ship: Ship, modified: boolean) {
        return (
            this.getMultiplier(ship, modified) * ship.getBaseProperty('roll')
        );
    }
}
