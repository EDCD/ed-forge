
const { Modules, Ships, Modifications } = require('coriolis-data/dist');
const fs = require('fs');
const _ = require('lodash');
const {
    SHIP_CORIOLIS_TO_FD, MODULES_REGEX, ARMOUR_TO_SHIP, CAT_CORIOLIS_TO_FD,
    PROP_CORIOLIS_TO_FD,
} = require('./scripts/coriolis-mappings');

/**
 * Returns an object key mapper that maps coriolis module prop names to FDev
 * ones.
 * @param {String} type Module type
 * @return {(any, String) => String} Mapper function
 */
function modulePropsMapper(type) {
    return (v, k) => {
        let mapped = PROP_CORIOLIS_TO_FD[k];
        let t = typeof mapped;
        if (t === 'string') {
            return mapped;
        } else if (t === 'object') {
            let v =  _.chain(mapped)
                .filter((descr) => Boolean(type.match(descr.for)))
                .map((descr) => descr.val)
                .head();
            return v;
        } else {
            return k;
        }
    };
}

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

// --------------------------------------------------------------
//  Create src/data/modules.json and src/data/module_cache.json
// --------------------------------------------------------------

/**
 * Inverts a mapping of categories to some list of values such that each of
 * these values maps to a list of types that fall into the given category.
 * Return value is a mapping as tuple.
 * @param {[String, [String]]} entry Object entry as tuple
 * @returns {[String, [String]]}
 */
function invertCatToEntries(entry) {
    let [category, vals] = entry;
    vals = _.map(vals, bprnt => bprnt.toLowerCase());
    let applicableTypes = _.map(CAT_CORIOLIS_TO_FD[category], t => t.toLowerCase());
    if (applicableTypes === undefined) {
        return [];
    } else {
        return _.zip(applicableTypes, _.fill(_.range(applicableTypes.length), vals));
    }
}

/**
 * Inverts a mapping of item type names to a list of values such that each of
 * these values maps to a list of items of the given type.
 * @param {[String, [String]]} entry Object entry as tuple
 * @returns {[String, [String]]}
 */
function invertTypeToEntries(entry) {
    let [ type, blueprints ] = entry;
    type = type.toLowerCase();
    let modulesOfThisType = _.chain(MODULE_CACHE[type]).values()
        .flatMap(_.values)
        .value();
    return _.zip(blueprints, _.fill(_.range(blueprints.length), modulesOfThisType));
}

// Create a map for modules mapping to blueprints that can be applied to them
const TYPES_TO_BLUEPRINTS = _.chain(Modifications.modules)
    .mapValues(o => _.keys(o.blueprints))
    .entries()
    .flatMap(invertCatToEntries)
    .fromPairs()
    .value();
const TYPES_TO_SPECIALS = _.chain(Modifications.modules)
    .mapValues(o => o.specials)
    .entries()
    .flatMap(invertCatToEntries)
    .fromPairs()
    .value();

// Initialize the empty cache to hold an empty object for each item type
const MODULE_CACHE = {};
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
    'manufacturer', 'crew', 'retailCost', 'ukName', 'ukDiscript', 'pp',
    'experimental' ];
let NOT_PROPS_KEYS = [ 'rating', 'class', 'eddbID', 'id', 'edID', 'symbol',
    'grp', 'mount', 'damagedist', 'name', 'pp', 'missile', 'experimental' ];

function modulePropsPicker(value, key) {
    return !NOT_PROPS_KEYS.includes(key);
}

