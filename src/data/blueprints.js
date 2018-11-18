import { UnknownRestrictedError } from '../errors.js';
import { MODULE_STATS } from '../module-stats';
import { getModuleInfo, getModuleProperty } from './items.js';

/**
 * Maps property to array of from [min, max].
 * @typedef {Object.<string, number[]>} BlueprintFeature
 */

/**
 * Maps blueprint key to grades.
 * @typedef {Object.<string, BlueprintFeature>} BlueprintGrade
 */

/** @type {Object.<string, BlueprintGrade>} */
const BLUEPRINTS = require('./blueprints.json');
/** @type {Object.<string, BlueprintFeature>} */
const EXPERIMENTALS = require('./experimentals.json');

const BLUEPRINT_EXTRAS = {
    'Weapon_LongRange': (moduleInfo, propObject) => {
        let falloff = propObject['range'].value;
        let baseFalloff = moduleInfo.props['falloff'];
        propObject['falloff'] = {
            modifier: falloff / baseFalloff,
            value: falloff
        };
    },
};

/**
 * Maps property names to ModifierObject for a blueprint.
 * @typedef {Object.<string, import('../Module.js').ModifierObject>} PropertyMap
 */

/**
 * Get modified properties for a module.
 * @param {string} module Item key
 * @param {string} name Blueprint key
 * @param {number} [grade=1] Blueprint grade
 * @param {number} [progress=0] Blueprint progress
 * @param {string} [experimentalName] Experimental effect
 * @return {PropertyMap} Map of property names to modifier objects.
 */
export function getBlueprintProps(module, name, grade = 1, progress = 0,
    experimentalName) {
    let moduleInfo = getModuleInfo(module);
    let blueprint = BLUEPRINTS[name];
    let experimental = EXPERIMENTALS[experimentalName];
    if (!blueprint) {
        throw new UnknownRestrictedError(`Don't know blueprint ${name}`);
    }
    if (grade < 1 || 5 < grade) {
        throw new UnknownRestrictedError('Grade must be in range 1-5');
    }
    if (experimentalName && !experimental) {
        throw new UnknownRestrictedError(
            `Don't know experimental ${experimentalName}`
        );
    }

    let modifierObject = blueprint[grade];
    let propObject = applyBlueprintModifiers(moduleInfo, modifierObject,
        progress, {});
    if (BLUEPRINT_EXTRAS[name]) {
        (BLUEPRINT_EXTRAS[name])(moduleInfo, propObject);
    }

    if (experimental) {
        propObject = applyBlueprintModifiers(moduleInfo, experimental, progress,
            propObject);
    }

    return propObject;
}

/**
 * Return a modifier based on a modified property.
 * @param {string} module Item id
 * @param {string} name Property name
 * @param {number} modifiedProperty New property value
 * @returns {number} Modifier
 */
export function calculateModifier(module, name, modifiedProperty) {
    let baseValue = getModuleProperty(module, name);
    let propertyDescriptor = MODULE_STATS[name];
    if (!propertyDescriptor) {
        throw new UnknownRestrictedError(`Don't know property ${name}`);
    }

    switch (propertyDescriptor.method) {
        case 'additive':        return modifiedProperty - baseValue;
        case 'multiplicative':  return modifiedProperty / baseValue;
        case 'overwrite':       return modifiedProperty;
        default:                return modifiedProperty / baseValue;
    }
}

/**
 * Applies blueprint modifiers for a module and saves the results to a property
 * map.
 * @param {import('./items.js').ModuleInformation} moduleInfo Module info
 * @param {BlueprintGrade} modifierObject Blueprint modifier object
 * @param {number} progress Blueprint progress
 * @param {PropertyMap} propObject Property map to modify
 * @returns {PropertyMap} Returns `propObject`
 */
function applyBlueprintModifiers(moduleInfo, modifierObject, progress,
    propObject) {
    for (let prop in modifierObject) {
        let propertyDescriptor = MODULE_STATS[prop];
        if (!propertyDescriptor) {
            throw new UnknownRestrictedError(`No descriptor for ${prop}`);
        }

        // Allow subsequent applications of modifier objects for experimental effects
        let baseValue = (propObject[prop] && propObject[prop].Value) ||
            moduleInfo.props[prop];
        let [ min, max ] = modifierObject[prop];
        let blueprintModifier = (max - min) * progress + min;

        let Modifier = getModifier(propertyDescriptor, baseValue, blueprintModifier);
        let Value = getModifiedProperty(propertyDescriptor, baseValue, Modifier);
        propObject[prop] = {
            Label: prop,
            Modifier, Value,
            LessIsGood: !propertyDescriptor.higherbetter
        };
    }
    return propObject;
}

/**
 * Turns a blueprint modifier into a modifier.
 * @param {import('../module-stats.js').ModulePropertyDescriptor}
 *      propertyDescriptor Meta data about the property to modify
 * @param {number} base Value to modify
 * @param {number} blueprintModifier Blueprint modifier
 * @returns {number} Modifier
 */
function getModifier(propertyDescriptor, base, blueprintModifier) {
    switch (propertyDescriptor.modifier) {
        case undefined:     return blueprintModifier;
        // Used when modding resistances
        case 'antiscale':   return (1 - base) * blueprintModifier;
        // Used when modding shield-/hullboost
        case 'offsetscale': return (1 + base) * (1 + blueprintModifier) - (1 + base);
        default: throw new UnknownRestrictedError();
    }
}

/**
 * Applies a modifier to a base value and returns the modified value.
 * @param {import('../module-stats.js').ModulePropertyDescriptor}
 *      propertyDescriptor Meta data about the property to modify
 * @param {number} base Value to modify
 * @param {number} modifier Modifier
 * @returns {number} Modified property
 */
function getModifiedProperty(propertyDescriptor, base, modifier) {
    switch (propertyDescriptor.method) {
        // Additive mods can add new properties
        case 'additive':        return (base || 0) + modifier;
        case 'multiplicative':  return base * (1 + modifier);
        case 'overwrite':       return modifier;
        default: throw new UnknownRestrictedError();
    }
}
