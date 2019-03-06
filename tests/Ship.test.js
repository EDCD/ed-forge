
import { Ship } from '..';
import { assertValidSlot, REG_CORE_SLOT, REG_INTERNAL_SLOT, REG_MILITARY_SLOT, REG_HARDPOINT_SLOT, REG_UTILITY_SLOT } from '../lib/data/slots';
import { matchesAny } from '../lib/helper';
import { clone } from 'lodash';

import * as anacondaBuild from './fixtures/anaconda.json';

function randomString(length = -1) {
    let str = String(Math.round(Number.MAX_SAFE_INTEGER * Math.random()));
    let strLen = length >= 0 ? Math.floor(Math.random() * length) : str.length;
    return str.substring(0, strLen);
}

let ship;
beforeEach(() => {
    ship = new Ship(anacondaBuild);
});

test('ship can be imported', () => {
    expect(ship).toBeTruthy();
});

test('modules are imported with correct items', () => {
    for (let module of anacondaBuild.Modules) {
        let slot = module.Slot;
        try { assertValidSlot(slot) } catch {
            continue;
        }
        expect(ship.getModule(slot).getItem()).toEqual(module.Item);
    }
});

test('modules are imported with correct blueprints', () => {
    for (let module of anacondaBuild.Modules) {
        if (!module.Engineering) {
            continue;
        }

        let importedModule = ship.getModule(module.Slot);
        for (let modifier of module.Engineering.Modifiers) {
            let { Label, Value } = modifier;
            expect(importedModule.get(Label)).toEqual(Value);
        }
    }
});

test('when querying core modules, only core modules are returned', () => {
    for (let core of ship.getCoreModules()) {
        expect(core._object.Slot).toMatch(REG_CORE_SLOT);
    }
});

test('when querying internal modules, only internal modules are returned', () => {
    for (let core of ship.getCoreModules()) {
        expect(matchesAny(core._object.Slot, REG_INTERNAL_SLOT, REG_CORE_SLOT)).toBeTruthy();
    }
});

test('when querying hardpoints, only hardpoints are returned', () => {
    for (let hardpoint of ship.getHardpoints()) {
        expect(hardpoint._object.Slot).toMatch(REG_HARDPOINT_SLOT);
    }
});

test('when querying utilities, only utilities are returned', () => {
    for (let hardpoint of ship.getUtilities()) {
        expect(hardpoint._object.Slot).toMatch(REG_UTILITY_SLOT);
    }
});

test('can query ship name', () => {
    expect(ship.getShipName()).toEqual(anacondaBuild['ShipName']);
});

test('can set shipname', () => {
    let name = randomString();
    ship.setShipName(name);
    expect(ship.getShipName()).toEqual(name);
});

test('can query ship ID', () => {
    expect(ship.getShipID()).toEqual(anacondaBuild['ShipIdent']);
});

test('can set ship id', () => {
    let id = randomString(6);
    ship.setShipID(id);
    expect(ship.getShipID()).toEqual(id);
});

test('can get distributor settings', () => {
    let distObj = ship.getDistributorSettingsObject();
    let dist = ship.getDistributorSettings();
    expect(dist.Sys).toEqual(distObj.Sys.base + distObj.Sys.mc);
    expect(dist.Eng).toEqual(distObj.Eng.base + distObj.Eng.mc);
    expect(dist.Wep).toEqual(distObj.Wep.base + distObj.Wep.mc);

    let sum = dist.Sys + dist.Eng + dist.Wep
    expect(sum).toBeGreaterThanOrEqual(6);
    expect(sum).toBeLessThanOrEqual(8);
});

test('can reset pips', () => {
    ship.pipsReset();
    let dist = ship.getDistributorSettings();
    expect(dist.Sys).toEqual(2);
    expect(dist.Eng).toEqual(2);
    expect(dist.Wep).toEqual(2);
});

test('can fully export the build', () => {
    let spec = clone(anacondaBuild);
    spec.Modules = expect.arrayContaining(anacondaBuild.Modules);
    expect(ship.toJSON()).toMatchObject(spec);
});
