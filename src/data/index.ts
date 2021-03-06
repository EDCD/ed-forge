/**
* @module Data
*/

/**
* Ignore
*/
import Ship from '../Ship';
import Module, { BlueprintObjectHandler } from '../Module';
import { getModuleInfo } from './items';
import { getShipInfo } from './ships';
import { UnknownRestrictedError } from '../errors';
import { get, fill } from 'lodash';

import * as MODULE_CACHE from './module_cache.json';


/**
 * Fetches a module ID from the cache. If the module does not have `clazz` or
 * `rating` specified, it is not necessary to give the correct values. For
 * example, if you try to do: `readModuleCache('xenoscanner', '0', 'E')` this
 * will succeed although `'xenoscanner'` is mapped with empty strings.
 * @param type The type of the module to fetch
 * @param clazz Class of the module to fetch
 * @param rating Rating of the module to fetch.
 * @returns Item ID
 */
function readModuleCache(type: string, clazz: string = '', rating: string = ''): string {
    let path = [];
    let rest = [type, clazz, rating];
    let item = {};
    while (item && rest.length) {
        path.push(rest.shift());
        item = get(MODULE_CACHE, path);
        // If we failed to fetch this item for the given sub-key, let's try ''
        if (!item) {
            path[path.length - 1] = '';
            item = get(MODULE_CACHE, path);
        }
    }
    return item as string;
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
     * one available for that group. If a module does not have a rating, the
     * arguments given for clazz or rating don't matter.
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
    static newBlueprint(name: string, grade: number, experimental?: string): BlueprintObjectHandler {
        name = name.toLowerCase();
        let blueprint: BlueprintObjectHandler = {
            'BlueprintName': name,
            'Level': grade,
            'Quality': undefined,
            'Modifiers': {}
        };
        if (experimental) {
            blueprint.ExperimentalEffect = experimental.toLowerCase();
        }
        return blueprint;
    }
}

export default Factory;
