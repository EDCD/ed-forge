import { Factory, Module, Ship } from '..';
import lz from 'lz-string';
import zlib from 'zlib';
import { TYPES } from './slots';
import * as CORIOLIS from './coriolis.json';
import { fill, zip } from 'lodash';
import { IllegalChangeError, IllegalStateError } from '../errors';

/**
 * Get a ship's internal modules sorted as does coriolis.
 * @param ship Ship to get internals for
 * @param excludeMilitary Old loadout strings may not include military slots
 * @returns Internals as coriolis sorts them
 */
export function internalsInCoriolisOrder(ship: Ship, excludeMilitary: boolean = false): Module[] {
  const internals = ship.getModules(TYPES.INTERNAL, undefined, true);
  if (!excludeMilitary) {
    // Insert military modules at the position where the first item of a smaller
    // size is...
    const findCondition = ship.getShipType().startsWith('typex') || ship.getShipType() === 'type9_military' ?
      // ...unless this is an alliance ship or the type 10. Then right before
      // the size 1 slot.
      (mil: Module, int: Module) => int.getSizeNum() <= 1 :
      (mil: Module, int: Module) => int.getSizeNum() < mil.getSizeNum();

    const militaries = ship.getModules(TYPES.MILITARY, undefined, true).map(
      (m) => {
        // Find the first slot that is smaller then this military slot. Remember
        // the index so that we can insert it later.
        let i = internals.findIndex((int) => findCondition(m, int));
        // If there is no such index, the military slot is the smallest. Insert
        // it as last element.
        i = i < 0 ? internals.length : i;
        return [i, m];
      },
    ) as [number, Module][];
    militaries.sort().reverse().forEach(([index, module]) => {
      internals.splice(index, 0, module);
    });
  }
  return internals;
}

function unescapeUrlSafe(d: string): string {
  return d.replace(/-/g, '/').replace(/_/g, '+');
}

enum SIGNAL { EMPTY, TERMINATED }

/**
 * Try to read a next character from the iterator.
 * @param iterator Iterator to read from
 * @param terminator Terminator symbol
 * @returns Symbol to read
 * @throws [[SIGNAL]] if iterator is empty or terminator is encountered.
 */
function next<T>(iterator: IterableIterator<any>, terminator?: T): T {
  const { value, done } = iterator.next();
  if (done) {
    throw SIGNAL.EMPTY;
  } else if (value === terminator) {
    throw SIGNAL.TERMINATED;
  }
  return value as T;
}

/**
 * Reads an iterator supplying values of type T n times (or until the iterator
 * ends).
 * @param iterator Iterator to read from
 * @param n Items to read
 * @returns Read values.
 */
function readBufN(iterator: IterableIterator<any>, n: number, terminator?: number): Buffer {
  return Buffer.from(Array(n).fill(undefined).map(() => next(iterator, terminator)));
}

/**
 * Decode an item string containing coriolis module ids. Ids are two characters
 * long but they can be omitted by a `-` character.
 * @param str Item string
 * @returns Array of coriolis ids
 */
function decodeItemsString(str: string): string[] {
  const ids = [];

  const iterator = str[Symbol.iterator]();
  try {
    while (true) {
      const firstDigit = next(iterator) as string;
      if (firstDigit === '-') {
        ids.push(undefined);
      } else {
        const secondDigit = next(iterator) as string;
        ids.push(firstDigit + secondDigit);
      }
    }
  } catch (e) {
    if (e !== SIGNAL.EMPTY && e !== SIGNAL.TERMINATED) throw e;
  }

  return ids;
}

interface Modification {
  blueprint: string,
  grade: number,
  experimental?: string,
}

const TERMINATOR: number = 255;  // or -1 as readInt8()
enum MOD_TYPE {
  BP = -2,
  GRADE = -3,
  SPECIAL = -4,
}

/**
 * Read modifications struct encoded as buffer. Buffer has the form:
 * > ([INDEX]([ID][VALUE])*[TERMINATOR])*[TERMINATOR]
 *
 * - [INDEX] is a one byte value pointing to the slot that's modified
 * - [ID] is a one byte value either being a property index (e.g., a number for
 *   'mass') or a special negative value denoting the blueprint itself, etc.
 * - [TERMINATOR] is a one byte -1
 * @param buf Buffer to read from
 * @returns Modifications as array corresponding to slots of the same index
 */
function decodeModificationsBuffer(buf: Buffer): Modification[] {
  // Stores modifications by slot index. Slot index is determined from context.
  const modifications = [];

  // Wrap buffer reads in try catch block because `readBuf` throws when stream
  // finishes.
  try {
    const iterator = buf[Symbol.iterator]();
    while (true) {
      const slotIndex = readBufN(iterator, 1, TERMINATOR).readInt8(0);

      // Read details of the modification
      let blueprint: string, grade: number, experimental: string;
      try {
        while (true) {
          const id = readBufN(iterator, 1, TERMINATOR).readInt8(0);
          const fieldValue = readBufN(iterator, 4).readInt32LE(0);
          switch (id) {
            case MOD_TYPE.BP:
              // Value and encodes blueprint id
              blueprint = CORIOLIS.BlueprintIds[fieldValue]; break;
            case MOD_TYPE.GRADE:
              // Value and encodes grade
              grade = fieldValue; break;
            case MOD_TYPE.SPECIAL:
              // Value and encodes special effect
              experimental = CORIOLIS.ExperimentalIds[fieldValue]; break;
            default:
              // Value encodes modification
              // TODO: we skip this for now
              // NOTE: If id is 40 here then this is a damagedist string
          }
        }
      } catch (e) {
        if (e !== SIGNAL.TERMINATED) throw e;
      }

      if (blueprint && grade) {
        modifications[slotIndex] = { blueprint, grade, experimental };
      }
    }
  } catch (e) {
    // TODO: Better error class
    if (e === SIGNAL.EMPTY) throw new Error('Unexpected end of buffer');
    else if (e !== SIGNAL.TERMINATED) throw e;
  }
  return modifications;
}

