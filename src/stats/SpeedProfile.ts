/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { range } from 'lodash';

import { scaleMul } from '../helper';
import Ship from '../Ship';
import { getLadenMass } from './Mass';

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
export function getSpeedMetrics(
    ship: Ship,
    modified?: boolean,
): ISpeedMetrics {
    const multipliers = getSpeedMultipliers(
        ship,
        getLadenMass(ship, modified),
        modified,
    );

    let boost;
    const canBoost =
        ship.getBaseProperty('boostenergy') <
        ship.getPowerDistributor().get('enginescapacity', modified);
    if (canBoost) {
        boost = getManeuverabilityMetrics(
            ship,
            multipliers[8] * getBoostMultiplier(ship),
        );
    } else {
        boost = { pitch: NaN, roll: NaN, speed: NaN, yaw: NaN };
    }
    const pipped = multipliers.map((mult) =>
        getManeuverabilityMetrics(ship, mult),
    );

    return { boost, pipped };
}

function getEngIndex(ship: Ship): number {
    return ship.getDistributorSettings().Eng / 0.5;
}

/**
 * Get the top speed of this ship taking into account whether it's currently
 * boosting.
 * @param ship Ship to get the speed for
 * @param [modified] True when modifications should be taken into account
 * @returns Top speed
 */
export function getSpeed(ship: Ship, modified?: boolean): number {
    return _getNow(ship, modified).speed;
}

export function getBoostSpeed(ship: Ship, modified?: boolean): number {
    return getSpeedMetrics(ship, modified).boost.speed;
}

/**
 * Get the max pitch speed of this ship taking into account whether it's
 * currently boosting.
 * @param ship Ship to get the pitch speed for
 * @param modified True when modifications should be taken into account
 * @returns Max pitch speed
 */
export function getPitch(ship: Ship, modified?: boolean): number {
    return _getNow(ship, modified).pitch;
}

export function getBoostPitch(ship: Ship, modified?: boolean): number {
    return getSpeedMetrics(ship, modified).boost.speed;
}

/**
 * Get the max yaw speed of this ship taking into account whether it's
 * currently boosting.
 * @param ship Ship to get the yaw speed for
 * @param modified True when modifications should be taken into account
 * @returns Max yaw speed
 */
export function getYaw(ship: Ship, modified?: boolean): number {
    return _getNow(ship, modified).yaw;
}

export function getBoostYaw(ship: Ship, modified: boolean): number {
    return getSpeedMetrics(ship, modified).boost.yaw;
}

/**
 * Get the max roll speed of this ship taking into account whether it's
 * currently boosting.
 * @param ship Ship to get the roll speed for
 * @param modified True when modifications should be taken into account
 * @returns Max roll speed
 */
export function getRoll(ship: Ship, modified?: boolean): number {
    return _getNow(ship, modified).yaw;
}

export function getBoostRoll(ship: Ship, modified?: boolean): number {
    return getSpeedMetrics(ship, modified).boost.roll;
}

function _getNow(ship: Ship, modified?: boolean): IManeuverabilityMetrics {
    return getSpeedMetrics(ship, modified).pipped[getEngIndex(ship)];
}
