/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from '..';
import { add, complMult, moduleReduceEnabled } from '../helper';

export interface IModuleProtectionMetrics {
    moduleArmour: number;
    moduleProtection: number;
}

/**
 * Calculate module protection metrics for the given ship.
 * @param ship Ship to get the metrics for
 * @param modified True when modifications should be taken into account
 * @returns Module protection metrics
 */
export function getModuleProtectionMetrics(
    ship: Ship,
    modified: boolean,
): IModuleProtectionMetrics {
    const mrps = ship.getMRPs();
    // By checking.enabled we filter out guardian MRPs being turned off
    const moduleArmour = moduleReduceEnabled(
        mrps,
        'integrity',
        modified,
        add,
        0,
    );
    const moduleProtection = moduleReduceEnabled(
        mrps,
        'protection',
        modified,
        complMult,
        1,
    );

    return { moduleArmour, moduleProtection };
}

/**
 * Get the module protection value for the given ship, i.e. the damage
 * reduction factor gained from all MRPs on the ship.
 * @param ship Ship to get module protection for
 * @param modified True when modifications should be taken into account
 * @returns Module protection value
 */
export function getModuleProtection(ship: Ship, modified: boolean): number {
    return getModuleProtectionMetrics(ship, modified).moduleProtection;
}

/**
 * Get the module armour for the given ship, i.e. the amount of damage that
 * the MRPs provide for the modules.
 * @param ship Ship to get the module armour for
 * @param modified True when modifications should be taken into account
 * @return Module armour value
 */
export function getModuleArmour(ship: Ship, modified: boolean): number {
    return getModuleProtectionMetrics(ship, modified).moduleArmour;
}