const BULKHEAD_INDEX_TO_GRADE = {
  0: 'grade1',
  1: 'grade2',
  2: 'grade3',
  3: 'mirrored',
  4: 'reactive',
};

/**
 * Try to parse a coriolis code for a ship. Currently, precise modifications
 * are not supported.
 * @param shipType Coriolis ship type to parse the code for
 * @param code Coriolis code
 * @returns Ship build and a (possibly empty) array of errors while parsing.
 */
export function parseCoriolisCode(shipType: string, code: string): [Ship, Error[]] {
  const ship = Factory.newShip(CORIOLIS.Ships[shipType.toLowerCase()]);

  // Coriolis code is segmented by dots.
  const parts = code.split('.');

  // If code starts with a digit this is a legacy module that does not include
  // military slots. Drop them again!
  let itemStr = parts[0];
  const noMilitary = Boolean(itemStr.match(/^[0-4]/));
  if (!noMilitary) {
    // Drop version character
    itemStr = itemStr.substring(1);
  }

  // Bulkheads are stored as index in the first character
  const bulkheads = BULKHEAD_INDEX_TO_GRADE[itemStr[0]];
  itemStr = itemStr.substring(1);

  // Create module array in the same order as coriolis
  // Drop bulkheads for core - handled in a special way.
  const core = ship.getCoreModules();
  const hardpoint = ship.getHardpoints(undefined, true);
  const utility = ship.getUtilities(undefined, true);
  const internal = internalsInCoriolisOrder(ship, noMilitary);
  const modules = core.concat(hardpoint).concat(utility).concat(internal);

  // Decode the items of the ship
  const itemIds = decodeItemsString(itemStr);
  // Insert an undefined id for the bulkheads. They're handled especially later.
  itemIds.unshift(undefined);
  fill(itemIds, undefined, itemIds.length, modules.length);

  // Second part stores which modules are enabled. This is a base64 encoded, LZ
  // compressed string of 0s and 1s.
  let enabled: boolean[] = [];
  if (parts[1]) {
    enabled = (lz.decompressFromBase64(unescapeUrlSafe(parts[1])) as string)
      .split('')
      .map((char) => Boolean(Number(char)));
  }
  // Fill any missing bits with undefined
  fill(enabled, undefined, enabled.length, modules.length);

  // Third part holds the priority group of each module. Similar format as
  // second part but arbitrary numbers.
  let priorities: number[] = [];
  if (parts[2]) {
    priorities = (lz.decompressFromBase64(unescapeUrlSafe(parts[2])) as string)
      .split('')
      .map((char) => Number(char));
  }
  fill(priorities, undefined, priorities.length, modules.length);

  // Fourth part holds modifications. This can be one of two formats. Formats
  // can be distinguished if one contains a colon.
  let modifications: Modification[] = [];
  if (parts[3]) {
    if (parts[3].match(/:/)) {
      // NOTE: I was not able to find a build in a thousand random builds from
      // the link shortener which was of this format. Hence, let's just throw an
      // exception.
      // TODO: Use custom error class
      throw new Error('Unsupported modifications string format');
    } else {
      // It's a gzip compressed, base64 encoded string.
      decodeModificationsBuffer(
        zlib.gunzipSync(Buffer.from(unescapeUrlSafe(parts[3]), 'base64')),
      );
    }
  }
  fill(modifications, undefined, modifications.length, modules.length);

  // Coriolis has collisions amongst its ids if not separated by type. Cope with
  // this here.
  const types = core.map(() => 'Core')
    .concat(hardpoint.map(() => 'Hardpoint'))
    .concat(utility.map(() => 'Hardpoint'))
    .concat(internal.map(() => 'Internal'));

  // First, clear all modules. It might happen that otherwise, invariants are
  // violated (e.g., when a bigger shield generator than the stock ship is
  // imported) before the stock shield generator is cleared.
  modules.forEach((module) => module.reset());
  const errors = [];
  zip(modules, zip(types, itemIds), enabled, priorities, modifications).forEach(
    ([slot, [type, id], isEnabled, priority, modification]) => {
      const item = CORIOLIS.Modules[type][id];
      if (item) {
        try {
          try {
            slot.setItem(item);
          } catch (err) {
            // Sometimes for core modules, the id does not encode the *id* but the
            // class/rating string. Try this next.
            if (err instanceof IllegalStateError && type === 'Core') {
              slot.setItem(slot.readMeta('group'), id.charAt(0), id.charAt(1));
            } else throw err;
          }

          if (isEnabled !== undefined) slot.setEnabled(isEnabled);
          if (priority !== undefined) slot.setPowerPriority(priority);
          if (modification !== undefined) {
            const { blueprint, grade, experimental } = modification;
            slot.setBlueprint(blueprint, grade, 1, experimental);
          }
        } catch (err) {
          // There are two reasons why we might end here: a blueprint could not
          // be applied because old versions of coriolis mapped modification
          // names differently to actual modifications. This means that we
          // sometimes cannot restore them faithfully; or an item could not be
          // applied because some old coriolis builds are invalid. Keep the
          // respective slot cleared.
          if (err instanceof IllegalChangeError) {
            errors.push(err);
          } else throw err;
        }
      }
    },
  );

  // Finally set the bulkheads. It's important that this happens after the loop
  // above because we inserted an undefined item which resets the slot.
  ship.getAlloys().setItem('armour', ship.getShipType(), bulkheads);

  return [ship, errors];
}
