
import { UnknownRestrictedError } from '../errors.js';

const SHIPS = require('./ships.json');

export function assertValidShip(ship) {
    if (!SHIPS[ship]) {
        throw new UnknownRestrictedError(`Don't know ship ${ship}`);
    }
}

export function getShipInfo(ship) {
    assertValidShip(ship);
    return SHIPS[ship];
}

export function getShipProperty(ship, property) {
    return getShipInfo(ship).props[property];
}
