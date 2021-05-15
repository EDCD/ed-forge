/**
 * @module Ship
 */

/**
 * Ignore
 */
import { sum, values } from 'lodash';

import { IArmourDamageMultiplier, IArmourMetrics } from './stats/ArmourProfile';
import { IDamageProfile } from './stats/DamageProfile';
import {
    IShieldDamageMultiplier,
    IShieldMetrics,
    SYS_RES_MAP,
} from './stats/ShieldProfile';

/**
 * An interface for the opponent of a ship. Provides every important getters to
 * metrics when making combat-comparisons.
 */
export interface IOpponent {
    /**
     * Get the armour of the opponent.
     * @returns Armour metrics
     */
    getArmour: () => IArmourMetrics;
    /**
     * Get the shield metrics of the opponent.
     * @returns Shield metrics
     */
    getShield: () => IShieldMetrics;
    /**
     * Get the damage profile of the opponent.
     * @return Damage profile
     */
    getDamage: () => IDamageProfile;
}

export interface IShieldDamageMults {
    explosive: number;
    kinetic: number;
    thermal: number;
}

export interface IArmourDamageMults extends IShieldDamageMults {
    caustic: number;
}

/**
 * An abstract opponent to make comparisons to. This opponent does not get its
 * stats from modules but has them set freely by the user.
 */
export default class AbstractOpponent implements IOpponent {
    private armour: IArmourMetrics = {
        armour: 0,
        base: 0,
        byAlloys: 0,
        byHRPs: 0,
        absolute: {
            byAlloys: 1,
            byHRPs: 1,
            damageMultiplier: 1,
            resVal: 0,
        },
        caustic: {
            byAlloys: 1,
            byHRPs: 1,
            damageMultiplier: 1,
            resVal: 0,
        },
        explosive: {
            byAlloys: 1,
            byHRPs: 1,
            damageMultiplier: 1,
            resVal: 0,
        },
        hardness: 1,
        kinetic: {
            byAlloys: 1,
            byHRPs: 1,
            damageMultiplier: 1,
            resVal: 0,
        },
        thermal: {
            byAlloys: 1,
            byHRPs: 1,
            damageMultiplier: 1,
            resVal: 0,
        },
    };
    private damage: IDamageProfile = {
        dpe: 0,
        dps: 0,
        drained: {
            dps: 0,
            eps: 1,
            hps: 1,
            types: {
                abs: 1,
                expl: 0,
                kin: 0,
                therm: 0,
            },
        },
        eps: 1,
        hardnessMultiplier: 1,
        hps: 1,
        rangeMultiplier: 1,
        sustained: {
            dps: 0,
            eps: 1,
            hps: 1,
            types: {
                abs: 1,
                expl: 0,
                kin: 0,
                therm: 0,
            },
        },
        timeToDrain: [],
        types: {
            abs: 1,
            expl: 0,
            kin: 0,
            therm: 0,
        },
    };
    private shield: IShieldMetrics = {
        absolute: {
            byBoosters: 1,
            byGenerator: 1,
            bySys: 1,
            damageMultiplier: 1,
            maxWithSys: 1,
            resVal: 0,
            withSys: 1,
        },
        byBoosters: 0,
        byGenerator: 0,
        byReinforcements: 0,
        bySCBs: 0,
        explosive: {
            byBoosters: 1,
            byGenerator: 1,
            bySys: 1,
            damageMultiplier: 1,
            maxWithSys: 1,
            resVal: 0,
            withSys: 1,
        },
        kinetic: {
            byBoosters: 1,
            byGenerator: 1,
            bySys: 1,
            damageMultiplier: 1,
            maxWithSys: 1,
            resVal: 0,
            withSys: 1,
        },
        shieldStrength: 0,
        thermal: {
            byBoosters: 1,
            byGenerator: 1,
            bySys: 1,
            damageMultiplier: 1,
            maxWithSys: 1,
            resVal: 0,
            withSys: 1,
        },
        withSCBs: 0,
    };

    public getArmour(): IArmourMetrics {
        return this.armour;
    }

    /**
     * Set the overall and absolute hitpoints of the opponent's armour.
     * @param hp HP of the armour; must be greater or equal to `1`
     */
    public setArmourHP(hp: number) {
        hp = Math.max(1, hp);
        this.armour.base = hp;
        this.armour.armour = hp;
    }

