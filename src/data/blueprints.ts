/**
 * @module Data
 */

/**
 * Ignore
 */
import { UnknownRestrictedError } from '../errors';
import { IModifierObject } from '../Module';
import MODULE_STATS, { IModulePropertyDescriptor } from '../module-stats';
import {
    BlueprintObject,
    ExperimentalObject,
    FeatureObject,
    ModuleInformation,
} from '../types';
import { getModuleInfo, getModuleProperty, getModuleTypeInfo } from './items';

import * as BLUEPRINTS from './blueprints.json';
import * as EXPERIMENTALS from './experimentals.json';

const FALLOFF_KEY = 'damagefalloffrange';
const BLUEPRINT_EXTRAS = {
    weapon_longrange: (
        moduleInfo: ModuleInformation,
        propObject: IPropertyMap,
    ) => {
        const falloff = propObject.maximumrange.Value;
        propObject[FALLOFF_KEY] = {
            Label: FALLOFF_KEY,
            Value: falloff,
        };
    },
};

/**
 * Maps property names to IModifierObject for a blueprint.
 */
export interface IPropertyMap {
    [property: string]: IModifierObject;
}

/**
 * Checks whether a given blueprint id is valid and returns the sanitized
 * blueprint ID.
 * @param id Blueprint id
 * @returns Lowercase blueprint ID
 */
export function assertValidBlueprint(blueprint: string): string {
    blueprint = blueprint.toLowerCase();
    if (!BLUEPRINTS[blueprint]) {
        throw new UnknownRestrictedError(`Don't know blueprint ${blueprint}`);
    }
    return blueprint;
}

/**
 * Checks whether a given experimental effect id is valid and returns the
 * sanitized experimental effect ID.
 * @param id Experimental effect id
 * @returns Lowercase experimental effect ID
 */
export function assertValidExperimental(experimental: string): string {
    experimental = experimental.toLowerCase();
    if (!EXPERIMENTALS[experimental]) {
        throw new UnknownRestrictedError(
            `Don't know experimental ${experimental}`,
        );
    }
    return experimental;
}

/**
 * Returns an object with details about the blueprint.
 * @param blueprint Blueprint name
 */
export function getBlueprintInfo(blueprint: string): BlueprintObject {
    return BLUEPRINTS[blueprint];
}

/**
 * Returns an object with details about the experimental effect.
 * @param experimental Experimental effect name
 */
export function getExperimentalInfo(experimental: string): ExperimentalObject {
    return EXPERIMENTALS[experimental];
}

/**
 * Get modified properties for a module.
 * @param module Item key
 * @param name Blueprint key
 * @param grade Blueprint grade
 * @param progress Blueprint progress
 * @param experimentalName Experimental effect
 * @returns Map of property names to modifier objects.
 */
export function getBlueprintProps(
    module: string,
    name: string,
    grade: number = 1,
    progress: number = 0,
    experimentalName?: string,
): IPropertyMap {
    const moduleInfo = getModuleInfo(module);
    const blueprint: BlueprintObject = BLUEPRINTS[name];
    const experimental: ExperimentalObject = EXPERIMENTALS[experimentalName];
    if (!blueprint) {
        throw new UnknownRestrictedError(`Don't know blueprint ${name}`);
    }
    if (grade < 1 || 5 < grade) {
        throw new UnknownRestrictedError('Grade must be in range 1-5');
    }
    if (experimentalName && !experimental) {
        throw new UnknownRestrictedError(
            `Don't know experimental ${experimentalName}`,
        );
    }

    const ModifierObject = blueprint.features[grade];
    let propObject = applyBlueprintModifiers(
        moduleInfo,
        ModifierObject,
        progress,
        {},
    );
    if (BLUEPRINT_EXTRAS[name]) {
        BLUEPRINT_EXTRAS[name](moduleInfo, propObject);
    }

    if (experimental) {
        propObject = applyBlueprintModifiers(
            moduleInfo,
            experimental.features,
            progress,
            propObject,
        );
    }

    return propObject;
}

/**
 * Return a modifier based on a modified property. This modifier does not
 * necessarily reflect the modifier used internally to calculate the value, e.g.
 * for properties that are changed using the boost method. It reflects the
 * change rate displayed in-game.
 * @param name Property name
 * @param originalProperty Base property value
 * @param modifiedProperty New property value
 * @returns Modifier
 */
export function calculateModifier(
    name: string,
    originalProperty: number,
    modifiedProperty: number,
): number {
    const propertyDescriptor = MODULE_STATS[name];
    if (!propertyDescriptor) {
        throw new UnknownRestrictedError(`Don't know property ${name}`);
    }

    switch (propertyDescriptor.method) {
        case 'additive':
            return modifiedProperty - (originalProperty || 0);
        case 'overwrite':
            return modifiedProperty;
        default:
            // This includes method == 'multiplicative'
            return modifiedProperty / originalProperty - 1;
    }
}

/**
 * Applies blueprint modifiers for a module and saves the results to a property
 * map.
 * @param moduleInfo Module info
 * @param IModifierObject Blueprint modifier object
 * @param progress Blueprint progress
 * @param propObject Property map to modify
 * @returns Returns `propObject`
 */
function applyBlueprintModifiers(
    moduleInfo: ModuleInformation,
    ModifierObject: FeatureObject,
    progress: number,
    propObject: IPropertyMap,
): IPropertyMap {
    for (const prop in ModifierObject) {
        if (ModifierObject.hasOwnProperty(prop)) {
            const propertyDescriptor = MODULE_STATS[prop];
            if (!propertyDescriptor) {
                throw new UnknownRestrictedError(`No descriptor for ${prop}`);
            }

            // Allow subsequent applications of modifier objects for
            // experimental effects
            const baseValue = propObject[prop] ?
                propObject[prop].Value :
                moduleInfo.props[prop];
            const { min, max, only } = ModifierObject[prop];

            if (only && !moduleInfo.proto.Item.match(only)) {
                continue;
            }

            // Never store this modifier in the modifier object because it does
            // not necessarily reflect the change displayed in-game, e.g. for
            // boost method.
            const modifier = (max - min) * progress + min;
            let Value = getModifiedProperty(
                propertyDescriptor,
                baseValue,
                modifier,
            );

            if (propertyDescriptor.integer) {
                Value = Math.round(Value);
            }

            if (!isNaN(Value)) {
                propObject[prop] = { Label: prop, Value };
            }
        }
    }
    return propObject;
}

/**
 * Applies a modifier to a base value and returns the modified value.
 * @param propertyDescriptor Meta data about the property to modify
 * @param base Value to modify
 * @param modifier Modifier
 * @returns Modified property
 */
function getModifiedProperty(
    propertyDescriptor: IModulePropertyDescriptor,
    base: number,
    modifier: number,
): number {
    switch (propertyDescriptor.method) {
        case 'boost':
            const pBase = propertyDescriptor.percentage ? base / 100 : base;
            return base + 100 * ((1 + pBase) * (1 + modifier) - (1 + pBase));
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

/**
 * Check whether a blueprint can be applied to an item.
 * @param item Item ID
 * @param blueprint Blueprint ID
 * @returns True if blueprint can be applied
 */
export function canApplyBlueprint(item: string, blueprint: string): boolean {
    return getModuleTypeInfo(item).applicable.includes(blueprint);
}

/**
 * Check whether a experimental effect can be applied to an item.
 * @param item Item ID
 * @param experimental Experimental effect ID
 * @returns True if experimental effect can be applied
 */
export function canApplyExperimental(
    item: string,
    experimental: string,
): boolean {
    return getModuleTypeInfo(item).applicable_specials.includes(experimental);
}
