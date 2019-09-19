
import { Ship, Factory } from '..';

function prec(grade, number) {
    let base = Math.pow(10, grade);
    return Math.round(number * base) / base;
}

for (let { name, build } of TEST_SUITES) {
    describe(`Blueprint recreation for ${name}`, () => {
        let ship = new Ship(build);

        for (let { Slot, Item, Engineering } of build.Modules) {
            if (!Engineering) {
                continue;
            }

            let module = ship.getModule(Slot);
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
