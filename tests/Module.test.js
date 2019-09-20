
import { Ship } from '..';
import {
    REG_CORE_SLOT,
    REG_INTERNAL_SLOT,
    REG_MILITARY_SLOT,
    REG_HARDPOINT_SLOT,
    REG_UTILITY_SLOT,
} from '../lib/data/slots';
import { matchesAny } from '../lib/helper';

function prec(grade, number) {
    let base = Math.pow(10, grade);
    return Math.round(number * base) / base;
}

const SLOT_REGS = [
    REG_CORE_SLOT,
    REG_INTERNAL_SLOT,
    REG_MILITARY_SLOT,
    REG_HARDPOINT_SLOT,
    REG_UTILITY_SLOT,
];

for (let { name, build } of TEST_SUITES) {
    describe(`Blueprint recreation for ${name}`, () => {
        let ship = new Ship(build);

        for (let { Slot, Item, Engineering } of build.Modules) {
            let module = ship.getModule(Slot);

            if (!matchesAny(Slot, ...SLOT_REGS)) {
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

            describe('Could apply blueprint', () => {
                test(`${BlueprintName} is listed`, () => {
                    expect(module.getApplicableBlueprints()).toContain(
                        BlueprintName.toLowerCase(),
                    );
                });

                if (ExperimentalEffect) {
                    test(`${ExperimentalEffect} is listed`, () => {
                        expect(module.getApplicableExperimentals()).toContain(
                            ExperimentalEffect.toLowerCase(),
                        );
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
                        expect(prec(2, module.get(Label, true))).toBe(prec(2, Value));
                    });
                    test(`${Label} raw`, () => {
                        expect(prec(3, module.get(Label, false))).toBe(prec(3, OriginalValue));
                    });
                }
            });
        }
    });
}
