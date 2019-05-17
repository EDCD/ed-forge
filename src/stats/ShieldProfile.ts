/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { Ship, Module } from "..";
import { scaleMul, diminishingDamageMultiplier } from "../helper";
import { clone, assign } from 'lodash';
import { EFFECTIVE_SYS_RATE } from "../module-stats";
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";
import { moduleReduceEnabled, add, complMult } from '../helper';

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

function getBaseShieldStrength(shieldGenerator: Module, ship: Ship, modified: boolean) {
    return ship.getBaseProperty('baseshieldstrength') * scaleMul(
        shieldGenerator.get('shieldgenminstrength', modified),
        shieldGenerator.get('shieldgenstrength', modified),
        shieldGenerator.get('shieldgenmaxstrength', modified),
        shieldGenerator.get('shieldgenminimalmass', modified),
        shieldGenerator.get('shieldgenoptimalmass', modified),
        shieldGenerator.get('shieldgenmaximalmass', modified),
        ship.getBaseProperty('hullmass')
    );
}

function getShieldAddition(ship: Ship, modified: boolean): number {
    return moduleReduceEnabled(ship._object.Modules, 'shieldaddition', modified, add, 0);
}

function getShieldMetrics(
    shieldGenerator: Module, baseShieldStrength: number, shieldAddition: number,
    ship: Ship, modified: boolean
): ShieldMetrics {
    let explDamage = 1 - shieldGenerator.get('explosiveresistance', modified);
    let kinDamage = 1 - shieldGenerator.get('kineticresistance', modified);
    let thermDamage = 1 - shieldGenerator.get('thermicresistance', modified);

    let sbs = ship.getShieldBoosters();
    let boost = moduleReduceEnabled(sbs, 'defencemodifiershieldmultiplier', modified, add, 0);
    let boosterExplDamage = moduleReduceEnabled(sbs, 'explosiveresistance', modified, complMult, 1);
    let boosterKinDamage = moduleReduceEnabled(sbs, 'kineticresistance', modified, complMult, 1);
    let boosterThermDamage = moduleReduceEnabled(sbs, 'thermicresistance', modified, complMult, 1);

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
        shieldStrength,
        bySCBs: 0,
        withSCBs: shieldStrength,
        absolute: {
            byGenerator: 1,
            byBoosters: 1,
            damageMultiplier: 1,
            bySys: 1,
            withSys: 1,
            maxWithSys: maxSysDamage,
        },
        explosive: {
            byGenerator: explDamage,
            byBoosters: fullExplDamage / explDamage,
            damageMultiplier: fullExplDamage,
            bySys: 1,
            withSys: fullExplDamage,
            maxWithSys: fullExplDamage * maxSysDamage,
        },
        kinetic: {
            byGenerator: kinDamage,
            byBoosters: fullKinDamage / kinDamage,
            damageMultiplier: fullKinDamage,
            bySys: 1,
            withSys: fullKinDamage,
            maxWithSys: fullKinDamage * maxSysDamage,
        },
        thermal: {
            byGenerator: thermDamage,
            byBoosters: fullThermDamage / thermDamage,
            damageMultiplier: fullThermDamage,
            bySys: 1,
            withSys: fullThermDamage,
            maxWithSys: fullThermDamage * maxSysDamage,
        },
    };

    return metrics;
}

function getSCBAddition(ship: Ship, modified: boolean): number {
    // TODO: move into module property and map to that
    let bySCBs = ship.getSCBs().reduce(
        (reduced, m) => reduced + m.get('shieldbankreinforcement', modified)
            * m.get('duration', modified)
            * (m.get('ammomaximum', modified) + m.get('ammoclipsize', modified)),
        0
    );

    return bySCBs;
}

interface RechargeMetrics {
    recover: number | undefined;
    minRecover: number | undefined;
    recharge: number | undefined;
    minRecharge: number | undefined;
}

function getRechargeMetrics(
    shieldStrength: number, shieldGenerator: Module, powerDistributor: Module,
    modified: boolean
): RechargeMetrics {
    let distributorDraw = shieldGenerator.get('energyperregen', modified);
    let distributorCap = powerDistributor.get('systemscapacity', modified);
    let distributorRecharge = powerDistributor.get(EFFECTIVE_SYS_RATE, modified);
    let distributorEnabled = powerDistributor.isEnabled();

    let { recharge, minRecharge } = getRechargeTime(
        shieldStrength / 2, shieldGenerator.get('regenrate', modified),
        distributorDraw, distributorCap, distributorRecharge, distributorEnabled
    );
    let recoverTimes = getRechargeTime(
        shieldStrength / 2, shieldGenerator.get('brokenregenrate', modified),
        distributorDraw, distributorCap, distributorRecharge, distributorEnabled
    );

    return {
        recharge, minRecharge,
        recover: recoverTimes.recharge,
        minRecover: recoverTimes.minRecharge
    };
}

export default class ShieldProfile {
    private _shieldStrength: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        type: [ /ShieldGenerator/i ],
        props: [ 'shieldgenminstrength', 'shieldgenstrength', 'shieldgenmaxstrength', 'shieldgenminimalmass', 'shieldgenoptimalmass', 'shieldgenmaximalmass' ],
    });
    private _shieldAddition: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        type: [ /GuardianShieldReinforcement/i, ],
        props: [ 'shieldaddition' ],
    });
    private _shieldMetrics: ShipPropsCacheLine<ShieldMetrics> = new ShipPropsCacheLine(
        this._shieldStrength, {
            type: [ /ShieldGenerator/i, /ShieldBooster/i, ],
            props: [ 'explosiveresistance', 'kineticresistance', 'thermicresistance', 'defencemodifiershieldmultiplier' ],
        }
    );
    private _scbAddition: ShipPropsCacheLine<number> = new ShipPropsCacheLine({
        type: [ /ShieldCellBank/i, ],
        props: [ 'ammomaximum', 'ammoclipsize', 'duration', 'shieldbankreinforcement', ],
    });
    private _rechargeMetrics: ShipPropsCacheLine<RechargeMetrics> = new ShipPropsCacheLine(
        this._shieldMetrics, {
            type: [ /ShieldGenerator/i ],
            props: [ 'regenrate', 'brokenregenrate' ],
        }, {
            type: [ /PowerDistributor/i ],
            props: [ 'systemscapacity', 'systemsrecharge' ],
        }
    );

    constructor() {
        autoBind(this);
    }

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

        let baseShieldStrength = this._shieldStrength.get(
            ship,
            getBaseShieldStrength,
            [ shieldGenerator, ship, modified ]
        );

        let shieldAddition = this._shieldAddition.get(
            ship,
            getShieldAddition,
            [ ship, modified ]
        );

        let metrics = this._shieldMetrics.get(
            ship,
            getShieldMetrics,
            [ shieldGenerator, baseShieldStrength, shieldAddition, ship, modified ],
        );

        let scbAddition = this._scbAddition.get(
            ship,
            getSCBAddition,
            [ ship, modified ]
        );

        metrics.bySCBs = scbAddition;
        metrics.withSCBs = metrics.shieldStrength + scbAddition;

        let powerDistributor = ship.getPowerDistributor();
        let rechargeMetrics = this._rechargeMetrics.get(
            ship,
            getRechargeMetrics,
            [ metrics.shieldStrength, shieldGenerator, powerDistributor, modified ]
        );
        assign(metrics, rechargeMetrics);
4
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

        return metrics as ShieldMetricsWithRecharge;
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
