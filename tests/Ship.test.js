
import { Ship } from '..';

import * as anacondaBuild from './fixtures/anaconda.json';

let ship;
beforeEach(() => {
    ship = new Ship(anacondaBuild);
})

test('ship can be imported', () => {
    expect(ship).toBeTruthy();
});

test('modules are imported with correct items', () => {
    for (let module of anacondaBuild.Modules) {
        expect(ship.getModule(module.Slot).getItem()).toEqual(module.Item);
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
