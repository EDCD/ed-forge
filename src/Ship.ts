/**
* @module Ship
*/

/**
* Ignore
*/
import {clone, cloneDeep, map, mapValues, chain, pick, set, values} from 'lodash';
import autoBind from 'auto-bind';
import {validateShipJson, shipVarIsSpecified} from './validation';
import {compress, decompress} from './compression';
import Module, { ModuleObject, Slot } from './Module';
import {
    REG_HARDPOINT_SLOT, REG_INTERNAL_SLOT, REG_MILITARY_SLOT, REG_UTILITY_SLOT
} from './data/slots';
import {IllegalStateError, NotImplementedError} from './errors';
import { assertValidSlot } from './data/slots';
import {getShipProperty, getShipMetaProperty, getShipInfo} from './data/ships';
import { ShipPropertyCalculator, ShipPropertyCalculatorClass, CARGO_CAPACITY, FUEL_CAPACITY, ShipMetricsCalculator } from './ship-stats';
import { matchesAny } from './helper';
import DiffEmitter from './helper/DiffEmitter';

const RESET_PIPS = {
    Sys: {base: 2, mc: 0,},
    Eng: {base: 2, mc: 0,},
    Wep: {base: 2, mc: 0,},
};


/**
 * A loadout-event-style ship build without modules
 */
interface ShipObjectBase {
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
export interface ShipObject extends ShipObjectBase {
    /** Array of all modules of this ship */
    Modules: ModuleObject[];
}

export interface ShipObjectHandler extends ShipObjectBase {
    Modules: { [ slot: string ]: Module };
}

/**
 * State of the current ship.
 */
export interface ShipState {
    /** Power distributor settings */
    PowerDistributor: DistributorStateObject;
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
export interface DistributorStateObject {
    /** Pips to SYS */
    Sys: DistributorSettingObject;
    /** Pips to ENG */
    Eng: DistributorSettingObject;
    /** Pips to WEP */
    Wep: DistributorSettingObject;
}

/**
 * A state of the power distributor.
 */
export interface DistributorState {
    Sys: number;
    Eng: number;
    Wep: number;
}

/**
 * Object to reflect settings of a specific power distributor, e.g. WEP.
 * It holds that `0 <= base + mc <= 4`.
 */
export interface DistributorSettingObject {
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
    public _liveryModules: ModuleObject[] = [];
    public _object: ShipObjectHandler = null;
    public state: ShipState = {
        PowerDistributor: cloneDeep(RESET_PIPS),
        Cargo: 0,
        Fuel: 1,
        BoostActive: false,
    };

    /**
     * Create a ship by reading a journal loadout-event-style object. Can be
     * given as compressed string or plain object.
     * @param buildFrom Ship build to load.
     */
    constructor(buildFrom: string | ShipObject) {
        super();
        autoBind(this);
        if (typeof buildFrom === 'string') {
            buildFrom = decompress<ShipObject>(buildFrom);
        }

        validateShipJson(buildFrom);

        let modules = buildFrom.Modules;
        this._object = (
            clone(buildFrom) as (ShipObject & ShipObjectHandler)
        ) as ShipObjectHandler;
        this._object.Modules = {};
        modules.forEach(m => {
            let slot = m.Slot.toLowerCase();
            try { assertValidSlot(slot) } catch {
                this._liveryModules.push(clone(m));
                return;
            }
            m.Slot = slot;
            this._object.Modules[slot] = new Module(m, this);
        });

        // Check missing modules - journal builds don't include those
        values(getShipInfo(buildFrom.Ship).proto.Modules).forEach(m => {
            let slot = m.Slot.toLowerCase();
            if (!this._object.Modules[slot]) {
                this._object.Modules[slot] = new Module(m, this);
                this._object.Modules[slot].reset();
            }
        });

        values(this._object.Modules).forEach(m => m.on(
            'diff', (...args) => {
                args = args.map(diff => {
                    diff.path = `Modules.${m._object.Slot}.${diff.path}`;
                });
                this.emit('diff', ...args);
            }
        ));
    }

    /**
     * Read an arbitrary object property of this ship's corresponding json.
     * @param property Property name
     * @returns Property value
     */
    read(property: string): any {
        return this._object[property];
    }

    /**
     * Read an arbitrary object property of this ship's corresponding meta properties.
     * @param property Property name
     * @returns Property value
     */
    readMeta(property: string): any {
        return getShipMetaProperty(this._object.Ship, property);
    }

