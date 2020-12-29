
const { Modules, Ships, Modifications } = require('coriolis-data/dist');
const fs = require('fs');
const _ = require('lodash');
const {
    SHIP_CORIOLIS_TO_FD, MODULES_REGEX, CAT_CORIOLIS_TO_FD,
    PROP_CORIOLIS_TO_FD, BLUEPRINT_EXCEPTION_TARGETS,
    EXPERIMENTAL_EXCEPTION_TARGETS, TYPE_TO_GROUP
} = require('./scripts/coriolis-mappings');
const MODULE_STATS = require('./src/module-stats.json');

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

RESISTANCE_MAPPINGS = [
    {
        'res': 'causticresistance',
        'eff': 'causticeffectiveness',
    },
    {
        'res': 'explosiveresistance',
        'eff': 'explosiveeffectiveness',
    },
    {
        'res': 'kineticresistance',
        'eff': 'kineticeffectiveness',
    },
    {
        'res': 'thermicresistance',
        'eff': 'thermiceffectiveness',
    },
];

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
//  Create src/data/modules.json and src/data/module_registry.json
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
    // Access 'items' with _.get because MODULE_REGISTRY[type] might be undefined
    let modulesOfThisType = _.chain(_.get(MODULE_REGISTRY[type], 'items')).values()
        .flatMap(_.values)
        .value();
    return _.zip(blueprints, _.fill(_.range(blueprints.length), modulesOfThisType));
}

// Create a map for modules mapping to blueprints that can be applied to them
const TYPES_TO_CORIOLIS_BLUEPRINTS = _.chain(Modifications.modules)
    .mapValues(o => _.keys(o.blueprints))
    .entries()
    .flatMap(invertCatToEntries)
    .fromPairs()
    .value();
const TYPES_TO_BLUEPRINTS = _.chain(Modifications.modules)
    .mapValues(o => _.keys(o.blueprints).map(
        bp => Modifications.blueprints[bp].fdname
    ))
    .entries()
    .flatMap(invertCatToEntries)
    .fromPairs()
    .value();
const TYPES_TO_CORIOLIS_SPECIALS = _.chain(Modifications.modules)
    .mapValues(o => o.specials)
    .entries()
    .flatMap(invertCatToEntries)
    .fromPairs()
    .value();
const TYPES_TO_SPECIALS = _.chain(Modifications.modules)
    .mapValues(o => (o.specials || []).map(
        sp => Modifications.specials[sp].fdname
    ))
    .entries()
    .flatMap(invertCatToEntries)
    .fromPairs()
    .value();

// Special effects for seekers and dumbfire racks are mapped by special keys;
// cope with this here
TYPES_TO_CORIOLIS_SPECIALS.dumbfirerack = Modifications.modules.mr.specials_D;
TYPES_TO_CORIOLIS_SPECIALS.seekerrack = Modifications.modules.mr.specials_S;
TYPES_TO_SPECIALS.dumbfirerack = TYPES_TO_CORIOLIS_SPECIALS.dumbfirerack.map(
    sp => Modifications.specials[sp].fdname,
);
TYPES_TO_SPECIALS.seekerrack = TYPES_TO_CORIOLIS_SPECIALS.seekerrack.map(
    sp => Modifications.specials[sp].fdname,
);

function moduleRegexToSlots(regex) {
    let slots;
    if (regex.match(/_Armour_/i)) {
        slots = ['armour'];
    } else if (regex.match(/Int_PowerPlant/i)) {
        slots = ['powerplant'];
    } else if (regex.match(/Int_Engine/i)) {
        slots = ['mainengines'];
    } else if (regex.match(/Int_HyperDrive/i)) {
        slots = ['frameshiftdrive'];
    } else if (regex.match(/Int_LifeSupport/i)) {
        slots = ['lifesupport'];
    } else if (regex.match(/Int_PowerDistributor/i)) {
        slots = ['powerdistributor'];
    } else if (regex.match(/Int_Sensors/i)) {
        slots = ['radar'];
    } else if (regex.match(/Int_FuelTank/i)) {
        slots = ['fueltank', 'slot(\\d{2})_size(\\d)'];
    } else if (regex.match(/Hpt_/i)) {
        if (regex.match(/size0/i) || regex.match(/tiny/i)) {
            slots = ['tinyhardpoint(\\d)'];
        } else {
            slots = ['(small|medium|large|huge)hardpoint'];
        }
    } else if (regex.match(/Int_/i)) {
        slots = ['slot(\\d{2})_size(\\d)'];
        if (
            regex.match(/HullReinforcement/i) ||
            regex.match(/ModuleReinforcement/i) ||
            regex.match(/ShieldReinforcement/i) ||
            regex.match(/ShieldCellBank/i)
        ) {
            slots.push('military(\\d{2})');
        }
    }
    return slots;
}

