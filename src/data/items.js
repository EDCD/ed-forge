
import { getSlotSize, isPassengerSlot, REG_INTERNAL_SLOT, REG_MILITARY_SLOT,
    REG_HARDPOINT_SLOT, REG_UTILITY_SLOT
} from './slots';
import { UnknownRestrictedError } from '../errors';
import { matchesAny } from '../helper';

const MODULES = require('./modules.json');

export function assertValidModule(type) {
    if (!MODULES[type]) {
        throw new UnknownRestrictedError(`Don't know module ${item}`);
    }
}

export function getClass(item) {
    assertValidModule(type);
    return MODULES[item].meta.class;
}

export function getRating(item) {
    assertValidModule(type);
    return MODULES[item].meta.rating;
}

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
        // TODO: throw exception
    }
    return info;
}

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
