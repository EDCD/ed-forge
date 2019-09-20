
const MODULE_REGISTRY = require('../../lib/data/module_registry.json');

describe('Registry entry has items', () => {
    for (let key in MODULE_REGISTRY) {
        if (MODULE_REGISTRY.hasOwnProperty(key)) {
            test(key, () => {
                expect(MODULE_REGISTRY[key].items).toBeDefined();
            });
        }
    }
});

describe('Registry entry has slots', () => {
    for (let key in MODULE_REGISTRY) {
        if (MODULE_REGISTRY.hasOwnProperty(key)) {
            test(key, () => {
                expect(MODULE_REGISTRY[key].slots.length).toBeGreaterThan(0);
            });
        }
    }
})
