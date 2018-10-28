
import Ajv from 'ajv';
const SHIP_SCHEMA = require('./ShipObject.schema.json');
const MODULE_SCHEMA = require('./ModuleObject.schema.json');

const VALIDATOR = new Ajv({ schemas: [MODULE_SCHEMA, SHIP_SCHEMA]});

export function validateShipJson(json) {
    return VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ShipObject.schema.json',
        json
    );
}

export function validateModuleJson(json) {
    return VALIDATOR.validate(
        'https://raw.githubusercontent.com/felixlinker/ed-forge/master/src/validation/ModuleObject.schema.json',
        json
    );
}

function varIsSpecified(object, v) {
    return Boolean(object.properties[v]);
}

export function shipVarIsSpecified(v) {
    return varIsSpecified(SHIP_SCHEMA, v);
}

export function moduleVarIsSpecified(v) {
    return varIsSpecified(MODULE_SCHEMA, v);
}
