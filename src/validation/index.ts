import Ajv from "ajv";
const SHIP_SCHEMA = require('./ShipObject.schema.json');
const MODULE_SCHEMA = require('./ModuleObject.schema.json');

const VALIDATOR = new Ajv({ schemas: [MODULE_SCHEMA, SHIP_SCHEMA]});

/**
 * Check whether a given object provides all fields necessary in order to be a
 * loadout-event-style ship build.
 * @param {Object} json Object to verify
 * @returns {boolean} True if given object is a valid ship build
 */
export function validateShipJson(json: object) {
    return VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ShipObject.schema.json',
        json
    );
}

/**
 * Check whether a given object provides all fields necessary in order to be a
 * loadout-event-style module.
 * @param {Object} json Object to verify
 * @returns {boolean} True if this is a valid module
 */
export function validateModuleJson(json: object) {
    return VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ModuleObject.schema.json',
        json
    );
}

function varIsSpecified(object: any, v: any) {
    return Boolean(object.properties[v]);
}

/**
 * Check whether a given var is specified in a loadout-event-style ship build.
 * @param {string} v Property name
 * @returns {boolean} True when there are some constraints for this property
 */
export function shipVarIsSpecified(v: string): boolean {
    return varIsSpecified(SHIP_SCHEMA, v);
}

/**
 * Check whether a given var is specified in a loadout-event-style module.
 * @param {string} v Property name
 * @returns {boolean} True when there are some constraints for this property
 */
export function moduleVarIsSpecified(v: string): boolean {
    return varIsSpecified(MODULE_SCHEMA, v);
}
