/**
* @module Helper
*/

/**
* Ignore
*/
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
