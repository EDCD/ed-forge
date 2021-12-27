/**
 * @module Data
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { IllegalStateError, UnknownRestrictedError } from '../errors';
import { BitVec } from '../types';
import { assertValidShip, getShipInfo } from './ships';
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

export enum SIZES {
    SIZE0 = '0',
    SIZE1 = '1',
    SIZE2 = '2',
    SIZE3 = '3',
    SIZE4 = '4',
    SIZE5 = '5',
    SIZE6 = '6',
    SIZE7 = '7',
    SIZE8 = '8',
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
    HUGE = 'huge',
}

const HPT_SIZES = {
    [SIZES.SMALL]: 1,
    [SIZES.MEDIUM]: 2,
    [SIZES.LARGE]: 3,
    [SIZES.HUGE]: 4,
};

const REG_INTERNAL_SLOT = /Slot\d{2}_Size(\d)/i;

/**
 *
 * @param slot Slot to check
 * @returns Type of slot if valid and possible size string
 */
function assertValidSlotType(ship: string, slot: string): { type: BitVec, size?: SIZES } {
    ship = assertValidShip(ship);
    let type;
    if (slot.match(/Armour/i)) {
        type = ARMOUR;
    } else if (slot.match(/PowerPlant/i)) {
        type = POWERPLANT;
    } else if (slot.match(/MainEngines/i)) {
        type = ENGINES;
    } else if (slot.match(/FrameShiftDrive/i)) {
        type = FSD;
    } else if (slot.match(/LifeSupport/i)) {
        type = LIFE_SUPPORT;
    } else if (slot.match(/PowerDistributor/i)) {
        type = POWER_DISTRIBUTOR;
    } else if (slot.match(/Radar/i)) {
        type = SENSORS ;
    } else if (slot.match(/FuelTank/i)) {
        type = FUEL_TANK;
    }

    if (type) {
        return { type, size: getShipInfo(ship).meta.coreSizes[slot] as SIZES };
    }

    let m = slot.match(REG_INTERNAL_SLOT);
    if (m) {
        return { type: INTERNAL, size: m[1] as SIZES };
    }

    if (slot.match(/Military(\d{2})/i)) {
        return { type: MILITARY, size: getShipInfo(ship).meta.militarySizes[slot] as SIZES };
    }

    m = slot.match(/(Small|Medium|Large|Huge)Hardpoint/i);
    if (m) {
        return { type: HARDPOINT, size: m[1].toLowerCase() as SIZES };
    }

    if (slot.match(/TinyHardpoint(\d)/i)) {
        return { type: UTILITY, size: SIZES.SIZE0 };
    }
    if (slot.match(/CargoHatch/i)) {
        return { type: CARGO_HATCH, size: SIZES.SIZE1 };
    }

    // If we're still here, type is invalid
    throw new UnknownRestrictedError(`Don't know slot ${slot}`);
}

/**
 * Checks whether a slot is valid and returns the sanitized slot ID.
 * @param slot Slot ID
 * @returns Lowercase slot ID
 */
export function assertValidSlot(ship: string, slot: string): string {
    assertValidSlotType(ship, slot);
    return slot.toLowerCase();
}

/**
 * Get the size of a slot; bulkheads and utility slots have size 0.
 * @param ship Ship ID
 * @param slot Slot ID
 * @returns Slot size
 */
function sizeStrToNum(size: SIZES): number {
    const sizeNumber = Number(size);
    if (isNaN(sizeNumber)) {
        return HPT_SIZES[size];
    } else {
        return sizeNumber;
    }
}

export class Slot {
    private type: BitVec;
    private size: string;
    private sizeNum: number;
    private slot: string;

    constructor(ship: string, slot: string) {
        autoBind(this);
        this.slot = slot.toLowerCase();
        const { type, size } = assertValidSlotType(ship, slot);
        this.type = type;
        this.size = size;
        this.sizeNum = sizeStrToNum(size);
    }

    public getSize(): string {
        return this.size;
    }

    public getSizeNum(): number {
        return this.sizeNum;
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
