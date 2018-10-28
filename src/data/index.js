
import coriolis from 'coriolis-data/dist';
import { keys, pick, values } from 'lodash';
import { MODULE_STATS } from '../module-stats';

const MODULE_STATS_KEYS = keys(MODULE_STATS);
const MODULES = {};

for (const group in coriolis.Modules) {
    for (const module in values(coriolis.Modules[group])) {
        MODULES[module.symbol] = pick(module, MODULE_STATS_KEYS);
    }
}

export function newModule(identifier) {
    return { Slot: '', On: true, Item: identifier, Priority: 1 };
}

export function getModuleProperty(identifier, property) {
    return MODULES[identifier][property];
}

export function newBlueprint(name, level, progress) {}
