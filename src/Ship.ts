/**
 * @module Ship
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import {
    chain,
    clone,
    cloneDeep,
    CollectionChain,
    map,
    mapValues,
    pick,
    set,
    values,
} from 'lodash';

import { compress, decompress } from './compression';
import {
    assertValidShip,
    getShipInfo,
    getShipMetaProperty,
    getShipProperty,
} from './data/ships';
import {
    assertValidSlot,
    REG_HARDPOINT_SLOT,
    REG_INTERNAL_SLOT,
    REG_MILITARY_SLOT,
    REG_UTILITY_SLOT,
} from './data/slots';
import {
    IllegalChangeError,
    IllegalStateError,
    ImportExportError,
    NotImplementedError,
} from './errors';
import { matchesAny } from './helper';
import DiffEmitter, { IDiffEvent } from './helper/DiffEmitter';
import Module, { IModuleObject, Slot } from './Module';
import {
    CARGO_CAPACITY,
    FUEL_CAPACITY,
    IShipPropertyCalculatorClass,
    ShipMetricsCalculator,
    ShipPropertyCalculator,
} from './ship-stats';
import { shipVarIsSpecified, validateShipJson } from './validation';
import { checkInvariants } from './validation/invariants';

const RESET_PIPS = {
    Eng: { base: 2, mc: 0 },
    Sys: { base: 2, mc: 0 },
    Wep: { base: 2, mc: 0 },
};

/**
 * A loadout-event-style ship build without modules
 */
interface IShipObjectBase {
    /** Player-set ship name */
    ShipName: string;
    /** Ship type, e.g. cutter */
    Ship: string;
    /** Player-set or auto-generated Ship ID */
    ShipIdent: string;
}

/**
 * A loadout-event-style ship build.
 */
export interface IShipObject extends IShipObjectBase {
    /** Array of all modules of this ship */
    Modules: IModuleObject[];
}

export interface IShipObjectHandler extends IShipObjectBase {
    Modules: { [slot: string]: Module };
}

/**
 * State of the current ship.
 */
export interface IShipState {
    /** Power distributor settings */
    PowerDistributor: IDistributorStateObject;
    /** Tones of cargo loaded */
    Cargo: number;
    /** Tones of fuel in tanks */
    Fuel: number;
    /** Does the ship currently boost? */
    BoostActive: boolean;
}

/**
 * A state of the power distributor.
 */
export interface IDistributorStateObject {
    /** Pips to SYS */
    Sys: IDistributorSettingObject;
    /** Pips to ENG */
    Eng: IDistributorSettingObject;
    /** Pips to WEP */
    Wep: IDistributorSettingObject;
}

/**
 * A state of the power distributor.
 */
export interface IDistributorState {
    Sys: number;
    Eng: number;
    Wep: number;
}

/**
 * Object to reflect settings of a specific power distributor, e.g. WEP.
 * It holds that `0 <= base + mc <= 4`.
 */
export interface IDistributorSettingObject {
    /** Base pips */
    base: number;
    /** Additional multi-crew pips */
    mc: number;
}

const STATE_EVENT = 'diff-state';
const OBJECT_EVENT = 'diff';

/**
 * An Elite: Dangerous ship build.
 */
export default class Ship extends DiffEmitter {
    public liveryModules: IModuleObject[] = [];
    public object: IShipObjectHandler = null;
    public state: IShipState = {
        BoostActive: false,
        Cargo: 0,
        Fuel: 1,
        PowerDistributor: cloneDeep(RESET_PIPS),
    };

