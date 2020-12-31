/**
 * @module ModuleStats
 */

/**
 * Ignore
 */
import { Ship } from '.';
import { IPropertyMap } from './data/blueprints';
import { IllegalStateError } from './errors';
import Module, { IModifierObject } from './Module';
import { getModuleProperty } from './data/items';
import * as CONST_STATS from './module-stats.json';
import { assign, mergeWith } from 'lodash';

function getReciprocal(prop: string): ModulePropertyCalculator {
    return (module, modified) => {
        return 1 / module.get(prop, modified);
    };
}

export const CAUS_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'causticeffectiveness',
);
export const EXPL_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'explosiveeffectiveness',
);
export const KIN_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'kineticeffectiveness',
);
export const THERM_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'thermiceffectiveness',
);

/**
 * Stores meta data about module properties.
 */
export interface IModulePropertyDescriptor {
    /**
     * How to apply the modifier to the the module property. If not given then
     * the property can't be modified.
     */
    method?: string;
    /**
     * True if increasing this value is good. If not given, there is no clear
     * sense of what is better.
     */
    higherbetter?: boolean;
    getter?: ModulePropertyCalculator;
    /**
     * If a property has an importer it won't be set when a module is imported.
     * Instead, all other properties will be imported first, then all importers
     * are invoked which delegate the obligation to import said property.
     */
    importer?: (
        module: Module,
        modifier: IModifierObject,
        synthetics: IPropertyMap,
    ) => void;
    /**
     * True if a value is a percentage value. These are tracked in the range
     * `[0,100]` in Elite: Dangerous and sometimes need to be casted in the
     * range `[0,1]`.
     */
    percentage?: boolean;
    /**
     * True if a value is an integer. After applying modifiers it will be
     * rounded.
     */
    integer?: boolean;
    /**
     * The unit this property is in, e.g. meters (m). Is always abbreviated.
     */
    unit?: string;
}

/**
 * Notes:
 *  - energyperregen is a property for shields
 *  - range is for sensors
 *  - scannerrange is for utility scanners
 *  - sensortargetscanangle is for sensors
 *
 * Some module attribute key names can be taken from the official Journal API
 * documentation.
 */
const MODULE_STATS: { [property: string]: IModulePropertyDescriptor } = mergeWith(
    CONST_STATS,
    {
        ammototal: { getter: AMMO_TOTAL },
        armourpenetration: { method: 'multiplicative' },
        burstintervall: {
            getter: getReciprocal('burstrateoffire'),
        },
        causticresistance: {
            getter: CAUS_RES,
            importer: importEff.bind(undefined, 'caustic'),
        },
        damageperenergy: { getter: DPE },
        damagepersecond: { getter: DPS },
        energypersecond: { getter: EPS },
        enginemaximalmass: {
            getter: useOptModifier.bind(undefined, 'enginemaximalmass', 'engineoptimalmass'),
        },
        enginemaxperformance: {
            getter: useOptModifier.bind(undefined, 'enginemaxperformance', 'engineoptperformance'),
        },
        engineminimalmass: {
            getter: useOptModifier.bind(undefined, 'engineminimalmass', 'engineoptimalmass'),
        },
        engineminperformance: {
            getter: useOptModifier.bind(undefined, 'engineminperformance', 'engineoptperformance'),
        },
        explosiveresistance: {
            getter: EXPL_RES,
            importer: importEff.bind(undefined, 'explosive'),
        },
        heatpersecond: { getter: HPS },
        kineticresistance: {
            getter: KIN_RES,
            importer: importEff.bind(undefined, 'kinetic'),
        },
        rateoffire: { getter: ROF, importer: importROF },
        // Shield generator maximal mass is not modified with optimal mass, although
        // engine maximal mass is.
        shieldgenmaxstrength: {
            getter: useOptModifier.bind(undefined, 'shieldgenmaxstrength', 'shieldgenstrength'),
        },
        shieldgenminimalmass: {
            getter: useOptModifier.bind(undefined, 'shieldgenminimalmass', 'shieldgenoptimalmass'),
        },
        shieldgenminstrength: {
            getter: useOptModifier.bind(undefined, 'shieldgenminstrength', 'shieldgenstrength'),
        },
        sustaineddamagepersecond: { getter: SDPS },
        sustainedenergypersecond: { getter: SEPS },
        sustainedheatpersecond: { getter: SHPS },
        thermicresistance: {
            getter: THERM_RES,
            importer: importEff.bind(undefined, 'thermic'),
        },
    },
    (fst, snd) => assign(fst, snd),
);
export default MODULE_STATS;

export const PD_RECHARGE_MAP = {};
for (let i = 0; i <= 4; i += 0.5) {
    PD_RECHARGE_MAP[i] = Math.pow(i, 1.1) / Math.pow(4, 1.1);
}

