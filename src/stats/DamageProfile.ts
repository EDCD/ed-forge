import autoBind from 'auto-bind';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';
import { REG_HARDPOINT_SLOT } from '../data/slots';
import Ship from '../Ship';
import { moduleReduceEnabled, add, moduleMeanEnabled } from '../helper';
import Module from '../Module';

/**
 * Damage profile for all weapons of a ship.
 */
export interface DamageProfile {
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
        /**Kinetic damage portion */
        kin: number;
        /** Thermal damage portion */
        therm: number;
    }
}

function getDamageProfile(hardpoints: Module[], modified: boolean): DamageProfile {
    return {
        dps: moduleReduceEnabled(hardpoints, 'damagepersecond', modified, add, 0),
        sdps: 0,
        eps: moduleReduceEnabled(hardpoints, 'energypersecond', modified, add, 0),
        dpe: moduleReduceEnabled(hardpoints, 'damageperenergy', modified, add, 0),
        hps: moduleReduceEnabled(hardpoints, 'heatpersecond', modified, add, 0),
        types: {
            abs: moduleMeanEnabled(hardpoints, 'absdamage', modified),
            expl: moduleMeanEnabled(hardpoints, 'expldamage', modified),
            kin: moduleMeanEnabled(hardpoints, 'kindamage', modified),
            therm: moduleMeanEnabled(hardpoints, 'thermdamage', modified),
        },
    };
}

export default class DamageProfileCalculator {
    private _damageProfile: ShipPropsCacheLine<DamageProfile> = new ShipPropsCacheLine({
        slot: [ REG_HARDPOINT_SLOT, ],
        props: [
            'damage', 'roundspershot', 'rof', 'clip', 'reload', 'distdraw',
            'thermload', 'absdamage', 'expldamage', 'kindamage', 'thermdamage',
        ],
    });

    constructor() {
        autoBind(this);
    }

    calculate(ship: Ship, modified: boolean): DamageProfile {
        let hardpoints = ship.getHardpoints();
        let profile = this._damageProfile.get(
            ship, getDamageProfile, [ hardpoints, modified, ]
        );
        // TODO: invalidate cache on experimental effect change and remove this line
        profile.sdps = moduleReduceEnabled(hardpoints, 'sustaineddamagerpersecond', modified, add, 0);
        return profile;
    }

    getDps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).dps;
    }

    getSdps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).sdps;
    }

    getEps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).eps;
    }

    getDpe(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).dpe;
    }

    getHps(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).hps;
    }

    getAbsDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.abs;
    }

    getExplDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.expl;
    }

    getKinDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.kin;
    }

    getThermDamagePortion(ship: Ship, modified: boolean) {
        return this.calculate(ship, modified).types.therm;
    }
}
