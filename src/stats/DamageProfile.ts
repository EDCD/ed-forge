import autoBind from 'auto-bind';

import { REG_HARDPOINT_SLOT } from '../data/slots';
import { add, moduleMeanEnabled, moduleReduceEnabled } from '../helper';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
import Module from '../Module';
import Ship from '../Ship';

/**
 * Damage profile for all weapons of a ship.
 */
export interface IDamageProfile {
    /** Damage per second */
    dps: number;
    /** Sustained damage per second */
    sdps: number;
    /** Energy per second */
    eps: number;
    /** Damage per energy */
    dpe: number;
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
        sdps: 0,
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

    constructor() {
        autoBind(this);
    }

    public calculate(ship: Ship, modified: boolean): IDamageProfile {
        const hardpoints = ship.getHardpoints();
        const profile = this.damageProfile.get(ship, getDamageProfile, [
            hardpoints,
            modified,
        ]);
        // TODO: invalidate cache on experimental effect change and remove this
        // line
        profile.sdps = moduleReduceEnabled(
            hardpoints,
            'sustaineddamagerpersecond',
            modified,
            add,
            0,
        );
        return profile;
    }

    public getDps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).dps;
    }

    public getSdps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).sdps;
    }

    public getEps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).eps;
    }

    public getDpe(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).dpe;
    }

    public getHps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).hps;
    }

    public getAbsDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.abs;
    }

    public getExplDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.expl;
    }

    public getKinDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.kin;
    }

    public getThermDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.therm;
    }
}
