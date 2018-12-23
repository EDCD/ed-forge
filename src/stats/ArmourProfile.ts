/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from "..";
import { diminishingDamageMultiplier } from "../helper";
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";

/**
 * Damage multipliers for a given resistance type.
 */
export interface ArmourDamageMultiplier {
    /** Damage multiplier just by alloys */
    byAlloys: number;
    /** Damage multiplier by HRPs */
    byHRPs: number;
    /** Overall damage multiplier; including diminishing returns */
    damageMultiplier: number;
}

/**
 * Armour metrics of a ship.
 */
export interface ArmourMetrics {
    /** Base armour of the ship */
    base: number;
    /** Additional armour provided by alloys */
    byAlloys: number;
    /** Additional armour provided by hull reinforcement */
    byHRPs: number;
    /** Total armour of the ship */
    armour: number;
    /** Damage multipliers against explosive attacks */
    explosive: ArmourDamageMultiplier;
    /** Damage multipliers against kinetic attacks */
    kinetic: ArmourDamageMultiplier;
    /** Damage multipliers against thermal attacks */
    thermal: ArmourDamageMultiplier;
    /** Damage multipliers against caustic attacks */
    caustic: ArmourDamageMultiplier;
}

/**
 * Apply diminishing returns to a resistance for armour
 * @param res Resistance to apply diminishing returns to
 * @returns Resistance with applied effects
 */
function diminishingArmourRes(res: number): number {
    return diminishingDamageMultiplier(0.7, res);
}

function getArmourMetrics(ship: Ship, modified: boolean): ArmourMetrics {
    let alloys = ship.getAlloys();

    let baseArmour = ship.getBaseProperty('basearmour');
    let hullBoost = alloys.get('hullboost', modified);
    let explDamage = 1 - alloys.get('explres', modified);
    let kinDamage = 1 - alloys.get('kinres', modified);
    let thermDamage = 1 - alloys.get('thermres', modified);
    let causDamage = 1 - alloys.get('causres', modified);
    let hrpReinforcement = 0;
    let hrpExplDamage = 1;
    let hrpKinDamage = 1;
    let hrpThermDamage = 1;
    let hrpCausDamage = 1;
    // By calling .isEnabled we filter out guardian HRPs being turned off
    ship.getHRPs().filter(m => m.isEnabled()).forEach(m => {
        hrpReinforcement += m.get('hullreinforcement', modified);
        hrpExplDamage *= 1 - m.get('explres', modified);
        hrpKinDamage *= 1 - m.get('kinres', modified);
        hrpThermDamage *= 1 - m.get('thermres', modified);
        hrpCausDamage *= 1 - m.get('causres', modified);
    });

    let boostedArmour = baseArmour * (1 + hullBoost);
    return {
        base: baseArmour,
        byAlloys: boostedArmour,
        byHRPs: hrpReinforcement,
        armour: boostedArmour + hrpReinforcement,
        explosive: {
            byAlloys: explDamage,
            byHRPs: hrpExplDamage,
            damageMultiplier: diminishingArmourRes(explDamage * hrpExplDamage),
        },
        kinetic: {
            byAlloys: kinDamage,
            byHRPs: hrpKinDamage,
            damageMultiplier: diminishingArmourRes(kinDamage * hrpKinDamage),
        },
        thermal: {
            byAlloys: thermDamage,
            byHRPs: hrpThermDamage,
            damageMultiplier: diminishingArmourRes(thermDamage * hrpThermDamage),
        },
        caustic: {
            byAlloys: causDamage,
            byHRPs: hrpCausDamage,
            damageMultiplier: diminishingArmourRes(causDamage * hrpCausDamage),
        },
    };
}

export default class ArmourProfile {
    private _armourMetrics : ShipPropsCacheLine<ArmourMetrics>;

    constructor() {
        this._armourMetrics = new ShipPropsCacheLine<ArmourMetrics>({
            type: [ /Armour/i, /HullReinforcement/i ],
            props: [ 'hullboost', 'explres', 'kinres', 'thermres', 'causres', 'hullreinforcement' ],
        });
    }

