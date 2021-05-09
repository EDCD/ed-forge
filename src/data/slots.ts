/**
 * @module Data
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { UnknownRestrictedError } from '../errors';
import { BitVec } from '../types';
import { getShipInfo } from './ships';
import {
    ARMOUR, CARGO_HATCH, ENGINES, FSD, FUEL_TANK, HARDPOINT, INTERNAL,
    LIFE_SUPPORT, MILITARY, POWERPLANT, POWER_DISTRIBUTOR, SENSORS, UTILITY,
} from './slots.json';

const CORE = ARMOUR | POWERPLANT | ENGINES | FSD | LIFE_SUPPORT
| POWER_DISTRIBUTOR | SENSORS | FUEL_TANK;
const ANY_INTERNAL = INTERNAL | MILITARY;

export const TYPES = {
    ANY_INTERNAL, ARMOUR, CARGO_HATCH, CORE, ENGINES, FSD, FUEL_TANK, HARDPOINT,
    INTERNAL, LIFE_SUPPORT, MILITARY, POWERPLANT, POWER_DISTRIBUTOR, SENSORS,
    UTILITY,
};

function assertValidSlotType(slot: string): BitVec {
    const type = getSlotType(slot);
    if (type === undefined) {
        throw new UnknownRestrictedError(`Don't know slot ${slot}`);
    }
    return type;
}

/**
 * Checks whether a slot is valid and returns the sanitized slot ID.
 * @param slot Slot ID
 * @returns Lowercase slot ID
 */
export function assertValidSlot(slot: string): string {
    assertValidSlotType(slot);
    return slot.toLowerCase();
}

const REG_INTERNAL_SLOT = /Slot(\d{2})_Size(\d)/i;

function getSlotType(slot: string): BitVec {
    if (slot.match(/Armour/i)) {
        return ARMOUR;
    } else if (slot.match(/PowerPlant/i)) {
        return POWERPLANT;
    } else if (slot.match(/MainEngines/i)) {
        return ENGINES;
    } else if (slot.match(/FrameShiftDrive/i)) {
        return FSD;
    } else if (slot.match(/LifeSupport/i)) {
        return LIFE_SUPPORT;
    } else if (slot.match(/PowerDistributor/i)) {
        return POWER_DISTRIBUTOR;
    } else if (slot.match(/Radar/i)) {
        return SENSORS;
    } else if (slot.match(/FuelTank/i)) {
        return FUEL_TANK;
    } else if (slot.match(REG_INTERNAL_SLOT)) {
        return INTERNAL;
    } else if (slot.match(/Military(\d{2})/i)) {
        return MILITARY;
    } else if (slot.match(/(Small|Medium|Large|Huge)Hardpoint/i)) {
        return HARDPOINT;
    } else if (slot.match(/TinyHardpoint(\d)/i)) {
        return UTILITY;
    } else if (slot.match(/CargoHatch/i)) {
        return CARGO_HATCH;
    } else {
        return undefined;
    }
}

/**
 * Returns the size of a core slot of a given ship.
 * @param ship Ship ID
 * @param slot Slot ID
 * @returns Core slot size
 */
function getCoreSlotSize(ship: string, slot: string): number {
    return getShipInfo(ship).meta.coreSizes[slot];
}

/**
 * Returns the size of a given military slot.
 * @param ship Ship ID
 * @param slot Slot ID
 * @returns Military slot size
 */
function getMilitarySlotSize(ship: string, slot: string): number {
    return getShipInfo(ship).meta.militarySizes[slot];
}

/**
 * Returns the size of an internal slot.
 * @param slot Slot ID
 * @returns Internal slot size
 */
function getInternalSlotSize(slot: string): number {
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
function getHardpointSlotSize(slot: string): number {
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
function getSlotSize(ship: string, slot: string): number {
    if (slot.match(/CargoHatch/i)) {
        return 1;
    }

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

export class Slot {
    private type: BitVec;
    private size: number;
    private slot: string;

    constructor(ship: string, slot: string) {
        autoBind(this);
        this.slot = slot.toLowerCase();
        this.type = assertValidSlotType(slot);
        this.size = getSlotSize(ship, slot);
    }

    public getSize(): number {
        return this.size;
    }

    public is(check: BitVec | string | RegExp): boolean {
        if (check instanceof RegExp) {
            if (this.slot.match(check)) {
                return true;
            }
        } else if (typeof check === 'number') {
            if (this.type & check) {
                return true;
            }
        } else {  // check is string
            if (this.slot === check) {
                return true;
            }
        }
    }

    public toString(): string {
        return this.slot;
    }
}
