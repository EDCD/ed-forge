
const { Modules, Ships, Modifications } = require('coriolis-data/dist');
const fs = require('fs');
const _ = require('lodash');
const {
    SHIP_CORIOLIS_TO_FD, MODULES_REGEX, ARMOUR_TO_SHIP
} = require('./scripts/coriolis-mappings');


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
    if (typeof value === 'string' && key !== 'rating' && key !== 'ukName' && key !== 'ukDiscript') {
        return value.toLowerCase();
    }
    return value;
}

function writeDataJSON(filename, json) {
    let path = `./src/data/${filename}`;
    console.log(`Writing ${path}`);
    fs.writeFile(
        path,
        JSON.stringify(json, jsonReplacer, 4),
        function () {}
    );
}

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
    'manufacturer', 'crew', 'retailCost', 'ukName', 'ukDiscript' ];
let NOT_PROPS_KEYS = [ 'rating', 'class', 'eddbID', 'id', 'edID', 'symbol',
    'grp', 'mount', 'damagedist', 'name' ];

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
        meta: _.defaults(_.pick(module, META_KEYS), { 'class': 0 }),
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

    let rof = module.rof;
    if (rof) {
        delete j.props.rof;
        j.props.burstint = 1 / rof;
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
                let armourPrefix = SHIP_CORIOLIS_TO_FD[shipId];
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

writeDataJSON('modules.json', MODULES);

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

writeDataJSON('module_cache.json', MODULE_CACHE);

// ----------------------------
//  Create src/data/ships.json
// ----------------------------

const SHIPS = {};

const HP_SIZE_TO_DESCRIPTOR = [ 'Tiny', 'Small', 'Medium', 'Large', 'Huge' ];
const CORE_SLOTS = [ 'PowerPlant', 'MainEngines', 'FrameShiftDrive',
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
    const Ship = SHIP_CORIOLIS_TO_FD[shipName];
    let j = {
        proto: {
            Ship: Ship,
            ShipId: 0,
            ShipName: '',
            ShipIdent: '',
            Modules: {},
        },
        props: _.mapKeys(
            _.pickBy(ship.properties, modulePropsPicker),
            (v, k) => k.toLowerCase()
        ),
        meta: _.pick(ship, META_KEYS),
    };
    _.assign(j.meta, _.pick(ship.properties, META_KEYS));

    // Save the size of the core slots as meta data
    j.meta.coreSizes = { armour: 0, };
    j.meta.militarySizes = {};
    j.meta.passengerSlots = {};

    // Give lightweight armour to ship
    let armour = _.assign(
        _.clone(
            MODULES[
                `${SHIP_CORIOLIS_TO_FD[shipName] || shipName}_Armour_Grade1`.toLowerCase()
            ].proto
        ),
        { Slot: 'Armour' }
    );
    j.proto.Modules.armour = armour;

    // Add core slots with default modules
    CORE_SLOTS.forEach((slot, i) => {
        slot = slot.toLowerCase();
        j.meta.coreSizes[slot] = ship.slots.standard[i];

        let defaultType = ship.defaults.standard[i]; // is of form /\d\w/
        let size = defaultType[0];
        let rating = RATING_MAP[defaultType[1]];
        let moduleKey = `${CORE_ITEM_MAP[i]}_Size${size}_Class${rating}`;
        let module = _.clone(MODULES[moduleKey.toLowerCase()].proto);
        module.Slot = slot;

        j.proto.Modules[slot] = module;
    });

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
    ship.slots.internal.map(internalToSlot)
        .forEach((slot, i) => {
            let defaultId = ship.defaults.internal[i];
            let module = defaultId ? _.clone(ID_TO_MODULE[defaultId].proto)
                : { Slot: '', On: true, Item: '', Priority: 1 };
            module.Slot = slot;

            j.proto.Modules[slot] = module;
        });

    // Add hardpoint and utility slots slots with default modules
    let hardpointCounters = [ 1, 1, 1, 1, 1 ];
    let hardpointToSlot = (hardpoint) => {
        let slot = `${HP_SIZE_TO_DESCRIPTOR[hardpoint]}Hardpoint${hardpointCounters[hardpoint]}`;
        hardpointCounters[hardpoint]++;
        return slot;
    };
    ship.slots.hardpoints.map(hardpointToSlot)
        .forEach((slot, i) => {
            let hardpointId = ship.defaults.hardpoints[i];
            // default IDs for hardpoints happen to be integers
            let module = hardpointId ? _.clone(ID_TO_MODULE_HP[String(hardpointId)].proto)
                : { Slot: '', On: true, Item: '', Priority: 1 };
            module.Slot = slot;
            j.proto.Modules[slot] = module;
        });

    SHIPS[Ship.toLowerCase()] = j;
}

_.forEach(_.entries(Ships), consumeShip);

writeDataJSON('ships.json', SHIPS);

// ---------------------------------
//  Create src/data/blueprints.json
// ---------------------------------

const BLUEPRINTS = {};

function consumeBlueprint(blueprintObject) {
    let details = {};
    for (let grade of _.keys(blueprintObject['grades'])) {
        let features = blueprintObject['grades'][grade]['features'];
        let rof = features['rof'];
        if (rof) {
            delete features['rof'];
            features['burstint'] = rof.map(x => -1 * x);
        }
        details[grade] = features;
    }

    // ed-forge handles long range weapons differently
    if (blueprintObject['fdname'] === 'Weapon_LongRange') {
        for (let grade in details) {
            delete details[grade]['fallofffromrange'];
        }
    }

    BLUEPRINTS[blueprintObject['fdname'].toLowerCase()] = details;
}

_.mapValues(Modifications.blueprints, consumeBlueprint);

writeDataJSON('blueprints.json', BLUEPRINTS);

// ------------------------------------
//  Create src/data/experimentals.json
// ------------------------------------

const EXPERIMENTALS = {};

function consumeExperimental(head) {
    let [ key, features ] = head;
    if (!key.startsWith('special_')) {
        return;
    }

    let damageDist = features['damagedist'];
    if (damageDist) {
        delete features['damagedist'];
        let newDamageTypes = {
            'absdamage': 0,
            'kindamage': 0,
            'expldamage': 0,
            'thermdamage': 0,
        };
        for (let type of _.keys(damageDist)) {
            let damageType;
            switch (type) {
                case 'A': damageType = 'absdamage';
                case 'K': damageType = 'kindamage';
                case 'E': damageType = 'expldamage';
                case 'T': damageType = 'thermdamage';
            }
            newDamageTypes[damageType] = damageDist[type];
        }
        _.assign(features, newDamageTypes);
    }

    let rof = features['rof'];
    if (rof) {
        delete features['rof'];
        features['burstint'] = -1 * rof;
    }

    for (let resKey of ['thermres', 'kinres', 'explres', 'causres']) {
        let res = features[resKey];
        if (res) {
            features[resKey] = res / 100;
        }
    }

    features = _.mapValues(features, val => [ val , val ]);
    EXPERIMENTALS[key.toLowerCase()] = features;
}

_.toPairs(Modifications.modifierActions).map(consumeExperimental);

writeDataJSON('experimentals.json', EXPERIMENTALS);
