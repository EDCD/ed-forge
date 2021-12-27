import { Factory, Ship } from "../../src";
import { TYPES } from "../../src/data/slots";
import { BitVec } from "../../src/types";

let ship: Ship;

describe('can\'t set certain modules twice', () => {
    beforeEach(() => {
        // Set up a clean ship and get rid of its internals because these might
        // throw when other modules get added
        ship = Factory.newShip('anaconda');
        ship.getInternals().forEach(internal => internal.reset());
    });

    function testSetTwice(typeAndSize: [string, string], slotType: BitVec) {
        let [type, size] = typeAndSize;
        test(type, () => {
            let [ firstSlot, secondSlot ] = ship.getModules(slotType, undefined, true);
            firstSlot.setItem(type, size, '1');
            expect(() => {
                secondSlot.setItem(type, size, '1');
            }).toThrow();
        });
    }

    ([
        ['ShieldGen', '4'], ['FuelScoop', '4'], ['SurfaceScanner', ''],
        ['FSDInterdictor', '4'], ['Refinery', '4'], ['DockingComputer', ''],
        ['SuperCruiseAssist', ''], ['FSDBooster', '4'], ['FighterBay', '5']
    ] as [string, string][]).map(typeAndSize => testSetTwice(typeAndSize, TYPES.INTERNAL));

    ([
        ['KillWarrantScanner', ''], ['WakeScanner', ''], ['XenoScanner', ''],
        ['PulseWaveAnalyzer', ''], ['ManifestScanner', '']
    ] as [string, string][]).map(typeAndSize => testSetTwice(typeAndSize, TYPES.UTILITY));
});