    /**
     * Read an arbitrary object property of this ship's corresponding properties.
     * @param property Property name
     * @returns Property value
     */
    public readProp(property: string): any {
        return getShipProperty(this._object.Ship, property);
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
    write(property: string, value: any) {
        if (shipVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`
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
    getModule(slot?: Slot, type?: (string | RegExp)): (Module | undefined) {
        if (!slot && !type) {
            return undefined;
        }

        let c;
        if (typeof slot === 'string') {
            slot = slot.toLowerCase();
            c = chain([ this._object.Modules[slot] ]);
        } else {
            c = chain(this._object.Modules).values();
            if (slot) {
                c = c.filter(m => m.isOnSlot(slot));
            }
        }

        if (type) {
            c = c.filter(m => m.itemIsOfType(type));
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
    getModules(slots?: (Slot | Slot[]), type?: (string | RegExp),
        includeEmpty: boolean = false, sort: boolean = false): Module[] {
        if (!slots && !type) {
            return [];
        }

        if (typeof slots === 'string') {
            slots = slots.toLowerCase();
            let m = this.getModule(slots, type);
            if (includeEmpty || m._object.Item) {
                return [ m ];
            }
            return [];
        }

        if (slots instanceof RegExp) {
            slots = [ slots ];
        }

        let ms = chain(this._object.Modules).values();
        if (!includeEmpty) {
            ms = ms.filter(m => !m.isEmpty());
        }
        if (slots) {
            let ss : string[] = [], rs : RegExp[] = [];
            slots.forEach(slot => {
                if (typeof slot === 'string') {
                    ss.push(slot);
                } else {
                    rs.push(slot);
                }
            });
            ms = ms.filter(
                module => module._object.Slot in ss
                    || matchesAny(module._object.Slot, ...rs)
            );
        }
        if (type) {
            ms = ms.filter(m => Boolean(m._object.Item.match(type)));
        }
        if (sort) {
            ms = ms.sortBy(m => m._object.Slot);
        }

        return ms.value();
    }

    /**
     * Returns an array of all core modules in order: alloys, power plant,
     * thrusters, FSD, life support, power distributor, sensors, fuel tank.
     * @returns Core modules
     */
    getCoreModules(): Module[] {
        return [
            this.getAlloys(),
            this.getPowerPlant(),
            this.getThrusters(),
            this.getFSD(),
            this.getLifeSupport(),
            this.getPowerDistributor(),
            this.getSensors(),
            this.getCoreFuelTank()
        ];
    }

    /**
     * Get the alloys of this ship.
     * @returns Alloys
     */
    getAlloys(): Module {
        return this.getModule('Armour');
    }

    /**
     * Get the power plant of this ship.
     * @returns Power plant
     */
    getPowerPlant(): Module {
        return this.getModule('PowerPlant');
    }

    /**
     * Get the thrusters of this ship.
     * @returns Thrusters
     */
    getThrusters(): Module {
        return this.getModule('MainEngines');
    }

    /**
     * Get the frame shift drive of this ship.
     * @returns FSD
     */
    getFSD(): Module {
        return this.getModule('FrameShiftDrive');
    }

    /**
     * Get the life support module of this ship.
     * @returns Life support
     */
    getLifeSupport(): Module {
        return this.getModule('LifeSupport');
    }

    /**
     * Get the power distributor of this ship.
     * @returns Power distributor
     */
    getPowerDistributor(): Module {
        return this.getModule('PowerDistributor');
    }

    /**
     * Get the sensors of this ship.
     * @returns Sensors
     */
    getSensors(): Module {
        return this.getModule('Radar');
    }

    /**
     * The core fuel tank of this ship.
     * @returns Core fuel tank
     */
    getCoreFuelTank(): Module {
        return this.getModule('FuelTank');
    }

    /**
     * The shield generator of this ship.
     * @returns Shield generator or undefined if not present
     */
    getShieldGenerator(): (Module | undefined) {
        return this.getModule(undefined, /int_shieldgenerator/);
    }

    /**
     * Get an array of all shield boosters of this ship.
     * @returns Array of shield boosters, possibly empty
     */
    getShieldBoosters(): Module[] {
        return this.getModules(undefined, /hpt_shieldbooster/);
    }

    /**
     * Get an array of all shield cell banks of this ship.
     * @returns Array of shield cell banks, possibly empty
     */
    getSCBs(): Module[] {
        return this.getModules(undefined, /int_shieldcellbank/);
    }

    /**
     * Get an array of all hull reinforcement packages of this ship, including
     * guardian and meta alloy hull reinforcement packages.
     * @returns Array of hull reinforcement packages, possibly empty
     */
    getHRPs(): Module[] {
        return this.getModules(undefined, /int_(metaalloy|guardian)?hullreinforcement/);
    }

    /**
     * Get an array of all module reinforcement packages of this ship, including
     * guardian module reinforcement packages.
     * @returns Array of module reinforcement packages, possibly empty
     */
    getMRPs(): Module[] {
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
    getInternals(type?: RegExp, includeEmpty: boolean = false): Module[] {
        let ms = this.getModules(REG_INTERNAL_SLOT, type, includeEmpty, true);
        let militaryMs = this.getModules(
            REG_MILITARY_SLOT, type, includeEmpty, true
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
    getHardpoints(type?: string, includeEmpty: boolean = false): Module[] {
        return this.getModules(REG_HARDPOINT_SLOT, type, includeEmpty, true);
    }

    /**
     * Returns all utility module in a fixed order (as ingame).
     * @param type Type to filter modules by.
     * @param includeEmpty If true, also empty modules will be returned, i.e.
     * which are just a slot.
     * @returns Utility modules
     */
    getUtilities(type?: string, includeEmpty: boolean = false): Module[] {
        return this.getModules(REG_UTILITY_SLOT, type, includeEmpty, true);
    }

    /**
     * Return a property of this ship, e.g. "pitch".
     * @param property Property name
     * @param modified False to retrieve default value
     * @returns Property value
     */
    get(property: ShipPropertyCalculator | ShipPropertyCalculatorClass,
        modified: boolean = true): number {
        if (typeof property === 'object') {
            return property.calculate(this, modified);
        }
        return property(this, modified);
    }

    /**
     * Returns one of the ship's constants, e.g. `hullmass`.
     * @param property Name of the property
     * @returns Value of the property
     */
    getBaseProperty(property: string): number {
        return getShipProperty(this._object.Ship, property);
    }

    /**
     * Returns the player-set ship name.
     * @returns Ship name
     */
    getShipName(): string {
        return this._object.ShipName;
    }

    /**
     * Sets a new ship name.
     * @param name Name to set
     */
    setShipName(name: string) {
        this._writeObject('ShipName', name);
    }

    /**
     * Returns player-set or auto-generated ship ID.
     * @returns Ship ID
     */
    getShipID(): string {
        return this._object.ShipIdent;
    }

    /**
     * Sets the ship ID.
     * @param id ID to set
     */
    setShipID(id: string) {
        // TODO: constrain value
        this._writeObject('ShipIdent', id);
    }

    /**
     * @param property
     * @param modified
     * @param unit
     * @param value
     */
    getFormatted(property: string, modified: boolean = true, unit?: string, value?: number) {
        throw new NotImplementedError();
    }

    /**
     * @param statistics
     * @param modified
     */
    getMetrics<T>(calculator: ShipMetricsCalculator<T>, modified: boolean = true): T {
        return calculator(this, modified);
    }

    /**
     * Returns the current power distributor settings.
     * @returns The distributor settings.
     */
    getDistributorSettingsObject(): DistributorStateObject {
        return cloneDeep(this.state.PowerDistributor);
    }

    /**
     * Returns the current power distributor settings.
     * @returns The distributor settings.
     */
    getDistributorSettings(): DistributorState {
        return mapValues(this.state.PowerDistributor,
            setting => setting.base + setting.mc
        );
    }

    /**
     * Set the power distributor settings.
     * @param settings Power distributor settings
     */
    setDistributorSettings(settings: DistributorStateObject) {
        let mcSize = getShipMetaProperty(this._object.Ship, 'crew') - 1;
        let newMc = settings.Sys.mc + settings.Eng.mc + settings.Wep.mc;
        if (newMc < 0 || mcSize < newMc) {
            throw new IllegalStateError(`Illegal amount of mc pips: ${newMc}`);
        }

        let newPips = settings.Sys.base + settings.Eng.base + settings.Wep.base;
        if (newPips != 6) {
            throw new IllegalStateError(
                `Can't set other than 6 pis - is ${newPips}`
            );
        }

        let pickProps = ['base', 'mc'];
        this._writeState('PowerDistributor', {
            Sys: pick(settings.Sys, pickProps),
            Eng: pick(settings.Eng, pickProps),
            Wep: pick(settings.Wep, pickProps),
        });
    }

