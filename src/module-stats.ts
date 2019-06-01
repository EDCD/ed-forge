/**
* @module ModuleStats
*/

/**
 * Ignore
 */
import { Ship } from ".";
import Module, { ModifierObject } from "./Module";
import { IllegalStateError } from "./errors";

function getReciprocal(prop: string): ModulePropertyCalculator {
    return (module, modified) => {
        return 1 / module.get(prop, modified);
    }
}

/**
 * Stores meta data about module properties.
 */
 export interface ModulePropertyDescriptor {
    /**
     * Method on how to turn a blueprint modifier into a modifier. If not given,
     * blueprint modifier will be used as modifier.
     */
    modifier?: string,
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
    importer?: (module: Module, modifier: ModifierObject) => void;
}

const MODULE_STATS: { [ property: string ]: ModulePropertyDescriptor } = {
    'ammoclipsize': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'ammomaximum': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'armourpenetration': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'absolutedamageportion': { 'method': 'overwrite' },
    'sensortargetscanangle': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'boottime': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'brokenregenrate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'burstsize': { 'method': 'overwrite', 'higherbetter': true },  // actually modified
    'burstintervall': { 'method': 'multiplicative', 'higherbetter': false, 'getter': getReciprocal('burstrateoffire') }, // actually modified
    'burstrateoffire': { 'method': 'overwrite', 'higherbetter': true },  // actually modified
    'cargo': {},
    'causticresistance': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },
    'damage': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'damagefalloffrange': {},
    'damageperenergy': { 'higherbetter': true, 'getter': DPE, },
    'damagepersecond': { 'higherbetter': true, 'getter': DPS, },
    'defencemodifierhealthaddition': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'defencemodifierhealthmultiplier': { 'modifier': 'offsetscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'defencemodifiershieldaddition': {},
    'defencemodifiershieldmultiplier': { 'modifier': 'offsetscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'distributordraw': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'dss_patchradius': { 'method': 'multiplicative', 'higherbetter': true }, // actually modified
    'enginescapacity': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'enginesrecharge': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'energypersecond': { 'higherbetter': false, 'getter': EPS, },
    // for shields
    'energyperregen': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'engineheatrate': {}, // TODO: modified but find out how
    'enginemaximalmass': {},
    'enginemaxperformance': {},
    'engineminimalmass': {},
    'engineminperformance': {},
    'engineoptimalmass': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'engineoptperformance': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'explosivedamageportion': { 'method': 'overwrite' },
    'explosiveresistance': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'fireintervall': { 'method': 'multiplicative', 'higherbetter': false }, // actually modified
    'fsdinterdictorfacinglimit': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'fsdinterdictorrange': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'fsdoptimalmass': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'fuel': {},
    'fuelmul': {},
    'fuelpower': {},
    'heatefficiency': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'heatpersecond': { 'higherbetter': false, 'getter': HPS, },
    'integrity': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'jitter': { 'method': 'additive', 'higherbetter': false },  // actually modified
    'jumpboost': {},
    'kineticdamageportion': { 'method': 'overwrite' },
    'kineticresistance': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'mass': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'maxfuel': {},
    // For weapons
    'maximumrange': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'powercapacity': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'powerdraw': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'protection': { 'method': 'multiplicative', 'higherbetter': true },
    // For sensors
    'range': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'rateoffire': { 'higherbetter': true, 'getter': ROF, 'importer': importROF },  // actually modified
    'regenrate': {},
    'reloadtime': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'roundspershot': {},
    'scannertimetoscan': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    // For utility scanners
    'scannerrange': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified,
    'shieldbankduration': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'shieldbankheat': {}, // TODO: modified, but how?
    'shieldbankreinforcement': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'shieldbankspinup': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'shieldgenmaximalmass': {},
    'shieldgenmaxstrength': {},  // actually modified
    'shieldgenminimalmass': {},
    'shieldgenminstrength': {},  // actually modified
    'shieldgenoptimalmass':  { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'shieldgenstrength': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'shotspeed': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'sustaineddamagerpersecond': { 'higherbetter': true, 'getter': SDPS, },
    'systemscapacity': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'systemsrecharge': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'thermalload': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'thermicdamageportion': { 'method': 'overwrite' },
    'thermicresistance': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'weaponscapacity': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'weaponsrecharge': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
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

function importROF(module: Module, modifier: ModifierObject) {
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
