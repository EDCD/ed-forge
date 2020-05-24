/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { assign, clone } from 'lodash';

import { Module, Ship } from '..';
import {
    add,
    complMult,
    diminishingDamageMultiplier,
    moduleReduceEnabled,
    scaleMul,
} from '../helper';
import { EFFECTIVE_SYS_RATE } from '../module-stats';

/**
 * Damage multipliers against a given resistance type.
 */
export interface IShieldDamageMultiplier {
    /** Base damage multiplier provided by the shield  generator */
    byGenerator: number;
    /** Additional damage multiplier provided by shield boosters */
    byBoosters: number;
    /**
     * Overall damage multiplier excluding effects from pips to sys with
     * diminishing returns applied
     */
    damageMultiplier: number;
    /**
     * Overall resistance excluding effects from pips to sys with diminishing
     * returns applied
     */
    resVal: number;
    /** Additional damage multiplier provided by pip to sys */
    bySys: number;
    /** Overall damage multiplier with diminishing returns applied */
    withSys: number;
    /**
     * Overall damage multiplier with 4 pips set to sys and diminishing returns
     * applied.
     */
    maxWithSys: number;
}

const NEUTRAL_DAMAGE_MULTIPLIERS = {
    byBoosters: 1,
    byGenerator: 1,
    bySys: 1,
    damageMultiplier: 1,
    maxWithSys: 1,
    resVal: 0,
    withSys: 1,
};

/**
 * Shield metrics for a given ship.
 */
export interface IShieldMetrics {
    /** Base shield strength by the shield generator */
    byGenerator: number;
    /** Additional shield strength provided by shield boosters */
    byBoosters: number;
    /** Additional shield strength by shield reinforcement packages */
    byReinforcements: number;
    /**
     * Total shield strength excluding effects from pips to sys and shield cell
     * banks
     */
    shieldStrength: number;
    /** Additional shield strength by shield cell banks */
    bySCBs: number;
    /** Total shield strength */
    withSCBs: number;
    /**
     * Damage multipliers for attacks ignoring resistances; can make a
     * difference because of effects from pips to sys
     */
    absolute: IShieldDamageMultiplier;
    /** Damage multipliers against explosive attacks */
    explosive: IShieldDamageMultiplier;
    /** Damage multipliers against kinetic attacks */
    kinetic: IShieldDamageMultiplier;
    /** Damage multipliers against thermal attacks */
    thermal: IShieldDamageMultiplier;
}

/**
 * Shield metrics including recharge times.
 */
export interface IShieldMetricsWithRecharge extends IShieldMetrics {
    /** Time to recover to 50% shield strength after collapse */
    recover: number | undefined;
    /**
     * Time to recover to 50% shield strength after collapse ignoring effects of
     * the sys capacitor
     */
    minRecover: number | undefined;
    /** Time to recharge shields from 50% to 100% */
    recharge: number | undefined;
    /**
     * Time to recharge shields from 50% to 100% ignoring effects of the sys
     * capacitor
     */
    minRecharge: number | undefined;
}

/**
 * Calculate diminishing returns for shields
 * @param baseRes Base resistance by the shield generator
 * @param fullRes Full resistance with shield booster effects
 * @returns Resistance with diminishing returns applied to [[fullRes]]
 */
function diminishingShieldRes(baseRes: number, fullRes: number): number {
    return diminishingDamageMultiplier(baseRes * 0.7, fullRes);
}

/**
 * Calculate the resistance multiplier for the amount of given pips to sys.
 * @param pips Number of pips
 */
function sysRes(pips: number): number {
    return (Math.pow(pips, 0.85) * 0.6) / Math.pow(4, 0.85);
}

/** Store the resistance multipliers per pip setting */
export const SYS_RES_MAP = {};
for (let i = 0; i <= 4; i += 0.5) {
    SYS_RES_MAP[i] = sysRes(i);
}

interface IRechargeTimes {
    recharge: number;
    minRecharge: number;
}

/**
 * Calculate how long it takes to recharge a given amount of shield assumed the
 * sys capacitor starts with full charge.
 * @param rechargeSize Amount of shields to recharge
 * @param rechargeRate Full recharge rate of the shield generator
 * @param distributorDraw Distributor drain by the shield generator when
 * recharging
 * @param distributorCap Capacity of the sys distributor
 * @param distributorRecharge Recharge rate of the sys distributor
 * @param distributorEnabled Whether or not the power distributor is enabled
 * @returns Recharge time
 */
