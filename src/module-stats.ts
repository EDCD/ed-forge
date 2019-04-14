/**
* @module ModuleStats
*/

/**
 * Ignore
 */
import { Ship } from ".";
import Module from "./Module";
import { IllegalStateError } from "./errors";

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
}

const MODULE_STATS: { [ property: string ]: ModulePropertyDescriptor } = {
    'ammo': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'absdamage': { 'method': 'overwrite' },
    'angle': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'boot': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'brokenregen': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'burst': { 'method': 'overwrite', 'higherbetter': true },  // actually modified
    'burstint': { 'method': 'multiplicative', 'higherbetter': false }, // actually modified
    'burstrof': { 'method': 'overwrite', 'higherbetter': true },  // actually modified
    'causres': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },
    'clip': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'damage': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'damagepersecond': { 'higherbetter': true, 'getter': DPS, },
    'damageperenergy': { 'higherbetter': true, 'getter': DPE, },
    'distdraw': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'duration': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'eff': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'engcap': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'engrate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'energypersecond': { 'higherbetter': false, 'getter': EPS, },
    'expldamage': { 'method': 'overwrite' },
    'explres': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'facinglimit': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'falloff': {},
    'heatpersecond': { 'higherbetter': false, 'getter': HPS, },
    'hullboost': { 'modifier': 'offsetscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'hullreinforcement': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'integrity': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'jitter': { 'method': 'additive', 'higherbetter': false },  // actually modified
    'kindamage': { 'method': 'overwrite' },
    'kinres': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'mass': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'maxfuel': {},
    'optmass': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'optmul': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'pgen': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'piercing': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'powerdraw': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'protection': { 'method': 'multiplicative', 'higherbetter': true },
    'range': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'ranget': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'regen': {},
    'reload': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'rof': { 'higherbetter': true },  // actually modified
    'scanrate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'scantime': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'sustaineddamagerpersecond': { 'higherbetter': true, 'getter': SDPS, },
    'shield': {},
    'shieldaddition': {},
    'shieldboost': { 'modifier': 'offsetscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'shieldreinforcement': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'shotspeed': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'spinup': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'syscap': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'sysrate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'thermdamage': { 'method': 'overwrite' },
    'thermload': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'thermres': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'wepcap': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'weprate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'jumpboost': {}
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
    return module.get('sysrate', modified)
        * getPdRechargeMultiplier(module._ship);
}

export function EFFECTIVE_ENG_RATE(module: Module, modified: boolean): number {
    if (!module._ship) {
        throw new IllegalStateError();
    }
    return module.get('engrate', modified)
        * getPdRechargeMultiplier(module._ship);
}

export function EFFECTIVE_WEP_RATE(module: Module, modified: boolean): number {
    if (!module._ship) {
        throw new IllegalStateError();
    }
    return module.get('weprate', modified)
        * getPdRechargeMultiplier(module._ship);
}

export function DPS(module: Module, modified: boolean): number {
    let damage = module.get('damage', modified);
    let roundsPerShot = module.get('roundspershot', modified) || 1;
    let rateOfFire = module.get('rof', modified) || 1;

    return damage * roundsPerShot * rateOfFire;
}

export function SDPS(module: Module, modified: boolean): number {
    let dps = DPS(module, modified);
    let clipSize = module.get('clip', modified);
    // If auto-loader is applied, effective clip size will be nearly doubled
    // as you get one reload for every two shots fired.
    if (clipSize) {
        if (modified && module._object.Engineering &&
            module._object.Engineering.ExperimentalEffect === 'special_auto_loader'
        ) {
            clipSize += clipSize - 1;
        }
        let timeToDeplete = clipSize / module.get('rof', modified);
        dps *= timeToDeplete / (timeToDeplete + module.get('reload', modified));
    }
    return dps;
}

export function EPS(module: Module, modified: boolean): number {
    let distDraw = module.get('distdraw', modified);
    let rof = module.get('rof', modified) || 1;
    return distDraw * rof;
}

export function DPE(module: Module, modified: boolean): number {
    return DPS(module, modified) / EPS(module, modified);
}

export function HPS(module: Module, modified: boolean): number {
    let thermalLoad = module.get('thermload', modified);
    // We don't use rpshot here as dist draw is per combined shot
    let rof = module.get('rof', modified) || 1;
    return thermalLoad * rof;
}
