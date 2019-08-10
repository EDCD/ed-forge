import { ModuleObject } from "./Module";
import { ShipObject } from "./Ship";

/**
 * Maps property to array of from [min, max].
 */
type FeatureObject = { [ property: string ]: number[] };

/**
 * Blueprint type: has features per grade and list of modules the blueprint can
 * be applied to.
 */
type BlueprintObject = {
    features: { [ grade: string ]: FeatureObject },
    appliesTo: [ string ],
};

declare module "src/data/blueprints.json" {
    const value: { [ blueprint: string ]: BlueprintObject };
    export default value;
}

/**
 * Experimental type: has features and list of modules the special
 */
type ExperimentalObject = {
    features: FeatureObject,
    appliesTo: [ string ],
};

declare module "src/data/experimentals.json" {
    const value: { [ experimental: string ]: ExperimentalObject };
    export default value;
}

declare module "src/data/module_cache.json" {
    const value: {
        [ grade: string ]: {
            [ rating: string ] : string
        }
    };
    export default value;
}

/**
 * Meta data about an item.
 */
export interface MetaModuleInformation {
    /** EDDB ID of the item */
    eddbID: number;
    /** ED ID of the item */
    edID: number;
    /** Class of the item */
    class: number;
    /** Rating of the item */
    rating: string;
}

/**
 * Object holding information about an item.
 */
export interface ModuleInformation {
    /** Loadout-event-style module object prototype */
    proto: ModuleObject;
    /** Default item properties */
    props: { [ property: string ]: number };
    /** Item meta information */
    meta: MetaModuleInformation;
}

declare module "src/data/modules.json" {
    const value: { [ ship: string ]: ModuleInformation };
    export default value;
}

/**
 * Ship meta data
 */
export interface ShipMetaInfo {
    /** EDDB ID of this ship */
    eddbID: number;
    /** ED ID of this ship */
    edID: number;
    /** Size of the ship; 1 is small, 3 is large */
    class: number;
    /** Manufacturer of the ship */
    manufacturer: string;
    /** Crew seats including helm */
    crew: number;
    /** Map from core slots to respective size */
    coreSizes: { [key: string]: number };
    /** Map from military slots to respective sizes */
    militarySizes: { [ key: string ]: number };
    /** Map from slots to true if passenger slot */
    passengerSlots: { [ key: string ]: boolean };
}

/**
 * Object holding information about a ship.
 */
interface ShipInfo {
    /** Ship prototype object */
    proto: ShipObject;
    /** Ship properties */
    props: { [ key: string ]: number };
    /** Meta data about a ship */
    meta: ShipMetaInfo;
}

declare module "src/data/ships.json" {
    const value: { [ ship: string ]: ShipInfo };
    export default value;
}

declare module "src/validation/*.schema.json" {
    const value: any;
    export default value;
}
