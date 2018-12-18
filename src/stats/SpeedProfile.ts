/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import Ship from "../Ship";
import { ScaleMulCalculator } from "../helper";
import { LADEN_TOTAL_MASS } from "../ship-stats";
import autoBind from "auto-bind";

/**
 * Calculate the speed multiplier provided by pips to eng.
 * @param ship Ship to get the multiplier for
 * @returns Speed multiplier
 */
function getEngMultiplier(ship: Ship): number {
    let engPips = ship.getDistributorSettings().Eng;
    let pipEffect = ship.getBaseProperty('pipspeed');
    return 1 - (pipEffect * (4 - engPips));
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

    return ship.getBaseProperty('boost') * ship.getBaseProperty('speed');
}

export default class SpeedProfile extends ScaleMulCalculator {
    constructor() {
        super();
        autoBind(this);
    }

    /**
     * Prepare the arguments to calculate the speed multiplier for this ship
     * which can be applied to base-speed values.
     * @param ship Ship to get the speed multiplier for
     * @param modified True when modifications should be taken into account
     * @returns Speed multiplier
     */
    getSpeedMultiplier(ship: Ship, modified: boolean): number {
        let thrusters = ship.getThrusters();
        let minMul = thrusters.get('minmul', modified);
        let optMul = thrusters.get('optmul', modified);
        let maxMul = thrusters.get('maxmul', modified);
        let minMass = thrusters.get('minmass', modified);
        let optMass = thrusters.get('optmass', modified);
        let maxMass = thrusters.get('maxmass', modified);
        let mass = ship.get(LADEN_TOTAL_MASS, modified);

        return this.get(minMul, optMul, maxMul, minMass, optMass, maxMass, mass)
            * getEngMultiplier(ship) * getBoostMultiplier(ship);
    }

    /**
     * Get the top speed of this ship taking into account whether it's currently
     * boosting.
     * @param ship Ship to get the speed for
     * @param modified True when modifications should be taken into account
     * @returns Top speed
     */
    getSpeed(ship: Ship, modified: boolean): number {
        return this.getSpeedMultiplier(ship, modified) * ship.getBaseProperty('speed');
    }

    /**
     * Get the max pitch speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the pitch speed for
     * @param modified True when modifications should be taken into account
     * @returns Max pitch speed
     */
    getPitch(ship: Ship, modified: boolean) {
        return this.getSpeedMultiplier(ship, modified) * ship.getBaseProperty('pitch');
    }

    /**
     * Get the max yaw speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the yaw speed for
     * @param modified True when modifications should be taken into account
     * @returns Max yaw speed
     */
    getYaw(ship: Ship, modified: boolean) {
        return this.getSpeedMultiplier(ship, modified) * ship.getBaseProperty('yaw');
    }

    /**
     * Get the max roll speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the roll speed for
     * @param modified True when modifications should be taken into account
     * @returns Max roll speed
     */
    getRoll(ship: Ship, modified: boolean) {
        return this.getSpeedMultiplier(ship, modified) * ship.getBaseProperty('roll');
    }
}
