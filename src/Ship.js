
import { clone, cloneDeep, map, chain, keys, sortBy } from 'lodash';
import { SHIP_VALIDATOR } from './validation/util';
import { compress, decompress } from './compression';
import Module, { ModuleLike } from './Module';

const CORE_MODULE_MAP = {
    'Armour': /_Armour_/,
    'PowerPlant': /Int_Powerplant_/,
    'MainEngines': /Int_Engine/,
    'FrameShiftDrive': /Int_Hyperdrive/,
    'LifeSupport': /Int_LifeSupport/,
    'PowerDistributor': /Int_PowerDistributor/,
    'Radar': /Int_Sensors/,
    'FuelTank': /Int_FuelTank/,
};
const CORE_MODULES = keys(CORE_MODULE_MAP);

const REG_INTERNAL = /Slot/;
const REG_MILITARY = /Military/;
const REG_HARDPOINT = /(Small|Medium|Large|Huge)Hardpoint/;
const REG_HARDPOINT_SMALL = /SmallHardpoint/;
const REG_HARDPOINT_MEDIUM = /MediumHardpoint/;
const REG_HARDPOINT_LARGE = /LargeHardpoint/;
const REG_HARDPOINT_HUGE = /HugeHardpoint/;
const REG_UTILITY = /TinyHardpoint/;

/** @module ed-forge */
export default Ship;

/**
 * @typedef {(string|RegExp)} Slot
 */

/**
 * @typedef {(Slot|number)} NumberedSlot
 */

function sortModules(modules) {
    return sortBy(modules, m => m._object.Slot);
}

/**
 * An Elite: Dangerous ship build.
 */
class Ship {

    /**
     * @typedef {Object} ShipObject
     * @property {string} Ship
     * @property {string} ShipName
     * @property {string} ShipIdent
     * @property {Module[]} Modules
     */

    /** @type {ShipObject} */
    _object = {};

    /**
     * @typedef {Object} DistributorSettingObject
     * @property {number} base
     * @property {number} mc
     */

    /**
     * @typedef {Object} DistributorStateObject
     * @property {DistributorSettingObject} Sys
     * @property {DistributorSettingObject} Eng
     * @property {DistributorSettingObject} Wep
     */

    /**
     * @typedef {Object} StateObject
     * @property {DistributorStateObject} PowerDistributor
     * @property {number} Cargo
     * @property {number} Fuel
     */

     /** @type {StateObject} */
    state = {
        PowerDistributor: {
            Sys: { base: 2, mc: 0, },
            Eng: { base: 2, mc: 0, },
            Wep: { base: 2, mc: 0, },
        },
        Cargo: 0,
        Fuel: 1,
    };

    /**
     * @param {(string|Object)} buildFrom
     */
    constructor(buildFrom) {
        if (typeof buildFrom === 'string') {
            buildFrom = decompress(buildFrom);
        }

        if (!SHIP_VALIDATOR(buildFrom)) {
            // TODO: exception handling
            return;
        }

        this._object = cloneDeep(buildFrom);
        this._object.Modules = map(
            this._object.Modules,
            moduleObject => new Module(moduleObject)
        );
    }

    /**
     * Read an arbitrary object property of this ship's corresponding json.
     * @param {string} property
     * @return {*}
     */
    read(property) {}

    /**
     * Write an arbitrary value to an arbitrary object property of this ship's
     * corresponding json. Fields that are required to be set on valid builds
     * are protected and can only be written by invoking the corresponding
     * method, e.g. to alter the ship's name you can't invoke
     * `ship.write('ShipName', 'Normandy')` but must invoke
     * `ship.setShipName('Normandy')`.
     * @param {string} property
     * @param {*} value
     */
    write(property, value) {}

    /**
     * Get the module that sits on a matching slot. If `slot` is a string only
     * a module with the same slot name is matching. If `slot` is a RegExp the
     * first module that matches the RegExp is returned. Order is not
     * guaranteed.
     * @param {(string|RegExp)} slot The slot of the module.
     * @return {(Module|undefined)} Returns the first matching module or
     *                              undefined if no matching one can be found.
     */
    getModule(slot) {
        return chain(this._object.Modules)
            .filter(m => m.isOnSlot(slot))
            .head();
    }

    /**
     * Sets given module on the first matching slot. Cf. {@see Ship.getModule}
     * for what a "matching slot" is. This function will copy the given module.
     * @param {Slot} slot Slot to set the module on.
     * @param {ModuleLike} module Module to set.
     * @return {(Module|undefined)} Returns the old module or undefined if no
     *                              matching slot was found.
     */
    setModule(slot, module) {
        for (let i in this._object.Modules) {
            let old = this._object.Modules[i];
            if (old.isOnSlot(slot)) {
                let m = new Module(module);
                m.setSlot(old._object.Slot);
                this._object.Modules[i] = m;
                return old;
            }
        }
    }

