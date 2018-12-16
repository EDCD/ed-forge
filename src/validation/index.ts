import Ajv from "ajv";
import * as SHIP_SCHEMA from './ShipObject.schema.json';
import * as MODULE_SCHEMA from './ModuleObject.schema.json';

const VALIDATOR = new Ajv({ schemas: [MODULE_SCHEMA, SHIP_SCHEMA]});

/**
 * Check whether a given object provides all fields necessary in order to be a
 * loadout-event-style ship build.
 * @param json Object to verify
 * @returns True if given object is a valid ship build
 */
export function validateShipJson(json: object): boolean {
    return VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ShipObject.schema.json',
        json
    ) as boolean;
}

/**
 * Check whether a given object provides all fields necessary in order to be a
 * loadout-event-style module.
 * @param json Object to verify
 * @returns True if this is a valid module
 */
export function validateModuleJson(json: object): boolean {
    return VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ModuleObject.schema.json',
        json
    ) as boolean;
}

function varIsSpecified(object: any, v: string): boolean {
    return Boolean(object.properties[v]);
}

/**
 * Check whether a given var is specified in a loadout-event-style ship build.
 * @param v Property name
 * @returns True when there are some constraints for this property
 */
export function shipVarIsSpecified(v: string): boolean {
    return varIsSpecified(SHIP_SCHEMA, v);
}

/**
 * Check whether a given var is specified in a loadout-event-style module.
 * @param v Property name
 * @returns True when there are some constraints for this property
 */
export function moduleVarIsSpecified(v: string): boolean {
    return varIsSpecified(MODULE_SCHEMA, v);
}
