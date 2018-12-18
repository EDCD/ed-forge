/**
* @module Helper
*/

/**
* Ignore
*/
import CachedCalculator from "../stats/CachedCalculator";

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
 * Implements [[scaleMul]] as a cached method.
 */
export class ScaleMulCalculator extends CachedCalculator {
    get = scaleMul;
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