// Initialize the empty cache to hold an empty object for each item type
const MODULE_REGISTRY = _.chain(MODULES_REGEX)
    .mapKeys((v, k) => k.toLowerCase())
    .mapValues((v, k) => {
        let regex = (v.r || v).source;
        return {
            regex,
            slots: moduleRegexToSlots(regex),
            applicable: TYPES_TO_BLUEPRINTS[k],
            applicable_specials: TYPES_TO_SPECIALS[k],
        };
    })
    .value();
const MODULES = {
    // Empty module
    '': {
        proto: {
            Slot: '',
            On: true,
            Item: '',
            Priority: 0,
        },
    },
};

const META_KEYS = [ 'eddbID', 'edID', 'class', 'rating', 'fighterHangars',
    'manufacturer', 'crew', 'retailCost', 'ukName', 'ukDiscript', 'pp',
    'experimental', 'cost', 'luxuryCabins', 'ammocost' ];
let NOT_PROPS_KEYS = [ 'rating', 'class', 'eddbID', 'id', 'edID', 'symbol',
    'grp', 'mount', 'damagedist', 'name', 'pp', 'missile', 'experimental',
    'ukName', 'ukDiscript', 'passive', 'cost', 'ammocost', 'fightercost',
    'rechargerating' ];

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
                path.unshift(type, 'items');
                return path;
            }
            return null;
        })
        .filter(Boolean)
        .first()
        .value();

    // Use Object function as custom setter to ensure no array are created
    _.setWith(MODULE_REGISTRY, path, moduleKey, Object);
    let [ type ] = path;

    // For some reason, the range property of internals is stored in kilometers
    // not meters in coriolis. Fix this here
    let range = module.range;
    if (range && module.symbol.toLowerCase().startsWith('int_')) {
        module.range *= 1000;
    }

    let mapper = modulePropsMapper(module.symbol);
    let j = {
        proto: {
            Slot: '',
            On: true,
            Item: module.symbol,
            Priority: 0
        },
        props: _.mapKeys(_.pickBy(module, modulePropsPicker), mapper),
        meta: _.defaults(_.pick(module, META_KEYS), {
            'class': 0,
            'group': TYPE_TO_GROUP[type] || type,
            type,
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
                case "T": j.props.thermicdamageportion = dist.T; break;
                case "E": j.props.explosivedamageportion = dist.E; break;
                case "K": j.props.kineticdamageportion = dist.K; break;
                case "A": j.props.absolutedamageportion = dist.A; break;
            }
        }
    }

    let mount = module.mount;
    if (mount) {
        j.meta.mount = path[3];
    }

    // Map resistances to damage multipliers for modules
    for (let {res, eff} of RESISTANCE_MAPPINGS) {
        let resVal = j.props[res];
        if (!isNaN(resVal)) {
            j.props[eff] = 1 - resVal;
            delete j.props[res];
        }
    }

    for (let propName in j.props) {
        let descr = MODULE_STATS[propName];
        if (descr && descr.percentage) {
            j.props[propName] *= 100;
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
writeDataJSON('module_registry.json', MODULE_REGISTRY);

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
            Modules: [],
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

    // Give lightweight armour to ship
    let armour = _.assign(
        _.clone(
            MODULES[
                `${SHIP_CORIOLIS_TO_FD[shipName] || shipName}_Armour_Grade1`.toLowerCase()
            ].proto
        ),
        { Slot: 'Armour' }
    );
    j.proto.Modules.push(armour);

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

        j.proto.Modules.push(module);
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
        }
        return key;
    };
    ship.slots.internal.map(internalToSlot)
        .forEach((slot, i) => {
            let defaultId = ship.defaults.internal[i];
            let module = defaultId ? _.clone(ID_TO_MODULE[defaultId].proto)
                : { Slot: '', On: true, Item: '', Priority: 0 };
            module.Slot = slot;

            j.proto.Modules.push(module);
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
                : { Slot: '', On: true, Item: '', Priority: 0 };
            module.Slot = slot;
            j.proto.Modules.push(module);
        });

    SHIPS[Ship.toLowerCase()] = j;
}

