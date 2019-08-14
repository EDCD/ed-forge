/**
* @module ModuleStats
*/

/**
 * Ignore
 */
import { Ship } from ".";
import Module, { ModifierObject } from "./Module";
import { IllegalStateError } from "./errors";
import { PropertyMap } from "./data/blueprints";

function getReciprocal(prop: string): ModulePropertyCalculator {
    return (module, modified) => {
        return 1 / module.get(prop, modified);
    }
}

export const CAUS_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'causticeffectiveness'
);
export const EXPL_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'explosiveeffectiveness'
);
export const KIN_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'kineticeffectiveness'
);
export const THERM_RES: ModulePropertyCalculator = effToRes.bind(
    undefined,
    'thermiceffectiveness'
);

/**
 * Stores meta data about module properties.
 */
 export interface ModulePropertyDescriptor {
    /**
     * How to apply the modifier to the the module property. If not given then
     * the property can't be modified.
     */
    method?: string,
    /**
     * True if increasing this value is good. If not given, there is no clear
     * sense of what is better.
     */
    higherbetter?: boolean,
    getter?: ModulePropertyCalculator | ModulePropertyCalculatorClass;
    /**
     * If a property has an importer it won't be set when a module is imported.
     * Instead, all other properties will be imported first, then all importers
     * are invoked which delegate the obligation to import said property.
     */
    importer?: (module: Module, modifier: ModifierObject, synthetics: PropertyMap) => void;
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

const MODULE_STATS: { [ property: string ]: ModulePropertyDescriptor } = {
    'ammoclipsize': { 'method': 'multiplicative', 'higherbetter': true, 'integer': true },
    'ammomaximum': { 'method': 'multiplicative', 'higherbetter': true, 'integer': true },
    'armourpenetration': { 'method': 'multiplicative', 'higherbetter': true },
    'absolutedamageportion': { 'method': 'overwrite' },
    // For sensors
    'sensortargetscanangle': { 'method': 'multiplicative', 'higherbetter': true },
    'boottime': { 'method': 'multiplicative', 'higherbetter': false },
    'brokenregenrate': { 'method': 'multiplicative', 'higherbetter': true },
    'burstsize': { 'method': 'overwrite', 'higherbetter': true, 'integer': true },
    'burstintervall': { 'method': 'multiplicative', 'higherbetter': false, 'getter': getReciprocal('burstrateoffire') },
    'burstrateoffire': { 'method': 'overwrite', 'higherbetter': true },
    'cargo': {},
    'causticeffectiveness': { 'method': 'multiplicative', 'higherbetter': false },
    'causticresistance': {
        'higherbetter': true,
        'getter': CAUS_RES,
        'importer': importEff.bind(undefined, 'caustic'),
        'percentage': true,
    },
    'damage': { 'method': 'multiplicative', 'higherbetter': true },
    'damagefalloffrange': { 'method': 'multiplicative', 'higherbetter': true },
    'damageperenergy': { 'higherbetter': true, 'getter': DPE, },
    'damagepersecond': { 'higherbetter': true, 'getter': DPS, },
    'defencemodifierhealthaddition': { 'method': 'multiplicative', 'higherbetter': true },
    'defencemodifierhealthmultiplier': { 'method': 'boost', 'higherbetter': true, 'percentage': true },
    'defencemodifiershieldaddition': {},
    'defencemodifiershieldmultiplier': { 'method': 'boost', 'higherbetter': true, 'percentage': true },
    'distributordraw': { 'method': 'multiplicative', 'higherbetter': false },
    'dss_patchradius': { 'method': 'multiplicative', 'higherbetter': true, 'percentage': true },
    'enginescapacity': { 'method': 'multiplicative', 'higherbetter': true },
    'enginesrecharge': { 'method': 'multiplicative', 'higherbetter': true },
    'energypersecond': { 'higherbetter': false, 'getter': EPS, },
    // for shields
    'energyperregen': { 'method': 'multiplicative', 'higherbetter': false },
    'engineheatrate': { 'method': 'multiplicative', 'higherbetter': false },
    'enginemaximalmass': {},
    'enginemaxperformance': {},
    'engineminimalmass': {},
    'engineminperformance': {},
    'engineoptimalmass': { 'method': 'multiplicative', 'higherbetter': true },
    'engineoptperformance': { 'method': 'multiplicative', 'higherbetter': true, 'percentage': true },
    'explosivedamageportion': { 'method': 'overwrite' },
    'explosiveeffectiveness': { 'method': 'multiplicative', 'higherbetter': false },
    'explosiveresistance': {
        'higherbetter': true,
        'getter': EXPL_RES,
        'importer': importEff.bind(undefined, 'explosive'),
        'percentage': true,
    },
    'fireintervall': { 'method': 'multiplicative', 'higherbetter': false },
    // TODO:
    'fsdheatrate': {},
    'fsdinterdictorfacinglimit': { 'method': 'multiplicative', 'higherbetter': true },
    'fsdinterdictorrange': { 'method': 'multiplicative', 'higherbetter': true },
    'fsdoptimalmass': { 'method': 'multiplicative', 'higherbetter': true },
    'fuel': {},
    'fuelmul': {},
    'fuelpower': {},
    'heatefficiency': { 'method': 'multiplicative', 'higherbetter': false },
    'heatpersecond': { 'higherbetter': false, 'getter': HPS, },
    'integrity': { 'method': 'multiplicative', 'higherbetter': true },
    'jitter': { 'method': 'additive', 'higherbetter': false },
    'jumpboost': {},
    'kineticdamageportion': { 'method': 'overwrite' },
    'kineticeffectiveness': { 'method': 'multiplicative', 'higherbetter': false },
    'kineticresistance': {
        'higherbetter': true,
        'getter': KIN_RES,
        'importer': importEff.bind(undefined, 'kinetic'),
        'percentage': true,
    },
    'mass': { 'method': 'multiplicative', 'higherbetter': false },
    'maxangle': { 'method': 'multiplicative', 'higherbetter': true },
    'maxfuel': {},
    // For weapons
    'maximumrange': { 'method': 'multiplicative', 'higherbetter': true },
    'powercapacity': { 'method': 'multiplicative', 'higherbetter': true },
    'powerdraw': { 'method': 'multiplicative', 'higherbetter': false },
    'protection': { 'method': 'multiplicative', 'higherbetter': true, 'percentage': true },
    // For sensors
    'range': { 'method': 'multiplicative', 'higherbetter': true },
    'rateoffire': { 'higherbetter': true, 'getter': ROF, 'importer': importROF },
    'regenrate': { 'method': 'multiplicative', 'higherbetter': true },
    'reloadtime': { 'method': 'multiplicative', 'higherbetter': false },
    'roundspershot': { 'integer': true },
    'scannertimetoscan': { 'method': 'multiplicative', 'higherbetter': false },
    // For utility scanners
    'scannerrange': { 'method': 'multiplicative', 'higherbetter': true },
    'shieldbankduration': { 'method': 'multiplicative', 'higherbetter': true },
    'shieldbankheat': { 'method': 'multiplicative', 'higherbetter': false },
    'shieldbankreinforcement': { 'method': 'multiplicative', 'higherbetter': true },
    'shieldbankspinup': { 'method': 'multiplicative', 'higherbetter': false },
    'shieldgenmaximalmass': {},
    'shieldgenmaxstrength': {},
    'shieldgenminimalmass': {},
    'shieldgenminstrength': {},
    'shieldgenoptimalmass': { 'method': 'multiplicative', 'higherbetter': true },
    'shieldgenstrength': { 'method': 'multiplicative', 'higherbetter': true, 'percentage': true },
    'shotspeed': { 'method': 'multiplicative', 'higherbetter': true },
    'sustaineddamagerpersecond': { 'higherbetter': true, 'getter': SDPS, },
    'systemscapacity': { 'method': 'multiplicative', 'higherbetter': true },
    'systemsrecharge': { 'method': 'multiplicative', 'higherbetter': true },
    'thermalload': { 'method': 'multiplicative', 'higherbetter': false },
    'thermicdamageportion': { 'method': 'overwrite' },
    'thermiceffectiveness': { 'method': 'multiplicative', 'higherbetter': false, },
    'thermicresistance': {
        'higherbetter': true,
        'getter': THERM_RES,
        'importer': importEff.bind(undefined, 'thermic'),
        'percentage': true,
    },
    'weaponscapacity': { 'method': 'multiplicative', 'higherbetter': true },
    'weaponsrecharge': { 'method': 'multiplicative', 'higherbetter': true },
};
export default MODULE_STATS;

const PD_RECHARGE_MAP = {};
for (let i = 0; i <= 4; i += 0.5) {
    PD_RECHARGE_MAP[i] = Math.pow(i, 1.1) / Math.pow(4, 1.1);
}

function getPdRechargeMultiplier(ship: Ship): number {
    return PD_RECHARGE_MAP[ship.getDistributorSettings().Sys]
}

export interface ModulePropertyCalculator {
    (module: Module, modified: boolean): number
}

export interface ModulePropertyCalculatorClass {
    calculate(module: Module, modified: boolean): number
}

export function EFFECTIVE_SYS_RATE(module: Module, modified: boolean): number {
    if (!module._ship) {
        throw new IllegalStateError();
    }
    return module.get('systemsrecharge', modified)
        * getPdRechargeMultiplier(module._ship);
}

export function EFFECTIVE_ENG_RATE(module: Module, modified: boolean): number {
    if (!module._ship) {
        throw new IllegalStateError();
    }
    return module.get('enginesrecharge', modified)
        * getPdRechargeMultiplier(module._ship);
}

export function EFFECTIVE_WEP_RATE(module: Module, modified: boolean): number {
    if (!module._ship) {
        throw new IllegalStateError();
    }
    return module.get('weaponsrecharge', modified)
        * getPdRechargeMultiplier(module._ship);
}

export function ROF(module: Module, modified: boolean): number {
    let fireInt = module.get('fireintervall', modified);
    let burstInt = module.get('burstintervall', modified) || 0;
    let burstSize = module.get('burstsize', modified) || 1;
    return 1 / (burstInt * burstSize + fireInt);
}

function importROF(module: Module, modifier: ModifierObject, synthetics: PropertyMap) {
    let burstInt = module.get('burstintervall', true) || 0;
    let burstSize = module.get('burstsize', true) || 1;
    let Value = (1 / modifier.Value) - (burstSize * burstInt);
    let Label = 'fireintervall';
    module._object.Engineering.Modifiers[Label] = { Label, Value };
}

export function DPS(module: Module, modified: boolean): number {
    let damage = module.get('damage', modified);
    let roundsPerShot = module.get('roundspershot', modified) || 1;
    let rateOfFire = module.get('rateoffire', modified) || 1;

    return damage * roundsPerShot * rateOfFire;
}

export function SDPS(module: Module, modified: boolean): number {
    let dps = DPS(module, modified);
    let clipSize = module.get('ammoclipsize', modified);
    // If auto-loader is applied, effective clip size will be nearly doubled
    // as you get one reload for every two shots fired.
    if (clipSize) {
        if (modified && module._object.Engineering &&
            module._object.Engineering.ExperimentalEffect === 'special_auto_loader'
        ) {
            clipSize += clipSize - 1;
        }
        let timeToDeplete = clipSize / module.get('rateoffire', modified);
        dps *= timeToDeplete / (timeToDeplete + module.get('reloadtime', modified));
    }
    return dps;
}

export function EPS(module: Module, modified: boolean): number {
    let distDraw = module.get('distributordraw', modified);
    let rof = module.get('rateoffire', modified) || 1;
    return distDraw * rof;
}

export function DPE(module: Module, modified: boolean): number {
    return DPS(module, modified) / EPS(module, modified);
}

export function HPS(module: Module, modified: boolean): number {
    let thermalLoad = module.get('thermalload', modified);
    // We don't use rpshot here as dist draw is per combined shot
    let rof = module.get('rateoffire', modified) || 1;
    return thermalLoad * rof;
}

function effToRes(eff: string, module: Module, modified: boolean): number {
    let effectiveness = module.get(eff, modified);
    return 100 * (1 - effectiveness);
}

function importEff(name: string, module: Module, modifier: ModifierObject, synthetics: PropertyMap) {
    let res = synthetics[name + 'resistance'].Value;
    let Label = name + 'effectiveness';
    let Value = 1 - (res / 100);
    module._object.Engineering.Modifiers[Label] = { Label, Value };
}