function consumeModule(module) {
    const moduleKey = module.symbol.toLowerCase();
    let path = _.chain(_.entries(MODULES_REGEX)).map(entry => {
            let [type, reg] = entry;
            type = type.toLowerCase();
            let groups = reg.groups || [1, 2];
            reg = reg.r || reg;

            let m = moduleKey.match(reg);
            if (m) {
                let path = groups.map(index => m[index] || '');
                if (type === 'ARMOUR') {
                    path[0] = ARMOUR_TO_SHIP[path[0]] || path[0];
                }
                path.unshift(type);
                return path;
            }
            return null;
        })
        .filter(Boolean)
        .first()
        .value();

    // Use Object function as custom setter to ensure no array are created
    _.setWith(MODULE_CACHE, path, moduleKey, Object);
    let [ type ] = path;

    let mapper = modulePropsMapper(module.symbol);
    let j = {
        proto: {
            Slot: '',
            On: true,
            Item: module.symbol,
            Priority: 1
        },
        props: _.mapKeys(_.pickBy(module, modulePropsPicker), mapper),
        meta: _.defaults(_.pick(module, META_KEYS), {
            'class': 0,
            'applicable': TYPES_TO_BLUEPRINTS[type] || [],
            'applicable_specials': TYPES_TO_SPECIALS[type] || [],
        }),
    };

    let dist = module.damagedist;
    if (dist) {
        // Init damage dist
        j.props.thermicdamageportion = 0;
        j.props.explosivedamageportion = 0;
        j.props.kineticdamageportion = 0;
        j.props.absolutedamageportion = 0;
        for (let type in dist) {
            switch (type) {
                case "T": j.props.thermicdamageportion = dist.T;
                case "E": j.props.explosivedamageportion = dist.E;
                case "K": j.props.kineticdamageportion = dist.K;
                case "A": j.props.absolutedamageportion = dist.A;
            }
        }
    }

    MODULES[moduleKey] = j;
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

const BLUEPRINTS_TO_MODULES = _.chain(TYPES_TO_BLUEPRINTS).entries()
    // mapping of blueprints => [module]; but keys can repeat
    .flatMap(invertTypeToEntries)
    // group by keys to eliminate duplicates
    .groupBy(x => x[0])
    // values are now arrays of type [[key, [module]]]; remove key and flatmap
    .mapValues(vals => _.flatMap(vals, val => val[1]))
    .value();
const BLUEPRINTS = {};

function consumeBlueprint(blueprintObject) {
    let name = blueprintObject['fdname'].toLowerCase();
    let features = {};
    let forModules = BLUEPRINTS_TO_MODULES[name];
    if (!forModules) {
        return; // This can happen for blueprints that by now have been removed,
                // e.g. detailed surface scanner mods.
    }
    let mapper = modulePropsMapper(forModules[0]); // assume for is uniform
    let grades = _.keys(blueprintObject['grades']);
    for (let grade of grades) {
        let gradeFeatures = _.mapKeys(blueprintObject['grades'][grade]['features'], mapper);
        let rof = gradeFeatures['rateoffire'];
        if (rof) {
            delete gradeFeatures['rateoffire'];
            // rof actually modifies fire interval
            gradeFeatures['fireintervall'] = rof.map(x => -1 * x);
        }
        features[grade] = gradeFeatures;
    }

    // ed-forge handles long range weapons differently
    if (name === 'weapon_longrange') {
        for (let grade of grades) {
            delete features[grade]['fallofffromrange'];
        }
    }

    BLUEPRINTS[name] = {
        features,
        for: forModules,
    };
}

_.mapValues(Modifications.blueprints, consumeBlueprint);

writeDataJSON('blueprints.json', BLUEPRINTS);

// ------------------------------------
//  Create src/data/experimentals.json
// ------------------------------------

const SPECIALS_TO_MODULES = _.chain(TYPES_TO_SPECIALS).entries()
    // mapping of blueprints => [module]; but keys can repeat
    .flatMap(invertTypeToEntries)
    // group by keys to eliminate duplicates
    .groupBy(x => x[0])
    // values are now arrays of type [[key, [module]]]; remove key and flatmap
    .mapValues(vals => _.flatMap(vals, val => val[1]))
    .value();
const EXPERIMENTALS = {};

function consumeExperimental(head) {
    let [ key, features ] = head;
    if (!key.startsWith('special_')) {
        return;
    }
    let name = key.toLowerCase();
    let forModules = SPECIALS_TO_MODULES[name];
    if (!forModules) {
        return; // This can happen for blueprints that by now have been removed,
                // e.g. detailed surface scanner mods.
    }
    // assume forModules is uniform
    features = _.mapKeys(features, modulePropsMapper(forModules[0]));

    let damageDist = features['damagedist'];
    if (damageDist) {
        delete features['damagedist'];
        let newDamageTypes = {
            'absolutedamageportion': 0,
            'kineticdamageportion': 0,
            'explosivedamageportion': 0,
            'thermicdamageportion': 0,
        };
        for (let type of _.keys(damageDist)) {
            let damageType;
            switch (type) {
                case 'A': damageType = 'absolutedamageportion';
                case 'K': damageType = 'kineticdamageportion';
                case 'E': damageType = 'explosivedamageportion';
                case 'T': damageType = 'thermicdamageportion';
            }
            newDamageTypes[damageType] = damageDist[type];
        }
        _.assign(features, newDamageTypes);
    }

    // rof special effects actually modify fire intervall without any changes
    let rof = features['rateoffire'];
    if (rof) {
        delete features['rateoffire'];
        features['fireintervall'] = rof;
    }

    for (let resKey of ['thermicresistance', 'kineticresistance', 'explosiveresistance', 'causticresistance']) {
        let res = features[resKey];
        if (res) {
            features[resKey] = res / 100;
        }
    }

    features = _.mapValues(features, val => [ val , val ]);
    EXPERIMENTALS[name] = {
        features,
        for: forModules,
    };
}

_.toPairs(Modifications.modifierActions).map(consumeExperimental);

writeDataJSON('experimentals.json', EXPERIMENTALS);
