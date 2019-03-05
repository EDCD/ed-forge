/**
* @module Validation
*/

/**
* Ignore
*/
import Ajv from "ajv";
import { ImportExportError } from '../errors';
import * as SHIP_SCHEMA from './ShipObject.schema.json';
import * as MODULE_SCHEMA from './ModuleObject.schema.json';

const VALIDATOR = new Ajv({ schemas: [MODULE_SCHEMA, SHIP_SCHEMA]});

function latestError(): string {
    return JSON.stringify(VALIDATOR.errors[VALIDATOR.errors.length - 1], undefined, 2);
}

/**
 * Check whether a given object provides all fields necessary in order to be a
 * loadout-event-style ship build.
 * @param json Object to verify
 */
export function validateShipJson(json: object) {
    let isValid = VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ShipObject.schema.json',
        json
    );

    if (!isValid) {
        throw new ImportExportError(`Ship build is not valid because ${latestError()}`);
    }
}

/**
 * Check whether a given object provides all fields necessary in order to be a
 * loadout-event-style module.
 * @param json Object to verify
 */
export function validateModuleJson(json: object) {
    let isValid = VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ModuleObject.schema.json',
        json
    );

    if (!isValid) {
        throw new ImportExportError(`Module is not valid because ${latestError()}`);
    }
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
