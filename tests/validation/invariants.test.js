import { Factory, Ship } from "../../lib";
import { keys, difference } from 'lodash';
import { LUXURY_SHIPS, SLF_SHIPS } from '../../lib/validation/invariants';
import * as SHIPS from '../../lib/data/SHIPS.json';

let ship;

describe('can\'t set certain modules twice', () => {
    beforeEach(() => {
        // Set up a clean ship and get rid of its internals because these might
        // throw when other modules get added
        ship = Factory.newShip('anaconda');
        ship.getInternals().map(internal => internal.reset());
    });

    function testSetTwice(typeAndSize, slotsGetter) {
        let [type, size] = typeAndSize;
        test(type, () => {
            let [ firstSlot, secondSlot ] = slotsGetter.call(ship, undefined, true);
            firstSlot.setItem(type, size, '1');
            expect(() => {
                secondSlot.setItem(type, size, '1');
            }).toThrow();
        });
    }

    [
        ['ShieldGen', '4'], ['FuelScoop', '4'], ['SurfaceScanner', ''],
        ['FSDInterdictor', '4'], ['Refinery', '4'], ['DockingComputer', ''],
        ['SuperCruiseAssist', ''], ['FSDBooster', '4'], ['FighterBay', '5']
    ].map(typeAndSize => testSetTwice(typeAndSize, Ship.prototype.getInternals));

    [
        ['KillWarrantScanner', ''], ['WakeScanner', ''], ['XenoScanner', ''],
        ['PulseWaveAnalyzer', ''], ['ManifestScanner', '']
    ].map(typeAndSize => testSetTwice(typeAndSize, Ship.prototype.getUtilities));
});

const ALL_SHIPS = keys(SHIPS);
// remove default export key in next line as well
const NO_LUXURY_SHIPS = difference(ALL_SHIPS, LUXURY_SHIPS.concat(['default']));
const LUXURY = 'int_passengercabin_size5_class4';

describe('can\'t add a luxury class cabins to all ships', () => {
    for (let shipType of NO_LUXURY_SHIPS) {
        ship = Factory.newShip(shipType);
        let slot = ship.getModule(/Size5/i);
        if (!slot) {
            continue;
        }

        test(shipType, () => {
            expect(() => {
                slot.setItem(LUXURY);
            }).toThrow();
        });
    }
});

describe('can add luxury class cabins to liners', () => {
    for (let shipType of LUXURY_SHIPS) {
        test(shipType, () => {
            ship = Factory.newShip(shipType);
            let slot = ship.getModule(/Size5/i);
            expect(() => {
                slot.setItem(LUXURY);
            }).not.toThrow();
            expect(slot.getItem()).toEqual(LUXURY);
        });
    }
});

// remove default export key in next line as well
const NO_SLF_SHIP = difference(ALL_SHIPS, SLF_SHIPS.concat(['default']));
const HANGAR = 'int_fighterbay_size5_class1';

describe('can\'t add fighter hangars to all ships', () => {
    for (let shipType of NO_SLF_SHIP) {
        ship = Factory.newShip(shipType);
        let slot = ship.getModule(/Size5/i);
        if (!slot) {
            continue;
        }

        test(shipType, () => {
            expect(() => {
                slot.setItem(HANGAR);
            }).toThrow();
        });
    }
});

describe('can add fighter hangars to right ships', () => {
    for (let shipType of SLF_SHIPS) {
        test(shipType, () => {
            ship = Factory.newShip(shipType);
            let slot = ship.getModule(/Size5/i);
            expect(() => {
                slot.setItem(HANGAR);
            }).not.toThrow();
            expect(slot.getItem()).toEqual(HANGAR);
        });
    }
});
