
import { Ship } from '../src';
import { assertValidSlot } from '../src/data/slots';
import { TestSuites } from './types';

/**
 * Round a number to `grade` decimal points.
 * @param grade How many decimal points to round to?
 * @param number Number to round
 * @returns Rounded number
 */
function prec(grade: number, number: number): number {
    let base = Math.pow(10, grade);
    return Math.round(number * base) / base;
}

for (let { name, build } of (global as any).TEST_SUITES as TestSuites) {
    describe(`Blueprint recreation for ${name}`, () => {
        let ship = new Ship(build);

        for (let { Slot, Item, Engineering } of build.Modules) {
            let module = ship.getModule(Slot);

            try {
                assertValidSlot(ship.object.Ship, Slot);
            } catch {
                // This will happen for livery modules, etc.
                continue;
            }

            describe(`Could apply items to ${Slot}`, () => {
                let applicable = module.getApplicableItems();
                test(`Can equip something`, () => {
                    expect(applicable.length).toBeGreaterThan(0);
                });

                if (Item) {
                    test(`Can equip ${Item}`, () => {
                        expect(applicable).toContain(
                            Item.toLowerCase(),
                        );
                    });
                }
            })

            if (!Engineering) {
                continue;
            }

            let {
                BlueprintName, Level, Quality, ExperimentalEffect, Modifiers
            } = Engineering;

            describe('Could apply engineering', () => {
                test(`Apply blueprint: ${BlueprintName}`, () => {
                    expect(() => {
                        module.setBlueprint(BlueprintName, 1, 1);
                    }).not.toThrow();
                });

                if (ExperimentalEffect) {
                    test(`Apply experimental: ${ExperimentalEffect}`, () => {
                        expect(() => {
                            module.setBlueprint(BlueprintName, 1, 1, ExperimentalEffect);
                        }).not.toThrow();
                    });
                }
            });

            // We can't predict stats by quality if it is not fully progressed;
            // skip these cases
            if (Quality < 1) {
                continue;
            }

            describe(`${BlueprintName} for ${Item} on ${Slot}`, () => {
                beforeEach(() => {
                    module.reset();
                    module.setItem(Item);
                    module.setBlueprint(BlueprintName, Level, Quality, ExperimentalEffect);
                });

                for (let { Label, Value, OriginalValue } of Modifiers) {
                    test(`${Label} modified`, () => {
                        // Ammo modifications can be off by one when rounded
                        if (Label == 'AmmoMaximum' || Label == 'AmmoClipSize') {
                            const ammo = module.get(Label, true);
                            expect([ammo - 1, ammo, ammo + 1]).toContain(Value);
                        } else {
                            expect(prec(2, module.get(Label, true))).toBe(prec(2, Value));
                        }
                    });
                    test(`${Label} raw`, () => {
                        expect(prec(3, module.get(Label, false))).toBe(prec(3, OriginalValue));
                    });
                }
            });
        }
    });
}