    /**
     * Gets a list of matching modules. Cf. {@see Ship.getModule} for what a
     * "matching module" is. Order of returned modules is not guaranteed unless
     * `slots` is an array then it is guaranteed for any slot with index i that
     * matching modules with that slot appear in the return value before slots
     * matching any slot with index > i. Duplicates are filtered.
     * @param {(Slot|Slot[])} slots Slots of the modules to get.
     * @return {Module[]} All matching modules. Possibly empty.
     */
    getModules(slots, type, includeEmpty) {
        let ms;
        if (typeof slots !== 'object') { // not an array
            let m = this.getModule(slot);
            if (m) {
                ms = chain([m]);
            }
        } else {
            ms = chain(this._object.Modules)
                .filter(
                    module => chain(slots)
                        .filter(module.isOnSlot)
                        .head()
                );
        }

        if (type) {
            ms = ms.filter(m => m._object.Item.match(type));
        }
        if (!includeEmpty) {
            ms = ms.filter(m => !m.isEmpty());
        }

        return ms.uniq().value();
    }

    /**
     * @return {Module[]}
     */
    getCoreModules() {
        return this.getModules(CORE_MODULES);
    }

    /**
     * Sets all modules given that are core modules replacing old ones.
     * @param {ModuleLike[]} modules Core modules to set.
     * @return {Module[]} Modules that have been removed from the build.
     */
    setCoreModules(modules) {
        return map(modules, module => new Module(module))
            .forEach(module => {
                let slot = chain(CORE_MODULES)
                    .filter(i_slot => module._object.Item.match(i_slot))
                    .head();
                if (slot) {
                    return this.setModule(slot, module);
                }
            })
            .filter();
    }

    /**
     * Sets a given core module to this build.
     * @param {Module} module Core module to set.
     */
    setCoreModule(module) {
        this.setCoreModules([module]);
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
        return this.getModule('MainEngine');
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
     *                        be returned.
     * @param {boolean} [includeEmpty=false]    If set to true also empty slots
     *                                          will be returned, i.e. which are
     *                                          just a slot.
     * @return {Module[]} Array of internal modules. Possibly empty.
     */
    getInternals(type, includeEmpty) {
        let ms = this.getModules(REG_INTERNAL, type, includeEmpty);
        let militaryMs = this.getModules(REG_MILITARY, type, includeEmpty);
        return sortModules(ms).concat(sortModules(militaryMs));
    }

    /**
     * Sets a module to an internal slot. If slot is a number then slot is
     * interpreted as a zero based index to all internal modules with the first
     * module being that of the highest class (as returned by
     * {@link Ship.getInternals} when empty modules are included).
     * @param {NumberedSlot} slot Slot to place the module in.
     * @param {ModuleLike} module Module to add to the ship.
     * @return {Module} Module that was removed from the build.
     */
    setInternal(slot, module) {
        if (typeof slot === 'number') {
            let internals = this.getInternals(undefined, true);
            slot = internals[slot]._object.Slot;
        }
        return this.setModule(slot, module);
    }

    /**
     * Returns hardpoint modules of this ship. Return values is ordered by
     * module class in ascending order first, then by a fixed order (as ingame).
     * @param {string} [type] Type to filter modules by.
     * @param {boolean} [includeEmpty=false]    If true, also empty modules will
     *                                          be returned, i.e. which are just
     *                                          a slot.
     * @return {Module[]} Hardpoint modules
     */
    getHardpoints(type, includeEmpty) {
        let smallHs = this.getModules(REG_HARDPOINT_SMALL, type, includeEmpty);
        let mediumHs = this.getModules(REG_HARDPOINT_MEDIUM, type, includeEmpty);
        let largeHs = this.getModules(REG_HARDPOINT_LARGE, type, includeEmpty);
        let hugeHs = this.getModules(REG_HARDPOINT_HUGE, type, includeEmpty);
        return sortModules(hugeHs)
            .concat(sortModules(largeHs))
            .concat(sortModules(mediumHs))
            .concat(sortModules(smallHs));
    }

    /**
     * @param {Module[]} modules
     */
    setHardpoints(modules) {}

    /**
     * @param {NumberedSlot} slot
     * @param {Module} module
     */
    setHardpoint(slot, module) {}

    /**
     * @param {string} [type]
     * @param {boolean} [includeEmpty=false]
     * @param {Module[]}
     */
    getUtilities(type, includeEmpty) {}

    /**
     * @param {Module[]} modules
     */
    setUtilities(modules) {}

    /**
     * @param {NumberedSlot} slot
     * @param {Module} module
     */
    setUtility(slot, module) {}

    /**
     * @param {(string|ShipPropertyCalculator)} property
     * @param {boolean} [modified=true]
     * @return {number}
     */
    get(property, modified = true) {}

    /**
     * @return {string}
     */
    getShipName() {
        return this._object.ShipName;
    }

    /**
     * @param {string} name
     */
    setShipName(name) {
        this._object.ShipName = name;
    }

    /**
     * @return {string}
     */
    getShipID() {
        return this._object.ShipIdent;
    }

    /**
     * @param {string} id
     */
    setShipID(id) {
        this._object.ShipIdent = id;
    }

    /**
     * @param {string} property
     * @param {boolean} [modified=true]
     * @param {i18n.FormatOptions.SiUnit} [unit]
     * @param {number} [value]
     */
    getFormatted(property, modified = true, unit, value) {}

    /**
     * @param {string} statistics
     * @param {boolean} [modified=true]
     */
    getStatistics(statistics, modified = true) {}

    /**
     * @return {Object}
     */
    toJSON() {
        let _modules = this._object.Modules;
        this._object.Modules = map(_modules, m => m.toJSON());
        let r = clone(this._object);
        this._object.Modules = _modules;
        return r;
    }

    /**
     * @return {string}
     */
    compress() {
        return compress(this.toJSON());
    }
}
