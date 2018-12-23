/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import Ship from "../Ship";
import autoBind from "auto-bind";
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { LADEN_MASS_CALCULATOR } from ".";
import { scaleMul } from "../helper";

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

/**
 * Calculate the speed multiplier for the given ship which can be applied to
 * base-speed values.
 * @param ship Ship to get the speed multiplier for
 * @param modified True when modifications should be taken into account
 * @returns Speed multiplier
 */
function getSpeedMultiplier(ship: Ship, modified: boolean): number {
    let thrusters = ship.getThrusters();
    return scaleMul(
        thrusters.get('minmul', modified),
        thrusters.get('optmul', modified),
        thrusters.get('maxmul', modified),
        thrusters.get('minmass', modified),
        thrusters.get('optmass', modified),
        thrusters.get('maxmass', modified),
        LADEN_MASS_CALCULATOR.calculate(ship, modified)
    );
}

export default class SpeedProfile {
    private _multiplier: ShipPropsCacheLine<number> = new ShipPropsCacheLine<number>(
        LADEN_MASS_CALCULATOR, {
            type: [ /Engine/i, ],
            props: [ 'minmul', 'optmul', 'maxmul', 'minmass', 'optmass', 'maxmass', ],
        }
    );

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
    getMultiplier(ship: Ship, modified: boolean): number {
        return this._multiplier.get(
            ship,
            getSpeedMultiplier,
            [ ship, modified ]
        ) * getEngMultiplier(ship) * getBoostMultiplier(ship);
    }

    /**
     * Get the top speed of this ship taking into account whether it's currently
     * boosting.
     * @param ship Ship to get the speed for
     * @param modified True when modifications should be taken into account
     * @returns Top speed
     */
    getSpeed(ship: Ship, modified: boolean): number {
        return this.getMultiplier(ship, modified) * ship.getBaseProperty('speed');
    }

    /**
     * Get the max pitch speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the pitch speed for
     * @param modified True when modifications should be taken into account
     * @returns Max pitch speed
     */
    getPitch(ship: Ship, modified: boolean) {
        return this.getMultiplier(ship, modified) * ship.getBaseProperty('pitch');
    }

    /**
     * Get the max yaw speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the yaw speed for
     * @param modified True when modifications should be taken into account
     * @returns Max yaw speed
     */
    getYaw(ship: Ship, modified: boolean) {
        return this.getMultiplier(ship, modified) * ship.getBaseProperty('yaw');
    }

    /**
     * Get the max roll speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the roll speed for
     * @param modified True when modifications should be taken into account
     * @returns Max roll speed
     */
    getRoll(ship: Ship, modified: boolean) {
        return this.getMultiplier(ship, modified) * ship.getBaseProperty('roll');
    }
}
