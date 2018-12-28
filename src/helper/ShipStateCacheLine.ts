/**
 * @module Helper
 */

/**
 * Ignore.
 */
import ShipCacheLine, { Dependable } from "./ShipCacheLine";
import { DiffEvent } from "./DiffEmitter";

/**
 * Extends [[ShipCacheLine]] to listen to state changes of ships.
 */
export default class ShipStateCacheLine<T> extends ShipCacheLine<T> {
    protected _listenTo: string = 'diff-state';
    private _stateVars: string[] = [];

    /**
     * Create a new cache line and state its dependencies. When a dependency is
     * of type [[ShipCacheLine]] or [[Dependable]], behavior is the same as for
     * [[ShipCacheLine]]. If it is a string, the cache will be flushed whenever
     * a state variable named equally changes.
     * @param dependencies Dependencies that this cache relies upon
     */
    constructor(...dependencies: (string | ShipCacheLine<any> | Dependable)[]) {
        super(...dependencies.filter(
            dep => dep instanceof ShipCacheLine || (typeof dep === 'object' && 'dependencies' in dep)
        ) as (ShipCacheLine<any> | Dependable)[]);

        dependencies.forEach(dep => {
            if (typeof dep === 'string') {
                this._stateVars.push(dep);
            }
        });
    }

    /**
     * Check a list of diff events for whether the cache has to be flushed as
     * described in [[constructor]] and flush the cache accordingly.
     * @param events Events to check
     */
    protected _checkDescriptors(...events: DiffEvent[]) {
        // No checks necessary if cache is not valid
        if (this._cache === undefined) {
            return;
        }

        for (let v of this._stateVars) {
            for (let event of events) {
                if (event.path === v) {
                    this._invalidate();
                    return;
                }
            }
        }
    }


}
