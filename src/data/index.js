
import Ship from '../Ship';
import Module from '../Module';
import { getModuleInfo } from './items';
import { getShipInfo } from './ships';
import { UnknownRestrictedError } from '../errors';

const MODULE_CACHE = require('./module_cache.json');

function readModuleCache(type, clazz='', rating='') {
    let cache = MODULE_CACHE[type];
    if (cache) {
        return cache[clazz][rating];
    }
}

/**
 * Factory to create basic ships and modules.
 */
export default class Factory {
    /**
     * Returns the item id of the given module via group, class and rating.
     * Class and rating for the most part match what is shown in-game but there
     * are some caveats. Bulkheads have the corresponding ship type as a class.
     * Some modules have no class and/or rating because there is only a single
     * one available for that group.
     * Details can be looked up in the `module_cache.json` file.
     * @param {string} group Type of the module
     * @param {string} [clazz] Class of the module
     * @param {string} [rating] Rating of the module
     */
    static getModuleId(group, clazz = '', rating = '') {
        let item = readModuleCache(group, clazz, rating);
        if (!item) {
            throw new UnknownRestrictedError(`Don't know module type ${group}`);
        }
        return item;
    }

    /**
     * Creates a new loadout-event-style module object.
     * @param {string} type Type of the module; either as a group as for
     *      {@link Factory.getModuleId} or as a valid item id.
     * @param {string} [clazz] Class of the module
     * @param {*} [rating] Rating of the module
     * @return {Object} Module object
     */
    static newModule(type, clazz = '', rating = '') {
        let item = readModuleCache(type, clazz, rating);
        if (item) {
            return this.newModule(item);
        }

        // We don't clone the prototype because this is done in Module
        return new Module(getModuleInfo(type).proto);
    }

    /**
     * Creates a new loadout-event-style ship object.
     * @param {string} type Ship type
     * @returns {Object} Ship object
     */
    static newShip(type) {
        // We don't clone the prototype because this is done in Ship
        return new Ship(getShipInfo(type).proto);
    }
}
