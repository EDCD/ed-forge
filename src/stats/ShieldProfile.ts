/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from "..";
import { ScaleMulCalculator, diminishingDamageMultiplier } from "../helper";
import { clone, assign } from 'lodash';
import CachedCalculator from "./CachedCalculator";
import { EFFECTIVE_SYS_RATE } from "../module-stats";

/**
 * Damage multipliers against a given resistance type.
 */
export interface ShieldDamageMultiplier {
    /** Base damage multiplier provided by the shield  generator */
    byGenerator: number;
    /** Additional damage multiplier provided by shield boosters */
    byBoosters: number;
    /**
     * Overall damage multiplier excluding effects from pips to sys with
     * diminishing returns applied
     */
    damageMultiplier: number;
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
    byGenerator: 1,
    byBoosters: 1,
    damageMultiplier: 1,
    bySys: 1,
    withSys: 1,
    maxWithSys: 1,
};

/**
 * Shield metrics for a given ship.
 */
export interface ShieldMetrics {
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
    absolute: ShieldDamageMultiplier;
    /** Damage multipliers against explosive attacks */
    explosive: ShieldDamageMultiplier;
    /** Damage multipliers against kinetic attacks */
    kinetic: ShieldDamageMultiplier;
    /** Damage multipliers against thermal attacks */
    thermal: ShieldDamageMultiplier;
}

/**
 * Shield metrics including recharge times.
 */
export interface ShieldMetricsWithRecharge extends ShieldMetrics {
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
    return Math.pow(pips, 0.85) * 0.6 / Math.pow(4, 0.85);
}

/** Store the resistance multipliers per pip setting */
const SYS_RES_MAP = {};
for (let i = 0; i <= 4; i += 0.5) {
    SYS_RES_MAP[i] = sysRes(i);
}

interface RechargeMetrics {
    recover: number | undefined;
    minRecover: number | undefined;
    recharge: number | undefined;
    minRecharge: number | undefined;
}

interface RechargeTimes {
    recharge: number;
    minRecharge: number;
}

/**
 * Calculate how long it takes to recharge a given amount of shield assumed the
 * sys capacitor starts with full charge.
 * @param rechargeSize Amount of shields to recharge
 * @param rechargeRate Full recharge rate of the shield generator
 * @param distributorDraw Distributor drain by the shield generator when recharging
 * @param distributorCap Capacity of the sys distributor
 * @param distributorRecharge Recharge rate of the sys distributor
 * @param distributorEnabled Whether or not the power distributor is enabled
 * @returns Recharge time
 */
function getRechargeTime(rechargeSize: number, rechargeRate: number,
    distributorDraw: number, distributorCap: number,
    distributorRecharge: number, distributorEnabled: boolean): RechargeTimes {
    let minRecharge = rechargeSize / rechargeRate;
    // How long can we recharge shields on the distributor capacity, i.e. with
    // full recharge rate?
    let fullRechargeTime = distributorCap / distributorDraw;
    // We can fully recharge with one capacitor!
    if (minRecharge <= fullRechargeTime) {
        return { recharge: minRecharge, minRecharge };
    // We can't recharge at all
    } else if (!distributorEnabled) {
        return { recharge: undefined, minRecharge };
    }

    // How much shield is left to recharge after we ran out of distributor
    // capacity and how much does the distributor recharge rate slow us down?
    let leftOver = rechargeSize - rechargeRate * fullRechargeTime;
    rechargeRate *= Math.min(distributorRecharge / distributorDraw);
    return {
        recharge: fullRechargeTime + leftOver / rechargeRate,
        minRecharge
    };
}

class RechargeProfile extends CachedCalculator {
    get(shieldStrength: number, rechargeRate: number, brokenRechargeRate: number,
        distributorDraw: number, distributorCap: number,
        distributorRecharge: number, distributorEnabled: boolean, pips: number): RechargeMetrics {
        let recoverTimes = getRechargeTime(shieldStrength / 2,
            brokenRechargeRate, distributorDraw, distributorCap,
            distributorRecharge, distributorEnabled);
        let recover = recoverTimes.recharge;
        let minRecover = recoverTimes.minRecharge;
        let { recharge, minRecharge } = getRechargeTime(shieldStrength / 2,
            rechargeRate, distributorDraw, distributorCap, distributorRecharge,
            distributorEnabled);

        return { recharge, minRecharge, recover, minRecover };
    }
}

export default class ShieldProfile extends CachedCalculator {
    private DamageMultiplierGetter = new ScaleMulCalculator();
    private RechargeProfileGetter = new RechargeProfile();

