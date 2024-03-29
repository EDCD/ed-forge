/**
 * @module Data
 */

/**
 * Ignore
 */
import { UnknownRestrictedError } from '../errors';
import { ShipInfo } from '../types';

import SHIPS from './ships.json';

/**
 * Checks whether a given ship id is valid and returns the sanitized ship ID.
 * @param ship Ship ID
 * @returns Lowercase ship ID
 */
export function assertValidShip(ship: string): string {
    ship = ship.toLowerCase();
    if (!SHIPS[ship]) {
        throw new UnknownRestrictedError(`Don't know ship ${ship}`);
    }
    return ship;
}

/**
 * Get ship info object.
 * @param ship Ship ID
 * @returns Ship info object
 */
export function getShipInfo(ship: string): ShipInfo {
    return SHIPS[ship];
}

/**
 * Get a ship property value.
 * @param ship Ship ID
 * @param property Property name
 * @returns Property value
 */
export function getShipProperty(ship: string, property: string): number {
    return getShipInfo(ship).props[property];
}

/**
 * Get a ship meta property value.
 * @param ship Ship ID
 * @param property Meta property key
 * @returns Meta property value
 */
export function getShipMetaProperty(ship: string, property: string): any {
    return getShipInfo(ship).meta[property];
}
