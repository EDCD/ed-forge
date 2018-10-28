
const { Modules, Ships } = require('coriolis-data/dist');
const fs = require('fs');
const _ = require('lodash');

// Will be set in consumeModule; hardpoints and other modules don't share ids
const ID_TO_MODULE = {};
const ID_TO_MODULE_HP = {};

// --------
//  Helper
// --------

/**
 * Converts any number into a string with at least to characters by adding an
 * optional leading zero.
 * @param {Number} number Any number
 * @returns {String} String with optional leading zero
 */
function leadingZero(number) {
    return (number < 10 ? '0' : '') + String(number);
}

/**
 * This function will turn any value passed as second parameter into lowercase
 * if it is a string and return that; otherwise it just returns the value.
 * This is meant to be passed as replacer to JSON.stringify to guard
 * serialization.
 * An exception to this is rating.
 * @param {String} key JSON key
 * @param {*} value Accompanying value
 * @returns {*} value.toLowerCase() if value is a string; value otherwise
 */
function jsonReplacer(key, value) {
    if (typeof value === 'string' && key !== 'rating') {
        return value.toLowerCase();
    }
    return value;
}

/**
 * Following regexes will parse modules for the module cache. The function which
 * create the cache expects matching group 1 to represent the class of the item
 * and matching group 2 to represent the rating. If groups is set, matching
 * group groups[0] will represent the class and groups[1] the rating.
 * If class and/or rating aren't given, "" will be default value.
 */
