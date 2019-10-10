/**
 * @module Module
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { clamp, clone, cloneDeep, forEach, map, set, values } from 'lodash';

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
import { assertValidSlot, getSlotSize, REG_CORE_SLOT } from './data/slots';
import {
    IllegalChangeError,
    IllegalStateError,
    NotImplementedError,
    UnknownRestrictedError,
} from './errors';
import { mapValuesDeep, matchesAny } from './helper';
import DiffEmitter from './helper/DiffEmitter';
import MODULE_STATS, {
    IModulePropertyCalculatorClass,
    ModulePropertyCalculator,
} from './module-stats';
import Ship from './Ship';
import { moduleVarIsSpecified, validateModuleJson } from './validation';

import * as MODULE_REGISTRY from './data/module_registry.json';
import { ModuleRegistryEntry } from './types';

/**
 * Clones a given module.
 * @param module Module to clone
 * @returns Cloned module object
 */
function cloneModuleToJSON(
    module: string | Module | IModuleObject,
): IModuleObject {
    if (module instanceof Module) {
        module = module.toJSON();
    } else {
        if (typeof module === 'string') {
            module = decompress<IModuleObject>(module);
        }
        module = cloneDeep(module);

        validateModuleJson(module);
    }

    return module;
}

/**
 * Loadout-event style object describing a module
 */
interface IIModuleObjectBase {
    /** Item/actual module that this module represents */
    Item: string;
    /** Power priority group */
    Priority: number;
    /** Slot this module is on (possibly empty string) */
    Slot: string;
    /** True when this module is switched on */
    On: boolean;
}

export interface IModuleObject extends IIModuleObjectBase {
    /** Blueprint applied to this module */
    Engineering?: IBlueprintObject;
}

export interface IModuleObjectHandler extends IIModuleObjectBase {
    /** Blueprint applied to this module */
    Engineering?: IBlueprintObjectHandler;
}

export type Slot = string | RegExp;

/**
 * Engineer blueprint.
 */
interface IIBlueprintObjectBase {
    Engineer?: string;
    EngineerID?: number;
    BlueprintID?: number;
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
    OriginalValue?: number;
    Modifier?: number;
    UserSet?: boolean;
}

const DIFF_EVENT = 'diff';

/**
 * A module that belongs to a Ship.
 */
export default class Module extends DiffEmitter {
    public object: IModuleObjectHandler = {
        Item: '',
        On: true,
        Priority: 1,
        Slot: '',
    };
    public ship: Ship = null;

