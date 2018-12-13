import {clone, cloneDeep, map, mapValues, chain, pick} from 'lodash';
import autoBind from 'auto-bind';
import {validateShipJson, shipVarIsSpecified} from './validation';
import {compress, decompress} from './compression';
import Module, { ModuleObject, Slot } from './Module';
import {
    REG_HARDPOINT_SLOT, REG_INTERNAL_SLOT, REG_MILITARY_SLOT, REG_UTILITY_SLOT
} from './data/slots';
import {ImportExportError, IllegalStateError, NotImplementedError} from './errors';
import {getShipProperty, getShipMetaProperty} from './data/ships';

const RESET_PIPS = {
    Sys: {base: 2, mc: 0,},
    Eng: {base: 2, mc: 0,},
    Wep: {base: 2, mc: 0,},
};


/**
 * A loadout-event-style ship build without modules
 */
export interface ShipObjectHandler {
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
export interface ShipObject extends ShipObjectHandler {
    /** Array of all modules of this ship */
    Modules: ModuleObject[];
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

/**
 * An Elite: Dangerous ship build.
 */
export default class Ship implements Ship {

    public _object: ShipObjectHandler = null;
    public _Modules: Module[] = [];
    public state: ShipState = {
        PowerDistributor: cloneDeep(RESET_PIPS),
        Cargo: 0,
        Fuel: 1,
    };

