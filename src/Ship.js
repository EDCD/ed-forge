
import Ajv from 'ajv';
import { cloneDeep, map } from 'lodash';

export const VALIDATOR = new Ajv();
_SHIP_VALIDATOR = VALIDATOR.compile(
    require('./validation/ShipObject.schema')
);

/** @module ed-forge */
export default Ship;

/**
 * @typedef {(number|string)} Slot
 */

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

        if (!_SHIP_VALIDATOR(buildFrom)) {
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
     * @param {Slot} slot
     */
    getModule(slot) {}

    /**
     *
     * @param {Slot} slot
     * @param {Module} module
     */
    setModule(slot, module) {}

    /**
     * @return {Module[]}
     */
    getCoreModules() {}

    /**
     * @param {Module[]} modules
     */
    setCoreModules(modules) {}

    /**
     * @param {Slot} slot
     * @param {Module} module
     */
    setCoreModule(slot, module) {}

    /**
     * @return {Module}
     */
    getAlloys() {}

    /**
     * @param {Module} module
     */
    setAlloys(module) {}

    /**
     * @return {Module}
     */
    getPowerPlant() {}

    setPowerPlant(module) {}

    /**
     * @return {Module}
     */
    getThruster() {}

    /**
     * @param {Module} module
     */
    setThrusters(module) {}

    /**
     * @return {Module}
     */
    getFSD() {}

    /**
     * @param {Module} module
     */
    setFSD(module) {}

    /**
     * @return {Module}
     */
    getLifeSupport() {}

    /**
     * @param {Module} module
     */
    setLifeSupport(module) {}

    /**
     * @return {Module}
     */
    getPowerDistributor() {}

    /**
     * @param {Module} module
     */
    setPowerDistributor(module) {}

    /**
     * @return {Module}
     */
    getSensors() {}

    /**
     * @param {Module} module
     */
    setSensors(module) {}

    /**
     * @return {Module}
     */
    getCoreFuelTank() {}

    /**
     * @param {Module} module
     */
    setCoreFuelTank(module) {}

    /**
     * @param {string} [type]
     * @param {boolean} [includeEmpty=false]
     * @return {Module[]}
     */
    getInternals(type, includeEmpty) {}

    /**
     * @param {Module[]} modules
     */
    setInternals(modules) {}

    /**
     * @param {Slot} slot
     * @param {Module} module
     */
    setInternal(slot, module) {}

    /**
     * @param {string} [type]
     * @param {boolean} [includeEmpty=false]
     * @return {Module[]}
     */
    getHardpoints(type, includeEmpty) {}

    /**
     * @param {Module[]} modules
     */
    setHardpoints(modules) {}

    /**
     * @param {Slot} slot
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
     * @param {Slot} slot
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
    getShipName() {}

    /**
     * @param {string} name
     */
    setShipName(name) {}

    /**
     * @return {string}
     */
    getShipID() {}

    /**
     * @param {string} id
     */
    setShipID(id) {}

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
    toJSON() {}

    /**
     * @return {string}
     */
    compress() {}
}

/**
 * @param {Object} json
 * @return {string}
 */
export function compressJson(json) {}

/**
 * @param {string} compressedBuild
 * @return {object}
 */
export function decompress(compressedBuild) {}
