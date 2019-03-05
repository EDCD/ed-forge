
import { Ship } from '..';
import { assertValidSlot } from '../lib/data/slots';

import * as anacondaBuild from './fixtures/anaconda.json';

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