_.forEach(_.entries(Ships), consumeShip);

writeDataJSON('ships.json', SHIPS);

// ---------------------------------
//  Create src/data/blueprints.json
// ---------------------------------

const BLUEPRINTS_TO_MODULES = _.chain(TYPES_TO_CORIOLIS_BLUEPRINTS).entries()
    // mapping of blueprints => [module]; but keys can repeat
    .flatMap(invertTypeToEntries)
    // group by keys to eliminate duplicates
    .groupBy(x => x[0])
    // values are now arrays of type [[key, [module]]]; remove key and flatmap
    .mapValues(vals => _.flatMap(vals, val => val[1]))
    .value();
const BLUEPRINTS = {};

let exceptions = [];

function consumeBlueprint(head) {
    let [key, blueprintObject] = head;
    key = key.toLowerCase();
    let name = blueprintObject['fdname'].toLowerCase();
    let features = {};
    let appliesTo = BLUEPRINTS_TO_MODULES[key];
    if (!appliesTo) {
        return; // This can happen for blueprints that by now have been removed,
                // e.g. detailed surface scanner mods.
    }
    let mapper = modulePropsMapper(appliesTo[0]); // assume for is uniform
    let grades = _.keys(blueprintObject['grades']);
    for (let grade of grades) {
        let gradeFeatures = _.chain(blueprintObject['grades'][grade]['features'])
            .mapKeys(mapper)
            .mapValues(([min, max]) => { return { min, max } })
            .value();
        let rof = gradeFeatures['rateoffire'];
        if (rof) {
            delete gradeFeatures['rateoffire'];
            // rof actually modifies fire interval
            gradeFeatures['fireintervall'] = rof;
        }

        // Map resistances to damage multipliers for blueprints
        for (let {res, eff} of RESISTANCE_MAPPINGS) {
            let resFeat = gradeFeatures[res];
            if (resFeat) {
                delete gradeFeatures[res];
                gradeFeatures[eff] = _.mapValues(resFeat, v => -1 * v);
            }
        }

        features[grade] = gradeFeatures;
    }

    // ed-forge handles long range weapons differently
    if (name === 'weapon_longrange') {
        for (let grade of grades) {
            delete features[grade]['fallofffromrange'];
        }
    }

    if (key !== name) {
        // Some blueprints are special because they implement an exception in
        // coriolis; we handle those differently
        exceptions.push({ key, name, features, appliesTo });
    } else {
        BLUEPRINTS[name] = { features, appliesTo };
    }
}

_.toPairs(Modifications.blueprints).map(consumeBlueprint);

// Merge an array of exceptions into normal blueprints. Coriolis can not handle
// exceptions in blueprints, i.e. features that only apply to a specific class
// of items. ed-forge can do this so we merge those blueprints here.
for (let { key, name, features, appliesTo } of exceptions) {
    // Original blueprint
    let blueprint = BLUEPRINTS[name];

    // Find distinct of the exception not in the original
    let exceptionTarget = BLUEPRINT_EXCEPTION_TARGETS[key];
    for (let grade in features) {
        for (let featureName in features[grade]) {
            if (!blueprint.features[grade][featureName]) {
                features[grade][featureName].only = exceptionTarget;
            }
        }
    }

    // It might be the case that the original blueprint has exceptions as well;
    // then find features of the original that are not in the exception. We
    // assume that there is only one additional exception per blueprint.
    let blueprintTarget = BLUEPRINT_EXCEPTION_TARGETS[name];
    if (blueprintTarget) {
        for (let grade in blueprint.features) {
            for (let featureName in blueprint.features[grade]) {
                if (!features[grade][featureName]) {
                    blueprint.features[grade][featureName].only = blueprintTarget;
                }
            }
        }
    }

    // This will only overwrite shared features which are the same anyways
    for (let grade in features) {
        _.assign(blueprint.features[grade], features[grade]);
    }

    // Merge appliesTo; we assume those two arrays not to intersect
    blueprint.appliesTo.push(...appliesTo);
}