    /**
     * Create a ship by reading a journal loadout-event-style object. Can be
     * given as compressed string or plain object.
     * @param buildFrom Ship build to load.
     * @throws {ImportExportError} On invalid ship json.
     */
    constructor(buildFrom: string | ShipObject) {
        autoBind(this);

        if (typeof buildFrom === 'string') {
            buildFrom = decompress<ShipObject>(buildFrom);
        }

        if (!validateShipJson(buildFrom)) {
            throw new ImportExportError('Ship build is not valid');
        }

        this._object = clone(buildFrom);
        this._Modules = map(
            buildFrom.Modules,
            moduleObject => new Module(moduleObject, this)
        );
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
     * Write an arbitrary value to an arbitrary object property of this ship's
     * corresponding json. Fields that are required to be set on valid builds
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the ship's name you can't invoke
     * `ship.write('ShipName', 'Normandy')` but must invoke
     * `ship.setShipName('Normandy')`.
     * @param property Property name
     * @param value Property value
     * @throws {IllegalStateError} On an attempt to write a protected property.
     */
    write(property: string, value: any) {
        if (shipVarIsSpecified(property)) {
            throw new IllegalStateError(
                `Can't write protected property ${property}`
            );
        }
        this._object[property] = value;
    }

    /**
     * Get the module that sits on a matching slot. If `slot` is a string only
     * a module with the same slot name is matching. If `slot` is a RegExp the
     * first module that matches the RegExp is returned. Order is not
     * guaranteed.
     * @param slot The slot of the module.
     * @returns Returns the first matching module or undefined if no matching
     * one can be found.
     */
    getModule(slot: Slot): (Module | undefined) {
        return chain(this._Modules)
            .filter(m => m.isOnSlot(slot))
            .head()
            .value();
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
    getModules(slots: (Slot | Slot[]), type: (string | RegExp),
        includeEmpty: boolean = false, sort: boolean = false): Module[] {
        let ms = chain(this._Modules)
            .filter(module => module.isOnSlot(slots));

        if (type) {
            ms = ms.filter(m => Boolean(m._object.Item.match(type)));
        }
        if (!includeEmpty) {
            ms = ms.filter(m => !m.isEmpty());
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
     * @return {Module} Alloys
     */
    getAlloys(): Module {
        return this.getModule('Armour');
    }

    /**
     * Get the power plant of this ship.
     * @return {Module} Power plant
     */
    getPowerPlant(): Module {
        return this.getModule('PowerPlant');
    }

    /**
     * Get the thrusters of this ship.
     * @return {Module} Thrusters
     */
    getThrusters(): Module {
        return this.getModule('MainEngines');
    }

    /**
     * Get the frame shift drive of this ship.
     * @return {Module} FSD
     */
    getFSD(): Module {
        return this.getModule('FrameShiftDrive');
    }

    /**
     * Get the life support module of this ship.
     * @return {Module} Life support
     */
    getLifeSupport(): Module {
        return this.getModule('LifeSupport');
    }

    /**
     * Get the power distributor of this ship.
     * @return {Module} Power distributor
     */
    getPowerDistributor(): Module {
        return this.getModule('PowerDistributor');
    }

    /**
     * Get the sensors of this ship.
     * @return {Module} Sensors
     */
    getSensors(): Module {
        return this.getModule('Radar');
    }

    /**
     * The core fuel tank of this ship.
     * @return {Module} Core fuel tank
     */
    getCoreFuelTank(): Module {
        return this.getModule('FuelTank');
    }

    /**
     * Gets an array of internal modules from this ship. Return value is split
     * in normal and military slots. Normal slots come first. Each category is
     * sorted by the module's class in descending order with a fixed order on
     * modules of the same class (as ingame).
     * @param {RegExp} [type] Optional regex to constrain the type of modules to
     *      be returned.
     * @param {boolean} [includeEmpty=false] If set to true also empty slots
     *      will be returned, i.e. which are just a slot.
     * @return {Module[]} Array of internal modules. Possibly empty.
     */
    getInternals(type: RegExp, includeEmpty: boolean) {
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
    getHardpoints(type: string, includeEmpty: boolean = false): Module[] {
        return this.getModules(REG_HARDPOINT_SLOT, type, includeEmpty, true);
    }

    /**
     * Returns all utility module in a fixed order (as ingame).
     * @param type Type to filter modules by.
     * @param includeEmpty If true, also empty modules will be returned, i.e.
     * which are just a slot.
     * @returns Utility modules
     */
    getUtilities(type: string, includeEmpty: boolean = false): Module[] {
        return this.getModules(REG_UTILITY_SLOT, type, includeEmpty, true);
    }

    /**
     * Return a property of this ship, e.g. "pitch".
     * @param property Property name
     * @param modified False to retrieve default value
     * @returns Property value
     */
    get(property: string, modified: boolean = true): number {
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
        this._object.ShipName = name;
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
        this._object.ShipIdent = id;
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
    getStatistics(statistics: string, modified: boolean = true) {
        throw new NotImplementedError();
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
     * @throws {IllegalStateError} If either multi-crew pips exceed crew size or
     *      normal pips don't equal 6 in sum.
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
        this.state.PowerDistributor = {
            Sys: pick(settings.Sys, pickProps) as DistributorSettingObject,
            Eng: pick(settings.Eng, pickProps) as DistributorSettingObject,
            Wep: pick(settings.Wep, pickProps) as DistributorSettingObject,
        };
    }

    /**
     * Resets pips to standard.
     * @param mcOnly True if only multi-crew pips should be reset.
     */
    pipsReset(mcOnly: boolean) {
        if (mcOnly) {
            this.state.PowerDistributor.Sys.mc = 0;
            this.state.PowerDistributor.Eng.mc = 0;
            this.state.PowerDistributor.Wep.mc = 0;
        } else {
            this.state.PowerDistributor = cloneDeep(RESET_PIPS);
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
        let other1 = (pipType == 'Sys') ? dist.Eng : dist.Sys;
        let other2 = (pipType == 'Wep') ? dist.Eng : dist.Wep;

        const left = Math.min(1, 4 - (pips.base + pips.mc));
        if (isMc) {
            let mc = getShipMetaProperty(this._object.Ship, 'crew') - 1;
            if (left > 0.5 && dist.Sys.mc + dist.Eng.mc + dist.Wep.mc < mc) {
                pips.mc += 1;
            }
        } else if (left > 0) {
            if (left == 0.5) {
                // Take from whichever is larger
                if (other1 > other2) {
                    other1.base -= 0.5;
                } else {
                    other2.base -= 0.5;
                }
                pips.base += 0.5;
            } else {  // left == 1
                let other1WasZero = other1.base == 0;
                other1.base -= (other2.base == 0) ? 1 : 0.5;
                other2.base -= other1WasZero ? 1 : 0.5;
                pips.base += 1;
            }
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
     * Copies the ship build and returns a valid loadout-event.
     * @returns Loadout-event-style ship build.
     */
    toJSON(): ShipObject {
        let r = clone(this._object);
        (r as ShipObject).Modules = map(this._Modules, m => m.toJSON());
        return (r as ShipObject);
    }

    /**
     * Returns the loadout-event reflecting this ship build as compressed
     * string.
     * @return {string} Compressed loadout-event-style ship build.s
     */
    compress(): string {
        return compress(this.toJSON());
    }
}
