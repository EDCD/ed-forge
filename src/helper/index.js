
export function matchesAny(string, ...regs) {
    for (let r of regs) {
        if (string.match(r)) {
            return true;
        }
    }
    return false;
}
