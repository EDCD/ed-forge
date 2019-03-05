/**
* @module Helper
*/

/**
 * Ignore.
 */
import { values } from 'lodash';
import Module from "../Module";

/**
 * Check whether a string matches any of the given regular expressions.
 * @param string String to match
 * @param regs Regular expressions to match against
 * @returns True when there is some match
 */
export function matchesAny(string: string, ...regs: RegExp[]): boolean {
    for (let r of regs) {
        if (string.match(r)) {
            return true;
        }
    }
    return false;
}

/**
 * Scale a multiplier based on it's positioning between an minimum, optimal and
 * maximum value. For example used to calculate the speed of a ship.
 * @param minMul Minimal possible multiplier
 * @param optMul Optimal multiplier
 * @param maxMul Maximum multiplier
 * @param min Minimum maximum value
 * @param opt Optimal value
 * @param max Maximum value
 * @param val Actual value
 * @returns Scaled multiplier
 */
export function scaleMul(minMul: number, optMul: number, maxMul: number,
    min: number, opt: number, max: number, val: number): number {
    let base = Math.min(1, (max - val) / (max - min));
    let exp = Math.log((optMul - minMul) / (maxMul - minMul));
    exp /= Math.log(Math.min(1, (max - opt) / (max - min)));
    return minMul + Math.pow(base, exp) * (maxMul - minMul);
}

/**
 * Apply diminishing returns to a damage multiplier starting from a threshold.
 * If the damage multiplier falls under this threshold, effects that go below
 * that are halved.
 * @param startAt When to start applying diminishing returns
 * @param multiplier Multiplier to apply diminishing returns to
 * @returns Damage multiplier with diminishing returns applied
 */
export function diminishingDamageMultiplier(startAt, multiplier) {
    if (multiplier > startAt) {
        return multiplier;
    }
    return (startAt / 2) + 0.5 * multiplier;
}

/**
 * Reduce a property for a list of modules with a given function. Only take
 * values into account that are not NaN.
 * @param modules List or map of modules to reduce props for
 * @param prop Property name
 * @param modified Should modifications be taken into account?
 * @param filters Filters to apply to the modules
 * @param fn Reduce function
 * @param initial Initial value
 * @returns Reduced value
 */
function _moduleReduce<T>(modules: Module[] | { [key: string]: Module },
    prop: string, modified: boolean, filters: Array<(Module) => boolean>,
    fn: (number, T) => T, initial: T | undefined): T {
        // apply all filters
        let props = filters.concat([m => !m.isEmpty()]).reduce(
            (mods, fn) => mods.filter(fn), values(modules)
        // get the properties
        ).map(m => m.get(prop, modified)).filter(v => !isNaN(v));
        // reduce the properties
        return props.reduce(fn, initial);
    }

/**
 * Reduce a property for a list of modules with a given function. Only take
 * values into account that are not NaN.
 * @param modules List or map of modules to reduce props for
 * @param prop Property name
 * @param modified Should modifications be taken into account?
 * @param fn Reduce function
 * @param initial Initial value
 * @returns Reduced value
 */
export function moduleReduce<T>(modules: Module[] | { [key: string]: Module },
    prop: string, modified: boolean, fn: (number, T) => T,
    initial: T | undefined): T {
        return _moduleReduce(modules, prop, modified, [], fn, initial);
    }

/**
 * Reduce a property for a list of modules with a given function. Only take
 * values into account that are not NaN and only from modules that are enabled.
 * @param modules List or map of modules to reduce props for
 * @param prop Property name
 * @param modified Should modifications be taken into account?
 * @param filters Filters to apply to the modules
 * @param fn Reduce function
 * @param initial Initial value
 * @returns Reduced value
 */
export function moduleReduceEnabled<T>(modules: Module[] | { [key: string]: Module },
    prop: string, modified: boolean, fn: (number, T) => T,
    initial: T | undefined): T {
        return _moduleReduce(
            modules, prop, modified, [m => m.isEnabled()],
            fn, initial
        );
    }

/**
 * Adds two numbers.
 * @param x One number
 * @param y Another number
 * @returns Sum
 */
export function add(x: number, y: number): number {
    return y + x;
}

/**
 * Multiplies two numbers.
 * @param x One number
 * @param y Another number
 * @return Product
 */
export function mult(x: number, y: number): number {
    return y * x;
}

/**
 * Return `y * (1 - x)`.
 * @param x Value to be complemented
 * @param y Base number
 * @returns Complementary product
 */
export function complMult(x: number, y: number): number {
    return y * (1 - x);
}