function getPdRechargeMultiplier(ship: Ship): number {
    return PD_RECHARGE_MAP[ship.getDistributorSettings().Sys];
}

export type ModulePropertyCalculator = (
    module: Module,
    modified: boolean,
) => number;

export function EFFECTIVE_SYS_RATE(module: Module, modified: boolean): number {
    if (!module.ship) {
        throw new IllegalStateError();
    }
    return (
        module.get('systemsrecharge', modified) *
        getPdRechargeMultiplier(module.ship)
    );
}

export function EFFECTIVE_ENG_RATE(module: Module, modified: boolean): number {
    if (!module.ship) {
        throw new IllegalStateError();
    }
    return (
        module.get('enginesrecharge', modified) *
        getPdRechargeMultiplier(module.ship)
    );
}

export function EFFECTIVE_WEP_RATE(module: Module, modified: boolean): number {
    if (!module.ship) {
        throw new IllegalStateError();
    }
    return (
        module.get('weaponsrecharge', modified) *
        getPdRechargeMultiplier(module.ship)
    );
}

export function ROF(module: Module, modified: boolean): number {
    const fireInt = module.get('fireintervall', modified);
    const burstInt = module.get('burstintervall', modified) || 0;
    const burstSize = module.get('burstsize', modified) || 1;
    return 1 / (burstInt * (burstSize - 1) + fireInt);
}

function importROF(
    module: Module,
    modifier: IModifierObject,
    synthetics: IPropertyMap,
) {
    const burstInt = module.get('burstintervall', true) || 0;
    const burstSize = module.get('burstsize', true) || 1;
    const Value = 1 / modifier.Value - burstSize * burstInt;
    const Label = 'fireintervall';
    module.object.Engineering.Modifiers[Label] = { Label, Value };
}

export function DPS(module: Module, modified: boolean): number {
    const damage = module.get('damage', modified);
    const roundsPerShot = (module.get('roundspershot', modified) || 1)
        * (module.get('burstsize', modified) || 1);
    const rateOfFire = module.get('rateoffire', modified) || 1;

    return damage * roundsPerShot * rateOfFire;
}

function getSustainedRate(module: Module, modified: boolean): number {
    let clipSize = module.get('ammoclipsize', modified);
    if (clipSize) {
        if (
            modified &&
            module.object.Engineering &&
            module.object.Engineering.ExperimentalEffect ===
                'special_auto_loader'
        ) {
            // If auto-loader is applied, effective clip size will be nearly
            // doubled as you get one reload for every two shots fired.
            clipSize += clipSize - 1;
        }
        const timeToDeplete = clipSize / module.get('rateoffire', modified);
        return (
            timeToDeplete / (timeToDeplete + module.get('reloadtime', modified))
        );
    } else {
        return 1;
    }
}

export function SDPS(module: Module, modified: boolean): number {
    return DPS(module, modified) * getSustainedRate(module, modified);
}

export function EPS(module: Module, modified: boolean): number {
    const distDraw = module.get('distributordraw', modified);
    const rof = module.get('rateoffire', modified) || 1;
    return distDraw * rof;
}

export function SEPS(module: Module, modified?: boolean): number {
    return EPS(module, modified) * getSustainedRate(module, modified);
}

export function DPE(module: Module, modified: boolean): number {
    return DPS(module, modified) / EPS(module, modified);
}

export function HPS(module: Module, modified: boolean): number {
    const thermalLoad = module.get('thermalload', modified);
    // We don't use rpshot here as dist draw is per combined shot
    const rof = module.get('rateoffire', modified) || 1;
    return thermalLoad * rof;
}

export function SHPS(module: Module, modified: boolean): number {
    return HPS(module, modified) * getSustainedRate(module, modified);
}

export function AMMO_TOTAL(module: Module, modified: boolean): number {
    return module.get('ammomaximum', modified)
        + module.get('ammoclipsize', modified);
}

function effToRes(eff: string, module: Module, modified: boolean): number {
    const effectiveness = module.get(eff, modified);
    return 100 * (1 - effectiveness);
}

function importEff(
    name: string,
    module: Module,
    modifier: IModifierObject,
    synthetics: IPropertyMap,
) {
    const res = synthetics[name + 'resistance'].Value;
    const Label = name + 'effectiveness';
    const Value = 1 - res / 100;
    module.object.Engineering.Modifiers[Label] = { Label, Value };
}

function useOptModifier(
    prop: string,
    optProp: string,
    module: Module,
    modified: boolean,
): number {
    const base = getModuleProperty(module.getItem().toLowerCase(), prop);
    if (!modified) {
        return base;
    } else {
        return base * (1 + (module.getModifier(optProp) || 0));
    }
}
