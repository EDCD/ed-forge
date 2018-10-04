
import coriolis from 'coriolis-data';

export const SLOT_TYPES = {
    ARMOUR: 'armour',
    POWER_PLANT: 'powerplant',
    THRUSTERS: 'mainengine',
    FSD: 'frameshiftdrive',
    LIFE_SUPPORT: 'lifesupport',
    POWER_DISTRIBUTOR: 'powerdistributor',
    SENSORS: 'radar',
    FUEL_TANK: 'fueltank',
    INTERNAL: 'internal',
    PASSENGER: 'passenger',
    MILITARY: 'military',
    HARDPOINT: 'hardpoint',
    UTILITY: 'utility',
};

const CORIOLIS_CORE_INDEX_MAP = [SLOT_TYPES.POWER_PLANT, SLOT_TYPES.THRUSTERS,
    SLOT_TYPES.FSD, SLOT_TYPES.LIFE_SUPPORT, SLOT_TYPES.POWER_DISTRIBUTOR,
    SLOT_TYPES.SENSORS, SLOT_TYPES.FUEL_TANK];

export const REG_CORE_SLOT = /(Armour|PowerPlant|MainEngines|FrameShiftDrive|LifeSupport|PowerDistributor|Radar|FuelTank)/i;
export const REG_INTERNAL_SLOT = /Slot(\d{2})_Size(\d)/i;
export const REG_MILITARY_SLOT = /Military(\d{2})/i;
export const REG_HARDPOINT_SLOT = /(Small|Medium|Large|Huge)Hardpoint/i;
export const REG_UTILITY_SLOT = /TinyHardpoint(\d)/i;

const HARDPOINT_ORDER = ['small', 'medium', 'large', 'huge'];
export function hardpointSizeToIndex(size) {
    size = size.toLowerCase();
    HARDPOINT_ORDER.findIndex(x => x === size) + 1;
}

/**
 * @param {string} ship
 * @param {string} slot
 * @return {Array}
 */
export function getCoreSlotInfo(ship, slot) {
    if (slot) {
        let m = slot.matches(REG_CORE_SLOT);
        if (m) {
            let type = m[1].toLowerCase();
            let coriolisIndex = CORIOLIS_CORE_INDEX_MAP.findIndex(
                x => x === type
            );
            let clazz;
            if (coriolisIndex < 0) {
                // As REG_CORE_SLOT matched this must a armour
                // Armour has no size; return 1
                clazz = 1;
            } else {
                clazz = coriolis.Ships[ship].slots.standard[coriolisIndex];
            }
            return [clazz, type];
        }
    }
    return [null, null];
}

/**
 * @param {string} ship
 * @param {string} slot
 * @return {Array}
 */
export function getInternalSlotInfo(ship, slot) {
    if (slot) {
        let m = slot.match(REG_INTERNAL_SLOT);
        if (m) {
            // Don't decrement the index for type 9 because it's internals start
            // at 0
            let i = Number(m[1]) - (ship === 'type_9_heavy' ? 0 : 1);
            // Figure out whether this internal slot is a passenger slot
            let noMilitaryInternals = coriolis.Ships[ship].slots.internal.filter(
                slot => (typeof slot === 'number' || slot.Name === 'Passenger')
            );
            let type = typeof noMilitaryInternals[i] === 'number'
                ? SLOT_TYPES.INTERNAL
                : SLOT_TYPES.PASSENGER;
            return [Number(m[2]), type];
        }
        m = slot.match(REG_MILITARY_SLOT);
        if (m) {
            let coriolisIndex = Number(m[1]) - 1; // Military slots start at 1
            let militaryInternals = coriolis.Ships[ship].slots.internal.filter(
                x => typeof x === 'object' && x.Name === 'Military'
            );
            return [
                militaryInternals[coriolisIndex].class, SLOT_TYPES.MILITARY
            ];
        }
    }
    return [null, null];
}

/**
 * @param {string} ship
 * @param {string} slot
 * @return {Array}
 */
export function getHardpointSlotInfo(ship, slot) {
    if (slot) {
        let m = slot.match(REG_HARDPOINT_SLOT);
        if (m) {
            return [hardpointSizeToIndex(m[1]), SLOT_TYPES.HARDPOINT];
        }
    }
    return [null, null];
}

/**
 * @param {string} ship
 * @param {string} slot
 * @return {Array}
 */
export function getUtilitySlotInfo(ship, slot) {
    if (slot && slot.match(REG_UTILITY_SLOT)) {
        // Utility slots don't have a size assigned to them
        return [1, SLOT_TYPES.UTILITY];
    }
    return [null, null];
}

/**
 * @param {string} ship
 * @param {string} slot
 * @return {Array}
 */
export function getSlotInfo(ship, slot) {
    for (const f of [getHardpointSlotInfo, getUtilitySlotInfo, getCoreSlotInfo,
        getInternalSlotInfo]) {
            let info = f(ship, slot);
            if (info) {
                return info;
            }
    }
    return [null, null];
}
