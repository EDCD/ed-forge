
import { getSlotSize, isPassengerSlot, REG_INTERNAL_SLOT, REG_MILITARY_SLOT,
    REG_HARDPOINT_SLOT, REG_UTILITY_SLOT
} from './slots';
import { UnknownRestrictedError } from '../errors';
import { matchesAny } from '../helper';

/**
 * Meta data about an item.
 * @typedef {Object} MetaModuleInformation
 * @property {number} eddbID EDDB ID of the item
 * @property {number} edID ED ID of the item
 * @property {number} class Class of the item
 * @property {string} [rating] Rating of the item
 */

/**
 * Object holding information about an item.
 * @typedef {Object} ModuleInformation
 * @property {ModuleObject} proto Loadout-event-style module object prototype
 * @property {Object} props Default item properties
 * @property {MetaModuleInformation} meta Item meta information
 */

const MODULES = require('./modules.json');

/**
 * Checks whether a given item id is valid.
 * @param {String} id Item id
 * @throws {UnknownRestrictedError} When ID is not valid
 */
export function assertValidModule(id) {
    if (!MODULES[id]) {
        throw new UnknownRestrictedError(`Don't know module ${item}`);
    }
}

/**
 * Returns an object with details about the item.
 * @param {string} item Item id
 * @returns {ModuleInformation} Information object
 */
export function getModuleInfo(item) {
    assertValidModule(item);
    return MODULES[item];
}

/**
 * Get the class of an item.
 * @param {string} item Item id
 * @returns {number} Item class
 */
export function getClass(item) {
    return getModuleInfo(item).meta.class;
}

/**
 * Return the rating of an item.
 * @param {string} item Item id
 * @returns {string} Item rating; '' when not applicable
 */
export function getRating(item) {
    return getModuleInfo(item).meta.rating || '';
}

/**
 * Info about where an item can fit.
 * @typedef {Object} ItemFitInfo
 * @property {RegExp[]} Slots Array of regexes that match slots where this item
 *      can be equipped.
 * @property {boolean} passenger True if this module can be fit only to
 *      passenger slots.
 */

/**
 * Get information about where an item can fit.
 * @param {string} item Item ID
 * @returns {ItemFitInfo} Item fit info
 * @throws {UnknownRestrictedError} When item is unknown
 */
function getItemInfo(item) {
    assertValidModule(type);
    let info = {
        Slots: [],
        passenger: false,
    };
    if (item.match(/_Armour_/i)) {
        info.Slots = [ /Armour/i ];
    } else if (item.match(/Int_PowerPlant/i)) {
        info.Slots = [ /PowerPlant/i ];
    } else if (item.match(/Int_Engine/i)) {
        info.Slots = [ /MainEngine/i ];
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
 * @param {string} item Item ID
 * @param {string} ship Ship type
 * @param {string} slot Slot
 * @returns {boolean} True when the item can be outfitted false otherwise
 * @throws {UnknownRestrictedError} When one of item, ship, slot is unknown
 */
export function itemFitsSlot(item, ship, slot) {
    assertValidModule(type);
    slot = slot.toLowerCase();

    let itemClass = getClass(item);
    let itemInfo = getItemInfo(item);

    // Does the item fit on this type of slot?
    if (!matchesAny(itemClass, ...itemInfo.Slots)) {
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
 * @param {string} item Item ID
 * @param {string} property Property value
 * @returns {number} Default property value
 */
export function getModuleProperty(item, property) {
    return getModuleInfo(item).props[property];
}
