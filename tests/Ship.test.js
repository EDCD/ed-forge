
import { Ship } from '..';
import { assertValidSlot, REG_CORE_SLOT, REG_INTERNAL_SLOT, REG_MILITARY_SLOT, REG_HARDPOINT_SLOT, REG_UTILITY_SLOT } from '../lib/data/slots';
import { matchesAny, mapValuesDeep } from '../lib/helper';
import { clone, pickBy, values } from 'lodash';

import * as SHIPS from '../lib/data/ships.json';

function randomString(length = -1) {
    let str = String(Math.round(Number.MAX_SAFE_INTEGER * Math.random()));
    let strLen = length >= 0 ? Math.floor(Math.random() * length) : str.length;
    return str.substring(0, strLen);
}

function prec3(number) {
    return Math.round(number * 1000) / 1000;
}

for (let { name, build } of TEST_SUITES) {
    describe(`Ship recreation for ${name}`, () => {
        let ship;
        beforeEach(() => {
            ship = new Ship(build);
        });

        test('ship can be imported', () => {
            expect(ship).toBeTruthy();
        });

        describe('modules are imported with correct items', () => {
            for (let module of build.Modules) {
                let slot = module.Slot;
                try { assertValidSlot(slot) } catch {
                    continue;
                }
                test(`Slot ${slot} has the right item`, () => {
                    expect(ship.getModule(slot).getItem()).toEqual(module.Item.toLowerCase());
                });
            }
        });

        describe('modules are imported with correct blueprints', () => {
            for (let module of build.Modules) {
                if (!module.Engineering) {
                    continue;
                }

                for (let modifier of module.Engineering.Modifiers) {
                    let { Label, Value } = modifier;
                    if (Label === 'DamageType') { // we ignore non-number mods for now
                        continue;
                    }
                    test(`${Label} on ${module.Slot} with ${module.Item} is modified correctly`, () => {
                        let importedModule = ship.getModule(module.Slot);
                        expect(prec3(importedModule.get(Label))).toEqual(prec3(Value));
                    });
                }
            }
        });

        test('when querying core modules, only core modules are returned', () => {
            for (let core of ship.getCoreModules()) {
                expect(core.object.Slot).toMatch(REG_CORE_SLOT);
            }
        });

        test('when querying internal modules, only internal modules are returned', () => {
            for (let core of ship.getCoreModules()) {
                expect(matchesAny(core.object.Slot, REG_INTERNAL_SLOT, REG_CORE_SLOT)).toBeTruthy();
            }
        });

        test('when querying hardpoints, only hardpoints are returned', () => {
            for (let hardpoint of ship.getHardpoints()) {
                expect(hardpoint.object.Slot).toMatch(REG_HARDPOINT_SLOT);
            }
        });

        test('when querying utilities, only utilities are returned', () => {
            for (let hardpoint of ship.getUtilities()) {
                expect(hardpoint.object.Slot).toMatch(REG_UTILITY_SLOT);
            }
        });

        test('can query ship name', () => {
            expect(ship.getShipName()).toEqual(build['ShipName']);
        });

        test('can set shipname', () => {
            let name = randomString();
            ship.setShipName(name);
            expect(ship.getShipName()).toEqual(name);
        });

        test('can query ship ID', () => {
            expect(ship.getShipID()).toEqual(build['ShipIdent']);
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

        let toLowerCase = v => typeof v === 'string' ? v.toLowerCase() : v;

        describe('export tests', () => {
            let spec;
            let json;
            let modulesMap;
            beforeEach(() => {
                spec = clone(build);
                // Transform all string values to lower case
                spec.Ship = spec.Ship.toLowerCase();
                spec.Modules = mapValuesDeep(spec.Modules, toLowerCase);
                modulesMap = {};
                for (let module of spec.Modules) {
                    modulesMap[module.Slot] = module;
                }

                json = ship.toJSON();
            });

            test('can export ship details', () => {
                let checkNotModules = (v, k) => k != 'Modules';
                expect(pickBy(json, checkNotModules)).toMatchObject(pickBy(spec, checkNotModules));
            });

            describe('modules are exported correct individually', () => {
                let checkNotEngineering = (v, k) => k != 'Engineering';
                let checkNotModifiers = (v, k) => k != 'Modifiers';
                let modifiersRestricted = modifier => {
                    let Value = prec3(modifier.Value);
                    let Label = modifier.Label;
                    return { Label, Value };
                }
                for (let m of build.Modules) {
                    let slot = m.Slot.toLowerCase();
                    test(slot, () => {
                        let module = ship.getModule(slot);
                        if (module) { // there may be slots like livery ones
                            let moduleJSON = module.toJSON();
                            let specJSON = modulesMap[slot];
                            // Expect that the first level of property matches
                            expect(pickBy(moduleJSON, checkNotEngineering))
                                .toMatchObject(pickBy(specJSON, checkNotEngineering));

                            if (moduleJSON.Engineering) {
                                // Expect that the first level of engineering properties matches
                                expect(pickBy(moduleJSON.Engineering, checkNotModifiers))
                                    .toMatchObject(pickBy(specJSON.Engineering, checkNotModifiers));

                                // Expect that original modifiers are contained in the new ones
                                let expectedModifiers = specJSON.Engineering.Modifiers
                                    // But we don't handle damagetype currently
                                    // TODO:
                                    .filter(modi => modi.Label != 'damagetype')
                                    // And we only care about certain fields
                                    // TODO:
                                    .map(modifiersRestricted);
                                let actualModifiers = moduleJSON.Engineering.Modifiers
                                    .map(modifiersRestricted);

                                expect(actualModifiers).toEqual(expect.arrayContaining(expectedModifiers));
                            }
                        }
                    });
                }
            });

            test('can fully export the build', () => {
                expect(
                    json.Modules
                ).toEqual(expect.arrayContaining(
                    ship.getModules(undefined, undefined, true).map(m => m.toJSON())
                ));
            });
        });
    });
}

const HANGAR = 'int_fighterbay_size5_class1';
describe('Adding SLF hangars', () => {
    for (let shipDescriptor of values(SHIPS.default)) {
        if (shipDescriptor.meta.fighterHangars) {
            test(`Can equip a SLF on ${shipDescriptor.proto.Ship}`, () => {
                let ship = new Ship(shipDescriptor.proto);
                let slot = ship.getModule(/Size5/i);
                expect(() => {
                    slot.setItem(HANGAR);
                }).not.toThrow();
                expect(slot.getItem()).toEqual(HANGAR);
            });
        } else {
            let ship = new Ship(shipDescriptor.proto);
            let slot = ship.getModule(/Size5/i);
            if (!slot) {
                continue;
            }

            test(`Can't equip a SLF on ${shipDescriptor.proto.Ship}`, () => {
                expect(() => {
                    slot.setItem(HANGAR);
                }).toThrow();
            });
        }
    }
});

const LUXURY = 'int_passengercabin_size5_class4';
describe('Adding luxury cabins', () => {
    for (let shipDescriptor of values(SHIPS.default)) {
        if (shipDescriptor.meta.luxuryCabins) {
            test(`Can equip luxury cabins on ${shipDescriptor.proto.Ship}`, () => {
                let ship = new Ship(shipDescriptor.proto);
                let slot = ship.getModule(/Size5/i);
                expect(() => {
                    slot.setItem(LUXURY);
                }).not.toThrow();
                expect(slot.getItem()).toEqual(LUXURY);
            });
        } else {
            let ship = new Ship(shipDescriptor.proto);
            let slot = ship.getModule(/Size5/i);
            if (!slot) {
                continue;
            }

            test(`Can't equip luxury cabins on ${shipDescriptor.proto.Ship}`, () => {
                expect(() => {
                    slot.setItem(LUXURY);
                }).toThrow();
            });
        }
    }
});