    /**
     * Create a ship by reading a journal loadout-event-style object. Can be
     * given as compressed string or plain object.
     * @param buildFrom Ship build to load.
     */
    constructor(buildFrom: string | IShipObject) {
        super();
        autoBind(this);
        if (typeof buildFrom === 'string') {
            buildFrom = decompress<IShipObject>(buildFrom);
        }

        validateShipJson(buildFrom);

        const modules = buildFrom.Modules;
        this.object = (clone(buildFrom) as (IShipObject &
            IShipObjectHandler)) as IShipObjectHandler;
        this.object.Ship = this.object.Ship.toLowerCase();
        this.object.Modules = {};
        modules.forEach((m) => {
            const slot = m.Slot.toLowerCase();
            try {
                assertValidSlot(slot);
            } catch {
                this.liveryModules.push(clone(m));
                return;
            }
            m.Slot = slot;
            this.object.Modules[slot] = new Module(m, this);
        });

        // Check missing modules - journal builds don't include those
        const shipType = assertValidShip(buildFrom.Ship);
        values(getShipInfo(shipType).proto.Modules).forEach((m) => {
            const slot = m.Slot.toLowerCase();
            if (!this.object.Modules[slot]) {
                this.object.Modules[slot] = new Module(m, this);
                this.object.Modules[slot].reset();
            }
        });

        if (!checkInvariants(this)) {
            throw new ImportExportError('Invalid build');
        }

        this._trackFor(this.object, OBJECT_EVENT);
        this._trackFor(this.state, STATE_EVENT);

        values(this.object.Modules).forEach((m) =>
            m.on('diff', (...args) => {
                this._checkInvariants(m, ...args);
                args.forEach((diff) => {
                    diff.path = `Modules.${m.object.Slot}.${diff.path}`;
                });
                this.emit('diff', ...args);
            }),
        );
    }

    /**
     * Read an arbitrary object property of this ship's corresponding json.
     * @param property Property name
     * @returns Property value
     */
    public read(property: string): any {
        return this.object[property];
    }

    /**
     * Return the type of the ship, e.g. `cutter`.
     * @returns Ship type
     */
    public getShipType(): string {
        return this.object.Ship;
    }

    /**
     * Read an arbitrary object property of this ship's corresponding meta
     * properties.
     * @param property Property name
     * @returns Property value
     */
    public readMeta(property: string): any {
        return getShipMetaProperty(this.object.Ship, property);
    }

    /**
     * Read an arbitrary object property of this ship's corresponding
     * properties.
     * @param property Property name
     * @returns Property value
     */
    public readProp(property: string): any {
        return getShipProperty(this.object.Ship, property.toLowerCase());
    }

