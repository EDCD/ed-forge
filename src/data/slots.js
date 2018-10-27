
import { UnknownRestrictedError } from '../errors';
import { matchesAny } from '../helper';

const SHIPS = require('./ships.json');

export const REG_CORE_SLOT = /(Armour|PowerPlant|MainEngines|FrameShiftDrive|LifeSupport|PowerDistributor|Radar|FuelTank)/i;
export const REG_INTERNAL_SLOT = /Slot(\d{2})_Size(\d)/i;
export const REG_MILITARY_SLOT = /Military(\d{2})/i;
export const REG_HARDPOINT_SLOT = /(Small|Medium|Large|Huge)Hardpoint/i;
export const REG_UTILITY_SLOT = /TinyHardpoint(\d)/i;

export function assertValidShip(ship) {
    if (!SHIPS[ship]) {
        throw new UnknownRestrictedError(`Don't know ship ${ship}`);
    }
}

export function assertValidSlot(slot) {
    if (!matchesAny(slot, REG_CORE_SLOT, REG_INTERNAL_SLOT, REG_MILITARY_SLOT, REG_HARDPOINT_SLOT, REG_UTILITY_SLOT)) {
        throw new UnknownRestrictedError(`Don't know slot ${slot}`);
    }
}

export function getCoreSlotSize(ship, slot) {
    assertValidShip(ship);
    assertValidSlot(slot);
    return SHIPS[ship].meta.coreSizes[slot];
}

export function getMilitarySlotSize(ship, slot) {
    assertValidShip(ship);
    assertValidSlot(slot);
    return SHIPS[ship].meta.militarySizes[slot];
}

export function isPassengerSlot(ship, slot) {
    assertValidShip(ship);
    assertValidSlot(slot);
    return SHIPS[ship].meta.passengerSlots[slot];
}

export function getInternalSlotSize(slot) {
    assertValidSlot(slot);
    let m = slot.match(REG_INTERNAL_SLOT);
    if (m) {
        return Number(m[2]);
    }
}

export function getHardpointSlotSize(slot) {
    assertValidSlot(slot);
    if (slot.match(/Tiny/i)) {
        return 0;
    } else if (slot.match(/Small/i)) {
        return 1;
    } else if (slot.match(/Medium/i)) {
        return 2;
    } else if (slot.match(/Large/i)) {
        return 3;
    } else if (slot.match(/Huge/i)) {
        return 4;
    }
}

export function getSlotSize(ship, slot) {
    assertValidShip(ship);
    assertValidSlot(slot);
    let slotSize = getCoreSlotSize(ship, slot);
    if (slotSize) {
        return slotSize;
    }

    slotSize = getHardpointSlotSize(slot);
    if (slotSize) {
        return slotSize;
    }

    slotSize = getMilitarySlotSize(ship, slot);
    if (slotSize) {
        return slotSize;
    }

    return getInternalSlotSize(slot);
}