function calculateRechargeTime(
    rechargeSize: number,
    rechargeRate: number,
    distributorDraw: number,
    distributorCap: number,
    distributorRecharge: number,
    distributorEnabled: boolean,
): IRechargeTimes {
    const minRecharge = rechargeSize / rechargeRate;
    // How long can we recharge shields on the distributor capacity, i.e. with
    // full recharge rate?
    const fullRechargeTime = distributorCap / distributorDraw;
    // We can fully recharge with one capacitor!
    if (minRecharge <= fullRechargeTime) {
        return { recharge: minRecharge, minRecharge };
        // We can't recharge at all
    } else if (!distributorEnabled) {
        return { recharge: undefined, minRecharge };
    }

    // How much shield is left to recharge after we ran out of distributor
    // capacity and how much does the distributor recharge rate slow us down?
    const leftOver = rechargeSize - rechargeRate * fullRechargeTime;
    rechargeRate *= Math.min(distributorRecharge / distributorDraw);
    return {
        minRecharge,
        recharge: fullRechargeTime + leftOver / rechargeRate,
    };
}

function getBaseShieldStrength(
    shieldGenerator: Module,
    ship: Ship,
    modified: boolean,
) {
    return (
        ship.getBaseProperty('baseshieldstrength') *
        scaleMul(
            shieldGenerator.getClean('shieldgenminstrength', modified),
            shieldGenerator.getClean('shieldgenstrength', modified),
            shieldGenerator.getClean('shieldgenmaxstrength', modified),
            shieldGenerator.getClean('shieldgenminimalmass', modified),
            shieldGenerator.getClean('shieldgenoptimalmass', modified),
            shieldGenerator.getClean('shieldgenmaximalmass', modified),
            ship.getBaseProperty('hullmass'),
        )
    );
}

function getShieldAddition(ship: Ship, modified: boolean): number {
    return moduleReduceEnabled(
        ship.object.Modules,
        'defencemodifiershieldaddition',
        modified,
        add,
        0,
    );
}

function calculateShieldMetrics(
    shieldGenerator: Module,
    baseShieldStrength: number,
    shieldAddition: number,
    ship: Ship,
    modified: boolean,
): IShieldMetrics {
    const explDamage =
        1 - shieldGenerator.getClean('explosiveresistance', modified);
    const kinDamage =
        1 - shieldGenerator.getClean('kineticresistance', modified);
    const thermDamage =
        1 - shieldGenerator.getClean('thermicresistance', modified);

    const sbs = ship.getShieldBoosters();
    const boost = moduleReduceEnabled(
        sbs,
        'defencemodifiershieldmultiplier',
        modified,
        add,
        0,
    );
    const boosterExplDamage = moduleReduceEnabled(
        sbs,
        'explosiveresistance',
        modified,
        complMult,
        1,
    );
    const boosterKinDamage = moduleReduceEnabled(
        sbs,
        'kineticresistance',
        modified,
        complMult,
        1,
    );
    const boosterThermDamage = moduleReduceEnabled(
        sbs,
        'thermicresistance',
        modified,
        complMult,
        1,
    );

    const byBoosters = baseShieldStrength * boost;
    const shieldStrength = baseShieldStrength + byBoosters + shieldAddition;

    const maxSysDamage = 1 - SYS_RES_MAP[4];
    const fullExplDamage = diminishingShieldRes(
        explDamage,
        explDamage * boosterExplDamage,
    );
    const fullKinDamage = diminishingShieldRes(
        kinDamage,
        kinDamage * boosterKinDamage,
    );
    const fullThermDamage = diminishingShieldRes(
        thermDamage,
        thermDamage * boosterThermDamage,
    );

    const metrics = {
        absolute: {
            byBoosters: 1,
            byGenerator: 1,
            bySys: 1,
            damageMultiplier: 1,
            maxWithSys: maxSysDamage,
            resVal: 0,
            withSys: 1,
        },
        byBoosters,
        byGenerator: baseShieldStrength,
        byReinforcements: shieldAddition,
        bySCBs: 0,
        explosive: {
            byBoosters: fullExplDamage / explDamage,
            byGenerator: explDamage,
            bySys: 1,
            damageMultiplier: fullExplDamage,
            maxWithSys: fullExplDamage * maxSysDamage,
            resVal: 1 - fullExplDamage,
            withSys: fullExplDamage,
        },
        kinetic: {
            byBoosters: fullKinDamage / kinDamage,
            byGenerator: kinDamage,
            bySys: 1,
            damageMultiplier: fullKinDamage,
            maxWithSys: fullKinDamage * maxSysDamage,
            resVal: 1 - fullKinDamage,
            withSys: fullKinDamage,
        },
        shieldStrength,
        thermal: {
            byBoosters: fullThermDamage / thermDamage,
            byGenerator: thermDamage,
            bySys: 1,
            damageMultiplier: fullThermDamage,
            maxWithSys: fullThermDamage * maxSysDamage,
            resVal: 1 - fullThermDamage,
            withSys: fullThermDamage,
        },
        withSCBs: shieldStrength,
    };

    return metrics;
}

