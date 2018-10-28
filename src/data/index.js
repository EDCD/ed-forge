
import Ship from '../Ship';
import Module from '../Module';
import { assertValidModule } from './items';
import { assertValidShip } from './slots';
import { UnknownRestrictedError } from '../errors';

const MODULES = require('./modules.json');
const MODULE_CACHE = require('./module_cache.json');
const SHIPS = require('./ships.json');

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

        assertValidModule(type);
        // We don't clone the prototype because this is done in Module
        return new Module(MODULES[type].proto);
    }

    static newShip(type) {
        assertValidShip(type);
        // We don't clone the prototype because this is done in Ship
        return new Ship(SHIPS[type].proto);
    }
}
