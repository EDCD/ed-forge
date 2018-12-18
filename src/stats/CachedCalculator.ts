/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { NotImplementedError } from "../errors";
import autoBind from 'auto-bind';

/**
 * Check two list of arguments for equality.
 * @param args1 First list of arguments
 * @param args2 Second list of arguments
 * @returns True if they're equal
 */
function isArgsEqual(args1: IArguments, args2: IArguments) {
    if (args1.length != args2.length) {
        return false;
    }

    for (let i in args1) {
        if (args1[i] !== args2[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Object that caches calls to its [[get]] method.
 */
export default class CachedCalculator {
    private _args: IArguments;
    private _val: any;

    constructor() {
        let getter = this.get;
        let self = this;
        this.get = function() {
            if (!isArgsEqual(self._args, arguments)) {
                self._args = arguments;
                self._val = getter.call(self, arguments);
            }
            return self._val;
        };

        autoBind(this);
    }

    /**
     * Calls to this function will be cached. If the arguments provided equal
     * the ones of the last call, the cached return value will be returned.
     * @param inputs Arguments to the function
     */
    get(...inputs: any[]): any {
        throw new NotImplementedError();
    }
}