const MODULES_REGEX = {
    Armour: /^(\S+)_Armour_(\S+)$/i,
    Powerplant: /^Int_PowerPlant_Size(\d)_Class(\d)$/i,
    GuardianPowerplant: /^Int_GuardianPowerplant_Size(\d)$/i,
    Thrusters: /^Int_Engine_Size(\d)_Class(\d)$/i,
    EnhancedThrusters: /^Int_Engine_Size(\d)_Class(\d)_Fast$/i,
    FSD: /^Int_HyperDrive_Size(\d)_Class(\d)$/i,
    LifeSupport: /^Int_LifeSupport_Size(\d)_Class(\d)$/i,
    PowerDistributor: /^Int_PowerDistributor_Size(\d)_Class(\d)$/i,
    GuardianPowerDistributor: /^Int_GuardianPowerDistributor_Size(\d)$/i,
    Sensors: /^Int_Sensors_Size(\d)_Class(\d)$/i,
    FuelTank: /^Int_FuelTank_Size(\d)_Class(\d)$/i,
    AdvancedPlasmaAcc: {
        r: /^Hpt_PlasmaAccelerator_(\w+)_(\w+)_Advanced$/i,
        groups: [2, 1],
    },
    AFM: /^Int_Repairer_Size(\d)_Class(\d)$/i,
    AXDumbfireRack: {
        r: /Hpt_ATDumbfireMissile_(\w+)_(\w+)/i,
        groups: [2, 1],
    },
    AXMultiCannon: {
        r: /^Hpt_ATMultiCannon_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    BeamLaser: {
        r: /^Hpt_BeamLaser_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    BiWeaveShieldGen: /^Int_ShieldGenerator_Size(\d)_Class(\d)_Fast$/i,
    BurstLaser: {
        r: /^Hpt_PulseLaserBurst_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    PassengerCabins: /^Int_PassengerCabin_Size(\d)_Class(\d)$/i,
    Cannon: {
        r: /^Hpt_Cannon_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    CargoRack: /^Int_CargoRack_Size(\d)_Class1$/i,
    ChaffLauncher: /^Hpt_ChaffLauncher_Tiny$/i,
    CollectorLimpet: /^Int_DroneControl_Collection_Size(\d)_Class(\d)$/i,
    CorrosionResistantCargoRack: /^Int_CorrosionProofCargoRack_Size(\d)_Class(\d)$/i,
    CytoScrambler: {
        r: /^Hpt_PulseLaserBurst_(\w+)_(\w+)_Scatter$/i,
        groups: [2, 1],
    },
    Disruptor: {
        r: /^Hpt_PulseLaser_(\w+)_(\w+)_Disruptor$/i,
        groups: [2, 1],
    },
    DockingComputer: /^Int_DockingComputer_Standard$/i,
    DumbfireRack: /^Hpt_ATDumbfireMissile_Fixed_(\w+)$/i,
    ECM: /^Hpt_ElectronicCountermeasure_Tiny$/i,
    Enforcer: {
        r: /^Hpt_MultiCannon_(\w+)_(\w+)_Strong$/i,
        groups: [2, 1],
    },
    EnzymeMissileRack: {
        r: /^Hpt_CausticMissile_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    FlakLauncher: {
        r: /^Hpt_FlakMortar_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    FlechetteLauncher: {
        r: /^Hpt_FlechetteLauncher_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    FragCannon: {
        r: /^Hpt_SlugShot_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    FSDDisruptor: {
        r: /^Hpt_DumbfireMissileRack_(\w+)_(\w+)_Lasso$/i,
        groups: [2, 1],
    },
    FSDInterdicotr: /^Int_FSDInterdictor_Size(\d)_Class(\d)$/i,
    FSDBooster: /^Int_GuardianFSDBooster_Size(\d)$/i,
    FuelScoop: /^Int_FuelScoop_Size(\d)_Class(\d)$/i,
    FuelTransferLimpet: /^Int_DroneControl_FuelTransfer_Size(\d)_Class(\d)$/i,
    FighterBay: /^Int_FighterBay_Size(\d)_Class1$/i,
    GuardianGaussCannon: {
        r: /^Hpt_Guardian_GaussCannon_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    GuardianHRP: /^Int_GuardianHullReinforcement_Size(\d)_Class(\d)$/i,
    GuargianMRP: /^Int_GuardianModuleReinforcement_Size(\d)_Class(\d)$/i,
    GuardianPlasmaCharger: {
        r: /^Hpt_Guardian_PlasmaLauncher_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    GuardianShardCannon: {
        r: /^Hpt_Guardian_ShardCannon(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    GuardianSRP: /^Int_GuardianShieldReinforcement_Size(\d)_Class(\d)$/i,
    HatchBreakerLimper: /^Int_DroneControl_ResourceSiphon_Size(\d)_Class(\d)$/i,
    HeatSinkLauncher: /^Hpt_HeatSinkLauncher_Turret_Tiny$/i,
    HRP: /^Int_HullReinforcement_Size(\d)_Class(\d)$/i,
    ImperialHammer: {
        r: /^Hpt_Railgun_(\w+)_(\w+)_Burst$/i,
        groups: [2, 1],
    },
    KillWarrantScanner: {
        r: /^Hpt_CrimeScanner_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    ManifestScanner: {
        r: /^Hpt_CargoScanner_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    MultiCannon: {
        r: /^Hpt_MultiCannon_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    MineLauncher: /^Hpt_MineLauncher_Fixed_(\w)+/i,
    MiningLance: {
        r: /^Hpt_MiningLaser_(\w+)_(\w+)_Advanced$/i,
        groups: [2, 1],
    },
    MiningLaser: {
        r: /^Hpt_MiningLaser_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    MRP: /^Int_ModuleReinforcement_Size(\d)_Class(\d)$/i,
    MetaAlloyHRP: /^Int_MetaAlloyHullReinforcement_Size(\d)_Class(\d)$/i,
    PackHound: {
        r: /^Hpt_DrunkMissileRack_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    Pacifier: {
        r: /^Hpt_Slugshot_(\w+)_(\w+)_Range$/i,
        groups: [2, 1],
    },
    PlasmaAcc: {
        r: /^Hpt_PlasmaAccelerator_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    PointDefence: /^Hpt_ChaffLauncher_Tiny$/i,
    PrismaticShieldGen: /^Int_ShieldGenerator_Size(\d)_Class(\d)_Strong$/i,
    ProspectorLimpet: /^Int_DroneControl_Prospector_Size(\d)_Class(\d)$/i,
    PulseLaser: {
        r: /^Hpt_PulseLaser_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    RailGun: {
        r: /^Hpt_RailGun_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    ReconLimpet: /^Int_DroneControl_Recon_Size(\d)_Class(\d)$/i,
    Refinery: /^Int_Refinery_Size(\d)_Class(\d)$/i,
    RepairLimpet: /^Int_DroneControl_Repair_Size(\d)_Class(\d)$/i,
    ResearchLimpet: /^Int_DroneControl_UnkVesselResearch$/i,
    Retributor: {
        r: /^Hpt_BeamLaser_(\w+)_(\w+)_Heat$/i,
        groups: [2, 1],
    },
    ShieldBooster: {
        r: /^Hpt_ShieldBooster_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    ShieldGen: /^Int_ShieldGenerator_Size(\d)_Class(\d)$/i,
    DiscoveryScanner: {
        r: /^Int_StellarBodyDiscoveryScanner_(\w+)$/i,
        groups: [-1, 1],
    },
    SCB: /^Int_ShieldCellBank_Size(\d)_Class(\d)$/i,
    SeekerRack: /^Hpt_ATDumbfireMissile_Turret_(\w+)/i,
    ShockCannon: {
        r: /^Hpt_PlasmaShockCannon_(\w+)_(\w+)$/i,
        groups: [2, 1],
    },
    ShockMine: /Hpt_MineLauncher_Fixed_Small_Impulse/i,
    ShutdownNeutralizer: /^Hpt_AntiUnknownShutdown_Tiny$/i,
    SurfaceScanner: /^Int_DetailedSurfaceScanner_Tiny$/i,
    TorpedoPylon: /^Hpt_AdvancedTorpPylon_Fixed_(\w+)$/i,
    VehicleBay: /^Int_BuggyBay_Size(\d)_Class(\d)$/i,
    WakeScanner: {
        r: /^Hpt_CloudScanner_Size0_Class(\d)$/i,
        groups: [-1, 1],
    },
    XenoScanner: /^Hpt_XenoScanner_Basic_Tiny$/i,
};

// ------------------------------
//  Create src/data/modules.json
// ------------------------------

const MODULES = {
    // Empty module
    '': {
        proto: {
            Slot: '',
            On: true,
            Item: '',
            Priority: '',
        },
    },
};

const META_KEYS = [ 'eddbID', 'edID', 'class', 'rating', 'fighterHangars',
    'manufacturer', 'crew' ];
let NOT_PROPS_KEYS = [ 'rating', 'class', 'eddbID', 'id', 'edID', 'symbol',
    'grp', 'mount', 'damagedist', 'name' ];
const SHIP_TO_ARMOUR = {
    'cobra_mk_iii': 'CobraMkIII',
    'type_6_transporter': 'Type6',
    'type_7_transporter': 'Type7',
    'imperial_clipper': 'Empire_Trader',
    'federal_dropship': 'Federation_Dropship',
    'type_9_heavy': 'Type9',
    'fer_de_lance': 'FerDeLance',
    'diamondback_explorer': 'DiamondBackXL',
    'imperial_courier': 'Empire_Courier',
    'diamondback': 'DiamondBack',
    'imperial_eagle': 'Empire_Eagle',
    'federal_assault_ship': 'Federation_Dropship_MkII',
    'federal_gunship': 'Federation_Gunship',
    'imperial_cutter': 'Cutter',
    'federal_corvette': 'Federation_Corvette',
    'viper_mk_iv': 'Viper_MkIV',
    'keelback': 'Independent_Trader',
    'cobra_mk_iv': 'CobraMkIV',
    'beluga': 'BelugaLiner',
    'type_10_defender': 'Type9_Military',
    'alliance_chieftain': 'TypeX',
    'alliance_challenger': 'TypeX_3',
    'alliance_crusader': 'TypeX_2',
};
let ARMOUR_TO_SHIP = {};
_.forEach(_.entries(SHIP_TO_ARMOUR), entry => {
    let [ship, armourPrefix] = entry;
    ARMOUR_TO_SHIP[armourPrefix.toLowerCase()] = ship;
})

function modulePropsPicker(value, key) {
    return !NOT_PROPS_KEYS.includes(key);
}

function consumeModule(module) {
    let j = {
        proto: {
            Slot: '',
            On: true,
            Item: module.symbol,
            Priority: 1
        },
        props: _.pickBy(module, modulePropsPicker),
        meta: _.pick(module, META_KEYS),
    };

    let dist = module.damagedist;
    if (dist) {
        // Init damage dist
        j.props.thermdamage = 0;
        j.props.expldamage = 0;
        j.props.kindamage = 0;
        j.props.absdamage = 0;
        for (let type in dist) {
            switch (type) {
                case "T": j.props.thermdamage = dist.T;
                case "E": j.props.expldamage = dist.E;
                case "K": j.props.kindamage = dist.K;
                case "A": j.props.absdamage = dist.A;
            }
        }
    }

    MODULES[module.symbol.toLowerCase()] = j;
    (module.symbol.match(/Hpt_/i) ? ID_TO_MODULE_HP : ID_TO_MODULE)[module.id] = j;
}

// Get list of all bulkhead modules
const I_TO_GRADE = ['Grade1', 'Grade2', 'Grade3', 'Mirrored', 'Reactive'];
_.chain(_.keys(Ships))
    .flatMap(shipId => {
        let ship = Ships[shipId];
        // Inject symbol into bulkheads
        return _.chain(ship.bulkheads)
            .map((armour, i) => {
                let armourPrefix = SHIP_TO_ARMOUR[shipId] || shipId;
                armour.symbol = `${armourPrefix}_Armour_${I_TO_GRADE[i]}`;
                return armour;
            })
            .value();
    })
    .forEach(consumeModule)
    .commit();

_.chain([ Modules.internal, Modules.standard, Modules.hardpoints ])
    .flatMap(_.values)  // to module groups
    .flatMap()          // to modules
    .forEach(consumeModule)
    .commit();

console.log('Writing /src/data/modules.json');
fs.writeFile(
    './src/data/modules.json',
    JSON.stringify(MODULES, jsonReplacer, 4),
    function () {}
);

// -----------------------------------
//  Create src/data/module_cache.json
// -----------------------------------

const MODULE_CACHE = {};

_.forEach(_.entries(MODULES_REGEX), entry => {
    let [regKey, reg] = entry;
    MODULE_CACHE[regKey] = {};
    let groups = reg.groups || [1, 2];
    reg = reg.r || reg;

    _.forEach(_.keys(MODULES), moduleKey => {
        let m = moduleKey.match(reg);
        if (m) {
            let path = groups.map(index => m[index] || '');
            if (regKey === 'ARMOUR') {
                path[0] = ARMOUR_TO_SHIP[path[0]] || path[0];
            }
            if (!MODULE_CACHE[regKey][path[0]]) {
                MODULE_CACHE[regKey][path[0]] = {};
            }
            MODULE_CACHE[regKey][path[0]][path[1]] = moduleKey;
        }
    });
});

console.log('Writing /src/data/module_cache.json');
fs.writeFile(
    './src/data/module_cache.json',
    JSON.stringify(MODULE_CACHE, jsonReplacer, 4),
    function () {}
);

// ----------------------------
//  Create src/data/ships.json
// ----------------------------

const SHIPS = {};

const HP_SIZE_TO_DESCRIPTOR = [ 'Tiny', 'Small', 'Medium', 'Large', 'Huge' ];
const CORE_SLOTS = [ 'PowerPlant', 'MainEngine', 'FrameShiftDrive',
    'LifeSupport', 'PowerDistributor', 'Radar', 'FuelTank' ];
const CORE_ITEM_MAP = [ 'Int_PowerPlant', 'Int_Engine', 'Int_HyperDrive',
    'Int_LifeSupport', 'Int_PowerDistributor', 'Int_Sensors', 'Int_FuelTank' ];
const RATING_MAP = {
    'A': 5,
    'B': 4,
    'C': 3,
    'D': 2,
    'E': 1,
};
NOT_PROPS_KEYS = [ 'name', 'luxuryCabins', 'class', 'manufacturer',
    'fighterHangars', 'crew' ];

function consumeShip(entry) {
    let [shipName, ship] = entry;
    let j = {
        proto: {
            Ship: shipName,
            ShipId: 0,
            ShipName: '',
            ShipIdent: '',
            Modules: [
                // Give lightweight armour to ship
                _.assign(
                    _.clone(
                        MODULES[
                            `${SHIP_TO_ARMOUR[shipName] || shipName}_Armour_Grade1`.toLowerCase()
                        ].proto
                    ),
                    { Slot: 'Armour' }
                ),
            ],
        },
        props: _.pickBy(ship.properties, modulePropsPicker),
        meta: _.pick(ship, META_KEYS),
    };
    _.assign(j.meta, _.pick(ship.properties, META_KEYS));

    // Save the size of the core slots as meta data
    j.meta.coreSizes = {};
    j.meta.militarySizes = {};
    j.meta.passengerSlots = {};

    // Add core slots with default modules
    let cores = _.chain(CORE_SLOTS)
        .forEach((slot, i) => {
            slot = slot.toLowerCase();
            j.meta.coreSizes[slot] = ship.slots.standard[i];
        })
        .map((slot, i) => {
            let defaultType = ship.defaults.standard[i]; // is of form /\d\w/
            let size = defaultType[0];
            let rating = RATING_MAP[defaultType[1]];
            let moduleKey = `${CORE_ITEM_MAP[i]}_Size${size}_Class${rating}`;
            let module = _.clone(MODULES[moduleKey.toLowerCase()].proto);
            module.Slot = slot;
            return module;
        })
        .value();
    j.proto.Modules.push(...cores);

    // Add internal slots with default modules
    let slotIndexOffset = ship.properties.name == 'type_9_heavy' ? 1 : 0;
    let militaryCounter = 0;
    let internalToSlot = (internal, i) => {
        let key;
        if (typeof internal === 'object' && internal.name === 'Military') {
            militaryCounter++;
            key = `Military${leadingZero(militaryCounter)}`;
            j.meta.militarySizes[key.toLowerCase()] = internal.class;
        } else {
            let slotNumber = i + 1;         // slot numbers are 1 indexed
            slotNumber -= slotIndexOffset;  // ... unless you're the type 9
            slotNumber -= militaryCounter;  // And we don't count militaries
            let size = internal.class || internal;
            key = `Slot${leadingZero(slotNumber)}_Size${size}`;
            if (typeof internal === 'object') { // => passenger slot
                j.meta.passengerSlots[key] = true;
            }
        }
        return key;
    };
    let internals = _.chain(ship.slots.internal)
        .map(internalToSlot)
        .map((slot, i) => {
            let defaultId = ship.defaults.internal[i];
            let module = defaultId ? _.clone(ID_TO_MODULE[defaultId].proto)
                : { Slot: '', On: true, Item: '', Priority: 1 };
            module.Slot = slot;
            return module;
        })
        .value();
    j.proto.Modules.push(...internals);

    // Add hardpoint and utility slots slots with default modules
    let hardpointCounters = [ 1, 1, 1, 1, 1 ];
    let hardpointToSlot = (hardpoint) => {
        let slot = `${HP_SIZE_TO_DESCRIPTOR[hardpoint]}Hardpoint${hardpointCounters[hardpoint]}`;
        hardpointCounters[hardpoint]++;
        return slot;
    };
    let hardpoints = _.chain(ship.slots.hardpoints)
        .map(hardpointToSlot)
        .map((slot, i) => {
            let hardpointId = ship.defaults.hardpoints[i];
            // default IDs for hardpoints happen to be integers
            let module = hardpointId ? _.clone(ID_TO_MODULE_HP[String(hardpointId)].proto)
                : { Slot: '', On: true, Item: '', Priority: 1 };
            module.Slot = slot;
            return module;
        })
        .value();
    j.proto.Modules.push(...hardpoints);

    SHIPS[ship.properties.name.toLowerCase()] = j;
}

_.forEach(_.entries(Ships), consumeShip);

console.log('Writing /src/data/ships.json');
fs.writeFile(
    './src/data/ships.json',
    JSON.stringify(SHIPS, jsonReplacer, 4),
    function () {}
);
