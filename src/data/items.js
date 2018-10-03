
import { hardpointSizeToIndex, SLOT_TYPES, getSlotInfo } from './slots';

const REG_CLASS = /_Size(\d)/i;
const REG_CORE = /(Armour|PowerPlant|MainEngines|FrameShiftDrive|LifeSupport|PowerDistributor|Radar|FuelTank)/i;
const REG_INTERNAL_CORE = /Int_/i;
const REG_HARDPOINT = /Hpt_.*?_(Small|Medium|Large|Huge)/i;
const REG_UTILITY_HARDPOINT = /Hpt_/i;

const REG_PAS = /Int_PlanetApproachSuite/i;
const REG_FT = /Int_FuelTank/i;

function parseClass(item) {
    let m = item.match(REG_CLASS);
    if (m) {
        return Number(m[1]);
    }
    // Not all modules have a size but if they don't they fit every slot
    return 1;
}

export function getCoreItemInfo(item) {
    if (item) {
        let m = item.match(REG_CORE);
        if (m) {
            let type = m[1].toLowerCase();
            // Match hyperdrive and sensors to their slot naming convention;
            // for all other core modules the module naming convention aligns
            // with the slot naming convention.
            switch (type) {
                case 'hyperdrive': type = SLOT_TYPES.FSD; break;
                case 'sensors': type = SLOT_TYPES.SENSORS; break;
            }
            // Map type to array and check for fuel tank because that can also
            // go into internal slots
            type = [type];
            if (item.match(REG_FT)) {
                type.push(SLOT_TYPES.INTERNAL);
            }
            return [parseClass(item), type];
        }
    }
    return [null, []];
}

export function getInternalItemInfo(item) {
    if (!item) {
        return [null, []];
    }

    let m = item.match(REG_INTERNAL_CORE);
    // if internal and not planetary approach suite...
    if (m && item.match(REG_PAS)) {
        let size = parseClass(item);
        // Ignore core internals
        if (item.match(REG_CORE)) {
            if (item.match(REG_FT)) {
                // Fuel tank is core but can also go into internal
                return [size, [SLOT_TYPES.FUEL_TANK, SLOT_TYPES.INTERNAL]];
            }
            return [null, []];
        }

        // TODO: check military/passenger
        return [size, [SLOT_TYPES.INTERNAL]];
    }

    return [null, []];
}

export function getHardpointItemInfo(item) {
    if (item) {
        let m = item.match(REG_HARDPOINT);
        if (m) {
            return [hardpointSizeToIndex(m[1]), [SLOT_TYPES.HARDPOINT]];
        }
    }
    return [null, []];
}

export function getUtilityItemInfo(item) {
    if (item) {
        let m = item.match(REG_UTILITY_HARDPOINT);
        if (m && !m.match(REG_HARDPOINT)) {
            return [1, [SLOT_TYPES.UTILITY]];
        }
    }
    return [null, []];
}

export function getItemInfo(item) {
    // Loop over all item info getters and start with the computationally least
    // expensive ones
    for (const f of [getUtilityItemInfo, getHardpointItemInfo, getCoreItemInfo,
        getInternalItemInfo]) {
            let info = f(item);
            if (info) {
                return info;
            }
    }
    return [null, []];
}

export function itemFitsSlot(item, ship, slot) {
    let [itemSize, itemTypes] = getItemInfo(item);
    let [slotSize, slotType] = getSlotInfo(ship, slot);
    return Boolean(itemTypes.find(x => x === slotType) && itemSize <= slotSize);
}