    /**
     * Calculate shield metrics for a given ship
     * @param ship Ship
     * @param modified True when modifications should be taken into account
     * @returns Shield metrics
     */
    getShieldMetrics(ship: Ship, modified: boolean): ShieldMetricsWithRecharge {
        let shieldGenerator = ship.getShieldGenerator();
        if (!shieldGenerator || !shieldGenerator.isEnabled()) {
            return {
                byGenerator: 0,
                byBoosters: 0,
                byReinforcements: 0,
                shieldStrength: 0,
                bySCBs: 0,
                withSCBs: 0,
                recover: undefined,
                minRecover: undefined,
                recharge: undefined,
                minRecharge: undefined,
                absolute: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
                explosive: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
                kinetic: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
                thermal: clone(NEUTRAL_DAMAGE_MULTIPLIERS),
            };
        }

        let minMul = shieldGenerator.get('minmul', modified);
        let optMul = shieldGenerator.get('optmul', modified);
        let maxMul = shieldGenerator.get('maxmul', modified);
        let minMass = shieldGenerator.get('minmass', modified);
        let optMass = shieldGenerator.get('optmass', modified);
        let maxMass = shieldGenerator.get('maxmass', modified);
        let hullMass = ship.getBaseProperty('hullmass');
        let baseShieldStrength = this.DamageMultiplierGetter.get(
            minMul, optMul, maxMul, minMass, optMass, maxMass, hullMass
        );

        let explDamage = 1 - shieldGenerator.get('explres', modified);
        let kinDamage = 1 - shieldGenerator.get('kinres', modified);
        let thermDamage = shieldGenerator.get('thermres', modified);

        let boost = 0;
        let boosterExplDamage = 0;
        let boosterKinDamage = 0;
        let boosterThermDamage = 0;
        ship.getShieldBoosters().filter(booster => booster.isEnabled())
            .forEach(booster => {
                boost += booster.get('shieldboost', modified);
                boosterExplDamage *= 1 - booster.get('explres', modified);
                boosterKinDamage *= 1 - booster.get('kinres', modified);
                boosterThermDamage *= 1 - booster.get('thermres', modified);
            });

        let shieldAddition = ship._Modules.filter(m => m.isEnabled()).reduce(
            (reduced, module) => reduced + module.get('shieldaddition', modified),
            0
        );

        let rechargeRate = shieldGenerator.get('regen', modified);
        let brokenRechargeRate = shieldGenerator.get('brokenregen', modified);
        let distributorDraw = shieldGenerator.get('distdraw', modified);

        let powerDistributor = ship.getPowerDistributor();
        let distributorCap = powerDistributor.get('syscap', modified);
        let distributorRecharge = powerDistributor.get(EFFECTIVE_SYS_RATE, modified);
        let distributorEnabled = powerDistributor.isEnabled();
4
        let metrics = this.get(baseShieldStrength, boost, shieldAddition,
            explDamage, kinDamage, thermDamage, boosterExplDamage,
            boosterKinDamage, boosterThermDamage);

        let sysPips = ship.getDistributorSettings().Sys;
        let sysDamage = 1 - SYS_RES_MAP[sysPips];
        metrics.absolute.withSys = sysDamage;
        metrics.absolute.bySys = sysDamage;
        metrics.explosive.withSys *= sysDamage;
        metrics.explosive.bySys = sysDamage;
        metrics.kinetic.withSys *= sysDamage;
        metrics.kinetic.bySys = sysDamage;
        metrics.thermal.withSys *= sysDamage;
        metrics.thermal.bySys = sysDamage;

        let rechargeProfile = this.RechargeProfileGetter.get(
            metrics.shieldStrength, rechargeRate, brokenRechargeRate,
            distributorDraw, distributorCap, distributorRecharge,
            distributorEnabled, sysPips
        );
        assign(metrics, rechargeProfile);

        let bySCBs = ship.getSCBs().reduce(
            (reduced, m) => reduced + m.get('shieldreinforcement', modified)
                * m.get('duration', modified)
                * (m.get('ammo', modified) + 1),
            0
        );

        metrics.bySCBs = bySCBs;
        metrics.withSCBs = metrics.shieldStrength + bySCBs;

        return metrics as ShieldMetricsWithRecharge;
    }

