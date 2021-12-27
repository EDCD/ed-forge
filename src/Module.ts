/**
 * @module Module
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import {
    clamp, clone, flatMap, keys, mapValues, set, values,
} from 'lodash';

import { compress, decompress } from './compression';
import Factory from './data';
import {
    assertValidExperimental,
    calculateModifier,
    canApplyBlueprint,
    canApplyExperimental,
    getBlueprintProps,
    IPropertyMap,
} from './data/blueprints';
import {
    assertValidModule,
    getClass,
    getModuleMetaProperty,
    getModuleProperty,
    getModuleTypeInfo,
    getRating,
    itemFitsSlot,
} from './data/items';
import { Slot, TYPES } from './data/slots';
import {
    IllegalChangeError,
    IllegalStateError,
    UnknownRestrictedError,
} from './errors';
import { mapValuesDeep } from './helper';
import DiffEmitter from './helper/DiffEmitter';
import MODULE_STATS, { ModulePropertyCalculator } from './module-stats';
import Ship from './Ship';
import { moduleVarIsSpecified, validateModuleJson } from './validation';

import MODULE_REGISTRY from './data/module_registry.json';
import { POWER_METRICS } from './ship-stats';
import { BitVec, ModuleRegistryEntry } from './types';

const SI_PREFIXES = {
    '-24': 'y',
    '-21': 'z',
    '-18': 'a',
    '-15': 'f',
    '-12': 'p',
    '-9': 'n',
    '-6': 'µ',
    '-3': 'm',
    '-2': 'c',
    '-1': 'd',
    '0': '',
    '1': 'da',
    '2': 'h',
    '3': 'k',
    '6': 'M',
    '9': 'G',
    '12': 'T',
    '15': 'P',
    '18': 'E',
    '21': 'Z',
    '24': 'Y',
};

/**
 * Clones a given module.
 * @param module Module to clone
 * @returns Cloned module object
 */
function moduleToJSON(
    module: string | Module | IModuleObject,
): IModuleObject {
    if (module instanceof Module) {
        module = module.toJSON();
    } else {
        if (typeof module === 'string') {
            module = decompress<IModuleObject>(module);
        }
        validateModuleJson(module);
    }

    return module;
}

export interface IPowered {
    /**
     * Is the module powered when hardpoints are deployed? If undefined, module
     * does not consume any power and as such is always turned "on".
     */
    deployed: boolean;
    /**
     * Is the module powered when hardpoints are retracted? If undefined, module
     * does not consume any power and as such is always turned "on".
     */
    retracted: boolean;
}

export interface IPropertyFormatting {
    /**
     * The value of the formatted property. Might be scaled to a certain
     * SI-Prefix, e.g. km instead of m.
     */
    value: number;
    /** Unit of the property including SI-Prefix. */
    unit: string;
    /**
     * Undefined if value is has not been modified. Otherwise reflects whether
     * the modification has beneficial effects.
     */
    beneficial: boolean;
    /**
     * True if value can only be an integer.
     */
    integer?: boolean;
}

/**
 * Loadout-event style object describing a module
 */
interface IIModuleObjectBase {
    /** Item/actual module that this module represents */
    Item: string;
    /** Power priority group (zero indexed) */
    Priority: number;
    /** True when this module is switched on */
    On: boolean;
}

export interface IModuleObject extends IIModuleObjectBase {
    /** Slot this module is on (possibly empty string) */
    Slot: string;
    /** Blueprint applied to this module */
    Engineering?: IBlueprintObject;
}

export interface IModuleObjectHandler extends IIModuleObjectBase {
    Slot: Slot;
    /** Blueprint applied to this module */
    Engineering?: IBlueprintObjectHandler;
}

/**
 * Engineer blueprint.
 */
interface IIBlueprintObjectBase {
    /** Name of the blueprint */
    BlueprintName: string;
    /** Grade of the blueprint from 1 to 5 */
    Level: number;
    /** Progress of the blueprint from 0 to 1 */
    Quality: number;
    /** Name of the experimental effect */
    ExperimentalEffect?: string;
}

export interface IBlueprintObject extends IIBlueprintObjectBase {
    /** Array of all modifiers */
    Modifiers: IModifierObject[];
}

