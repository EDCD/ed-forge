/**
 * @module Data
 */

/**
 * Ignore
 */
import { IllegalStateError, UnknownRestrictedError } from '../errors';
import { matchesAny } from '../helper';
import { ModuleInformation } from '../types';
import {
    getSlotSize,
    REG_HARDPOINT_SLOT,
    REG_INTERNAL_SLOT,
    REG_MILITARY_SLOT,
    REG_UTILITY_SLOT,
} from './slots';

import * as MODULES from './modules.json';

/**
 * Checks whether a given item id is valid.
 * @param id Item id
 */
export function assertValidModule(id: string) {
    id = id.toLowerCase();
    if (!MODULES[id]) {
        throw new UnknownRestrictedError(`Don't know module ${id}`);
    }
}

/**
 * Returns an object with details about the item.
 * @param item Item id
 * @returns Information object
 */
export function getModuleInfo(item: string): ModuleInformation {
    item = item.toLowerCase();
    assertValidModule(item);
    return MODULES[item];
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
 * Get information about where an item can fit.
 * @param item Item ID
 * @returns Item fit info
 */
function getFittingSlots(item: string): RegExp[] {
    assertValidModule(item);
    let slots;
    if (item.match(/_Armour_/i)) {
        slots = [/Armour/i];
    } else if (item.match(/Int_PowerPlant/i)) {
        slots = [/PowerPlant/i];
    } else if (item.match(/Int_Engine/i)) {
        slots = [/MainEngines/i];
    } else if (item.match(/Int_HyperDrive/i)) {
        slots = [/FrameShiftDrive/i];
    } else if (item.match(/Int_LifeSupport/i)) {
        slots = [/LifeSupport/i];
    } else if (item.match(/Int_PowerDistributor/i)) {
        slots = [/PowerDistributor/i];
    } else if (item.match(/Int_Sensors/i)) {
        slots = [/Radar/i];
    } else if (item.match(/Int_FuelTank/i)) {
        slots = [/FuelTank/i, REG_INTERNAL_SLOT];
    } else if (item.match(/Hpt_/i)) {
        if (item.match(/size0/i) || item.match(/tiny/i)) {
            slots = [REG_UTILITY_SLOT];
        } else {
            slots = [REG_HARDPOINT_SLOT];
        }
    } else if (item.match(/Int_/i)) {
        slots = [REG_INTERNAL_SLOT];
        if (
            item.match(/HullReinforcement/i) ||
            item.match(/ModuleReinforcement/i) ||
            item.match(/ShieldReinforcement/i) ||
            item.match(/ShieldCellBank/i)
        ) {
            slots.push(REG_MILITARY_SLOT);
        }
    } else {
        throw new UnknownRestrictedError(`Don't know module ${item}`);
    }
    return slots.map(r => RegExp(r, 'i'));
}

/**
 * Checks whether an item fits on a slot of a given ship.
 * @param item Item ID
 * @param ship Ship type
 * @param slot Slot
 * @returns True when the item can be outfitted false otherwise
 */
export function itemFitsSlot(
    item: string,
    ship: string,
    slot: string,
): boolean {
    assertValidModule(item);
    slot = slot.toLowerCase();

    const itemClass = getClass(item);
    const slots = getFittingSlots(item);

    // Does the item fit on this type of slot?
    if (!matchesAny(slot, ...slots)) {
        return false;
    }

    // Does the item fit on this slot?
    const slotSize = getSlotSize(ship, slot);
    return itemClass <= slotSize;
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
