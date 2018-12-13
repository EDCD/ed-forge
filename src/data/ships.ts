
import { UnknownRestrictedError } from '../errors';
import { ShipObject } from '../Ship';

import * as SHIPS from './ships.json';

/**
 * Ship meta data
 */
export interface ShipMetaInfo {
    /** EDDB ID of this ship */
    eddbID: number;
    /** ED ID of this ship */
    edID: number;
    /** Size of the ship; 1 is small, 3 is large */
    class: number;
    /** Manufacturer of the ship */
    manufacturer: string;
    /** Crew seats including helm */
    crew: number;
    /** Map from core slots to respective size */
    coreSizes: { [key: string]: number };
    /** Map from military slots to respective sizes */
    militarySizes: { [ key: string ]: number };
    /** Map from slots to true if passenger slot */
    passengerSlots: { [ key: string ]: boolean };
}

interface ShipInfo {
    /** Ship prototype object */
    proto: ShipObject;
    /** Ship properties */
    props: { [ key: string ]: number };
    /** Meta data about a ship */
    meta: ShipMetaInfo;
}

/**
 * Checks whether a given ship id is valid.
 * @param ship Ship ID
 * @throws {UnknownRestrictedError} When ID is not valid
 */
export function assertValidShip(ship: string) {
    if (!SHIPS[ship]) {
        throw new UnknownRestrictedError(`Don't know ship ${ship}`);
    }
}

/**
 * Get ship info object.
 * @param ship Ship ID
 * @returns {ShipInfo} Ship info object
 */
export function getShipInfo(ship: string) {
    assertValidShip(ship);
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
