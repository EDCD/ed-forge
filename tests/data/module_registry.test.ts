import { ModuleRegistryEntry } from "../../src/types";

const MODULE_REGISTRY = require('../../src/data/module_registry.json');

describe('Registry entry has items', () => {
    for (let key in MODULE_REGISTRY) {
        if (MODULE_REGISTRY.hasOwnProperty(key)) {
            test(key, () => {
                expect((MODULE_REGISTRY[key] as ModuleRegistryEntry).items).toBeDefined();
            });
        }
    }
});

describe('Registry entry has slots', () => {
    for (let key in MODULE_REGISTRY) {
        if (MODULE_REGISTRY.hasOwnProperty(key)) {
            test(key, () => {
                expect((MODULE_REGISTRY[key] as ModuleRegistryEntry).slots).toBeDefined();
            });
        }
    }
})
