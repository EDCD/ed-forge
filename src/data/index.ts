
import Ship from '../Ship';
import Module, { BlueprintObject } from '../Module';
import { getModuleInfo } from './items';
import { getShipInfo } from './ships';
import { UnknownRestrictedError } from '../errors';

import * as MODULE_CACHE from './module_cache.json';


/**
 * Fetches a module ID from the cache.
 * @param type The type of the module to fetch
 * @param clazz Class of the module to fetch
 * @param rating Rating of the module to fetch.
 * @returns Item ID
 */
function readModuleCache(type: string, clazz: string = '', rating: string = ''): string {
    let cache = MODULE_CACHE[type];
    if (cache) {
        return cache[clazz][rating];
    }
}

/**
 * Factory to create basic ships and modules.
 */
class Factory {
    /**
     * Returns the item id of the given module via group, class and rating.
     * Class and rating for the most part match what is shown in-game but there
     * are some caveats. Bulkheads have the corresponding ship type as a class.
     * Some modules have no class and/or rating because there is only a single
     * one available for that group.
     * Details can be looked up in the `module_cache.json` file.
     * @param group Type of the module
     * @param clazz Class of the module
     * @param rating Rating of the module
     * @returns Item ID
     */
    static getModuleId(group: string, clazz: string = '', rating: string = ''): string {
        group = group.toLowerCase();
        clazz = clazz.toLowerCase();
        rating = rating.toLowerCase();
        let item = readModuleCache(group, clazz, rating);
        if (!item) {
            throw new UnknownRestrictedError(`Don't know module type ${group}`);
        }
        return item;
    }

    /**
     * Creates a new loadout-event-style module.
     * @param type Type of the module; either as a group as for
     * [[Factory.getModuleId]] or as a valid item id.
     * @param clazz Class of the module
     * @param rating Rating of the module
     * @return Module
     */
    static newModule(type: string, clazz: string = '', rating: string = ''): Module {
        type = type.toLowerCase();
        clazz = clazz.toLowerCase();
        rating = rating.toLowerCase();
        let item = readModuleCache(type, clazz, rating);
        if (item) {
            return this.newModule(item);
        }

        // We don't clone the prototype because this is done in Module
        return new Module(getModuleInfo(type).proto);
    }

    /**
     * Creates a new loadout-event-style ship object.
     * @param type Ship type
     * @returns Ship object
     */
    static newShip(type: string): Ship {
        type = type.toLowerCase();
        // We don't clone the prototype because this is done in Ship
        return new Ship(getShipInfo(type).proto);
    }

    /**
     * Creates a new blueprint object.
     * @param name Name of the blueprint
     * @param grade Grade of the blueprints
     * @param progress Progress of the blueprint
     */
    static newBlueprint(name: string, grade: number, progress: number = 0): BlueprintObject {
        name = name.toLowerCase();
        return {
            'BlueprintName': name,
            'Level': grade,
            'Quality': undefined,
            'Modifiers': []
        };
    }
}

export default Factory;
