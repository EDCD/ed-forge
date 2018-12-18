/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from "..";

export interface ModuleProtectionMetrics {
    moduleArmour: number;
    moduleProtection: number;
}

export default class ModuleProtectionProfile {
    /**
     * Get the module protection metrics for the given ship
     * @param ship Ship to get the metrics for
     * @param modified True when modifications should be taken into account
     * @returns Module protection metrics
     */
    getModuleProtectionMetrics(ship: Ship, modified: boolean): ModuleProtectionMetrics {
        let moduleArmour = 0;
        let moduleProtection = 1;
        // By calling .isEnabled we filter out guardian MRPs being turned off
        ship.getMRPs().filter(m => m.isEnabled()).forEach(m => {
            moduleArmour += m.get('integrity', modified);
            moduleProtection *= 1 - m.get('protection', modified);
        });

        return { moduleArmour, moduleProtection };
    }

    /**
     * Get the module protection value for the given ship, i.e. the damage
     * reduction factor gained from all MRPs on the ship.
     * @param ship Ship to get module protection for
     * @param modified True when modifications should be taken into account
     * @returns Module protection value
     */
    getModuleProtection(ship: Ship, modified: boolean): number {
        return this.getModuleProtectionMetrics(ship, modified).moduleProtection;
    }

    /**
     * Get the module armour for the given ship, i.e. the amount of damage that
     * the MRPs provide for the modules.
     * @param ship Ship to get the module armour for
     * @param modified True when modifications should be taken into account
     * @return Module armour value
     */
    getModuleArmour(ship: Ship, modified: boolean): number {
        return this.getModuleProtectionMetrics(ship, modified).moduleArmour;
    }
}
