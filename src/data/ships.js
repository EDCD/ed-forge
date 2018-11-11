
import { UnknownRestrictedError } from '../errors.js';

const SHIPS = require('./ships.json');

/**
 * Checks whether a given ship id is valid.
 * @param {String} id Ship ID
 * @throws {UnknownRestrictedError} When ID is not valid
 */
export function assertValidShip(ship) {
    if (!SHIPS[ship]) {
        throw new UnknownRestrictedError(`Don't know ship ${ship}`);
    }
}

/**
 * Meta data about a ship.
 * @typedef {Object} ShipMetaInfo
 * @property {number} eddbID EDDB ID of the ship
 * @property {number} edID ED ID of the ship
 * @property {number} class Landing pad size of the ship; from 1 to 3
 * @property {string} manufacturer Ship manufacturer
 * @property {number} crew Total number of crew members
 * @property {Object} coreSizes Map from slot to size for core slots
 * @property {Object} militarySizes Map from slot to size for military slots
 * @property {Object} passengerSlots Maps slot to true if it is a passenger slot
 */

/**
 * Object holding information about a ship.
 * @typedef {Object} ShipInfo
 * @property {ShipObject} proto Loadout-event-style ship build prototype
 * @property {Object} props Ship properties
 * @property {ShipMetaInfo} meta Ship meta information
 */

/**
 * Get ship info object.
 * @param {string} ship Ship ID
 * @returns {ShipInfo} Ship info object
 */
export function getShipInfo(ship) {
    assertValidShip(ship);
    return SHIPS[ship];
}

/**
 * Get a ship property value.
 * @param {string} ship Ship ID
 * @param {string} property Property name
 * @returns {number} Property value
 */
export function getShipProperty(ship, property) {
    return getShipInfo(ship).props[property];
}
