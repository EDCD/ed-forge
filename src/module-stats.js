
/**
 * Stores meta data about module properties.
 * @typedef {Object} ModulePropertyDescriptor
 * @property {string} [modifier] Method on how to turn a blueprint modifier into
 *      a modifier. If not given, blueprint modifier will be used as modifier.
 * @property {string} [method] How to apply the modifier to the the module
 *      property. If not given then the property can't be modified.
 * @property {boolean} [higherbetter] True if increasing this value is good. If
 *      not given, there is no clear sense of what is better.
 */

/**
 * @enum {ModulePropertyDescriptor}
 */
export const MODULE_STATS = {
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
    'dps': { 'higherbetter': true },
    'dpe': { 'higherbetter': true },
    'distdraw': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'duration': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'eff': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'engcap': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'engrate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'eps': {},
    'expldamage': { 'method': 'overwrite' },
    'explres': { 'modifier': 'antiscale', 'method': 'additive', 'higherbetter': true },  // actually modified
    'facinglimit': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'falloff': {},
    'hps': {},
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
    'power': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'protection': { 'method': 'multiplicative', 'higherbetter': true },
    'range': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'ranget': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'regen': {},
    'reload': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'rof': { 'higherbetter': true },  // actually modified
    'scanrate': { 'method': 'multiplicative', 'higherbetter': true },  // actually modified
    'scantime': { 'method': 'multiplicative', 'higherbetter': false },  // actually modified
    'sdps': {},
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