    /**
     * Write an arbitrary value to an arbitrary object property of this ship's
     * corresponding json. Fields that are required to be set on valid builds
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the ship's name you can't invoke
     * `ship.write('ShipName', 'Normandy')` but must invoke
     * `ship.setShipName('Normandy')`.
     * @param property Property name
     * @param value Property value
     */
    public write(property: string, value: any) {
        if (shipVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`,
            );
        }
        this._writeObject(property, value);
    }

    /**
     * Get the module that sits on a matching slot. If `slot` is a string only
     * a module with the same slot name is matching. If `slot` is a RegExp the
     * first module that matches the RegExp is returned. Order is not
     * guaranteed.
     * @param slot The slot of the module.
     * @param type
     * @returns Returns the first matching module or undefined if no matching
     * one can be found.
     */
    public getModule(slot?: Slot, type?: string | RegExp): Module | undefined {
        if (!slot && !type) {
            return undefined;
        }

        let c: CollectionChain<Module>;
        if (typeof slot === 'string') {
            slot = slot.toLowerCase();
            c = chain([this.object.Modules[slot]]);
        } else {
            c = chain(values(this.object.Modules));
            if (slot) {
                c = c.filter((m) => m.isOnSlot(slot));
            }
        }

        if (type) {
            c = c.filter((m) => m.itemIsOfType(type));
        }

        return c.head().value();
    }

    /**
     * Gets a list of matching modules. Cf. [[Ship.getModule]] for what a
     * "matching module" is. Order of returned modules is not guaranteed.
     * Duplicates are filtered.
     * @param {(Slot|Slot[])} slots Slots of the modules to get.
     * @param type String or regex applied to module items to filter modules.
     * @param includeEmpty True to include empty slots.
     * @param [sort=false] True to sort modules by slot.
     * @return {Module[]} All matching modules. Possibly empty.
     */
    public getModules(
        slots?: Slot | Slot[],
        type?: string | RegExp,
        includeEmpty: boolean = false,
        sort: boolean = false,
    ): Module[] {
        if (typeof slots === 'string') {
            slots = slots.toLowerCase();
            const m = this.getModule(slots, type);
            if (includeEmpty || m.object.Item) {
                return [m];
            }
            return [];
        }

        if (slots instanceof RegExp) {
            slots = [slots];
        }

        let ms = chain(this.object.Modules).values();
        if (!includeEmpty) {
            ms = ms.filter((m) => !m.isEmpty());
        }
        if (slots) {
            const ss: string[] = [];
            const rs: RegExp[] = [];
            slots.forEach((slot) => {
                if (typeof slot === 'string') {
                    ss.push(slot);
                } else {
                    rs.push(slot);
                }
            });
            ms = ms.filter(
                (module) =>
                    module.object.Slot in ss ||
                    matchesAny(module.object.Slot, ...rs),
            );
        }
        if (type) {
            ms = ms.filter((m) => m.itemIsOfType(type));
        }
        if (sort) {
            ms = ms.sortBy((m) => m.object.Slot);
        }

        return ms.value();
    }

    /**
     * Returns an array of all core modules in order: alloys, power plant,
     * thrusters, FSD, life support, power distributor, sensors, fuel tank.
     * @returns Core modules
     */
    public getCoreModules(): Module[] {
        return [
            this.getAlloys(),
            this.getPowerPlant(),
            this.getThrusters(),
            this.getFSD(),
            this.getLifeSupport(),
            this.getPowerDistributor(),
            this.getSensors(),
            this.getCoreFuelTank(),
        ];
    }

    /**
     * Get the alloys of this ship.
     * @returns Alloys
     */
    public getAlloys(): Module {
        return this.getModule('Armour');
    }

    /**
     * Get the power plant of this ship.
     * @returns Power plant
     */
    public getPowerPlant(): Module {
        return this.getModule('PowerPlant');
    }

    /**
     * Get the thrusters of this ship.
     * @returns Thrusters
     */
    public getThrusters(): Module {
        return this.getModule('MainEngines');
    }

    /**
     * Get the frame shift drive of this ship.
     * @returns FSD
     */
    public getFSD(): Module {
        return this.getModule('FrameShiftDrive');
    }

    /**
     * Get the life support module of this ship.
     * @returns Life support
     */
    public getLifeSupport(): Module {
        return this.getModule('LifeSupport');
    }

    /**
     * Get the power distributor of this ship.
     * @returns Power distributor
     */
    public getPowerDistributor(): Module {
        return this.getModule('PowerDistributor');
    }

    /**
     * Get the sensors of this ship.
     * @returns Sensors
     */
    public getSensors(): Module {
        return this.getModule('Radar');
    }

    /**
     * The core fuel tank of this ship.
     * @returns Core fuel tank
     */
    public getCoreFuelTank(): Module {
        return this.getModule('FuelTank');
    }

    /**
     * The shield generator of this ship.
     * @returns Shield generator or undefined if not present
     */
    public getShieldGenerator(): Module | undefined {
        return this.getModule(undefined, /int_shieldgenerator/);
    }

    /**
     * Get an array of all shield boosters of this ship.
     * @returns Array of shield boosters, possibly empty
     */
    public getShieldBoosters(): Module[] {
        return this.getModules(undefined, /hpt_shieldbooster/);
    }

    /**
     * Get an array of all shield cell banks of this ship.
     * @returns Array of shield cell banks, possibly empty
     */
    public getSCBs(): Module[] {
        return this.getModules(undefined, /int_shieldcellbank/);
    }

    /**
     * Get an array of all hull reinforcement packages of this ship, including
     * guardian and meta alloy hull reinforcement packages.
     * @returns Array of hull reinforcement packages, possibly empty
     */
    public getHRPs(): Module[] {
        return this.getModules(
            undefined,
            /int_(metaalloy|guardian)?hullreinforcement/,
        );
    }

    /**
     * Get an array of all module reinforcement packages of this ship, including
     * guardian module reinforcement packages.
     * @returns Array of module reinforcement packages, possibly empty
     */
    public getMRPs(): Module[] {
        return this.getModules(undefined, /int_(guardian)?modulereinforcement/);
    }

    /**
     * Gets an array of internal modules from this ship. Return value is split
     * in normal and military slots. Normal slots come first. Each category is
     * sorted by the module's class in descending order with a fixed order on
     * modules of the same class (as ingame).
     * @param type Regex to constrain the type of modules to
     *      be returned.
     * @param includeEmpty If set to true also empty slots
     *      will be returned, i.e. which are just a slot.
     * @returns Array of internal modules. Possibly empty.
     */
    public getInternals(
        type?: string | RegExp,
        includeEmpty: boolean = false,
    ): Module[] {
        const ms = this.getModules(REG_INTERNAL_SLOT, type, includeEmpty, true);
        const militaryMs = this.getModules(
            REG_MILITARY_SLOT,
            type,
            includeEmpty,
            true,
        );
        // @ts-ignore
        return ms.concat(militaryMs);
    }

    /**
     * Returns hardpoint modules of this ship. Return values is ordered by
     * module class in ascending order first, then by a fixed order (as ingame).
     * @param type Type to filter modules by.
     * @param includeEmpty If true, also empty modules will be returned, i.e.
     * which are just a slot.
     * @returns Hardpoint modules
     */
    public getHardpoints(
        type?: string | RegExp,
        includeEmpty: boolean = false,
    ): Module[] {
        return this.getModules(REG_HARDPOINT_SLOT, type, includeEmpty, true);
    }

    /**
     * Returns all utility module in a fixed order (as ingame).
     * @param type Type to filter modules by.
     * @param includeEmpty If true, also empty modules will be returned, i.e.
     * which are just a slot.
     * @returns Utility modules
     */
    public getUtilities(
        type?: string | RegExp,
        includeEmpty: boolean = false,
    ): Module[] {
        return this.getModules(REG_UTILITY_SLOT, type, includeEmpty, true);
    }

    /**
     * Return a property of this ship, e.g. "pitch".
     * @param property Property name
     * @param modified False to retrieve default value
     * @returns Property value
     */
    public get(
        property: ShipPropertyCalculator | IShipPropertyCalculatorClass,
        modified: boolean = true,
    ): number {
        if (typeof property === 'object') {
            return property.calculate(this, modified);
        }
        return property(this, modified);
    }

    /**
     * @param statistics
     * @param modified
     */
    public getMetrics<T>(
        calculator: ShipMetricsCalculator<T>,
        modified: boolean = true,
    ): T {
        return calculator(this, modified);
    }

    /**
     * Returns one of the ship's constants, e.g. `hullmass`.
     * @param property Name of the property
     * @returns Value of the property
     */
    public getBaseProperty(property: string): number {
        return getShipProperty(this.object.Ship, property);
    }

    /**
     * Returns the player-set ship name.
     * @returns Ship name
     */
    public getShipName(): string {
        return this.object.ShipName;
    }

    /**
     * Sets a new ship name.
     * @param name Name to set
     */
    public setShipName(name: string) {
        this._writeObject('ShipName', name);
    }

    /**
     * Returns player-set or auto-generated ship ID.
     * @returns Ship ID
     */
    public getShipID(): string {
        return this.object.ShipIdent;
    }

    /**
     * Sets the ship ID.
     * @param id ID to set
     */
    public setShipID(id: string) {
        // TODO: constrain value
        this._writeObject('ShipIdent', id);
    }

    /**
     * @param property
     * @param modified
     * @param unit
     * @param value
     */
    public getFormatted(
        property: string,
        modified: boolean = true,
        unit?: string,
        value?: number,
    ) {
        throw new NotImplementedError();
    }

    /**
     * Returns the current power distributor settings.
     * @returns The distributor settings.
     */
    public getDistributorSettingsObject(): IDistributorStateObject {
        return cloneDeep(this.state.PowerDistributor);
    }

    /**
     * Returns the current power distributor settings.
     * @returns The distributor settings.
     */
    public getDistributorSettings(): IDistributorState {
        return mapValues(
            this.state.PowerDistributor,
            (setting) => setting.base + setting.mc,
        );
    }

    /**
     * Set the power distributor settings.
     * @param settings Power distributor settings
     */
    public setDistributorSettings(settings: IDistributorStateObject) {
        const mcSize = getShipMetaProperty(this.object.Ship, 'crew') - 1;
        const newMc = settings.Sys.mc + settings.Eng.mc + settings.Wep.mc;
        if (newMc < 0 || mcSize < newMc) {
            throw new IllegalStateError(`Illegal amount of mc pips: ${newMc}`);
        }

        const newPips =
            settings.Sys.base + settings.Eng.base + settings.Wep.base;
        if (newPips !== 6) {
            throw new IllegalStateError(
                `Can't set other than 6 pis - is ${newPips}`,
            );
        }

