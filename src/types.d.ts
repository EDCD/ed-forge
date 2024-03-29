import { IModuleObject } from './Module';
import { IShipObject } from './Ship';

/**
 * Maps property to array of from [min, max].
 */
type FeatureObject = {
    [property: string]: {
        min: number;
        max: number;
        only: string;
    };
};

/**
 * Blueprint type: has features per grade and list of modules the blueprint can
 * be applied to.
 */
type BlueprintObject = {
    features: { [grade: string]: FeatureObject };
    appliesTo: [string];
};

/**
 * Experimental type: has features and list of modules the special
 */
type ExperimentalObject = {
    features: FeatureObject;
    appliesTo: [string];
};

type BitVec = number;

type ModuleRegistryEntry = {
    regex: string;
    slots: BitVec;
    applicable: string[];
    applicable_specials: string[];
    items: {
        [grade: string]: {
            [rating: string]: string;
        };
    };
};

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
    /** Outfitting group of the item; more general than type (e.g. shieldgen) */
    group: string;
    /** Rating of the item */
    rating: string;
    /** Type of the item (e.g. biweaveshieldgen). Module registry is sorted by
     * types. */
    type: string;
    /** Mount of the item (if hardpoint) */
    mount?: string;
}

/**
 * Object holding information about an item.
 */
export interface ModuleInformation {
    /** Loadout-event-style module object prototype */
    proto: IModuleObject;
    /** Default item properties */
    props: { [property: string]: number };
    /** Item meta information */
    meta: MetaModuleInformation;
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
    coreSizes: { [key: string]: string };
    /** Map from military slots to respective sizes */
    militarySizes: { [key: string]: string };
    /** Present and true if the ship supports luxury passenger cabins */
    luxuryCabins?: boolean;
    /** Present and true if the ship supports SLF hangars */
    fighterHangars?: boolean;
}

/**
 * Object holding information about a ship.
 */
interface ShipInfo {
    /** Ship prototype object */
    proto: IShipObject;
    /** Ship properties */
    props: { [key: string]: number };
    /** Meta data about a ship */
    meta: ShipMetaInfo;
}
