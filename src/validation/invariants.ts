import Module from '../Module';
import Ship from '../Ship';

/**
 * Function that checks invariants. The invariant should satisfy an inductive
 * property as follows: If no module is given as argument, the property should
 * be checked thoroughly for all modules to serve as induction hypothesis. If
 * the module is given the function can check whether the invariant is violated
 * by the change only.
 * @param ship Ship to check the invariant for
 * @param [module] Module that changed (if any)
 * @returns Does the invariant still hold?
 */
export type Invariant = (ship: Ship, module?: Module) => boolean;

/**
 * Returns an invariant that checks that the number of a given type of modules
 * does not exceed a threshold.
 * @param type Module type to constrain
 * @param max Maximum number of matching items
 * @returns Invariant
 */
function maxChecker(type: RegExp, max: number): Invariant {
    return (ship: Ship, moduleChanged?: Module) => {
        // If this module is not of the constrained type, we don't need to check
        // the invariant because a) it was true before that latest change and b)
        // as this module has no additional item of the constrained type the
        // number of max items is ensured.
        if (moduleChanged && !moduleChanged.itemIsOfType(type)) {
            return true;
        }
        return ship.getModules(undefined, type).length <= max;
    };
}

/**
 * Returns an invariant that checks that the given type of modules can only be
 * applied to ships listed.
 * @param type Module type to constrain
 * @param allowedShips Ships that are allowed to equip this type
 */
function typeForShipChecker(type: RegExp, allowedShips: string[]): Invariant {
    return (ship: Ship, module?: Module) => {
        if (module && !module.itemIsOfType(type)) {
            return true;
        }
        return (
            !ship.getModules(undefined, type).length ||
            allowedShips.includes(ship.object.Ship)
        );
    };
}

/**
 * Returns an invariant that checks that the maximum mass value of a given type
 * of module is not lower than the ships hull mass.
 * @param type Module type to check
 * @param maxMassKey Maximum mass key
 * @returns Invariant
 */
function maxMassChecker(type: RegExp, maxMassKey: string) {
    return (ship: Ship, module: Module) => {
        if (module && !module.itemIsOfType(type)) {
            return true;
        }
        for (const matching of ship.getModules(undefined, type)) {
            if (matching.get(maxMassKey, true) < ship.readMeta('hullmass')) {
                return false;
            }
        }
        return true;
    };
}

export const LUXURY_SHIPS = ['belugaliner', 'orca', 'dolphin'];
export const SLF_SHIPS = [
    'typex_2',
    'anaconda',
    'belugaliner',
    'federation_corvette',
    'cutter',
    'krait_mkii',
    'type9_military',
    'type9',
    'federation_gunship',
    'independant_trader',
];

export const INVARIANTS: Invariant[] = [
    // Check that a ship only has one shield generator
    maxChecker(/Int_ShieldGenerator/i, 1),
    // Check that a ship only has one fuel scoop
    maxChecker(/Int_FuelScoop/i, 1),
    // Check that a ship only has detailed surface scanner
    maxChecker(/Int_DetailedSurfaceScanner/i, 1),
    // Check that a ship only has one FSD interdictor
    maxChecker(/Int_FSDInterdictor/i, 1),
    // Check that a ship only has one refinery
    maxChecker(/Int_Refinery/i, 1),
    // Check that a ship only has one docking computer
    maxChecker(/Int_DockingComputer/i, 1),
    // Check that a ship only has one supercruise assist
    maxChecker(/Int_SupercruiseAssist/i, 1),
    // Check that a ship only has one FSD booster
    maxChecker(/Int_GuardianFSDBooster/i, 1),
    // Check that the ship only has only one fighter hangar
    maxChecker(/Int_FighterBay/i, 1),
    // Check that the ship only has only one kill warrant scanner
    maxChecker(/Hpt_CrimeScanner/i, 1),
    // Check that the ship only has only one manifest scanner
    maxChecker(/Hpt_CargoScanner/i, 1),
    // Check that the ship only has only one frame shift wake scanner
    maxChecker(/Hpt_CloudScanner/i, 1),
    // Check that the ship only has only one xeno scanner
    maxChecker(/Hpt_XenoScanner/i, 1),
    // Check that the ship only has only one pulse wave analyzer
    maxChecker(/Hpt_MRAScanner/i, 1),
    // Check that a ship has not more than four experimental weapons
    (ship, module) => {
        if (module && !module.readMeta('experimental')) {
            return true;
        }
        return (
            4 >=
            ship
                .getHardpoints()
                .reduce(
                    (sum, m) => sum + (m.readMeta('experimental') ? 1 : 0),
                    0,
                )
        );
    },
    // Luxury class cabins only for Beluga, Orca and Dolphin
    typeForShipChecker(/PassengerCabin_Size\d_Class4/i, LUXURY_SHIPS),
    // Fighter hangars only for specific ships
    typeForShipChecker(/Int_FighterBay/i, SLF_SHIPS),
    // Hull mass must not exceed what thrusters are capable to handle
    maxMassChecker(/Int_Engine/i, 'enginemaximalmass'),
    // Hull mass must not exceed what shields are capable to handle
    maxMassChecker(/Int_ShieldGenerator/i, 'shieldgenmaximalmass'),
];

/**
 * Checks whether all invariants hold for the given ship.
 * @param ship Ship to check the invariant for
 * @param [module] Module that changed (if any)
 * @returns Do all invariants hold?
 */
export function checkInvariants(ship: Ship, module?: Module): boolean {
    for (const invariant of INVARIANTS) {
        if (!invariant(ship, module)) {
            return false;
        }
    }
    return true;
}
