
import { clone, cloneDeep, map, mapValues, chain, pick } from 'lodash';
import autoBind from 'auto-bind';
import { validateShipJson, shipVarIsSpecified } from './validation';
import { compress, decompress } from './compression';
import Module from './Module';
import { REG_HARDPOINT_SLOT, REG_INTERNAL_SLOT, REG_MILITARY_SLOT,
    REG_UTILITY_SLOT } from './data/slots';
import { ImportExportError, IllegalStateError, NotImplementedError, UnknownRestrictedError } from './errors';
import { getShipProperty, getShipMetaProperty } from './data/ships';

const RESET_PIPS = {
    Sys: { base: 2, mc: 0, },
    Eng: { base: 2, mc: 0, },
    Wep: { base: 2, mc: 0, },
};

/**
 * @typedef {(string|RegExp)} Slot
 */

/**
 * An Elite: Dangerous ship build.
 */
class Ship {

    /**
     * A loadout-event-style ship build.
     * @typedef {Object} ShipObject
     * @property {string} Ship Ship type, e.g. cutter.
     * @property {string} ShipName Player-set ship name.
     * @property {string} ShipIdent Player-set or auto-generated Ship ID.
     * @property {Module[]} Modules Array of all modules of this ship.
     */

    /**
     * Object to reflect settings of a specific power distributor, e.g. WEP.
     * It holds that `0 <= base + mc <= 4`.
     * @typedef {Object} DistributorSettingObject
     * @property {number} base Base pips
     * @property {number} mc Additional multi-crew pips
     */

    /**
     * A state of the power distributor.
     * @typedef {Object} DistributorStateObject
     * @property {DistributorSettingObject} Sys Pips to SYS
     * @property {DistributorSettingObject} Eng Pips to ENG
     * @property {DistributorSettingObject} Wep Pips to WEP
     */

    /**
     * State of the current ship.
     * @typedef {Object} StateObject
     * @property {DistributorStateObject} PowerDistributor Power distributor
     *      settings.
     * @property {number} Cargo Tones of cargo loaded
     * @property {number} Fuel Tones of fuel in tanks
     */

    /**
     * Create a ship by reading a journal loadout-event-style object. Can be
     * given as compressed string or plain object.
     * @param {(string|Object)} buildFrom Ship build to load.
     * @throws {ImportExportError} On invalid ship json.
     */
    constructor(buildFrom) {
        autoBind(this);
        /** @type {ShipObject} */
        this._object = null;
        /** @type {StateObject} */
        this.state = {
            PowerDistributor: cloneDeep(RESET_PIPS),
            Cargo: 0,
            Fuel: 1,
        };

        if (typeof buildFrom === 'string') {
            buildFrom = decompress(buildFrom);
        }

        if (!validateShipJson(buildFrom)) {
            throw new ImportExportError('Ship build is not valid');
        }

        this._object = clone(buildFrom);
        this._object.Modules = map(
            buildFrom.Modules,
            moduleObject => new Module(moduleObject, this)
        );
    }

    /**
     * Read an arbitrary object property of this ship's corresponding json.
     * @param {string} property Property name
     * @return {*} Property value
     */
    read(property) {
        return this._object[property];
    }

