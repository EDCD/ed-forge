/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { Ship } from "..";
import ShipPropsCacheLine from "../helper/ShipPropsCacheLine";

export interface ModuleProtectionMetrics {
    moduleArmour: number;
    moduleProtection: number;
}

/**
 * Calculate module protection metrics for the given ship.
 * @param ship Ship to get the metrics for
 * @param modified True when modifications should be taken into account
 * @returns Module protection metrics
 */
function getModuleProtectionMetrics(ship: Ship, modified: boolean): ModuleProtectionMetrics {
    let moduleArmour = 0;
    let moduleProtection = 1;
    // By calling .isEnabled we filter out guardian MRPs being turned off
    ship.getMRPs().filter(m => m.isEnabled()).forEach(m => {
        moduleArmour += m.get('integrity', modified);
        moduleProtection *= 1 - m.get('protection', modified);
    });

    return { moduleArmour, moduleProtection };
}

export default class ModuleProtectionProfile {
    private _protectionMetrics: ShipPropsCacheLine<ModuleProtectionMetrics>;

    constructor() {
        this._protectionMetrics = new ShipPropsCacheLine<ModuleProtectionMetrics>({
            type: [ /ModuleReinforcement/i, ],
            props: [ 'integrity', 'protection', ],
        });
    }

    /**
     * Get the module protection metrics for the given ship
     * @param ship Ship to get the metrics for
     * @param modified True when modifications should be taken into account
     * @returns Module protection metrics
     */
    getMetrics(ship: Ship, modified: boolean): ModuleProtectionMetrics {
        return this._protectionMetrics.get(
            ship,
            getModuleProtectionMetrics,
            [ ship, modified ]
        );
    }

    /**
     * Get the module protection value for the given ship, i.e. the damage
     * reduction factor gained from all MRPs on the ship.
     * @param ship Ship to get module protection for
     * @param modified True when modifications should be taken into account
     * @returns Module protection value
     */
    getModuleProtection(ship: Ship, modified: boolean): number {
        return this.getMetrics(ship, modified).moduleProtection;
    }

    /**
     * Get the module armour for the given ship, i.e. the amount of damage that
     * the MRPs provide for the modules.
     * @param ship Ship to get the module armour for
     * @param modified True when modifications should be taken into account
     * @return Module armour value
     */
    getModuleArmour(ship: Ship, modified: boolean): number {
        return this.getMetrics(ship, modified).moduleArmour;
    }
}
