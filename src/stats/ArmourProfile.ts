/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import {
    add,
    complMult,
    diminishingDamageMultiplier,
    moduleReduceEnabled,
} from '../helper';

/**
 * Damage multipliers for a given resistance type.
 */
export interface IArmourDamageMultiplier {
    /** Damage multiplier just by alloys */
    byAlloys: number;
    /** Damage multiplier by HRPs */
    byHRPs: number;
    /** Overall damage multiplier; including diminishing returns */
    damageMultiplier: number;
    /** Overall resistance value; including diminishing returns */
    resVal: number;
}

/**
 * Armour metrics of a ship.
 */
export interface IArmourMetrics {
    /** Base armour of the ship */
    base: number;
    /** Additional armour provided by alloys */
    byAlloys: number;
    /** Additional armour provided by hull reinforcement */
    byHRPs: number;
    /** Total armour of the ship */
    armour: number;
    /** Damage multipliers against explosive attacks */
    explosive: IArmourDamageMultiplier;
    /** Damage multipliers against kinetic attacks */
    kinetic: IArmourDamageMultiplier;
    /** Damage multipliers against thermal attacks */
    thermal: IArmourDamageMultiplier;
    /** Damage multipliers against caustic attacks */
    caustic: IArmourDamageMultiplier;
}

/**
 * Apply diminishing returns to a resistance for armour
 * @param res Resistance to apply diminishing returns to
 * @returns Resistance with applied effects
 */
function diminishingArmourRes(res: number): number {
    return diminishingDamageMultiplier(0.7, res);
}

export function getArmourMetrics(
    ship: Ship,
    modified: boolean
): IArmourMetrics {
    const alloys = ship.getAlloys();

    const baseArmour = ship.getBaseProperty('basearmour');
    const hullBoost = alloys.getClean(
        'defencemodifierhealthmultiplier',
        modified,
    );
    const explDamage = alloys.get('explosiveeffectiveness', modified);
    const kinDamage = alloys.get('kineticeffectiveness', modified);
    const thermDamage = alloys.get('thermiceffectiveness', modified);
    const causDamage = alloys.get('causticeffectiveness', modified);

    const hrps = ship.getHRPs();
    const hrpReinforcement = moduleReduceEnabled(
        hrps,
        'defencemodifierhealthaddition',
        modified,
        add,
        0,
    );
    const hrpExplDamage = moduleReduceEnabled(
        hrps,
        'explosiveeffectiveness',
        modified,
        complMult,
        1,
    );
    const hrpKinDamage = moduleReduceEnabled(
        hrps,
        'kineticeffectiveness',
        modified,
        complMult,
        1,
    );
    const hrpThermDamage = moduleReduceEnabled(
        hrps,
        'thermiceffectiveness',
        modified,
        complMult,
        1,
    );
    const hrpCausDamage = moduleReduceEnabled(
        hrps,
        'causticeffectiveness',
        modified,
        complMult,
        1,
    );

    const boostedArmour = baseArmour * (1 + hullBoost);
    return {
        armour: boostedArmour + hrpReinforcement,
        base: baseArmour,
        byAlloys: boostedArmour,
        byHRPs: hrpReinforcement,
        caustic: {
            byAlloys: causDamage,
            byHRPs: hrpCausDamage,
            damageMultiplier: diminishingArmourRes(causDamage * hrpCausDamage),
            resVal: 1 - diminishingArmourRes(causDamage * hrpCausDamage),
        },
        explosive: {
            byAlloys: explDamage,
            byHRPs: hrpExplDamage,
            damageMultiplier: diminishingArmourRes(explDamage * hrpExplDamage),
            resVal: 1 - diminishingArmourRes(explDamage * hrpExplDamage),
        },
        kinetic: {
            byAlloys: kinDamage,
            byHRPs: hrpKinDamage,
            damageMultiplier: diminishingArmourRes(kinDamage * hrpKinDamage),
            resVal: 1 - diminishingArmourRes(kinDamage * hrpKinDamage),
        },
        thermal: {
            byAlloys: thermDamage,
            byHRPs: hrpThermDamage,
            damageMultiplier: diminishingArmourRes(
                thermDamage * hrpThermDamage,
            ),
            resVal: 1 - diminishingArmourRes(thermDamage * hrpThermDamage),
        },
    };
}

/**
 * Get the total armour of the ship.
 * @param ship Ship to get the armour for
 * @param modified True if modifications should be taken into account
 * @returns Total armour of the ship
 */
export function getArmour(ship: Ship, modified: boolean): number {
    return getArmourMetrics(ship, modified).armour;
}

/**
 * Get the total explosive resistance of the ship.
 * @param ship Ship to get the explosive resistance for
 * @param modified True if modifications should be taken into account
 * @returns Total explosive resistance of the ship
 */
export function getExplosiveResistance(ship: Ship, modified: boolean): number {
    return (
        1 - getArmourMetrics(ship, modified).explosive.damageMultiplier
    );
}

/**
 * Get the total armour against explosive attacks of the ship.
 * @param ship Ship to get the armour for
 * @param modified True if modifications should be taken into account
 * @returns Total armour against explosive attacks of the ship
 */
export function getExplosiveArmour(ship: Ship, modified: boolean): number {
    const metrics = getArmourMetrics(ship, modified);
    return metrics.armour / metrics.explosive.damageMultiplier;
}

/**
 * Get the total kinetic resistance of the ship.
 * @param ship Ship to get the kinetic resistance for
 * @param modified True if modifications should be taken into account
 * @returns Total kinetic resistance of the ship
 */
export function getKineticResistance(ship: Ship, modified: boolean): number {
    return (
        1 - getArmourMetrics(ship, modified).kinetic.damageMultiplier
    );
}

/**
 * Get the total armour against kinetic attacks of the ship.
 * @param ship Ship to get the armour for
 * @param modified True if modifications should be taken into account
 * @returns Total armour against kinetic attacks of the ship
 */
export function getKineticArmour(ship: Ship, modified: boolean): number {
    const metrics = getArmourMetrics(ship, modified);
    return metrics.armour / metrics.kinetic.damageMultiplier;
}

/**
 * Get the total thermal resistance of the ship.
 * @param ship Ship to get the thermal resistance for
 * @param modified True if modifications should be taken into account
 * @returns Total thermal resistance of the ship
 */
export function getThermalResistance(ship: Ship, modified: boolean): number {
    return (
        1 - getArmourMetrics(ship, modified).thermal.damageMultiplier
    );
}

/**
 * Get the total armour against thermal attacks of the ship.
 * @param ship Ship to get the armour for
 * @param modified True if modifications should be taken into account
 * @returns Total armour against thermal attacks of the ship
 */
export function getThermalArmour(ship: Ship, modified: boolean): number {
    const metrics = getArmourMetrics(ship, modified);
    return metrics.armour / metrics.thermal.damageMultiplier;
}

/**
 * Get the total caustic resistance of the ship.
 * @param ship Ship to get the caustic resistance for
 * @param modified True if modifications should be taken into account
 * @returns Total caustic resistance of the ship
 */
export function getCausticResistance(ship: Ship, modified: boolean): number {
    return (
        1 - getArmourMetrics(ship, modified).caustic.damageMultiplier
    );
}

/**
 * Get the total armour against caustic attacks of the ship.
 * @param ship Ship to get the armour for
 * @param modified True if modifications should be taken into account
 * @returns Total armour against caustic attacks of the ship
 */
export function getCausticArmour(ship: Ship, modified: boolean): number {
    const metrics = getArmourMetrics(ship, modified);
    return metrics.armour / metrics.caustic.damageMultiplier;
}
