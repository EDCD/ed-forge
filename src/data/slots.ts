/**
 * @module Data
 */

/**
 * Ignore
 */
import { UnknownRestrictedError } from '../errors';
import { matchesAny } from '../helper';
import { assertValidShip, getShipInfo } from './ships';

export const REG_CORE_SLOT = /(Armour|PowerPlant|MainEngines|FrameShiftDrive|LifeSupport|PowerDistributor|Radar|FuelTank)/i;
export const REG_INTERNAL_SLOT = /Slot(\d{2})_Size(\d)/i;
export const REG_MILITARY_SLOT = /Military(\d{2})/i;
export const REG_HARDPOINT_SLOT = /(Small|Medium|Large|Huge)Hardpoint/i;
export const REG_UTILITY_SLOT = /TinyHardpoint(\d)/i;

/**
 * Checks whether a slot is valid.
 * @param slot Slot ID
 */
export function assertValidSlot(slot: string) {
    if (
        !matchesAny(
            slot,
            REG_CORE_SLOT,
            REG_INTERNAL_SLOT,
            REG_MILITARY_SLOT,
            REG_HARDPOINT_SLOT,
            REG_UTILITY_SLOT,
        )
    ) {
        throw new UnknownRestrictedError(`Don't know slot ${slot}`);
    }
}

/**
 * Returns the size of a core slot of a given ship.
 * @param ship Ship ID
 * @param slot Slot ID
 * @returns Core slot size
 */
export function getCoreSlotSize(ship: string, slot: string): number {
    assertValidSlot(slot);
    return getShipInfo(ship).meta.coreSizes[slot];
}

/**
 * Returns the size of a given military slot.
 * @param ship Ship ID
 * @param slot Slot ID
 * @returns Military slot size
 */
export function getMilitarySlotSize(ship: string, slot: string): number {
    assertValidSlot(slot);
    return getShipInfo(ship).meta.militarySizes[slot];
}

/**
 * Returns the size of an internal slot.
 * @param slot Slot ID
 * @returns Internal slot size
 */
export function getInternalSlotSize(slot: string): number {
    assertValidSlot(slot);
    const m = slot.match(REG_INTERNAL_SLOT);
    if (m) {
        return Number(m[2]);
    }
}

/**
 * Returns the size of a hardpoint slot from 1 to 4 where 1 is the size of a
 * small and 4 is the size of a huge hardpoint.
 * @param slot Slot ID
 * @returns Hardpoint slot size
 */
export function getHardpointSlotSize(slot: string): number {
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

/**
 * Get the size of a slot; bulkheads and utility slots have size 0.
 * @param ship Ship ID
 * @param slot Slot ID
 * @returns Slot size
 */
export function getSlotSize(ship: string, slot: string): number {
    assertValidShip(ship);
    assertValidSlot(slot);
    let slotSize = getCoreSlotSize(ship, slot);
    if (slotSize !== undefined) {
        return slotSize;
    }

    slotSize = getHardpointSlotSize(slot);
    if (slotSize !== undefined) {
        return slotSize;
    }

    slotSize = getMilitarySlotSize(ship, slot);
    if (slotSize !== undefined) {
        return slotSize;
    }

    return getInternalSlotSize(slot);
}