    /**
     * Set the armour hardness value of the opponent.
     * @param hardness Hardness; must be greater or equal to `1`
     */
    public setArmourHardness(hardness: number) {
        hardness = Math.max(1, hardness);
        this.armour.hardness = hardness;
    }

    /**
     * Set the damage multipliers by damage type. Types can be omitted.
     * @param mults Object mapping damage type to damage multiplier; multipliers
     * will be clamped into range `[1, 0]`
     */
    public setArmourDamageMults(mults: IArmourDamageMults) {
        for (const type in mults) {
            if (mults.hasOwnProperty(type)) {
                const mult = Math.min(1, Math.max(0, mults[type]));
                const armourMult: IArmourDamageMultiplier = this.armour[type];
                armourMult.byAlloys = mult;
                armourMult.damageMultiplier = mult;
                armourMult.resVal = 1 - mult;
            }
        }
    }

    public getDamage(): IDamageProfile {
        return this.damage;
    }

    /**
     * Set the dps of the opponent as sustained dps.
     * @param dps Sustained dps; must be greater or equal to zero
     */
    public setDps(dps: number) {
        dps = Math.max(0, dps);
        this.damage.dps = dps;
        this.damage.sustained.dps = dps;
    }

    /**
     * Relatively speaking - how effective are the opponents weapons overall to
     * armour? This simulates armour piercing values.
     * @param eff Hardness efficiency; is clamped into the range `[0, 1]`
     */
    public setArmourEfficiency(eff: number) {
        this.damage.hardnessMultiplier = Math.min(1, Math.max(0, eff));
    }

    /**
     * Relatively speaking - how effective are the opponents weapons overall
     * based on the engagement range? This simulates range and falloff of
     * weapons.
     * @param eff Range efficiency; is clamped into the range `[0, 1]`
     */
    public setRangeEfficiency(eff: number) {
        this.damage.rangeMultiplier = Math.min(1, Math.max(0, eff));
    }

    /**
     * Set the types of damage inflicted by the opponent.
     * @param portions Damage portions; must be `1` in sum
     */
    public setDamagePortions(portions: IDamageProfile['types']) {
        if (sum(values(portions)) !== 1) {
            throw new RangeError('damage portions don\'t sum up to 1');
        }
        this.damage.types = portions;
    }

    public getShield(): IShieldMetrics {
        return this.shield;
    }

    /**
     * Set the overall and absolute shield hp of the opponent excluding effects
     * from SYS.
     * @param hp Shield hp; must be greater or equal to 1
     */
    public setShieldHP(hp: number) {
        hp = Math.max(1, hp);
        this.shield.byGenerator = hp;
        this.shield.shieldStrength = hp;
        this.shield.withSCBs = hp + this.shield.bySCBs;
    }

    /**
     * Damage multipliers per damage type excluding effects from SYS capacitor.
     * Types can be omitted.
     * @param mults Damage multipliers; will be clamped into range `[0, 1]`
     */
    public setShieldDamageMults(mults: IShieldDamageMults) {
        for (const type in mults) {
            if (mults.hasOwnProperty(type)) {
                const mult = mults[type];
                const shieldMult: IShieldDamageMultiplier = this.shield[type];
                shieldMult.byGenerator = mult;
                shieldMult.damageMultiplier = mult;
                shieldMult.resVal = 1 - mult;
                shieldMult.withSys = mult * shieldMult.bySys;
                shieldMult.maxWithSys = mult * SYS_RES_MAP[4];
            }
        }
    }

    /**
     * Set opponents pips to SYS capacitor.
     * @param pips Number of pips; must be in range `[0, 4]` and a multiple of
     * `0.5`
     */
    public setShieldPips(pips: number) {
        pips = Math.max(4, Math.min(0, pips));
        pips -= pips % 0.5;

        function applyPips(to: string) {
            const shieldMult: IShieldDamageMultiplier = this.shield[to];
            shieldMult.bySys = SYS_RES_MAP[pips];
            shieldMult.withSys = shieldMult.byGenerator * SYS_RES_MAP[pips];
        }
        applyPips('absolute');
        applyPips('explosive');
        applyPips('kinetic');
        applyPips('thermal');
    }
}