export interface IBlueprintObjectHandler extends IIBlueprintObjectBase {
    /** Array of all modifiers */
    Modifiers: IPropertyMap;
}

/**
 * Module property modifier overriding default values.
 */
export interface IModifierObject {
    /** Property name */
    Label: string;
    /** Modified property value */
    Value: number;
    /** Original property of the module */
    OriginalValue?: number;
    /**
     * Change-rate of the value in comparison to base-property. In case the
     * value is undefined, it has only not been calculated yet - the property
     * might still be modified.
     */
    Modifier?: number;
    UserSet?: boolean;
}

const DIFF_EVENT = 'diff';

/**
 * A module that belongs to a Ship.
 */
export default class Module extends DiffEmitter {
    public object: IModuleObjectHandler;
    public ship: Ship;

    /**
     * Create a module by reading a module JSON given in a loadout-event-style
     * ship build. Can be given as a compressed string or plain object.
     * @param buildFrom Module to load
     * @param ship Ship to assign this module to
     */
    constructor(ship: Ship, buildFrom: string | Module | IModuleObject) {
        super();
        autoBind(this);

        this.ship = ship;

        const object = mapValuesDeep(moduleToJSON(buildFrom), (v) =>
            typeof v === 'string' ? v.toLowerCase() : v,
        ) as IModuleObject;

        // NOTE: This is the same as the const initialized above - we assign
        // this here to cope with ts compilation.
        this.object = object as any as IModuleObjectHandler;

        this.object.Slot = new Slot(this.ship.getShipType(), object.Slot);
        if (object.Engineering) {
            const importLater = [];
            const synthetics: IPropertyMap = {};
            const modifiers = object.Engineering.Modifiers;
            this.object.Engineering.Modifiers = {};
            for (const modifier of modifiers) {
                const label = modifier.Label.toLowerCase();
                const stats = MODULE_STATS[label];
                if (stats) {
                    if (stats.getter) {
                        synthetics[label] = modifier;
                    }

                    if (stats.importer) {
                        importLater.push([stats.importer, modifier]);
                    } else if (!stats.getter) {
                        this.object.Engineering.Modifiers[label] = modifier;
                    }
                }
            }

            for (const [importWith, modifier] of importLater) {
                importWith(this, modifier, synthetics);
            }
        }

        this._trackFor(this.object, DIFF_EVENT);
    }

    /**
     * Read an arbitrary object property of this module's corresponding json.
     * @param property Property name
     * @returns Property value
     */
    public read(property: string): any {
        return this.object[property];
    }

    /**
     * Read an arbitrary object property of this module's corresponding meta
     * properties, e.g. eddbID, edID.
     * @param property Property name
     * @returns Property value
     */
    public readMeta(property: string): any {
        if (!this.object.Item) {
            return undefined;
        } else {
            return getModuleMetaProperty(this.object.Item, property);
        }
    }

    /**
     * Write an arbitrary value to an arbitrary object property of this module's
     * corresponding json. Fields that are required to be set on valid modules
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the module's item you can't invoke
     * `module.write('Item', '...')` but must invoke
     * `module.setItem('...')`.
     * @param property Property name
     * @param value Property value
     */
    public write(property: string, value: any) {
        if (moduleVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`,
            );
        }

        this._writeObject(property, value);
    }

    /**
     * Return a property of this module, e.g. "mass".
     * @param property Property name
     * @param modified False to retrieve default value
     * @returns Property value or `null` when property
     *      applies to this module but is not given or undefined when property
     *      does not apply to this type of module, e.g. "ammo" on a cargo rack.
     */
    public get(
        property:
            | string
            | ModulePropertyCalculator,
        modified: boolean = true,
    ): number | null | undefined {
        if (typeof property === 'string') {
            property = property.toLowerCase();
            const stats = MODULE_STATS[property];
            if (!stats) {
                throw new UnknownRestrictedError(
                    `Don't know property ${property}`,
                );
            }