function getSCBAddition(ship: Ship, modified: boolean): number {
    // TODO: move into module property and map to that
    const bySCBs = ship
        .getSCBs()
        .reduce(
            (reduced, m) =>
                reduced +
                m.getClean('shieldbankreinforcement', modified) *
                    m.getClean('shieldbankduration', modified) *
                    (m.getClean('ammomaximum', modified) +
                        m.getClean('ammoclipsize', modified)),
            0,
        );

    return bySCBs;
}

interface IRechargeMetrics {
    recover: number | undefined;
    minRecover: number | undefined;
    recharge: number | undefined;
    minRecharge: number | undefined;
}

function getRechargeMetrics(
    shieldStrength: number,
    shieldGenerator: Module,
    powerDistributor: Module,
    modified: boolean,
): IRechargeMetrics {
    const distributorDraw = shieldGenerator.getClean(
        'energyperregen',
        modified,
    );
    const distributorCap = powerDistributor.getClean(
        'systemscapacity',
        modified,
    );
    const distributorRecharge = powerDistributor.get(
        EFFECTIVE_SYS_RATE,
        modified,
    );
    const distributorEnabled = powerDistributor.isEnabled();

    const { recharge, minRecharge } = calculateRechargeTime(
        shieldStrength / 2,
        shieldGenerator.getClean('regenrate', modified),
        distributorDraw,
        distributorCap,
        distributorRecharge,
        distributorEnabled,
    );
    const recoverTimes = calculateRechargeTime(
        shieldStrength / 2,
        shieldGenerator.getClean('brokenregenrate', modified),
        distributorDraw,
        distributorCap,
        distributorRecharge,
        distributorEnabled,
    );

    return {
        minRecharge,
        minRecover: recoverTimes.minRecharge,
        recharge,
        recover: recoverTimes.recharge,
    };
}

/**
 * Calculate shield metrics for a given ship
 * @param ship Ship
 * @param modified True when modifications should be taken into account
 * @returns Shield metrics
 */
export function getShieldMetrics(
    ship: Ship,
    modified: boolean,
): IShieldMetricsWithRecharge {
    const shieldGenerator = ship.getShieldGenerator();
    if (!shieldGenerator || !shieldGenerator.isEnabled()) {
        return {
            absolute: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
            byBoosters: 0,
            byGenerator: 0,
            byReinforcements: 0,
            bySCBs: 0,
            explosive: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
            kinetic: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
            minRecharge: undefined,
            minRecover: undefined,
            recharge: undefined,
            recover: undefined,
            shieldStrength: 0,
            thermal: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
            withSCBs: 0,
        };
    }

    const baseShieldStrength = getBaseShieldStrength(
        shieldGenerator,
        ship,
        modified,
    );

    const shieldAddition = getShieldAddition(ship, modified);

    const metrics = calculateShieldMetrics(
        shieldGenerator,
        baseShieldStrength,
        shieldAddition,
        ship,
        modified,
    );

    const scbAddition = getSCBAddition(ship, modified);

    metrics.bySCBs = scbAddition;
    metrics.withSCBs = metrics.shieldStrength + scbAddition;

    const powerDistributor = ship.getPowerDistributor();
    const rechargeMetrics = getRechargeMetrics(
        metrics.shieldStrength,
        shieldGenerator,
        powerDistributor,
        modified,
    );
    assign(metrics, rechargeMetrics);

    const sysPips = ship.getDistributorSettings().Sys;
    const sysDamage = 1 - SYS_RES_MAP[sysPips];
    metrics.absolute.withSys = sysDamage;
    metrics.absolute.bySys = sysDamage;
    metrics.explosive.withSys *= sysDamage;
    metrics.explosive.bySys = sysDamage;
    metrics.kinetic.withSys *= sysDamage;
    metrics.kinetic.bySys = sysDamage;
    metrics.thermal.withSys *= sysDamage;
    metrics.thermal.bySys = sysDamage;

    return metrics as IShieldMetricsWithRecharge;
}

