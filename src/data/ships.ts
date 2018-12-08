
import { UnknownRestrictedError } from '../errors';

/**
 * Ship meta data
 * @typedef {Object} ShipMetaInfo
 * @property {number} eddbID EDDB ID of this ship
 * @property {number} edID ED ID of this ship
 * @property {number} class Size of the ship; 1 is small, 3 is large
 * @property {string} manufacturer Manufacturer of the ship
 * @property {number} crew Crew seats including helm
 * @property {Object.<string, number>} Map from core slots to respective size
 * @property {Object.<string, number>} Map from military slots to respective
 *      sizes
 * @property {Object.<string, boolean>} Map from slots to true if passenger slot
 */

/**
 * @typedef {Object} ShipInfo
 * @property {import('../Ship').ShipObject} proto Ship prototype object
 * @property {Object.<string, number>} props Ship properties
 * @property {ShipMetaInfo} meta Meta data about a ship
 */

/** @type {Object.<string, ShipDescriptor>} */
const SHIPS = require('./ships.json');

/**
 * Checks whether a given ship id is valid.
 * @param {String} ship Ship ID
 * @throws {UnknownRestrictedError} When ID is not valid
 */
export function assertValidShip(ship: string) {
    if (!SHIPS[ship]) {
        throw new UnknownRestrictedError(`Don't know ship ${ship}`);
    }
}

/**
 * Get ship info object.
 * @param {string} ship Ship ID
 * @returns {ShipInfo} Ship info object
 */
export function getShipInfo(ship: string) {
    assertValidShip(ship);
    return SHIPS[ship];
}

/**
 * Get a ship property value.
 * @param {string} ship Ship ID
 * @param {string} property Property name
 * @returns {number} Property value
 */
export function getShipProperty(ship: string, property: string): number {
    return getShipInfo(ship).props[property];
}

/**
 * Get a ship meta property value.
 * @param {string} ship Ship ID
 * @param {string} property Meta property key
 * @returns {*} Meta property value
 */
export function getShipMetaProperty(ship: string, property: string): any {
    return getShipInfo(ship).meta[property];
}