    /**
     * Create a module by reading a module JSON given in a loadout-event-style
     * ship build. Can be given as a compressed string or plain object.
     * @param buildFrom Module to load
     * @param ship Ship to assign this module to
     */
    constructor(buildFrom: string | Module | IModuleObject, ship?: Ship) {
        super();
        autoBind(this);

        if (buildFrom) {
            const object = mapValuesDeep(cloneModuleToJSON(buildFrom), (v) =>
                typeof v === 'string' ? v.toLowerCase() : v,
            ) as IModuleObject & IModuleObjectHandler;
            const handler = object as IModuleObjectHandler;
            // Remember modifiers that need to be imported with a function
            const imported = [];
            const synthetics: IPropertyMap = {};
            if (object.Engineering) {
                const modifiers = object.Engineering.Modifiers;
                handler.Engineering.Modifiers = {};
                modifiers.forEach((modifier) => {
                    const label = modifier.Label.toLowerCase();
                    // Only store stats that don't have a getter
                    const stats = MODULE_STATS[label];
                    if (stats) {
                        if (stats.getter) {
                            synthetics[label] = modifier;
                        }

                        const importWith = stats.importer;
                        if (importWith) {
                            imported.push([importWith, modifier]);
                        } else if (!stats.getter) {
                            handler.Engineering.Modifiers[label] = modifier;
                        }
                    }
                });
            }
            this.object = handler;
            forEach(imported, (info) => {
                const [importWith, modifier] = info;
                importWith(this, modifier, synthetics);
            });
        }

        this._trackFor(this.object, DIFF_EVENT);
        if (ship) {
            this.ship = ship;
        }
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
            | ModulePropertyCalculator
            | IModulePropertyCalculatorClass,
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
                property = getter;
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
        }
        if (typeof property === 'object') {
            return property.calculate(this, modified);
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
            return this.object.Engineering.Modifiers[property].Modifier;
        } else {
            return 0;
        }
    }

    /**
     * @param property
     * @param modified
     * @param unit
     * @param value
     * @returns
     */
    public getFormatted(
        property: string,
        modified: boolean = true,
        unit: string,
        value: number,
    ): string {
        throw new NotImplementedError();
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
        const Modifier = calculateModifier(
            this.object.Item,
            Label,
            Value,
        );
        if (this.object.Engineering.Modifiers[Label]) {
            this._prepareObjectChange(`${propertyPath}.Value`, Value);
            this._prepareObjectChange(`${propertyPath}.Modifier`, Modifier);
            this._prepareObjectChange(`${propertyPath}.UserSet`, true);
            this._commitObjectChanges();
        } else {
            this._writeObject(
                propertyPath,
                { Label, Modifier, UserSet: true, Value },
            );
        }
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
     * Returns an array of all applicable items to this module. If neither a
     * ship nor a slot is assigned to this module, an exception is raised.
     * @returns Array of applicable items
     */
    public getApplicableItems(): string[] {
        if (!this.ship || !this.object.Slot) {
            throw new IllegalStateError(
                'Can only get applicable items once a ship has been assigned to the module',
            );
        }

        // Prepare module registry items indices ordered by size
        const hardpointKeys = ['', 'small', 'medium', 'large', 'huge'];
        const internalKeys = ['', '1', '2', '3', '4', '5', '6', '7', '8'];
        if (this.object.Slot === 'armour') {
            // If this is an armour slot, we only return all armour available
            // to the module's ship
            return values(
                MODULE_REGISTRY.armour.items[this.ship.getShipType()],
            );
        } else {
            // If this is not an armour slot, try each available module category
            const size = this.getSize();
            // MODULE_REGISTRY is a module and thus has the key 'default'; this
            // key must be ignored in this context
            return values((MODULE_REGISTRY as any).default).reduce(
                (reduced: string[], entry: ModuleRegistryEntry) => {
                    // Only consider categories that match this slot but ignore
                    // the armour slot
                    if (
                        entry.slots[0] === 'armour' ||
                        !matchesAny(
                            this.object.Slot,
                            ...entry.slots.map((r) => RegExp(r, 'i')),
                        )
                    ) {
                        return reduced;
                    }

                    let selectors: string[];
                    if (
                        entry.slots[0] === '(small|medium|large|huge)hardpoint'
                    ) {
                        selectors = hardpointKeys;
                    } else {
                        selectors = internalKeys;
                    }

                    return reduced.concat(
                        ...map(selectors.slice(0, size + 1), (k) =>
                            values(entry.items[k]),
                        ),
                    );
                },
                [],
            );
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
        delete this.object.Engineering;
    }

    /**
     * Clear all modifications and resets the slot completely. If the slot is a
     * core internal slot, the item won't get changed.
     */
    public reset() {
        if (!this.object.Slot.match(REG_CORE_SLOT)) {
            this.object.Item = '';
        }
        this.object.Priority = 1;
        this.object.On = true;
        this.resetEngineering();
    }

    /**
     * Returns a copy of this module as a loadout-event-style module.
     * @returns Module
     */
    public toJSON(): IModuleObject {
        const r = (clone(this.object) as (IModuleObject &
            IModuleObjectHandler)) as IModuleObject;
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
    public setItem(item: string, clazz: string = '', rating: string = '') {
        try {
            item = Factory.getModuleId(item, clazz, rating);
            // Don't handle errors as item might not have been a type to begin
            // with. Further errors will be handled when we check if this item
            // fits on this slot
        } catch (e) {}

        item = assertValidModule(item);
        const fits = !itemFitsSlot(
            item,
            this.ship.object.Ship,
            this.object.Slot,
        );
        if (this.ship && this.object.Slot && fits) {
            throw new IllegalStateError(
                `Item ${item} does not fit ${this.object.Slot}`,
            );
        }

        this._prepare(DIFF_EVENT, 'Engineering');
        delete this.object.Engineering;
        this._writeObject('Item', item); // this will commit changes
    }

    /**
     * Checks whether this module is on a matching slot.
     * @param slot Slot to check; if string exact match is required, if RegExp
     * only a simple match is required. If an array, one the given slots must
     * match.
     * @returns True if the module is on the given slot or the RegExp matches,
     *  false if none of this holds; null if the slot is on no module at all.
     */
    public isOnSlot(slot: Slot | Slot[]): boolean | null {
        if (!this.object.Slot) {
            return null;
        }

        if (typeof slot === 'string') {
            return this.object.Slot === slot.toLowerCase();
        } else if (slot instanceof RegExp) {
            return Boolean(this.object.Slot.match(slot));
        } else {
            // Array
            for (const s of slot) {
                if (this.isOnSlot(s)) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Returns the slot name of this module.
     * @returns Slot name
     */
    public getSlot(): string {
        return this.object.Slot;
    }

    /**
     * Sets the slot of this module. Slots can only be set once (includes
     * constructor) to prevent bad states. A slot can only be assigned when a
     * ship already has been assigned.
     * @param slot Slot to assign.
     */
    public setSlot(slot: string) {
        if (!this.ship) {
            throw new IllegalStateError(
                `Can't assign slot to ${slot} for unknown ship`,
            );
        }

        if (this.object.Slot) {
            throw new IllegalStateError(`Can't reassign slot to ${slot}`);
        }

        slot = assertValidSlot(slot);
        if (
            this.object.Item &&
            itemFitsSlot(this.object.Item, this.ship.object.Ship, slot)
        ) {
            throw new IllegalStateError(
                `Can't assign slot current item ${this.object.Item} does not fit on ${slot}`,
            );
        }

        this._writeObject('Slot', slot);
    }

    /**
     * Is the module currently enabled?
     * @returns True when enabled
     */
    public isEnabled(): boolean {
        return this.object.On;
    }

    /**
     * Turn this module on/off. If the module does not consume power, this
     * method hasn't any effect.
     * @param on True to turn the module on
     */
    public setEnabled(on: boolean) {
        // if an module does not consume power, it is always on
        if (this.get('PowerDraw')) {
            this._writeObject('On', on);
        }
    }

    /**
     * Get the power priority of the current module.
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
     * @param priority Priority (greater than 1)
     */
    public setPowerPriority(priority: number) {
        if (priority < 1) {
            throw new IllegalChangeError(
                'Priority groups must be greater than 0',
            );
        }
        this.object.Priority = Math.floor(priority);
    }

    /**
     * Returns the ship this module is assigned to or `null` if unassigned.
     */
    public getShip(): Ship | null {
        return this.ship;
    }

    /**
     * Sets the ship of this module. A ship can only be assigned once to prevent
     * bad states.
     * @param ship
     */
    public setShip(ship: Ship) {
        if (this.ship !== null) {
            throw new IllegalStateError('Cannot reassign ship in Module');
        }

        this.ship = ship;
    }

    /**
     * Checks whether this module is empty, i.e. does not have an item assigned.
     * @returns True when empty, false otherwise.
     */
    public isEmpty(): boolean {
        return this.object.Item === '';
    }

    /**
     * Checks whether this module is assigned to a slot.
     * @returns True when assigned, false otherwise.
     */
    public isAssigned(): boolean {
        return this.ship && this.object.Slot !== '';
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

    /**
     * Returns the size of the slot of this module. Size of utility slots and
     * bulkheads is always zero. Size of hardpoint slots is in range 1 to 4 for
     * small to huge.
     * @returns Size or `null` if no slot has been assigned
     */
    public getSize(): number | null {
        if (!this.ship || !this.object.Slot) {
            return null;
        }
        return getSlotSize(this.ship.object.Ship, this.object.Slot);
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
