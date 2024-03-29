/**
 * @module Data
 */

/**
 * Ignore
 */
import { get } from 'lodash';

import { UnknownRestrictedError } from '../errors';
import { IBlueprintObjectHandler } from '../Module';
import Ship from '../Ship';
import { assertValidBlueprint, assertValidExperimental } from './blueprints';
import { assertValidShip, getShipInfo } from './ships';

import MODULE_REGISTRY from './module_registry.json';
import SHIPS from './ships.json';

const RATING_TO_NUMBER = {
    'a': 5,
    'b': 4,
    'c': 3,
    'd': 2,
    'e': 1,
}

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
function readModuleCache(
    type: string,
    clazz: string = '',
    rating: string = '',
): string {
    const path = [];
    const rest = [type, 'items', clazz, RATING_TO_NUMBER[rating] || rating];
    let item = {};
    while (item && rest.length) {
        path.push(rest.shift());
        item = get(MODULE_REGISTRY, path);
        // If we failed to fetch this item for the given sub-key, let's try ''
        if (!item) {
            path[path.length - 1] = '';
            item = get(MODULE_REGISTRY, path);
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
     * Details can be looked up in the `module_registry.json` file.
     * @param group Type of the module
     * @param clazz Class of the module
     * @param rating Rating of the module
     * @returns Item ID
     */
    public static getModuleId(
        group: string,
        clazz: string | number = '',
        rating: string = '',
    ): string {
        group = group.toLowerCase();
        clazz = typeof clazz === 'number' ? String(clazz) : clazz.toLowerCase();
        rating = rating.toLowerCase();
        const item = readModuleCache(group, clazz, rating);
        if (!item) {
            throw new UnknownRestrictedError(`Don't know module type ${group}`);
        }
        return item;
    }

    /**
     * Creates a new loadout-event-style ship object.
     * @param type Ship type
     * @returns Ship object
     */
    public static newShip(type: string): Ship {
        type = assertValidShip(type);
        // We don't clone the prototype because this is done in Ship
        return new Ship(getShipInfo(type).proto);
    }

    /**
     * Creates a new blueprint object.
     * @param name Name of the blueprint
     * @param grade Grade of the blueprints
     * @param progress Progress of the blueprint
     */
    public static newBlueprint(
        name: string,
        grade: number,
        experimental?: string,
    ): IBlueprintObjectHandler {
        name = assertValidBlueprint(name);
        const blueprint: IBlueprintObjectHandler = {
            BlueprintName: name,
            Level: grade,
            Modifiers: {},
            Quality: undefined,
        };
        if (experimental) {
            blueprint.ExperimentalEffect = assertValidExperimental(
                experimental,
            );
        }
        return blueprint;
    }

    /**
     * Get an array of all available ship types.
     */
    public static getAllShipTypes(): string[] {
        // Cast SHIPS to any because only this allows us to access the default
        // key. If we were to call Object.keys with just SHIPS the key
        // "default" would be included.
        return Object.keys(SHIPS);
    }
}

export default Factory;