    /**
     * Resets pips to standard.
     * @param mcOnly True if only multi-crew pips should be reset.
     */
    pipsReset(mcOnly: boolean) {
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
    incPip(pipType: string, isMc: boolean = false) {
        let dist = this.state.PowerDistributor;
        let pips = dist[pipType];
        let other1, other1Key;
        if (pipType == 'Sys') {
            other1 = dist.Eng;
            other1Key = 'Eng';
        } else {
            other1 = dist.Sys;
            other1Key = 'Sys';
        }
        let other2, other2Key;
        if (pipType == 'Wep') {
            other2 = dist.Eng;
            other2Key = 'Eng';
        } else {
            other2 = dist.Wep;
            other2Key = 'Wep';
        };

        const left = Math.min(1, 4 - (pips.base + pips.mc));
        if (isMc) {
            let mc = getShipMetaProperty(this._object.Ship, 'crew') - 1;
            if (left > 0.5 && dist.Sys.mc + dist.Eng.mc + dist.Wep.mc < mc) {
                this._writeState(`PowerDistributor.${pipType}.mc`, pips.mc + 1);
            }
        } else if (left > 0) {
            let sum, diff1, diff2;
            if (left == 0.5) {
                // Take from whichever is larger
                if (other1 > other2) {
                    diff1 = other1.base - 0.5;
                } else {
                    diff2 = other2.base - 0.5;
                }
                sum = pips.base + 0.5;
            } else {  // left == 1
                let other1WasZero = other1.base == 0;
                diff1 = other1.base - ((other2.base == 0) ? 1 : 0.5);
                diff2 = other2.base - (other1WasZero ? 1 : 0.5);
                sum = pips.base + 1;
            }
            this._prepareStateChange(`PowerDistributor.${pipType}.base`, sum);
            this._prepareStateChange(`PowerDistributor.${other1Key}.base`, diff1);
            this._prepareStateChange(`PowerDistributor.${other2Key}.base`, diff2);
            this._commitStateChanges();
        }
    }

    /**
     * Increment the sys pip settings.
     * @param isMc True to increment multi-crew pips
     */
    incSys(isMc: boolean = false) {
        this.incPip('Sys', isMc);
    }

    /**
     * Increment the eng pip settings.
     * @param isMc True to increment multi-crew pips
     */
    incEng(isMc: boolean = false) {
        this.incPip('Eng', isMc);
    }

    /**
     * Increment the wep pip settings.
     * @param isMc True to increment multi-crew pips
     */
    incWep(isMc: boolean = false) {
        this.incPip('Wep', isMc);
    }

    /**
     * Set the amount of cargo currently loaded. Will be sanitized if it is
     * lower than zero or above what can be carried.
     * @param cargo Cargo to be set; will be sanitized
     */
    setCargo(cargo: number) {
        cargo = Math.max(0, cargo);
        cargo = Math.min(cargo, this.get(CARGO_CAPACITY, true));
        this._writeState('Cargo', cargo);
    }

    /**
     * Set the amount of fuel currently in all tanks. Will be sanitized if it is
     * lower than zero or above what can be carried.
     * @param fuel Fuel currently in all tanks; will be sanitized
     */
    setFuel(fuel: number) {
        fuel = Math.max(0, fuel);
        fuel = Math.min(fuel, this.get(FUEL_CAPACITY, true));
        this._writeState('Fuel', fuel);
    }

    /**
     * Returns whether the ship is currently boosting.
     * @returns True if the ship is boosting
     */
    isBoosting(): boolean {
        return this.state.BoostActive;
    }

    /**
     * Set whether the ship is currently boosting
     * @param isBoosting True when boosting
     */
    setBoosting(isBoosting: boolean) {
        this._writeState('BoostActive', isBoosting);
    }

    /**
     * Copies the ship build and returns a valid loadout-event.
     * @returns Loadout-event-style ship build.
     */
    toJSON(): ShipObject {
        let r = clone(this._object) as (ShipObject & ShipObjectHandler) as ShipObject;
        r.Modules = map(values(this._object.Modules), m => m.toJSON());
        r.Modules = r.Modules.concat(this._liveryModules);
        return r;
    }

    /**
     * Returns the loadout-event reflecting this ship build as compressed
     * string.
     * @returns Compressed loadout-event-style ship build.s
     */
    compress(): string {
        return compress(this.toJSON());
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
        this._prepare(STATE_EVENT, this.state, path);
        set(this.state, path, value);
    }

    /**
     * Emit all saved changes to [[state]] as `'diff-state'` event.
     */
    private _commitStateChanges() {
        this._commit(STATE_EVENT);
    }

    /**
     * Write a value to [[_object]] and emit the changes as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _writeObject(path: string, value: any) {
        this._prepareObjectChange(path, value);
        this._commit(OBJECT_EVENT);
    }

    /**
     * Write a value to [[_object]] and prepare the changes to be emitted
     * as `'diff'` event.
     * @param path Path for the object to write to
     * @param value Value to write
     */
    private _prepareObjectChange(path: string, value: any) {
        this._prepare(STATE_EVENT, this._object, path);
        set(this._object, path, value);
    }
}
