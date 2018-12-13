
import { getSlotSize, isPassengerSlot, REG_INTERNAL_SLOT, REG_MILITARY_SLOT,
    REG_HARDPOINT_SLOT, REG_UTILITY_SLOT
} from './slots';
import { UnknownRestrictedError } from '../errors';
import { matchesAny } from '../helper';
import { ModuleObject } from '../Module'

import * as MODULES from './modules.json';

/**
 * Meta data about an item.
 */
export interface MetaModuleInformation {
    /** EDDB ID of the item */
    eddbID: number;
    /** ED ID of the item */
    edID: number;
    /** Class of the item */
    class: number;
    /** Rating of the item */
    rating: string;
}

/**
 * Object holding information about an item.
 */
export interface ModuleInformation {
    /** Loadout-event-style module object prototype */
    proto: ModuleObject;
    /** Default item properties */
    props: Object;
    /** Item meta information */
    meta: MetaModuleInformation;
}

/**
 * Checks whether a given item id is valid.
 * @param id Item id
 * @throws {UnknownRestrictedError} When ID is not valid
 */
export function assertValidModule(id: string) {
    if (!MODULES[id]) {
        throw new UnknownRestrictedError(`Don't know module ${id}`);
    }
}

/**
 * Returns an object with details about the item.
 * @param item Item id
 * @returns {ModuleInformation} Information object
 */
export function getModuleInfo(item: string) {
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
 * Info about where an item can fit.
 */
interface ItemFitInfo {
    /** Array of regexes that match slots where this item can be equipped */
    Slots: RegExp[];
    /** True if this module can be fit only to passenger slots */
    passenger: boolean;
}

/**
 * Get information about where an item can fit.
 * @param item Item ID
 * @returns Item fit info
 * @throws {UnknownRestrictedError} When item is unknown
 */
function getItemInfo(item: string): ItemFitInfo {
    assertValidModule(item);
    let info = {
        Slots: [],
        passenger: false,
    };
    if (item.match(/_Armour_/i)) {
        info.Slots = [ /Armour/i ];
    } else if (item.match(/Int_PowerPlant/i)) {
        info.Slots = [ /PowerPlant/i ];
    } else if (item.match(/Int_Engine/i)) {
        info.Slots = [ /MainEngines/i ];
    } else if (item.match(/Int_HyperDrive/i)) {
        info.Slots = [ /FrameShiftDrive/i ];
    } else if (item.match(/Int_LifeSupport/i)) {
        info.Slots = [ /LifeSupport/i ];
    } else if (item.match(/Int_PowerDistributor/i)) {
        info.Slots = [ /PowerDistributor/i ];
    } else if (item.match(/Int_Sensors/i)) {
        info.Slots = [ /Radar/i ];
    } else if (item.match(/Int_FuelTank/i)) {
        info.Slots = [ /FuelTank/i, REG_INTERNAL_SLOT ];
    } else if (item.match(/Hpt_/i)) {
        if (item.match(/size0/i) || item.match(/tiny/i)) {
            info.Slots = [ REG_UTILITY_SLOT ];
        } else {
            info.Slots = [ REG_HARDPOINT_SLOT ];
        }
    } else if (item.match(/Int_/i)) {
        info.Slots = [ REG_INTERNAL_SLOT ];
        if (item.match(/HullReinforcement/i) ||
            item.match(/ModuleReinforcement/i) ||
            item.match(/ShieldReinforcement/i) ||
            item.match(/ShieldCellBank/i)
        ) {
            info.Slots.push(REG_MILITARY_SLOT);
        }

        if (item.match(/CargoRack/i) ||
            item.match(/PassengerCabin/i) ||
            item.match(/HullReinforcement/i) ||
            item.match(/ModuleReinforcement/i)
        ) {
            info.passenger = true;
        }
    } else {
        throw new UnknownRestrictedError(`Don't know module ${item}`);
    }
    return info;
}

/**
 * Checks whether an item fits on a slot of a given ship.
 * @param item Item ID
 * @param ship Ship type
 * @param slot Slot
 * @returns True when the item can be outfitted false otherwise
 * @throws {UnknownRestrictedError} When one of item, ship, slot is unknown
 */
export function itemFitsSlot(item: string, ship: string, slot: string): boolean {
    assertValidModule(item);
    slot = slot.toLowerCase();

    let itemClass = getClass(item);
    let itemInfo = getItemInfo(item);

    // Does the item fit on this type of slot?
    if (!matchesAny(item, ...itemInfo.Slots)) {
        return false;
    }

    // Does the item fit on this slot?
    let slotSize = getSlotSize(ship, slot);
    if (slotSize < itemClass) {
        return false;
    }

    // At last, we must check whether this slot is for passenger modules only
    return !isPassengerSlot(ship, slot) || itemInfo.passenger;
}

/**
 * Get a default property value of an item.
 * @param item Item ID
 * @param property Property value
 * @returns Default property value
 */
export function getModuleProperty(item: string, property: string): any {
    return getModuleInfo(item).props[property];
}
