/**
 * @module Data
 */

/**
 * Ignore
 */
import { values } from 'lodash';

import { IllegalStateError, UnknownRestrictedError } from '../errors';
import { ModuleInformation, ModuleRegistryEntry } from '../types';
import { Slot } from './slots';

import MODULE_REGISTRY from './module_registry.json';
import MODULES from './modules.json';
import { getShipInfo } from './ships';

/**
 * Checks whether a given item id is valid and returns the sanitized item ID.
 * @param id Item id
 * @returns Lowercase item ID
 */
export function assertValidModule(id: string): string {
    id = id.toLowerCase();
    if (!MODULES[id]) {
        throw new UnknownRestrictedError(`Don't know module ${id}`);
    }
    return id;
}

/**
 * Returns an object with details about the item.
 * @param item Item id
 * @returns Information object
 */
export function getModuleInfo(item: string): ModuleInformation {
    return MODULES[item];
}

/**
 * Returns an object with details about the type of an item.
 * @param item Item ID
 * @returns Item type information object
 */
export function getModuleTypeInfo(item: string): ModuleRegistryEntry {
    return MODULE_REGISTRY[getModuleInfo(item).meta.type];
}

/**
 * Get the class of an item.
 * @param item Item id
 * @returns Item class
 */
export function getClass(item: string): number {
    return getModuleInfo(item).meta.class;
}

/**
 * Return the rating of an item.
 * @param item Item id
 * @returns Item rating; '' when not applicable
 */
export function getRating(item: string): string {
    return getModuleInfo(item).meta.rating || '';
}

/**
 * Checks whether an item fits on a slot of a given ship.
 * @param item Item ID
 * @param ship Ship type
 * @param slot Slot
 * @returns True when the item can be outfitted false otherwise
 */
export function itemFitsSlot(
    ship: string,
    slot: Slot,
    item: string,
): boolean {
    const moduleInfo = getModuleInfo(item);
    const registryEntry: ModuleRegistryEntry =
        MODULE_REGISTRY[moduleInfo.meta.type];
    item = item.toLowerCase();
    ship = ship.toLowerCase();

    const type = moduleInfo.meta.type;
    // Does the item fit on this type of slot?
    if (!slot.is(registryEntry.slots)) {
        return false;
    }

    if (type === 'armour') {
        return values(registryEntry.items[ship]).includes(item);
    }

    if (type === 'fighterbay') {
        if (!getShipInfo(ship).meta.fighterHangars) return false;
    } else if (type === 'passengercabins' && item.match(/class4/i)) {
        if (!getShipInfo(ship).meta.luxuryCabins) return false;
    }

    // Does the item fit on this slot?
    if (type === 'lifesupport' || type === 'sensors') {
        return slot.getSizeNum() === getClass(item);
    } else {
        return slot.getSizeNum() >= getClass(item);
    }
}

/**
 * Get a default property value of an item.
 * @param item Item ID
 * @param property Property value
 * @returns Default property value
 */
export function getModuleProperty(item: string, property: string): number {
    if (!item) {
        throw new IllegalStateError("Can't get module property for no item");
    }

    return getModuleInfo(item).props[property];
}

/**
 * Get a meta property value of an item.
 * @param item Item ID
 * @param property Meta property key
 * @returns Meta property value
 */
export function getModuleMetaProperty(item: string, property: string): any {
    if (!item) {
        throw new IllegalStateError(
            "Can't get module meta property for no item",
        );
    }

    return getModuleInfo(item).meta[property];
}