    /**
     * Calculate shield metrics.
     * @param baseShieldStrength Generator shield strength
     * @param boost Shield strength boost by shield boosters
     * @param shieldAddition Raw shield addition by reinforcement packages
     * @param explDamage Base explosive damage multiplier
     * @param kinDamage Base kinetic damage multiplier
     * @param thermDamage Base thermal damage multiplier
     * @param boosterExplDamage Explosive damage multiplier by shield boosters
     * @param boosterKinDamage Kinetic damage multiplier by shield boosters
     * @param boosterThermDamage Thermal damage multiplier by shield boosters
     * @returns Shield metrics for 0 pips to sys
     */
    get(baseShieldStrength: number, boost: number, shieldAddition: number,
        explDamage: number, kinDamage: number, thermDamage: number,
        boosterExplDamage: number, boosterKinDamage: number,
        boosterThermDamage: number): ShieldMetrics {
        let byBoosters = baseShieldStrength * boost;
        let shieldStrength = baseShieldStrength + byBoosters + shieldAddition;

        let maxSysDamage = 1 - SYS_RES_MAP[4];
        let fullExplDamage = diminishingShieldRes(
            explDamage,
            explDamage * boosterExplDamage
        );
        let fullKinDamage = diminishingShieldRes(
            kinDamage,
            kinDamage * boosterKinDamage
        );
        let fullThermDamage = diminishingShieldRes(
            thermDamage,
            thermDamage * boosterThermDamage
        );

        let metrics = {
            byGenerator: baseShieldStrength,
            byBoosters,
            byReinforcements: shieldAddition,
            /// TODO: support shield cells
            shieldStrength,
            bySCBs: 0,
            withSCBs: shieldStrength,
            absolute: {
                byGenerator: 1,
                byBoosters: 1,
                damageMultiplier: 1,
                withSys: 1,
                bySys: 1,
                maxWithSys: maxSysDamage,
            },
            explosive: {
                byGenerator: explDamage,
                byBoosters: explDamage / fullExplDamage,
                damageMultiplier: explDamage,
                withSys: explDamage,
                bySys: 1,
                maxWithSys: explDamage * maxSysDamage,
            },
            kinetic: {
                byGenerator: kinDamage,
                byBoosters: kinDamage / fullKinDamage,
                damageMultiplier: kinDamage,
                withSys: kinDamage,
                bySys: 1,
                maxWithSys: kinDamage * maxSysDamage,
            },
            thermal: {
                byGenerator: thermDamage,
                byBoosters: thermDamage / fullThermDamage,
                damageMultiplier: thermDamage,
                withSys: thermDamage,
                bySys: 1,
                maxWithSys: thermDamage * maxSysDamage,
            },
        };

        return metrics;
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
    getStrength(ship: Ship, modified: boolean): number {
        let metrics = this.getShieldMetrics(ship, modified);
        return metrics.shieldStrength / metrics.absolute.damageMultiplier;
    }

    /**
     * Calculate the explosive resistance of the shields for a ship; excluding
     * effects from pips to sys.
     * @param ship Ship to get the resistance for
     * @param modified True when modifications should be taken into account
     * @returns Explosive resistance
     */
    getExplosiveResistance(ship: Ship, modified: boolean): number {
        return 1 - this.getShieldMetrics(ship, modified).explosive.damageMultiplier;
    }

    /**
     * Calculate the shield strength against explosive attacks for a ship;
     * excluding effects from pips to sys. and strength by shield cell banks.
     * @param ship Ship to get the shield strength for
     * @param modified True when modifications should be taken into account
     * @returns Shield strength against explosive attacks
     */
    getExplosiveStrength(ship: Ship, modified: boolean): number {
        let metrics = this.getShieldMetrics(ship, modified);
        return metrics.shieldStrength / metrics.explosive.damageMultiplier;
    }

    /**
     * Calculate the kinetic resistance of the shields for a ship; excluding
     * effects from pips to sys.
     * @param ship Ship to get the resistance for
     * @param modified True when modifications should be taken into account
     * @returns Kinetic resistance
     */
    getKineticResistance(ship: Ship, modified: boolean) {
        return 1 - this.getShieldMetrics(ship, modified).kinetic.damageMultiplier;
    }

    /**
     * Calculate the shield strength against kinetic attacks for a ship;
     * excluding effects from pips to sys and strength by shield cell banks.
     * @param ship Ship to get the shield strength for
     * @param modified True when modifications should be taken into account
     * @returns Shield strength against kinetic attacks
     */
    getKineticStrength(ship: Ship, modified: boolean): number {
        let metrics = this.getShieldMetrics(ship, modified);
        return metrics.shieldStrength / metrics.kinetic.damageMultiplier;
    }

    /**
     * Calculate the thermal resistance of the shields for a ship; excluding
     * effects from pips to sys.
     * @param ship Ship to the resistance for
     * @param modified True when modifications should be taken into account
     * @returns Thermal resistance
     */
    getThermalResistance(ship: Ship, modified: boolean): number {
        return 1 - this.getShieldMetrics(ship, modified).thermal.damageMultiplier;
    }

    /**
     * Calculate the shield strength against thermal attacks for a ship;
     * excluding effects from pips to sys and strength by shield cell banks.
     * @param ship Ship to get the shield strength for
     * @param modified True when modifications should be taken into account
     * @returns Shield strength against thermal attacks
     */
    getThermalStrength(ship: Ship, modified: boolean): number {
        let metrics = this.getShieldMetrics(ship, modified);
        return metrics.shieldStrength / metrics.explosive.damageMultiplier;
    }

    /**
     * Get the recharge time from 50% to 100% for the shields of a given ship
     * not taking the effects of the power distributor into account.
     * @param ship Ship to get the recharge time for
     * @param modified True when modifications should be taken into account
     * @returns Recharge time from 50% to 100%
     */
    getRechargeTime(ship: Ship, modified: boolean): number {
        return this.getShieldMetrics(ship, modified).minRecharge;
    }

    /**
     * Get the time to recover for the shields of the given ship, i.e. how long
     * it takes shields to recover to 50% after they collapsed. Effects by the
     * power distributor are ignored in the calculations.
     * @param ship Ship to get the recover time for
     * @param modified True when modifications should be taken into account
     * @returns Time to recover to 50% after collapse
     */
    getRecoverTime(ship: Ship, modified: boolean): number {
        return this.getShieldMetrics(ship, modified).minRecover;
    }
}