writeDataJSON('blueprints.json', BLUEPRINTS);

// ------------------------------------
//  Create src/data/experimentals.json
// ------------------------------------

const SPECIALS_TO_MODULES = _.chain(TYPES_TO_CORIOLIS_SPECIALS).entries()
    // mapping of blueprints => [module]; but keys can repeat
    .flatMap(invertTypeToEntries)
    // group by keys to eliminate duplicates
    .groupBy(x => x[0])
    // values are now arrays of type [[key, [module]]]; remove key and flatmap
    .mapValues(vals => _.flatMap(vals, val => val[1]))
    .value();
const EXPERIMENTALS = {};

let experimentalExceptions = [];

function consumeExperimental(head) {
    let [ key, features ] = head;
    if (!key.startsWith('special_')) {
        return;
    }
    let name = key.toLowerCase();
    let appliesTo = SPECIALS_TO_MODULES[name];
    if (!appliesTo) {
        return; // This can happen for blueprints that by now have been removed,
                // e.g. detailed surface scanner mods.
    }
    // assume appliesTo is uniform
    features = _.mapKeys(features, modulePropsMapper(appliesTo[0]));

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
                case 'A': damageType = 'absolutedamageportion'; break;
                case 'K': damageType = 'kineticdamageportion'; break;
                case 'E': damageType = 'explosivedamageportion'; break;
                case 'T': damageType = 'thermicdamageportion'; break;
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

    // Map resistances to damage multipliers
    for (let {res, eff} of RESISTANCE_MAPPINGS) {
        let resFeat = features[res];
        if (resFeat) {
            delete features[res];
            features[eff] = -1 * (resFeat / 100);
        }
    }

    features = _.mapValues(features, val => { return { 'min': val, 'max': val } } );
    const { fdname } = Modifications.specials[key];
    if (key !== fdname) {
        experimentalExceptions.push({ key, fdname, features, appliesTo })
    } else {
        EXPERIMENTALS[name] = { features, appliesTo };
    }
}

// Coriolis also keeps track of the legacy version of plasma slug which is not
// needed here because on legacy builds, the stats can simply be altered freely.
// We simply treat the plasma accelerator version of plasma slug as the
// "default" experimental effect.
Modifications.modifierActions.special_plasma_slug
    = Modifications.modifierActions.special_plasma_slug_pa;
delete Modifications.modifierActions.special_plasma_slug_pa;
_.toPairs(Modifications.modifierActions).map(consumeExperimental);

// Merge an array of exceptions into normal experimentals. Coriolis can not
// handle exceptions in experimentals, i.e. features that only apply to a
// specific class of items. ed-forge can do this so we merge those experimentals
// here.
for (let { key, fdname, features, appliesTo } of experimentalExceptions) {
    // Original blueprint
    let experimental = EXPERIMENTALS[fdname];

    // Find distinct of the exception not in the original
    let exceptionTarget = EXPERIMENTAL_EXCEPTION_TARGETS[key];
    for (let featureName in features) {
        if (!experimental.features[featureName]) {
            features[featureName].only = exceptionTarget;
        }
    }

    // It might be the case that the original blueprint has exceptions as well;
    // then find features of the original that are not in the exception. We
    // assume that there is only one additional exception per blueprint.
    let experimentalTarget = BLUEPRINT_EXCEPTION_TARGETS[fdname];
    if (experimentalTarget) {
        for (let featureName in experimental.features) {
            if (!features[featureName]) {
                experimental.features[featureName].only = experimentalTarget;
            }
        }
    }

    // This will only overwrite shared features which are the same anyways
    _.assign(experimental.features, features);

    // Merge appliesTo; we assume those two arrays not to intersect
    experimental.appliesTo.push(...appliesTo);
}

writeDataJSON('experimentals.json', EXPERIMENTALS);
