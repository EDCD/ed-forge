/**
* @module Data
*/

/**
* Ignore
*/
import {UnknownRestrictedError} from '../errors';
import MODULE_STATS from '../module-stats';
import { getModuleInfo, getModuleProperty } from './items';
import { ModifierObject } from '../Module';
import { FeatureObject, ModuleInformation } from '../types';

import * as BLUEPRINTS from './blueprints.json';
import * as EXPERIMENTALS from './experimentals.json';

const BLUEPRINT_EXTRAS = {
    'Weapon_LongRange': (moduleInfo: ModuleInformation, propObject) => {
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
 */
type PropertyMap = { [ property: string ]: ModifierObject }

/**
 * Get modified properties for a module.
 * @param module Item key
 * @param name Blueprint key
 * @param grade Blueprint grade
 * @param progress Blueprint progress
 * @param experimentalName Experimental effect
 * @returns Map of property names to modifier objects.
 */
export function getBlueprintProps(module: string, name: string,
    grade: number = 1, progress: number = 0, experimentalName?: string): PropertyMap {
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
 * @param module Item id
 * @param name Property name
 * @param modifiedProperty New property value
 * @returns Modifier
 */
export function calculateModifier(module: string, name: string, modifiedProperty: number): number {
    let baseValue = getModuleProperty(module, name);
    let propertyDescriptor = MODULE_STATS[name];
    if (!propertyDescriptor) {
        throw new UnknownRestrictedError(`Don't know property ${name}`);
    }

    switch (propertyDescriptor.method) {
        case 'additive':
            return modifiedProperty - baseValue;
        case 'multiplicative':
            return modifiedProperty / baseValue;
        case 'overwrite':
            return modifiedProperty;
        default:
            return modifiedProperty / baseValue;
    }
}

/**
 * Applies blueprint modifiers for a module and saves the results to a property
 * map.
 * @param moduleInfo Module info
 * @param modifierObject Blueprint modifier object
 * @param progress Blueprint progress
 * @param propObject Property map to modify
 * @returns Returns `propObject`
 */
function applyBlueprintModifiers(moduleInfo: ModuleInformation,
    modifierObject: FeatureObject, progress: number, propObject: PropertyMap): PropertyMap {
    for (let prop in modifierObject) {
        let propertyDescriptor = MODULE_STATS[prop];
        if (!propertyDescriptor) {
            throw new UnknownRestrictedError(`No descriptor for ${prop}`);
        }

        // Allow subsequent applications of modifier objects for experimental effects
        let baseValue = (propObject[prop] && propObject[prop].Value) ||
            moduleInfo.props[prop];
        let [min, max] = modifierObject[prop];
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
 * @param propertyDescriptor Meta data about the property to modify
 * @param base Value to modify
 * @param blueprintModifier Blueprint modifier
 * @returns Modifier
 */
function getModifier(propertyDescriptor, base: number, blueprintModifier: number): number {
    switch (propertyDescriptor.modifier) {
        case undefined:
            return blueprintModifier;
        // Used when modding resistances
        case 'antiscale':
            return (1 - base) * blueprintModifier;
        // Used when modding shield-/hullboost
        case 'offsetscale':
            return (1 + base) * (1 + blueprintModifier) - (1 + base);
        default:
            throw new UnknownRestrictedError();
    }
}

/**
 * Applies a modifier to a base value and returns the modified value.
 * @param propertyDescriptor Meta data about the property to modify
 * @param base Value to modify
 * @param modifier Modifier
 * @returns Modified property
 */
function getModifiedProperty(propertyDescriptor, base: number, modifier: number): number {
    switch (propertyDescriptor.method) {
        // Additive mods can add new properties
        case 'additive':
            return (base || 0) + modifier;
        case 'multiplicative':
            return base * (1 + modifier);
        case 'overwrite':
            return modifier;
        default:
            throw new UnknownRestrictedError();
    }
}
