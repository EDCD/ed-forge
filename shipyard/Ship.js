
import Module from './Module';

export default class Ship {

    /**
     * @typedef {Object} ShipObject
     * @property {string} Ship
     * @property {string} ShipName
     * @property {string} ShipIdent
     * @property {Module[]} Modules
     */

    /** @type {ShipObject} */
    object = {};

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

    constructor() {}

    getCoreModules() {}

    getAlloys() {}

    getPowerPlant() {}

    getThruster() {}

    getFSD() {}

    getLifeSupport() {}

    getPowerDistributor() {}

    getSensors() {}

    getCoreFuelTank() {}

    /**
     * @param {string} type
     * @param {boolean} includeEmpty
     * @return {Module[]}
     */
    getInternals(type, includeEmpty) {}

    /**
     * @param {string} type
     * @param {boolean} includeEmpty
     * @return {Module[]}
     */
    getHardpoints(type, includeEmpty) {}

    /**
     * @param {string} type
     * @param {boolean} includeEmpty
     * @param {Module[]}
     */
    getUtilities(type, includeEmpty) {}

    /**
     * @param {(string|ShipStats.ShipStatCalculator)} property
     * @param {boolean} modified
     * @return {number}
     */
    get(property, modified) {}
}