        const pickProps = ['base', 'mc'];
        this._writeState('PowerDistributor', {
            Eng: pick(settings.Eng, pickProps),
            Sys: pick(settings.Sys, pickProps),
            Wep: pick(settings.Wep, pickProps),
        });
    }

    /**
     * Resets pips to standard.
     * @param mcOnly True if only multi-crew pips should be reset.
     */
    public pipsReset(mcOnly: boolean) {
        if (mcOnly) {
            this._prepareStateChange('PowerDistributor.Sys.mc', 0);
            this._prepareStateChange('PowerDistributor.Eng.mc', 0);
            this._prepareStateChange('PowerDistributor.Wep.mc', 0);
            this._commitStateChanges();
        } else {
            this._writeState('PowerDistributor', cloneDeep(RESET_PIPS));
        }
    }

    /**
     * Incremented the pip settings for a given type. Might lead to no change if
     * no further pips can be assigned.
     * @param pipType Either Sys, Eng or Wep.
     * @param isMc True if multi-crew pip should be incremented.
     */
    public incPip(pipType: string, isMc: boolean = false) {
        const dist = this.state.PowerDistributor;
        const pips = dist[pipType];
        let other1;
        let other1Key;
        if (pipType === 'Sys') {
            other1 = dist.Eng;
            other1Key = 'Eng';
        } else {
            other1 = dist.Sys;
            other1Key = 'Sys';
        }
        let other2;
        let other2Key;
        if (pipType === 'Wep') {
            other2 = dist.Eng;
            other2Key = 'Eng';
        } else {
            other2 = dist.Wep;
            other2Key = 'Wep';
        }

        const left = Math.min(1, 4 - (pips.base + pips.mc));
        if (isMc) {
            const mc = getShipMetaProperty(this.object.Ship, 'crew') - 1;
            if (left > 0.5 && dist.Sys.mc + dist.Eng.mc + dist.Wep.mc < mc) {
                this._writeState(`PowerDistributor.${pipType}.mc`, pips.mc + 1);
            }
        } else if (left > 0) {
            let sum;
            let diff1;
            let diff2;
            if (left === 0.5) {
                // Take from whichever is larger
                if (other1 > other2) {
                    diff1 = other1.base - 0.5;
                } else {
                    diff2 = other2.base - 0.5;
                }
                sum = pips.base + 0.5;
            } else {
                // left == 1
                const other1WasZero = other1.base === 0;
                diff1 = other1.base - (other2.base === 0 ? 1 : 0.5);
                diff2 = other2.base - (other1WasZero ? 1 : 0.5);
                sum = pips.base + 1;
            }
            this._prepareStateChange(`PowerDistributor.${pipType}.base`, sum);
            this._prepareStateChange(
                `PowerDistributor.${other1Key}.base`,
                diff1,
            );
            this._prepareStateChange(
                `PowerDistributor.${other2Key}.base`,
                diff2,
            );
            this._commitStateChanges();
        }
    }

    /**
     * Increment the sys pip settings.
     * @param isMc True to increment multi-crew pips
     */
    public incSys(isMc: boolean = false) {
        this.incPip('Sys', isMc);
    }

    /**
     * Increment the eng pip settings.
     * @param isMc True to increment multi-crew pips
     */
    public incEng(isMc: boolean = false) {
        this.incPip('Eng', isMc);
    }

    /**
     * Increment the wep pip settings.
     * @param isMc True to increment multi-crew pips
     */
    public incWep(isMc: boolean = false) {
        this.incPip('Wep', isMc);
    }

    /**
     * Get the amount of cargo currently loaded.
     * @returns Tons of cargo loaded
     */
    public getCargo(): number {
        return this.state.Cargo;
    }

    /**
     * Set the amount of cargo currently loaded. Will be sanitized if it is
     * lower than zero or above what can be carried.
     * @param cargo Cargo to be set; will be sanitized
     */
    public setCargo(cargo: number) {
        cargo = Math.max(0, cargo);
        cargo = Math.min(cargo, this.get(CARGO_CAPACITY, true));
        this._writeState('Cargo', cargo);
    }

    /**
     * Get the amount of fuel currently loaded.
     * @returns Tons of fuel loaded.
     */
    public getFuel(): number {
        return this.state.Fuel;
    }

    /**
     * Set the amount of fuel currently in all tanks. Will be sanitized if it is
     * lower than zero or above what can be carried.
     * @param fuel Fuel currently in all tanks; will be sanitized
     */
    public setFuel(fuel: number) {
        fuel = Math.max(0, fuel);
        fuel = Math.min(fuel, this.get(FUEL_CAPACITY, true));
        this._writeState('Fuel', fuel);
    }

    /**
     * Returns whether the ship is currently boosting.
     * @returns True if the ship is boosting
     */
    public isBoosting(): boolean {
        return this.state.BoostActive;
    }

    /**
     * Set whether the ship is currently boosting
     * @param isBoosting True when boosting
     */
    public setBoosting(isBoosting: boolean) {
        this._writeState('BoostActive', isBoosting);
    }

    /**
     * Copies the ship build and returns a valid loadout-event.
     * @returns Loadout-event-style ship build.
     */
    public toJSON(): IShipObject {
        const r = (clone(this.object) as (IShipObject &
            IShipObjectHandler)) as IShipObject;
        r.Modules = map(values(this.object.Modules), (m) => m.toJSON());
        r.Modules = r.Modules.concat(this.liveryModules);
        return r;
    }

    /**
     * Returns the loadout-event reflecting this ship build as compressed
     * string.
     * @returns Compressed loadout-event-style ship build.s
     */
    public compress(): string {
        return compress(this.toJSON());
    }

    /**
     * Check whether all invariants still hold after a given module changed.
     * @param m Module that changed
     * @param diffs Changes to the module
     */
    private _checkInvariants(m: Module, ...diffs: IDiffEvent[]) {
        for (const diff of diffs) {
            const { path } = diff;
            if (path === 'Item') {
                const valid = checkInvariants(this, m);
                if (!valid) {
                    m.revert();
                    m.clearHistory();
                    throw new IllegalChangeError();
                } else {
                    // If this change is alright we can also clear the history
                    m.clearHistory();
                }
            }
        }
    }

    /**
     * Write a value to [[state]] and emit the changes as `'diff-state'`
     * event.
     * @param path Path for the state object to write to
     * @param value Value to write
     */
    private _writeState(path: string, value: any) {
        this._prepareStateChange(path, value);
        this._commitStateChanges();
    }

    /**
     * Write a value to [[state]] and prepare the changes to be emitted as
     * `'diff-state'` event.
     * @param path Path for the state object to write to
     * @param value Value to write
     */
    private _prepareStateChange(path: string, value: any) {
        this._prepare(STATE_EVENT, path);
        set(this.state, path, value);
    }

    /**
     * Emit all saved changes to [[state]] as `'diff-state'` event.
     */
    private _commitStateChanges() {
        this._commit(STATE_EVENT);
    }

    /**
     * Write a value to [[object]] and emit the changes as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _writeObject(path: string, value: any) {
        this._prepareObjectChange(path, value);
        this._commit(OBJECT_EVENT);
    }

    /**
     * Write a value to [[object]] and prepare the changes to be emitted
     * as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _prepareObjectChange(path: string, value: any) {
        this._prepare(STATE_EVENT, path);
        set(this.object, path, value);
    }
}
