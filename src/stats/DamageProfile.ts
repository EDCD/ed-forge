/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { range } from 'lodash';

import { add, moduleMeanEnabled, moduleReduceEnabled } from '../helper';
import Module from '../Module';
import { PD_RECHARGE_MAP } from '../module-stats';
import Ship from '../Ship';

export interface IDamageMetrics {
    /** Damage per second */
    dps: number;
    /** Energy per second */
    eps: number;
    /** Heat per second */
    hps: number;
    timeToDrain: number[];
}

/**
 * Damage profile for all weapons of a ship.
 */
export interface IDamageProfile extends IDamageMetrics {
    /** Damage per energy */
    dpe: number;
    /** Damage metrics taking into account reload times */
    sustained: IDamageMetrics;
    /** Damage types as multiplicators; will sum up to one */
    types: {
        /** Absolute damage portion */
        abs: number;
        /** Explosive damage portion */
        expl: number;
        /** Kinetic damage portion */
        kin: number;
        /** Thermal damage portion */
        therm: number;
    };
}

function calculateDamageProfile(
    hardpoints: Module[],
    modified: boolean,
): IDamageProfile {
    return {
        dpe: moduleReduceEnabled(
            hardpoints,
            'damageperenergy',
            modified,
            add,
            0,
        ),
        dps: moduleReduceEnabled(
            hardpoints,
            'damagepersecond',
            modified,
            add,
            0,
        ),
        eps: moduleReduceEnabled(
            hardpoints,
            'energypersecond',
            modified,
            add,
            0,
        ),
        hps: moduleReduceEnabled(hardpoints, 'heatpersecond', modified, add, 0),
        sustained: {
            dps: moduleReduceEnabled(
                hardpoints,
                'sustaineddamagerpersecond',
                modified,
                add,
                0,
            ),
            eps: moduleReduceEnabled(
                hardpoints,
                'sustainedenergypersecond',
                modified,
                add,
                0,
            ),
            hps: moduleReduceEnabled(
                hardpoints,
                'sustainedheatpersecond',
                modified,
                add,
                0,
            ),
            timeToDrain: [],
        },
        timeToDrain: [],
        types: {
            abs: moduleMeanEnabled(
                hardpoints,
                'absolutedamageportion',
                modified,
            ),
            expl: moduleMeanEnabled(
                hardpoints,
                'explosivedamageportion',
                modified,
            ),
            kin: moduleMeanEnabled(
                hardpoints,
                'kineticdamageportion',
                modified,
            ),
            therm: moduleMeanEnabled(
                hardpoints,
                'thermicdamageportion',
                modified,
            ),
        },
    };
}

function setTimesToDrain<T extends IDamageMetrics>(
    damageMetrics: T,
    ship: Ship,
    modified?: boolean,
): T {
    const pd = ship.getPowerDistributor();
    const { eps } = damageMetrics;
    const wepCap = pd.get('weaponscapacity', modified);
    const wepRecharge = pd.get('weaponsrecharge', modified);
    damageMetrics.timeToDrain = range(0, 4.5, 0.5).map((wepPips) => {
        const effectiveRecharge = wepRecharge * PD_RECHARGE_MAP[wepPips];
        if (effectiveRecharge < eps) {
            const timeToDrainCap = wepCap / eps;
            // This formula is the limit of the geometric series
            // https://en.wikipedia.org/wiki/Geometric_series
            return timeToDrainCap / (1 - (effectiveRecharge / eps));
        } else {
            return Infinity;
        }
    });
    return damageMetrics;
}

export function getDamageProfile(
    ship: Ship,
    modified: boolean,
): IDamageProfile {
    const hardpoints = ship.getHardpoints();
    let profile = calculateDamageProfile(hardpoints, modified);
    profile = setTimesToDrain(profile, ship, modified);
    setTimesToDrain(profile.sustained, ship, modified);
    return profile;
}

export function getDps(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).dps;
}

export function getSdps(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).sustained.dps;
}

export function getEps(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).eps;
}

export function getDpe(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).dpe;
}

export function getHps(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).hps;
}

export function getAbsDamagePortion(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).types.abs;
}

export function getExplDamagePortion(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).types.expl;
}

export function getKinDamagePortion(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).types.kin;
}

export function getThermDamagePortion(ship: Ship, modified: boolean): number {
    return getDamageProfile(ship, modified).types.therm;
}
