
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

export default class Factory {
    static getModuleId(type, clazz = '', rating = '') {
        let item = readModuleCache(type, clazz, rating);
        if (!item) {
            throw new UnknownRestrictedError(`Don't know module type ${type}`);
        }
        return item;
    }

    static newModule(type, clazz = '', rating = '') {
        let item = readModuleCache(type, clazz, rating);
        if (item) {
            return this.newModule(item);
        }

        // We don't clone the prototype because this is done in Module
        return new Module(getModuleInfo(type).proto);
    }

    static newShip(type) {
        // We don't clone the prototype because this is done in Ship
        return new Ship(getShipInfo(type).proto);
    }
}