/**
 * Calculate the base shield strength for a ship; excluding effects from
 * pips to sys and shield cell banks but including shield boosters and
 * shield reinforcement.
 * packages.
 * @param ship Ship to get the shield strength for
 * @param modified True when modifications should be taken into account
 * @returns Total raw shield strength
 */
export function getStrength(ship: Ship, modified: boolean): number {
    const metrics = getShieldMetrics(ship, modified);
    return metrics.shieldStrength / metrics.absolute.damageMultiplier;
}

/**
 * Calculate the explosive resistance of the shields for a ship; excluding
 * effects from pips to sys.
 * @param ship Ship to get the resistance for
 * @param modified True when modifications should be taken into account
 * @returns Explosive resistance
 */
export function getExplosiveResistance(ship: Ship, modified: boolean): number {
    return (
        1 - getShieldMetrics(ship, modified).explosive.damageMultiplier
    );
}

/**
 * Calculate the shield strength against explosive attacks for a ship;
 * excluding effects from pips to sys. and strength by shield cell banks.
 * @param ship Ship to get the shield strength for
 * @param modified True when modifications should be taken into account
 * @returns Shield strength against explosive attacks
 */
export function getExplosiveStrength(ship: Ship, modified: boolean): number {
    const metrics = getShieldMetrics(ship, modified);
    return metrics.shieldStrength / metrics.explosive.damageMultiplier;
}

/**
 * Calculate the kinetic resistance of the shields for a ship; excluding
 * effects from pips to sys.
 * @param ship Ship to get the resistance for
 * @param modified True when modifications should be taken into account
 * @returns Kinetic resistance
 */
export function getKineticResistance(ship: Ship, modified: boolean) {
    return (
        1 - getShieldMetrics(ship, modified).kinetic.damageMultiplier
    );
}

/**
 * Calculate the shield strength against kinetic attacks for a ship;
 * excluding effects from pips to sys and strength by shield cell banks.
 * @param ship Ship to get the shield strength for
 * @param modified True when modifications should be taken into account
 * @returns Shield strength against kinetic attacks
 */
export function getKineticStrength(ship: Ship, modified: boolean): number {
    const metrics = getShieldMetrics(ship, modified);
    return metrics.shieldStrength / metrics.kinetic.damageMultiplier;
}

/**
 * Calculate the thermal resistance of the shields for a ship; excluding
 * effects from pips to sys.
 * @param ship Ship to the resistance for
 * @param modified True when modifications should be taken into account
 * @returns Thermal resistance
 */
export function getThermalResistance(ship: Ship, modified: boolean): number {
    return (
        1 - getShieldMetrics(ship, modified).thermal.damageMultiplier
    );
}

/**
 * Calculate the shield strength against thermal attacks for a ship;
 * excluding effects from pips to sys and strength by shield cell banks.
 * @param ship Ship to get the shield strength for
 * @param modified True when modifications should be taken into account
 * @returns Shield strength against thermal attacks
 */
export function getThermalStrength(ship: Ship, modified: boolean): number {
    const metrics = getShieldMetrics(ship, modified);
    return metrics.shieldStrength / metrics.explosive.damageMultiplier;
}

/**
 * Get the recharge time from 50% to 100% for the shields of a given ship
 * not taking the effects of the power distributor into account.
 * @param ship Ship to get the recharge time for
 * @param modified True when modifications should be taken into account
 * @returns Recharge time from 50% to 100%
 */
export function getRechargeTime(ship: Ship, modified: boolean): number {
    return getShieldMetrics(ship, modified).minRecharge;
}

/**
 * Get the time to recover for the shields of the given ship, i.e. how long
 * it takes shields to recover to 50% after they collapsed. Effects by the
 * power distributor are ignored in the calculations.
 * @param ship Ship to get the recover time for
 * @param modified True when modifications should be taken into account
 * @returns Time to recover to 50% after collapse
 */
export function getRecoverTime(ship: Ship, modified: boolean): number {
    return getShieldMetrics(ship, modified).minRecover;
}
