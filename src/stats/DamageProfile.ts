/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { range } from 'lodash';

import { moduleMeanEnabled, moduleSumEnabled } from '../helper';
import { PD_RECHARGE_MAP } from '../module-stats';
import Ship from '../Ship';

export interface IDamageMetrics {
    /** Damage per second */
    dps: number;
    /** Energy per second */
    eps: number;
    /** Heat per second */
    hps: number;
}

/**
 * Damage profile for all weapons of a ship.
 */
export interface IDamageProfile extends IDamageMetrics {
    hardnessMultiplier: number;
    rangeMultiplier: number;
    /** Damage per energy */
    dpe: number;
    /** Damage metrics taking into account reload times */
    sustained: IDamageMetrics;
    /**
     * Time in seconds it takes to drain weapon capacitor under constant fire,
     * considering reloads. Each index corresponds to a half-pip put in WEP,
     * e.g., index `3` is for 1.5 pips.
     */
    timeToDrain: number[];
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

export function getDamageProfile(ship: Ship, modified: boolean): IDamageProfile {
    const hardpoints = ship.getHardpoints();
    const pd = ship.getPowerDistributor();
    const wepCap = pd.get('weaponscapacity', modified);
    const wepRecharge = pd.get('weaponsrecharge', modified);
    const dps = moduleSumEnabled(hardpoints, 'damagepersecond', modified);
    const sustainedEps = moduleSumEnabled(
        hardpoints,
        'sustainedenergypersecond',
        modified,
    );

    return {
        dpe: moduleSumEnabled(hardpoints, 'damageperenergy', modified),
        dps,
        eps: moduleSumEnabled(hardpoints, 'energypersecond', modified),
        hardnessMultiplier: moduleSumEnabled(
            hardpoints,
            (m) => m.get('damagepersecond') / dps * m.getArmourEffectiveness(),
            modified,
        ),
        hps: moduleSumEnabled(hardpoints, 'heatpersecond', modified),
        rangeMultiplier: moduleSumEnabled(
            hardpoints,
            (m) => m.get('damagepersecond') / dps * m.getRangeEffectiveness(),
            modified,
        ),
        sustained: {
            dps: moduleSumEnabled(
                hardpoints,
                'sustaineddamagepersecond',
                modified,
            ),
            eps: sustainedEps,
            hps: moduleSumEnabled(
                hardpoints,
                'sustainedheatpersecond',
                modified,
            ),
        },
        timeToDrain: range(0, 4.5, 0.5).map((wepPips) => {
            const effectiveRecharge = wepRecharge * PD_RECHARGE_MAP[wepPips];
            if (effectiveRecharge < sustainedEps) {
                const timeToDrainCap = wepCap / sustainedEps;
                // This formula is the limit of the geometric series
                // https://en.wikipedia.org/wiki/Geometric_series
                return timeToDrainCap / (1 - (effectiveRecharge / sustainedEps));
            } else {
                return Infinity;
            }
        }),
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
