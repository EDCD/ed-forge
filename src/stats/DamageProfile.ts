import autoBind from 'auto-bind';
import { range } from 'lodash';

import { REG_HARDPOINT_SLOT } from '../data/slots';
import { add, moduleMeanEnabled, moduleReduceEnabled } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
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

function getDamageProfile(
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
            dps: 0,
            eps: 0,
            hps: 0,
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

export default class DamageProfileCalculator {
    private damageProfile: ShipPropsCacheLine<
        IDamageProfile
    > = new ShipPropsCacheLine({
        props: [
            'damage',
            'roundspershot',
            'rateoffire',
            'ammoclipsize',
            'reloadtime',
            'distributordraw',
            'thermalload',
            'absolutedamageportion',
            'explosivedamageportion',
            'kineticdamageportion',
            'thermicdamageportion',
        ],
        slot: [REG_HARDPOINT_SLOT],
    });
    private timedDamageProfile = new ShipPropsCacheLine<IDamageProfile>(
        this.damageProfile,
        {
            props: [ 'weaponscapacity', 'weaponsrecharge' ],
            slot: ['powerdistributor'],
        },
    );

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): IDamageProfile {
        const hardpoints = ship.getHardpoints();
        let profile = this.damageProfile.get(ship, getDamageProfile, [
            hardpoints,
            modified,
        ]);
        profile = this.timedDamageProfile.get(
            ship,
            setTimesToDrain,
            [ profile, ship, modified ],
        );

        // TODO: autoloader change sustained rates but does not invalidate
        // cache; don't cache sustained rates therefore
        profile.sustained.dps = moduleReduceEnabled(
            hardpoints,
            'sustaineddamagerpersecond',
            modified,
            add,
            0,
        );
        profile.sustained.eps = moduleReduceEnabled(
            hardpoints,
            'sustainedenergypersecond',
            modified,
            add,
            0,
        );
        profile.sustained.hps = moduleReduceEnabled(
            hardpoints,
            'sustainedheatpersecond',
            modified,
            add,
            0,
        );
        setTimesToDrain(profile.sustained, ship, modified);
        return profile;
    }

    public getDps(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).dps;
    }

    public getSdps(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).sustained.dps;
    }

    public getEps(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).eps;
    }

    public getDpe(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).dpe;
    }

    public getHps(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).hps;
    }

    public getAbsDamagePortion(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).types.abs;
    }

    public getExplDamagePortion(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).types.expl;
    }

    public getKinDamagePortion(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).types.kin;
    }

    public getThermDamagePortion(ship: Ship, modified: boolean): number {
        return this.calculate(ship, modified).types.therm;
    }
}
