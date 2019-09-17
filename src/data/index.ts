/**
 * @module Data
 */

/**
 * Ignore
 */
import { get } from 'lodash';

import { UnknownRestrictedError } from '../errors';
import Module, { IBlueprintObjectHandler } from '../Module';
import Ship from '../Ship';
import { getModuleInfo } from './items';
import { getShipInfo } from './ships';

import * as MODULE_REGISTRY from './module_registry.json';
import * as SHIPS from './ships.json';

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
    const rest = [type, 'items', clazz, rating];
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
        clazz: string = '',
        rating: string = '',
    ): string {
        group = group.toLowerCase();
        clazz = clazz.toLowerCase();
        rating = rating.toLowerCase();
        const item = readModuleCache(group, clazz, rating);
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
    public static newModule(
        type: string,
        clazz: string = '',
        rating: string = '',
    ): Module {
        type = type.toLowerCase();
        clazz = clazz.toLowerCase();
        rating = rating.toLowerCase();
        const item = readModuleCache(type, clazz, rating);
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
    public static newShip(type: string): Ship {
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
    public static newBlueprint(
        name: string,
        grade: number,
        experimental?: string,
    ): IBlueprintObjectHandler {
        name = name.toLowerCase();
        const blueprint: IBlueprintObjectHandler = {
            BlueprintName: name,
            Level: grade,
            Modifiers: {},
            Quality: undefined,
        };
        if (experimental) {
            blueprint.ExperimentalEffect = experimental.toLowerCase();
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
        return Object.keys((SHIPS as any).default);
    }
}

export default Factory;
