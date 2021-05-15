/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { assign, cloneDeep, sortBy, takeWhile } from 'lodash';
import { Module } from '..';

import { moduleMeanEnabled, moduleSumEnabled } from '../helper';
import Ship from '../Ship';

export interface IDamageMetrics {
    /** Damage per second */
    dps: number;
    /** Energy per second */
    eps: number;
    /** Heat per second */
    hps: number;
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

export function weighedPortion(
    type: string,
    totalDps: number,
    module: Module,
    modified: boolean,
): number {
    return module.get(type, modified) * module.get('damagepersecond', modified)
        / totalDps;
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
     * Damage metrics taking when WEP capacitor is empty, not taking into
     * account reload times.
     */
    drained: IDamageMetrics;
    /**
     * Time in seconds it takes to drain weapon capacitor under constant fire,
     * considering reloads..
     */
    timeToDrain: number;
}

export function getDamageProfile(ship: Ship, modified: boolean): IDamageProfile {
    const pd = ship.getPowerDistributor();
    const wepCap = pd.get('weaponscapacity', modified);
    const wepRecharge = pd.get('effectiveweaponsrecharge', modified);

    const hardpoints = sortBy(
        ship.getHardpoints(),
        (m) => m.get('distributordraw', modified),
    );
    const dps = moduleSumEnabled(hardpoints, 'damagepersecond', modified);
    const damage: IDamageMetrics = {
        dps,
        eps: moduleSumEnabled(hardpoints, 'energypersecond', modified),
        hps: moduleSumEnabled(hardpoints, 'heatpersecond', modified),
        types: {
            abs: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'absolutedamageportion', dps),
                modified,
            ),
            expl: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'explosivedamageportion', dps),
                modified,
            ),
            kin: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'kineticdamageportion', dps),
                modified,
            ),
            therm: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'thermicdamageportion', dps),
                modified,
            ),
        },
    };

    const sdps = moduleSumEnabled(
        hardpoints,
        'sustaineddamagepersecond',
        modified,
    );
    const sustained: IDamageMetrics = {
        dps: sdps,
        eps: moduleSumEnabled(
            hardpoints,
            'sustainedenergypersecond',
            modified,
        ),
        hps: moduleSumEnabled(
            hardpoints,
            'sustainedheatpersecond',
            modified,
        ),
        types: {
            abs: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'absolutedamageportion', sdps),
                modified,
            ),
            expl: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'explosivedamageportion', sdps),
                modified,
            ),
            kin: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'kineticdamageportion', sdps),
                modified,
            ),
            therm: moduleMeanEnabled(
                hardpoints,
                weighedPortion.bind(undefined, 'thermicdamageportion', sdps),
                modified,
            ),
        },
    };

    const timeToDrain = wepRecharge >= sustained.eps
        ? Infinity
        // This formula is the limit of the geometric series
        // https://en.wikipedia.org/wiki/Geometric_series
        : (wepCap / sustained.eps) / (1 - (wepRecharge / sustained.eps));

    let drained: IDamageMetrics;
    if (timeToDrain === Infinity) {
        drained = cloneDeep(damage);
    } else {
        let consumption = 0;
        const firingModules = takeWhile(hardpoints, (m) => {
            consumption += m.get('distributordraw', modified);
            return consumption > wepRecharge;
        });

        const drainedDps = moduleSumEnabled(
            firingModules,
            'damagepersecond',
            modified,
        );
        drained = {
            dps: drainedDps,
            eps: moduleSumEnabled(
                firingModules,
                'energypersecond',
                modified,
            ),
            hps: moduleSumEnabled(
                firingModules,
                'heatpersecond',
                modified,
            ),
            types: {
                abs: moduleMeanEnabled(
                    firingModules,
                    weighedPortion.bind(undefined, 'absolutedamageportion', drainedDps),
                    modified,
                ),
                expl: moduleMeanEnabled(
                    firingModules,
                    weighedPortion.bind(undefined, 'explosivedamageportion', drainedDps),
                    modified,
                ),
                kin: moduleMeanEnabled(
                    firingModules,
                    weighedPortion.bind(undefined, 'kineticdamageportion', drainedDps),
                    modified,
                ),
                therm: moduleMeanEnabled(
                    firingModules,
                    weighedPortion.bind(undefined, 'thermicdamageportion', drainedDps),
                    modified,
                ),
            },
        };
    }

    return assign(damage, {
        dpe: moduleSumEnabled(hardpoints, 'damageperenergy', modified),
        drained,
        hardnessMultiplier: moduleSumEnabled(
            hardpoints,
            (m) => m.get('damagepersecond') / dps * m.getArmourEffectiveness(),
            modified,
        ),
        rangeMultiplier: moduleSumEnabled(
            hardpoints,
            (m) => m.get('damagepersecond') / dps * m.getRangeEffectiveness(),
            modified,
        ),
        sustained,
        timeToDrain,
    });
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
