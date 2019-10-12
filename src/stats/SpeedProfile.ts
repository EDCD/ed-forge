/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { range } from 'lodash';

import {
    LADEN_MASS_CALCULATOR,
    MAXIMUM_MASS_CALCULATOR,
    UNLADEN_MASS_CALCULATOR,
} from '.';
import { scaleMul } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
import Ship from '../Ship';
import { IShipPropertyCalculatorClass } from '../ship-stats';

/**
 * Describes the manuverability of a ship
 */
export interface IManeuverabilityMetrics {
    /** Max speed in m/s */
    speed: number;
    /** Max pitch rate in °/s */
    pitch: number;
    /** Max yaw rate in °/s */
    yaw: number;
    /** Max roll rate in °/s */
    roll: number;
}

/**
 * A collection of manuverability metrics under multiple scenarios
 */
export interface ISpeedMetrics {
    /** Manuverability metrics when boosting */
    boost: IManeuverabilityMetrics;
    /**
     * Manuverability metrics for different ENG-pips settings; if `x` pips are
     * set to ENG, `pipped[x / 0.5]` holds the respective maneuverability
     * metrics.
     */
    pipped: IManeuverabilityMetrics[];
}

export interface ISpeedProfile {
    /** Worst speed metrics, i.e. when fully loaded with cargo and fuel */
    min: ISpeedMetrics;
    /** Speed metrics with current mass, i.e. factoring in the ship's state */
    now: ISpeedMetrics;
    /** Best speed metrics, i.e. without fuel or cargo */
    max: ISpeedMetrics;
}

/**
 * Calculate the speed multiplier provided by pips to eng.
 * @param ship Ship to get the multiplier for
 * @returns Speed multiplier
 */
function getEngMultiplier(ship: Ship, engPips: number): number {
    const pipEffect = ship.getBaseProperty('pipspeed');
    return 1 - pipEffect * (4 - engPips);
}

/**
 * Calculate the speed multiplier provided by boosting.
 * @param ship Ship to get the multiplier for
 * @returns Boost multiplier
 */
function getBoostMultiplier(ship: Ship): number {
    return ship.getBaseProperty('boost') / ship.getBaseProperty('speed');
}

/**
 * Calculate the speed multiplier for the given ship which can be applied to
 * base-speed values.
 * @param ship Ship to get the speed multiplier for
 * @param mass Mass of the ship to calculate the multipliers for
 * @param [modified] True when modifications should be taken into account
 * @returns Speed multipliers for each pip settings; each index corresponds to
 * `pipsToEng / 0.5`, i.e. to get the multiplier for 2.5 pips set to ENG look up
 * index `2.5 / 0.5 == 5`.
 */
function getSpeedMultipliers(
    ship: Ship,
    mass: number,
    modified?: boolean,
): number[] {
    const thrusters = ship.getThrusters();
    const baseMul = scaleMul(
        thrusters.getClean('engineminperformance', modified),
        thrusters.getClean('engineoptperformance', modified),
        thrusters.getClean('enginemaxperformance', modified),
        thrusters.getClean('engineminimalmass', modified),
        thrusters.getClean('engineoptimalmass', modified),
        thrusters.getClean('enginemaximalmass', modified),
        mass,
    );
    return range(0, 4.5, 0.5).map(
        (eng) => baseMul * getEngMultiplier(ship, eng),
    );
}

/**
 * Calculate maneuverability metrics based on a given multiplier.
 * @param ship Ship
 * @param multiplier Current engine's multiplier
 * @returns Maneuverability metrics
 */
function getManeuverabilityMetrics(
    ship: Ship,
    multiplier: number,
): IManeuverabilityMetrics {
    return {
        pitch: ship.getBaseProperty('pitch') * multiplier,
        roll: ship.getBaseProperty('roll') * multiplier,
        speed: ship.getBaseProperty('speed') * multiplier,
        yaw: ship.getBaseProperty('pitch') * multiplier,
    };
}

/**
 * Calculate the speed metrics for a ship, based on some mass value.
 * @param ship Ship
 * @param [modified] True if modifications should be taken into account
 * @eturns Speed metrics of the ship
 */
function getSpeedMetrics(
    ship: Ship,
    massCalculator: IShipPropertyCalculatorClass,
    modified?: boolean,
): ISpeedMetrics {
    const multipliers = getSpeedMultipliers(
        ship,
        ship.get(massCalculator, modified),
        modified,
    );
    const boost = getManeuverabilityMetrics(
        ship,
        multipliers[8] * getBoostMultiplier(ship),
    );
    const pipped = multipliers.map((mult) =>
        getManeuverabilityMetrics(ship, mult),
    );

    return { boost, pipped };
}

