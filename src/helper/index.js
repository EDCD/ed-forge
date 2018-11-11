
/**
 * Check whether a string matches any of the given regular expressions.
 * @param {string} string String to match
 * @param  {...RegExp} regs Regular expressions to match against
 * @returns {boolean} True when there is some match
 */
export function matchesAny(string, ...regs) {
    for (let r of regs) {
        if (string.match(r)) {
            return true;
        }
    }
    return false;
}
