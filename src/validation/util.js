
const VALIDATOR = new Ajv();
export const SHIP_VALIDATOR = VALIDATOR.compile(
    require('./validation/ShipObject.schema')
);
export const MODULE_VALIDATOR = VALIDATOR.compile(
    require('./validation/ModuleObject.schema')
);