const ENGINE_DEPENDENCIES = {
    props: [
        'engineminperformance',
        'engineoptperformance',
        'enginemaxperformance',
        'engineminimalmass',
        'engineoptimalmass',
        'enginemaximalmass',
    ],
    type: [/Engine/i],
};

function getEngIndex(ship: Ship): number {
    return ship.getDistributorSettings().Eng / 0.5;
}

export default class SpeedProfile {
    private min = new ShipPropsCacheLine<ISpeedMetrics>(
        MAXIMUM_MASS_CALCULATOR,
        ENGINE_DEPENDENCIES,
    );
    private max = new ShipPropsCacheLine<ISpeedMetrics>(
        UNLADEN_MASS_CALCULATOR,
        ENGINE_DEPENDENCIES,
    );
    private now = new ShipPropsCacheLine<ISpeedMetrics>(
        LADEN_MASS_CALCULATOR,
        ENGINE_DEPENDENCIES,
    );

    constructor() {
        autoBind(this);
    }

    public getSpeedProfile(ship: Ship, modified?: boolean): ISpeedProfile {
        return {
            max: this.max.get(
                ship,
                getSpeedMetrics,
                [ship, UNLADEN_MASS_CALCULATOR, modified],
            ),
            min: this.min.get(
                ship,
                getSpeedMetrics,
                [ship, MAXIMUM_MASS_CALCULATOR, modified],
            ),
            now: this.now.get(
                ship,
                getSpeedMetrics,
                [ship, LADEN_MASS_CALCULATOR, modified],
            ),
        };
    }

    /**
     * Get the top speed of this ship taking into account whether it's currently
     * boosting.
     * @param ship Ship to get the speed for
     * @param [modified] True when modifications should be taken into account
     * @returns Top speed
     */
    public getSpeed(ship: Ship, modified?: boolean): number {
        return this._getNow(ship, modified).speed;
    }

    public getMaxSpeed(ship: Ship, modified?: boolean): number {
        return this._getMax(ship, modified).speed;
    }

    public getBoostSpeed(ship: Ship, modified?: boolean): number {
        return this.getSpeedProfile(ship, modified).now.boost.speed;
    }

    /**
     * Get the max pitch speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the pitch speed for
     * @param modified True when modifications should be taken into account
     * @returns Max pitch speed
     */
    public getPitch(ship: Ship, modified?: boolean): number {
        return this._getNow(ship, modified).pitch;
    }

    public getMaxPitch(ship: Ship, modified?: boolean): number {
        return this._getMax(ship, modified).pitch;
    }

    public getBoostPitch(ship: Ship, modified?: boolean): number {
        return this.getSpeedProfile(ship, modified).now.boost.speed;
    }

    /**
     * Get the max yaw speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the yaw speed for
     * @param modified True when modifications should be taken into account
     * @returns Max yaw speed
     */
    public getYaw(ship: Ship, modified?: boolean): number {
        return this._getNow(ship, modified).yaw;
    }

    public getMaxYaw(ship: Ship, modified?: boolean): number {
        return this._getMax(ship, modified).yaw;
    }

    public getBoostYaw(ship: Ship, modified: boolean): number {
        return this.getSpeedProfile(ship, modified).now.boost.yaw;
    }

    /**
     * Get the max roll speed of this ship taking into account whether it's
     * currently boosting.
     * @param ship Ship to get the roll speed for
     * @param modified True when modifications should be taken into account
     * @returns Max roll speed
     */
    public getRoll(ship: Ship, modified?: boolean): number {
        return this._getNow(ship, modified).yaw;
    }

    public getMaxRoll(ship: Ship, modified?: boolean): number {
        return this._getMax(ship, modified).yaw;
    }

    public getBoostRoll(ship: Ship, modified?: boolean): number {
        return this.getSpeedProfile(ship, modified).now.boost.roll;
    }

    private _getNow(ship: Ship, modified?: boolean): IManeuverabilityMetrics {
        return this.getSpeedProfile(ship, modified).now.pipped[
            getEngIndex(ship)
        ];
    }

    private _getMax(ship: Ship, modified?: boolean): IManeuverabilityMetrics {
        return this.getSpeedProfile(ship, modified).max.pipped[8];
    }
}