    /**
     * Prepare arguments for the armour metrics and calculate them using a
     * cache.
     * @param ship Ship to get metrics for
     * @param modified True when modifications should be taken into account
     * @returns Armour metrics of the ship
     */
    getArmourMetrics(ship: Ship, modified: boolean): ArmourMetrics {
        return this._armourMetrics.get(
            ship,
            getArmourMetrics,
            [ ship, modified ]
        );
    }

    /**
     * Get the total armour of the ship.
     * @param ship Ship to get the armour for
     * @param modified True if modifications should be taken into account
     * @returns Total armour of the ship
     */
    getArmour(ship: Ship, modified: boolean): number {
        return this.getArmourMetrics(ship, modified).armour;
    }

    /**
     * Get the total explosive resistance of the ship.
     * @param ship Ship to get the explosive resistance for
     * @param modified True if modifications should be taken into account
     * @returns Total explosive resistance of the ship
     */
    getExplosiveResistance(ship: Ship, modified: boolean): number {
        return 1 - this.getArmourMetrics(ship, modified).explosive.damageMultiplier;
    }

    /**
     * Get the total armour against explosive attacks of the ship.
     * @param ship Ship to get the armour for
     * @param modified True if modifications should be taken into account
     * @returns Total armour against explosive attacks of the ship
     */
    getExplosiveArmour(ship: Ship, modified: boolean): number {
        let metrics = this.getArmourMetrics(ship, modified);
        return metrics.armour / metrics.explosive.damageMultiplier;
    }

    /**
     * Get the total kinetic resistance of the ship.
     * @param ship Ship to get the kinetic resistance for
     * @param modified True if modifications should be taken into account
     * @returns Total kinetic resistance of the ship
     */
    getKineticResistance(ship: Ship, modified: boolean): number {
        return 1 - this.getArmourMetrics(ship, modified).kinetic.damageMultiplier;
    }

    /**
     * Get the total armour against kinetic attacks of the ship.
     * @param ship Ship to get the armour for
     * @param modified True if modifications should be taken into account
     * @returns Total armour against kinetic attacks of the ship
     */
    getKineticArmour(ship: Ship, modified: boolean): number {
        let metrics = this.getArmourMetrics(ship, modified);
        return metrics.armour / metrics.kinetic.damageMultiplier;
    }

    /**
     * Get the total thermal resistance of the ship.
     * @param ship Ship to get the thermal resistance for
     * @param modified True if modifications should be taken into account
     * @returns Total thermal resistance of the ship
     */
    getThermalResistance(ship: Ship, modified: boolean): number {
        return 1 - this.getArmourMetrics(ship, modified).thermal.damageMultiplier;
    }

    /**
     * Get the total armour against thermal attacks of the ship.
     * @param ship Ship to get the armour for
     * @param modified True if modifications should be taken into account
     * @returns Total armour against thermal attacks of the ship
     */
    getThermalArmour(ship: Ship, modified: boolean): number {
        let metrics = this.getArmourMetrics(ship, modified);
        return metrics.armour / metrics.thermal.damageMultiplier;
    }

    /**
     * Get the total caustic resistance of the ship.
     * @param ship Ship to get the caustic resistance for
     * @param modified True if modifications should be taken into account
     * @returns Total caustic resistance of the ship
     */
    getCausticResistance(ship: Ship, modified: boolean): number {
        return 1 - this.getArmourMetrics(ship, modified).caustic.damageMultiplier;
    }

    /**
     * Get the total armour against caustic attacks of the ship.
     * @param ship Ship to get the armour for
     * @param modified True if modifications should be taken into account
     * @returns Total armour against caustic attacks of the ship
     */
    getCausticArmour(ship: Ship, modified: boolean): number {
        let metrics = this.getArmourMetrics(ship, modified);
        return metrics.armour / metrics.caustic.damageMultiplier;
    }
}
