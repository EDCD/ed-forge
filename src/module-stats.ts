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
    getter?: ModulePropertyCalculator | IModulePropertyCalculatorClass;
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
}

const MODULE_STATS: { [property: string]: IModulePropertyDescriptor } = {
    absolutedamageportion: { method: 'overwrite' },
    ammoclipsize: {
        higherbetter: true,
        integer: true,
        method: 'multiplicative',
    },
    ammomaximum: {
        higherbetter: true,
        integer: true,
        method: 'multiplicative',
    },
    ammototal: { getter: AMMO_TOTAL, higherbetter: true, integer: true },
    armourpenetration: { method: 'multiplicative', higherbetter: true },
    bays: { higherbetter: true },
    boottime: { method: 'multiplicative', higherbetter: false },
    brokenregenrate: { method: 'multiplicative', higherbetter: true },
    burstintervall: {
        getter: getReciprocal('burstrateoffire'),
        higherbetter: false,
        method: 'multiplicative',
    },
    burstrateoffire: { method: 'overwrite', higherbetter: true },
    burstsize: { method: 'overwrite', higherbetter: true, integer: true },
    cargo: {},
    causticeffectiveness: { method: 'multiplicative', higherbetter: false },
    causticresistance: {
        getter: CAUS_RES,
        higherbetter: true,
        importer: importEff.bind(undefined, 'caustic'),
        percentage: true,
    },
    damage: { method: 'multiplicative', higherbetter: true },
    damagefalloffrange: { method: 'multiplicative', higherbetter: true },
    damageperenergy: { higherbetter: true, getter: DPE },
    damagepersecond: { higherbetter: true, getter: DPS },
    defencemodifierhealthaddition: {
        higherbetter: true,
        method: 'multiplicative',
    },
    defencemodifierhealthmultiplier: {
        higherbetter: true,
        method: 'boost',
        percentage: true,
    },
    defencemodifiershieldaddition: {},
    defencemodifiershieldmultiplier: {
        higherbetter: true,
        method: 'boost',
        percentage: true,
    },
    distributordraw: { method: 'multiplicative', higherbetter: false },
    dss_patchradius: {
        higherbetter: true,
        method: 'multiplicative',
        percentage: true,
    },
    // for shields
    energyperregen: { method: 'multiplicative', higherbetter: false },
    energypersecond: { higherbetter: false, getter: EPS },
    engineheatrate: { method: 'multiplicative', higherbetter: false },
    enginemaximalmass: {},
    enginemaxperformance: {},
    engineminimalmass: {},
    engineminperformance: {},
    engineoptimalmass: { method: 'multiplicative', higherbetter: true },
    engineoptperformance: {
        higherbetter: true,
        method: 'multiplicative',
        percentage: true,
    },
    enginescapacity: { method: 'multiplicative', higherbetter: true },
    enginesrecharge: { method: 'multiplicative', higherbetter: true },
    explosivedamageportion: { method: 'overwrite' },
    explosiveeffectiveness: { method: 'multiplicative', higherbetter: false },
    explosiveresistance: {
        getter: EXPL_RES,
        higherbetter: true,
        importer: importEff.bind(undefined, 'explosive'),
        percentage: true,
    },
    fireintervall: { method: 'multiplicative', higherbetter: false },
    // TODO:
    fsdheatrate: {},
    fsdinterdictorfacinglimit: { method: 'multiplicative', higherbetter: true },
    fsdinterdictorrange: { method: 'multiplicative', higherbetter: true },
    fsdoptimalmass: { method: 'multiplicative', higherbetter: true },
    fuel: {},
    fuelmul: {},
    fuelpower: {},
    heatefficiency: { method: 'multiplicative', higherbetter: false },
    heatpersecond: { higherbetter: false, getter: HPS },
    integrity: { method: 'multiplicative', higherbetter: true },
    jitter: { method: 'additive', higherbetter: false },
    jumpboost: {},
    kineticdamageportion: { method: 'overwrite' },
    kineticeffectiveness: { method: 'multiplicative', higherbetter: false },
    kineticresistance: {
        getter: KIN_RES,
        higherbetter: true,
        importer: importEff.bind(undefined, 'kinetic'),
        percentage: true,
    },
    mass: { method: 'multiplicative', higherbetter: false },
    maxangle: { method: 'multiplicative', higherbetter: true },
    maxfuel: {},
    // For weapons
    maximumrange: { method: 'multiplicative', higherbetter: true },
    powercapacity: { method: 'multiplicative', higherbetter: true },
    powerdraw: { method: 'multiplicative', higherbetter: false },
    protection: {
        higherbetter: true,
        method: 'multiplicative',
        percentage: true,
    },
    // For sensors
    range: { method: 'multiplicative', higherbetter: true },
    rateoffire: { higherbetter: true, getter: ROF, importer: importROF },
    rebuildsperbay: { higherbetter: true },
    regenrate: { method: 'multiplicative', higherbetter: true },
    reloadtime: { method: 'multiplicative', higherbetter: false },
    roundspershot: { integer: true },
    // For utility scanners
    scannerrange: { method: 'multiplicative', higherbetter: true },
    scannertimetoscan: { method: 'multiplicative', higherbetter: false },
    // For sensors
    sensortargetscanangle: { method: 'multiplicative', higherbetter: true },
    shieldbankduration: { method: 'multiplicative', higherbetter: true },
    shieldbankheat: { method: 'multiplicative', higherbetter: false },
    shieldbankreinforcement: { method: 'multiplicative', higherbetter: true },
    shieldbankspinup: { method: 'multiplicative', higherbetter: false },
    shieldgenmaximalmass: {},
    shieldgenmaxstrength: {},
    shieldgenminimalmass: {},
    shieldgenminstrength: {},
    shieldgenoptimalmass: { method: 'multiplicative', higherbetter: true },
    shieldgenstrength: {
        higherbetter: true,
        method: 'multiplicative',
        percentage: true,
    },
    shotspeed: { method: 'multiplicative', higherbetter: true },
    sustaineddamagerpersecond: { higherbetter: true, getter: SDPS },
    sustainedenergypersecond: { higherbetter: true, getter: SEPS },
    sustainedheatpersecond: { higherbetter: true, getter: SHPS },
    systemscapacity: { method: 'multiplicative', higherbetter: true },
    systemsrecharge: { method: 'multiplicative', higherbetter: true },
    thermalload: { method: 'multiplicative', higherbetter: false },
    thermicdamageportion: { method: 'overwrite' },
    thermiceffectiveness: { method: 'multiplicative', higherbetter: false },
    thermicresistance: {
        getter: THERM_RES,
        higherbetter: true,
        importer: importEff.bind(undefined, 'thermic'),
        percentage: true,
    },
    weaponscapacity: { method: 'multiplicative', higherbetter: true },
    weaponsrecharge: { method: 'multiplicative', higherbetter: true },
};
export default MODULE_STATS;

const PD_RECHARGE_MAP = {};
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

export interface IModulePropertyCalculatorClass {
    calculate(module: Module, modified: boolean): number;
}

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