            const getter = MODULE_STATS[property].getter;
            if (getter) {
                return getter(this, modified);
            } else {
                if (
                    modified &&
                    this.object.Engineering &&
                    this.object.Engineering.Modifiers[property]
                ) {
                    return this.object.Engineering.Modifiers[property].Value;
                }
                return getModuleProperty(this.object.Item, property);
            }
        } // else: function
        return property(this, modified);
    }

    /**
     * Same as [[Module.get]] but retrieves percentage values not as raw numbers
     * but casted into the range `[0,1]`.
     * @param property Property name or getter
     * @param modified False to retrieve default value
     * @return Property value with the same exceptions as in [[Module.get]]
     */
    public getClean(
        property: string,
        modified: boolean = true,
    ): number | null | undefined {
        property = property.toLowerCase();
        let value = this.get(property, modified);
        if (MODULE_STATS[property].percentage) {
            value /= 100;
        }
        return value;
    }

    /**
     * Returns the modifier, i.e. change rate, of a given property or zero if
     * the property hasn't been modified.
     * @param property Property name
     * @returns Modifier
     */
    public getModifier(property: string): number {
        property = property.toLowerCase();
        if (
            this.object.Engineering &&
            this.object.Engineering.Modifiers[property]
        ) {
            const modifierObject = this.object.Engineering.Modifiers[property];
            let { Modifier } = modifierObject;
            // In case the Modifier has never been calculated, do it now
            if (Modifier === undefined) {
                Modifier = calculateModifier(
                    property, this.get(property, false), modifierObject.Value,
                );
                // Don't commit this change because technically, the module
                // doesn't change.
                modifierObject.Modifier = Modifier;
            }
            return Modifier;
        // Modifiers for synthetic properties must always be re-calculated!
        // There is no mechanism that invalidates the Modifier property on
        // changes of the underlying non-synthetic properties.
        } else if (MODULE_STATS[property].getter) {
            return calculateModifier(
                property,
                MODULE_STATS[property].getter(this, false),
                MODULE_STATS[property].getter(this, true),
            );
        } else {
            return 0;
        }
    }

    /**
     * Returns the value of a module property scaled to a some SI-Prefix and
     * meta-information regarding the value.
     * @param property Property to fetch.
     * @param [modified=true] Set to false to retrieve default value.
     * @param [siScaling=0] SI scaling. Must have an official SI prefix.
     * @returns Formatting info
     */
    public getFormatted(
        property: string,
        modified: boolean = true,
        siScaling: number = 0,
    ): IPropertyFormatting {
        const stats = MODULE_STATS[property];
        if (!stats) {
            throw new UnknownRestrictedError(`Don't know property ${property}`);
        }

        const prefix = SI_PREFIXES[siScaling];
        // Can't check for truthiness, because '' might be returned
        if (prefix === undefined) {
            throw new UnknownRestrictedError(`Don't know SI prefix ${siScaling}`);
        }

        const scaleFactor = Math.pow(10, siScaling);
        const value = this.get(property, modified) * scaleFactor;

        const { higherbetter, unit, percentage, integer } = stats;
        const delta = value - this.get(property, false) * scaleFactor;
        return {
            beneficial: delta === 0 ? undefined : higherbetter === delta > 0,
            integer,
            unit: `${prefix}${unit || (percentage && '%') || ''}`,
            value,
        };
    }

    /**
     *
     * @param property Property to fetch the modifier for.
     */
    public getModifierFormatted(property: string): IPropertyFormatting {
        const value = this.getModifier(property);
        const { method, higherbetter, percentage } = MODULE_STATS[property];
        let unit = '%';
        if (method === 'overwrite' || method === 'additive') {
            unit = percentage ? '%' : undefined;
        }
        let beneficial;
        if (value !== 0) {
            beneficial = higherbetter === value > 0;
        }
        return {
            beneficial, integer: false, unit, value,
        };
    }

    /**
     * Fetch an array of properties modified excluding synthetic ones.
     * @returns Array of modifier properties; empty if no modification has been
     * applied.
     */
    public getModifiedProperties(): string[] {
        const { Engineering } = this.object;
        if (!Engineering) {
            return [];
        } else {
            return keys(this.object.Engineering.Modifiers);
        }
    }

    /**
     * Sets the value of a property.
     * @param Label Property name
     * @param Value Property value
     */
    public set(Label: string, Value: number) {
        if (!this.object.Engineering) {
            throw new IllegalStateError(
                `Can't set property ${Label} - no blueprint applied`,
            );
        }

        Label = Label.toLowerCase();
        const propertyPath = `Engineering.Modifiers.${Label}`;
        if (this.object.Engineering.Modifiers[Label]) {
            this._prepareObjectChange(`${propertyPath}.Value`, Value);
            this._prepareObjectChange(`${propertyPath}.Modifier`, undefined);
            this._prepareObjectChange(`${propertyPath}.UserSet`, true);
            this._commitObjectChanges();
        } else {
            this._writeObject(propertyPath, { Label, UserSet: true, Value });
        }
    }

    /**
     * How relatively effective is this weapon against the enemy armour based
     * on its penetration value?
     * @param modified Should modifications be taken into account?
     * @returns Efficiency in range `[0, 1]` or `NaN` if this module is not a
     * weapon
     */
    public getArmourEffectiveness(modified?: boolean): number {
        if (!this.ship.getOpponent()) {
            return 1;
        }

        const opponent = this.ship.getOpponent();
        let hardness;
        // In theory, we could simply use the interface in the first place,
        // however this might trigger a calculation on every call of
        // `armourEfficiency` for every module. To save performance, simple read
        // the base property for ships.
        if (opponent instanceof Ship) {
            hardness = opponent.readProp('hardness');
        } else {
            hardness = opponent.getArmour().hardness;
        }
        return Math.min(1, this.get('armourpenetration', modified) / hardness);
    }

    /**
     * How relatively effective is this weapon based on the engagement range and
     * its falloff value?
     * @param modified Should modifications be taken into account?
     * @returns Efficiency in range `[0, 1]` or `NaN` if this module is not a
     * weapon
     */
    public getRangeEffectiveness(modified?: boolean) {
        if (isNaN(this.ship.getEngagementRange())) {
            return 1;
        }

        const falloff = this.get('damagefalloffrange', modified);
        const oppRange = this.ship.getEngagementRange();
        const range = this.get('maximumrange', modified);
        return Math.min(
            1,
            Math.max(0, 1 - (oppRange - falloff) / (range - falloff)),
        );
    }

    /**
     * Remove a modifier for a property and reset it to default values.
     * @param property Property name.
     */
    public clear(property: string) {
        if (!this.object.Engineering) {
            throw new IllegalStateError(
                `Can't clear property ${property} - no blueprint allied`,
            );
        }

        property = property.toLowerCase();
        this._prepare(DIFF_EVENT, `Engineering.Modifiers.${property}`);
        delete this.object.Engineering.Modifiers[property];
        this._commitObjectChanges();
    }

    /**
     * Apply a blueprint to this module preserving user set properties.
     * @param name Blueprint name
     * @param grade Blueprint grade
     * @param progress Blueprint progress
     * @param experimental Experimental effect to apply; if none is given old
     * experimental (if given) is preserved
     */
    public setBlueprint(
        name: string,
        grade: number = 1,
        progress: number = 0,
        experimental?: string,
    ) {
        if (!this.object.Item) {
            throw new IllegalStateError(
                `Can't set blueprint ${name} without item`,
            );
        }

        const blueprint = Factory.newBlueprint(name, grade, experimental);
        if (!canApplyBlueprint(this.object.Item, name.toLowerCase())) {
            throw new IllegalChangeError(
                `Can't apply ${name} to ${this.object.Item}`,
            );
        }

        if (
            experimental &&
            !canApplyExperimental(this.object.Item, experimental.toLowerCase())
        ) {
            throw new IllegalChangeError(
                `Can't apply ${experimental} to ${this.object.Item}`,
            );
        }
        this._prepareObjectChange('Engineering', blueprint);
        this.setBlueprintProgress(progress); // this will commit prepare changes
    }

    /**
     * Set the progress of the current blueprint.
     * @param progress Progress in range from 0 to 1
     */
    public setBlueprintProgress(progress?: number) {
        if (!this.object.Engineering) {
            throw new IllegalStateError("Can't set progress of no blueprint");
        }

        if (progress === undefined) {
            progress = this.object.Engineering.Quality;
        }
        progress = clamp(progress, 0, 1);
        this._prepareObjectChange('Engineering.Quality', progress);
        this._prepareObjectChange(
            'Engineering.Modifiers',
            getBlueprintProps(
                this.object.Item,
                this.object.Engineering.BlueprintName,
                this.object.Engineering.Level,
                this.object.Engineering.Quality,
                this.object.Engineering.ExperimentalEffect,
            ),
        );
        this._commitObjectChanges();
    }

    /**
     * Apply a experimental effect to this module.
     * @param [name] experimental effect name; if no experimental effect is
     * given, the current effect will be cleared.
     */
    public setExperimental(name?: string) {
        if (!this.object.Engineering) {
            throw new IllegalStateError(
                `Can only set experimental ${name} when a blueprint has been applied.`,
            );
        }

        if (name !== undefined) {
            name = assertValidExperimental(name);
        }

        this._prepareObjectChange(
            'Engineering.ExperimentalEffect',
            name,
        );
        this.setBlueprintProgress(); // this will commit prepare changes
    }

    /**
     * Returns an array of all applicable items to this module. Can only be
     * resolved once both a ship and a slot have been assigned.
     * @returns Array of applicable items
     */
    public getApplicableItems(): string[] {
        if (this.isOnSlot(TYPES.ARMOUR)) {
            // If this is an armour slot, we only return all armour available
            // to the module's ship
            return values(
                MODULE_REGISTRY.armour.items[this.ship.getShipType()],
            );
        } else {
            // If this is not an armour slot, try each available module category
            return flatMap(MODULE_REGISTRY as any as {
                [name: string]: ModuleRegistryEntry,
            }, (entry: ModuleRegistryEntry) => {
                if (!this.isOnSlot(entry.slots)) {
                    // This type of module does not fit at all
                    return [];
                } else {
                    return flatMap(
                        values(entry.items),
                        (ratings) => values(ratings).filter(itemFitsSlot.bind(
                            undefined,
                            this.ship.getShipType(),
                            this.object.Slot,
                        )),
                    );
                }
            });
        }
    }

    /**
     * Returns an array of applicable blueprints. This array is empty if the
     * module has no item equipped.
     * @returns Array of applicable blueprints
     */
    public getApplicableBlueprints(): string[] {
        if (!this.object.Item) {
            return [];
        } else {
            return clone(getModuleTypeInfo(this.object.Item).applicable);
        }
    }

    /**
     * Returns an array of applicable experimental effects. This array is empty
     * if the module has no item equipped.
     * @returns Array of applicable experimental effects
     */
    public getApplicableExperimentals(): string[] {
        if (!this.object.Item) {
            return [];
        } else {
            return clone(
                getModuleTypeInfo(this.object.Item).applicable_specials,
            );
        }
    }

    /**
     * Clear all modifications.
     */
    public resetEngineering() {
        this._writeObject('Engineering', undefined);
    }

    /**
     * Clear all modifications and resets the slot completely. If the slot is a
     * core internal slot, the item won't get changed.
     */
    public reset() {
        if (!this.isOnSlot(TYPES.CORE)) {
            this._prepareObjectChange('Item', '');
        }
        this._prepareObjectChange('Priority', 0);
        this._prepareObjectChange('On', true);
        // resetEngineering will commit changes
        this.resetEngineering();
    }

    /**
     * Returns a copy of this module as a loadout-event-style module.
     * @returns Module
     */
    public toJSON(): IModuleObject {
        const r = (clone(this.object) as (IModuleObject &
            IModuleObjectHandler)) as IModuleObject;
        r.Slot = this.object.Slot.toString();
        if (this.object.Engineering) {
            r.Engineering = (clone(
                this.object.Engineering,
            ) as (IBlueprintObject &
                IBlueprintObjectHandler)) as IBlueprintObject;
            r.Engineering.Modifiers = values(this.object.Engineering.Modifiers);
            for (const stat in MODULE_STATS) {
                if (MODULE_STATS.hasOwnProperty(stat)) {
                    const getter = MODULE_STATS[stat].getter;
                    if (getter) {
                        const Value = this.get(getter, true);
                        if (Value) {
                            r.Engineering.Modifiers.push({
                                Label: stat,
                                Value,
                            });
                        }
                    }
                }
            }
        }
        return r;
    }

    /**
     * Returns a compressed string representing the loadout-event-style module.
     * @returns Compressed string
     */
    public compress(): string {
        return compress(this.object);
    }

    /**
     * Check whether the item of this slot is of the given type. If a string
     * is given as argument, it will be checked for equality. If it is an regex
     * it will be checked whether the regex matches this item.
     * @param type Item type to check
     * @returns True if the item matches the type provided
     */
    public itemIsOfType(type: string | RegExp): boolean {
        if (typeof type === 'string') {
            return this.object.Item === type.toLowerCase();
        }
        return Boolean(this.object.Item.match(type));
    }

    /**
     * Returns the actual item of this module, e.g.
     * `int_powerplant_size5_class1`.
     * @returns The item
     */
    public getItem(): string {
        return this.object.Item;
    }

    /**
     * Set the item of this module.
     * @param item Item to set.
     * @param clazz
     * @param rating
     */
    public setItem(item: string, clazz: string | number = '', rating: string = '') {
        try {
            item = Factory.getModuleId(item, clazz, rating);
            // Don't handle errors as item might not have been a type to begin
            // with. Further errors will be handled when we check if this item
            // fits on this slot
        } catch (e) {}

        item = assertValidModule(item);
        const fits = itemFitsSlot(
            this.ship.getShipType(),
            this.object.Slot,
            item,
        );
        if (!fits) {
            throw new IllegalStateError(
                `Item ${item} does not fit ${this.object.Slot}`,
            );
        }

        this._prepare(DIFF_EVENT, 'Engineering');
        delete this.object.Engineering;
        this._writeObject('Item', item); // this will commit changes
    }

    /**
     * Set the armour of the ship by type.
     * @param type Type of the armour (grade1-3, mirrored, reactive)
     */
    public setAlloys(type: string) {
        this.setItem('armour', this.ship.getShipType(), type);
    }

    /**
     * Checks whether this module is on a matching slot.
     * @param slot Slot to check; if string exact match is required, if RegExp
     * only a simple match is required. If an array, one the given slots must
     * match.
     * @returns True if the module is on the given slot or the RegExp matches,
     *  false if none of this holds; null if the slot is on no module at all.
     */
    public isOnSlot(slot: BitVec | string | RegExp): boolean | null {
        return this.object.Slot.is(slot);
    }

    /**
     * Returns the slot name of this module.
     * @returns Slot name
     */
    public getSlot(): string {
        return this.object.Slot.toString();
    }

    /**
     * Is the module currently enabled?
     * @returns True when enabled
     */
    public isEnabled(): boolean {
        return this.object.On;
    }

    /**
     * Is the module powered?
     * @returns Mapping to boolean; might be undefined when the module cannot
     * be turned on or off, e.g. is a hull reinforcement package.
     */
    public isPowered(): IPowered {
        const isHardPoint = this.isOnSlot(TYPES.HARDPOINT);
        const powered = {
            deployed: true,
            retracted: isHardPoint ? undefined : true,
        };

        if (this.get('powerdraw') === 0) {
            return powered;
        }

        if (!this.isEnabled()) {
            // Use `... && false` so that undefined stays undefined
            return mapValues(powered, (isPowered) => isPowered && false);
        }

        const prio = this.getPowerPriority();
        const metrics = this.ship.getMetrics(POWER_METRICS);
        const gen = metrics.generated;
        powered.deployed = metrics.relativeConsumed[prio] <= gen;
        if (!isHardPoint) {
            powered.retracted = metrics.relativeConsumedRetracted[prio] <= gen;
        }
        return powered;
    }

    /**
     * Turn this module on/off. If the module does not consume power, this
     * method hasn't any effect.
     * @param [on] True to turn the module on, false to turn it off. Passing
     * nothing will flip the state.
     */
    public setEnabled(on?: boolean) {
        // if an module does not consume power, it is always on
        if (on === undefined) {
            on = !this.isEnabled();
        }
        if (this.get('PowerDraw')) {
            this._writeObject('On', on);
        }
    }

    /**
     * Get the power priority of the current module. Priorities are indices
     * starting with `0` which corresponds to the ingame priority group `1`.
     * @return Power priority group
     */
    public getPowerPriority(): number | null {
        if (this.object.Item) {
            return this.object.Priority;
        } else {
            return null;
        }
    }

    /**
     * Set the power priority group of the current module.
     * @param priority Priority (not negative)
     */
    public setPowerPriority(priority: number) {
        if (priority < 0) {
            throw new IllegalChangeError(
                'Priority groups must not be negative',
            );
        }
        if (this.get('PowerDraw')) {
            this._writeObject('Priority', Math.floor(priority));
        }
    }

    /**
     * Returns the ship this module is assigned to or `null` if unassigned.
     */
    public getShip(): Ship {
        return this.ship;
    }

    /**
     * Checks whether this module is empty, i.e. does not have an item assigned.
     * @returns True when empty, false otherwise.
     */
    public isEmpty(): boolean {
        return this.object.Item === '';
    }

    /**
     * Returns the class of this module. Class of utility items or bulkheads is
     * always zero. Class of hardpoints is in range 1 to 4 for small to huge.
     * @returns Item class or `null` if no item has been assigned
     */
    public getClass(): number | null {
        if (!this.object.Item) {
            return null;
        }
        return getClass(this.object.Item);
    }

    /**
     * Returns the rating of this module.
     * @returns Rating or `null` if no item has been assigned
     */
    public getRating(): string | null {
        if (!this.object.Item) {
            return null;
        }
        return getRating(this.object.Item);
    }

    /**
     * Get the module class and rating as a string, e.g. `"5E"`. Might return
     * null when slot is empty.
     * @returns Class and rating
     */
    public getClassRating(): string | null {
        const clazz = this.getClass();
        const rating = this.getRating();
        if (!clazz || !rating) {
            return null;
        }
        return String(clazz) + rating;
    }

    /**
     * Get currently applied blueprint or null if no engineering is done to the
     * module.
     * @returns Blueprint key
     */
    public getBlueprint(): string | null {
        if (this.object.Engineering) {
            return this.object.Engineering.BlueprintName;
        } else {
            return null;
        }
    }

    /**
     * Get currently applied experimental effect or null if no engineering is
     * done to the module
     * @returns Experimental effect key
     */
    public getExperimental(): string | null {
        if (this.object.Engineering) {
            return this.object.Engineering.ExperimentalEffect;
        } else {
            return null;
        }
    }

    /**
     * Get grade of the currently applied blueprint.
     * @returns Blueprint grade
     */
    public getBlueprintGrade(): number | null {
        if (this.object.Engineering) {
            return this.object.Engineering.Level;
        } else {
            return null;
        }
    }

    /**
     * Returns the progress of the current blueprint or `null` if no blueprint
     * is currently applied.
     */
    public getBlueprintProgress(): number | null {
        if (this.object.Engineering) {
            return this.object.Engineering.Quality;
        } else {
            return null;
        }
    }

    public getSize(): string {
        return this.object.Slot.getSize();
    }

    /**
     * Returns the size of the slot of this module. Size of utility slots and
     * bulkheads is always zero. Size of hardpoint slots is in range 1 to 4 for
     * small to huge.
     * @returns Size
     */
    public getSizeNum(): number {
        return this.object.Slot.getSizeNum();
    }

    /**
     * Reverts the module `by` number of steps into history.
     * @param [by=1] Number of steps to revert
     */
    public revert() {
        super.revert(DIFF_EVENT, 1);
    }

    /**
     * Clear the change history of this module.
     */
    public clearHistory() {
        super.clear(DIFF_EVENT);
    }

    /**
     *
     * @param cb
     */
    public try(cb: () => any): any {
        return this.tryWhileMuted(DIFF_EVENT, cb);
    }

    /**
     * Write a value to [[object]] and emit the changes as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _writeObject(path: string, value: any) {
        this._prepareObjectChange(path, value);
        this._commitObjectChanges();
    }

    /**
     * Write a value to [[object]] and prepare the changes to be emitted
     * as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _prepareObjectChange(path: string, value: any) {
        this._prepare(DIFF_EVENT, path);
        set(this.object, path, value);
    }

    /**
     * Emit all saved changes to [[object]] as `'diff'` event.
     */
    private _commitObjectChanges() {
        this._commit(DIFF_EVENT);
    }
}
