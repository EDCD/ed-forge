import { Factory, Ship } from "../../lib";

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
