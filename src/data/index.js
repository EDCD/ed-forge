
import Ship from '../Ship';
import Module from '../Module';
import { assertValidModule } from './items';
import { assertValidShip } from './slots';

const MODULES = require('./modules.json');
const SHIPS = require('./ships.json');

export default class Factory {
    static newModule(type) {
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
