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
        const baseFalloff = moduleInfo.props[FALLOFF_KEY];
        propObject[FALLOFF_KEY] = {
            Label: FALLOFF_KEY,
            Modifier: falloff / baseFalloff,
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
 * Return a modifier based on a modified property.
 * @param module Item id
 * @param name Property name
 * @param modifiedProperty New property value
 * @returns Modifier
 */
export function calculateModifier(
    module: string,
    name: string,
    modifiedProperty: number,
): number {
    const baseValue = getModuleProperty(module, name);
    const propertyDescriptor = MODULE_STATS[name];
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
            const baseValue =
                (propObject[prop] && propObject[prop].Value) ||
                moduleInfo.props[prop];
            const { min, max, only } = ModifierObject[prop];

            if (only && !moduleInfo.proto.Item.match(only)) {
                continue;
            }

            const Modifier = (max - min) * progress + min;
            let Value = getModifiedProperty(
                propertyDescriptor,
                baseValue,
                Modifier,
            );

            if (propertyDescriptor.integer) {
                Value = Math.round(Value);
            }

            if (!isNaN(Value)) {
                propObject[prop] = {
                    Label: prop,
                    LessIsGood: !propertyDescriptor.higherbetter,
                    Modifier,
                    Value,
                };
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
        // Additive mods can add new properties
        case 'boost':
            const pBase = propertyDescriptor.percentage ? base / 100 : base;
            return base + 100 * ((1 + pBase) * (1 + modifier) - (1 + pBase));
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