    /**
     * Write an arbitrary value to an arbitrary object property of this ship's
     * corresponding json. Fields that are required to be set on valid builds
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the ship's name you can't invoke
     * `ship.write('ShipName', 'Normandy')` but must invoke
     * `ship.setShipName('Normandy')`.
     * @param {string} property Property name
     * @param {*} value Property value
     * @throws {IllegalStateError} On an attempt to write a protected property.
     */
    write(property, value) {
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
     * @param {(string|RegExp)} slot The slot of the module.
     * @return {(Module|undefined)} Returns the first matching module or
     *      undefined if no matching one can be found.
     */
    getModule(slot) {
        return chain(this._object.Modules)
            .filter(m => m.isOnSlot(slot))
            .head()
            .value();
    }

    /**
     * Gets a list of matching modules. Cf. {@see Ship.getModule} for what a
     * "matching module" is. Order of returned modules is not guaranteed.
     * Duplicates are filtered.
     * @param {(Slot|Slot[])} slots Slots of the modules to get.
     * @param {(string|RegExp)} type String or regex applied to module items to
     *      filter modules.
     * @param {boolean} [includeEmpty=false] True to include empty slots.
     * @param {boolean} [sort=false] True to sort modules by slot.
     * @return {Module[]} All matching modules. Possibly empty.
     */
    getModules(slots, type, includeEmpty, sort) {
        let ms = chain(this._object.Modules)
            .filter(module => module.isOnSlot(slots));

        if (type) {
            ms = ms.filter(m => m._object.Item.match(type));
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
     * @return {Module[]} Core modules
     */
    getCoreModules() {
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
    getAlloys() {
        return this.getModule('Armour');
    }

    /**
     * Get the power plant of this ship.
     * @return {Module} Power plant
     */
    getPowerPlant() {
        return this.getModule('PowerPlant');
    }

    /**
     * Get the thrusters of this ship.
     * @return {Module} Thrusters
     */
    getThrusters() {
        return this.getModule('MainEngines');
    }

    /**
     * Get the frame shift drive of this ship.
     * @return {Module} FSD
     */
    getFSD() {
        return this.getModule('FrameShiftDrive');
    }

    /**
     * Get the life support module of this ship.
     * @return {Module} Life support
     */
    getLifeSupport() {
        return this.getModule('LifeSupport');
    }

    /**
     * Get the power distributor of this ship.
     * @return {Module} Power distributor
     */
    getPowerDistributor() {
        return this.getModule('PowerDistributor');
    }

    /**
     * Get the sensors of this ship.
     * @return {Module} Sensors
     */
    getSensors() {
        return this.getModule('Radar');
    }

    /**
     * The core fuel tank of this ship.
     * @return {Module} Core fuel tank
     */
    getCoreFuelTank() {
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
    getInternals(type, includeEmpty) {
        let ms = this.getModules(REG_INTERNAL_SLOT, type, includeEmpty, true);
        let militaryMs = this.getModules(
            REG_MILITARY_SLOT, type, includeEmpty, true
        );
        return ms.concat(militaryMs);
    }

    /**
     * Returns hardpoint modules of this ship. Return values is ordered by
     * module class in ascending order first, then by a fixed order (as ingame).
     * @param {string} [type] Type to filter modules by.
     * @param {boolean} [includeEmpty=false] If true, also empty modules will be
     *      returned, i.e. which are just a slot.
     * @return {Module[]} Hardpoint modules
     */
    getHardpoints(type, includeEmpty) {
        return this.getModules(REG_HARDPOINT_SLOT, type, includeEmpty, true);
    }

    /**
     * Returns all utility module in a fixed order (as ingame).
     * @param {string} [type] Type to filter modules by.
     * @param {boolean} [includeEmpty=false] If true, also empty modules will be
     *      returned, i.e. which are just a slot.
     * @return {Module[]} Utility modules
     */
    getUtilities(type, includeEmpty) {
        return this.getModules(REG_UTILITY_SLOT, type, includeEmpty, true);
    }

    /**
     * Return a property of this ship, e.g. "pitch".
     * @param {(string|ShipPropertyCalculator)} property Property name
     * @param {boolean} [modified=true] False to retrieve default value
     * @return {number} Property value
     */
    get(property, modified = true) {
        return getShipProperty(this._object.Ship, property);
    }

    /**
     * Returns the player-set ship name.
     * @return {string} Ship name
     */
    getShipName() {
        return this._object.ShipName;
    }

    /**
     * Sets a new ship name.
     * @param {string} name Name to set
     */
    setShipName(name) {
        this._object.ShipName = name;
    }

    /**
     * Returns player-set or auto-generated ship ID.
     * @return {string} Ship ID
     */
    getShipID() {
        return this._object.ShipIdent;
    }

    /**
     * Sets the ship ID.
     * @param {string} id ID to set
     */
    setShipID(id) {
        // TODO: constrain value
        this._object.ShipIdent = id;
    }

    /**
     * @param {string} property
     * @param {boolean} [modified=true]
     * @param {i18n.FormatOptions.SiUnit} [unit]
     * @param {number} [value]
     */
    getFormatted(property, modified = true, unit, value) {
        throw new NotImplementedError();
    }

    /**
     * @param {string} statistics
     * @param {boolean} [modified=true]
     */
    getStatistics(statistics, modified = true) {
        throw new NotImplementedError();
    }

    /**
     * Returns the current power distributor settings.
     * @param {boolean} split True to return the settings split up by multi-crew
     *      and base pips.
     * @returns {(DistributorStateObject|Object.<string, number>)} The
     *      distributor settings either as DistributorStateObject or as a map to
     *      overall pip values.
     */
    getDistributorSettings(split) {
        return mapValues(this.state.PowerDistributor,
            settings => split ? clone(settings) : settings.base + settings.mc
        );
    }

    /**
     * Set the power distributor settings.
     * @param {DistributorStateObject} settings Power distributor settings
     * @throws {IllegalStateError} If either multi-crew pips exceed crew size or
     *      normal pips don't equal 6 in sum.
     */
    setDistributorSettings(settings) {
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
            Sys: pick(settings.Sys, pickProps),
            Eng: pick(settings.Eng, pickProps),
            Wep: pick(settings.Wep, pickProps),
        };
    }

    /**
     * Resets pips to standard.
     * @param {boolean} mcOnly True if only multi-crew pips should be reset.
     */
    pipsReset(mcOnly) {
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
     * @param {string} pipType Either Sys, Eng or Wep.
     * @param {boolean} [isMc=false] True if multi-crew pip should be incremented.
     */
    incPip(pipType, isMc) {
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
     * @param {boolean} [isMc=false] True to increment multi-crew pips
     */
    incSys(isMc) {
        this.incPip('Sys', isMc);
    }

    /**
     * Increment the eng pip settings.
     * @param {boolean} [isMc=false] True to increment multi-crew pips
     */
    incEng(isMc) {
        this.incPip('Eng', isMc);
    }

    /**
     * Increment the wep pip settings.
     * @param {boolean} [isMc=false] True to increment multi-crew pips
     */
    incWep(isMc) {
        this.incPip('Wep', isMc);
    }

    /**
     * Copies the ship build and returns a valid loadout-event.
     * @return {Object} Loadout-event-style ship build.
     */
    toJSON() {
        let _modules = this._object.Modules;
        this._object.Modules = map(_modules, m => m.toJSON());
        let r = clone(this._object);
        this._object.Modules = _modules;
        return r;
    }

    /**
     * Returns the loadout-event reflecting this ship build as compressed
     * string.
     * @return {string} Compressed loadout-event-style ship build.s
     */
    compress() {
        return compress(this.toJSON());
    }
}

/** @module edforge */
export default Ship;
