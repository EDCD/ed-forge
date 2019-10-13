/**
 * @module Helper
 */

/**
 * Ignore.
 */
import { map, mapValues, values } from 'lodash';

import Module from '../Module';

/**
 * Check whether a string matches any of the given regular expressions or equals
 * any of the given strings.
 * @param str String to match
 * @param regs Regular expressions/strings to match against
 * @returns True when there is some match
 */
export function matchesAny(str: string, ...regs: (string | RegExp)[]): boolean {
    for (const r of regs) {
        if (r instanceof RegExp) {
            if (str.match(r)) {
                return true;
            }
        } else {
            if (str === r) {
                return true;
            }
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
export function scaleMul(
    minMul: number,
    optMul: number,
    maxMul: number,
    min: number,
    opt: number,
    max: number,
    val: number,
): number {
    const base = Math.min(1, (max - val) / (max - min));
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
    return startAt / 2 + 0.5 * multiplier;
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
function _moduleReduce<T>(
    modules: Module[] | { [key: string]: Module },
    prop: string,
    modified: boolean,
    filters: ((Module) => boolean)[],
    fn: (acc: T, v: number) => T,
    initial: T | undefined,
): T {
    // apply all filters
    const props = filters
        .concat([(m) => !m.isEmpty()])
        .reduce(
            (mods, f) => mods.filter(f),
            values(modules),
            // get the properties
        )
        .map((m) => m.getClean(prop, modified))
        .filter((v) => !isNaN(v));
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
export function moduleReduce<T>(
    modules: Module[] | { [key: string]: Module },
    prop: string,
    modified: boolean,
    fn: (acc: T, v: number) => T,
    initial: T | undefined,
): T {
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
export function moduleReduceEnabled<T>(
    modules: Module[] | { [key: string]: Module },
    prop: string,
    modified: boolean,
    fn: (acc: T, v: number) => T,
    initial: T | undefined,
): T {
    return _moduleReduce(
        modules,
        prop,
        modified,
        [(m) => m.isEnabled()],
        fn,
        initial,
    );
}

/**
 * Calculate the mean of a property for a list of modules with a given function.
 * Only take values into account that are not NaN.
 * @param modules List or map of modules to reduce props for
 * @param prop Property name
 * @param modified Should modifications be taken into account?
 * @param filters Filters to apply to the modules
 * @param initial Initial value
 * @returns Mean value
 */
function _moduleMean(
    modules: Module[] | { [key: string]: Module },
    prop: string,
    modified: boolean,
    filters: ((Module) => boolean)[],
): number {
    const fn = (acc: number[], v: number): number[] => {
        const [reduced, length] = acc;
        return [reduced + v, length + 1];
    };

    const [red, len] = _moduleReduce<number[]>(
        modules,
        prop,
        modified,
        filters,
        fn,
        [0, 0],
    );
    if (len === 0) {
        return 0;
    }
    return red / len;
}

/**
 * Calculate the mean of a property for a list of modules with a given function.
 * Only take values into account that are not NaN.
 * @param modules List or map of modules to reduce props for
 * @param prop Property name
 * @param modified Should modifications be taken into account?
 * @param initial Initial value
 * @returns Mean value
 */
export function moduleMean(
    modules: Module[] | { [key: string]: Module },
    prop: string,
    modified: boolean,
): number {
    return _moduleMean(modules, prop, modified, []);
}

/**
 * Calculate the mean of a property for a list of modules with a given function.
 * Only take values into account that are not NaN and only from modules that are
 * enabled.
 * @param modules List or map of modules to reduce props for
 * @param prop Property name
 * @param modified Should modifications be taken into account?
 * @param initial Initial value
 * @returns Mean value
 */
export function moduleMeanEnabled(
    modules: Module[] | { [key: string]: Module },
    prop: string,
    modified: boolean,
): number {
    return _moduleMean(modules, prop, modified, [(m) => m.isEnabled()]);
}

/**
 * Adds two numbers.
 * @param x One number
 * @param y Another number
 * @returns Sum
 */
export function add(x: number, y: number): number {
    return x + y;
}

/**
 * Multiplies two numbers.
 * @param x One number
 * @param y Another number
 * @return Product
 */
export function mult(x: number, y: number): number {
    return x * y;
}

/**
 * Return `y * (1 - x)`.
 * @param x Value to be complemented
 * @param y Base number
 * @returns Complementary product
 */
export function complMult(x: number, y: number): number {
    return x * (1 - y);
}

/**
 * Maps all leaf-values of an object or array. `f` will only be applied to
 * values of the object that are not objects or array. If a value is an object
 * or array this function will be recursively called for that value.
 * @param obj Object to map values for
 * @param f Mapping function
 * @returns Mapped object or array
 */
export function mapValuesDeep(obj: object, f: (value: any) => any): object {
    if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return map(obj, (x) => mapValuesDeep(x, f));
        } else {
            return mapValues(obj, (x) => mapValuesDeep(x, f)) as object;
        }
    } else {
        return f(obj);
    }
}
