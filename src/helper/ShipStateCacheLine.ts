/**
 * @module Helper
 */

/**
 * Ignore.
 */
import { IDiffEvent } from './DiffEmitter';
import ShipCacheLine, { IDependable } from './ShipCacheLine';

/**
 * Extends [[ShipCacheLine]] to listen to state changes of ships.
 */
export default class ShipStateCacheLine<T> extends ShipCacheLine<T> {
    protected listenTo: string = 'diff-state';
    private stateVars: string[] = [];

    /**
     * Create a new cache line and state its dependencies. When a dependency is
     * of type [[ShipCacheLine]] or [[IDependable]], behavior is the same as for
     * [[ShipCacheLine]]. If it is a string, the cache will be flushed whenever
     * a state variable named equally changes.
     * @param dependencies Dependencies that this cache relies upon
     */
    constructor(
        ...dependencies: (string | ShipCacheLine<any> | IDependable)[]
    ) {
        super(
            ...(dependencies.filter(
                (dep) =>
                    dep instanceof ShipCacheLine ||
                    (typeof dep === 'object' && 'dependencies' in dep),
            ) as (ShipCacheLine<any> | IDependable)[]),
        );

        dependencies.forEach((dep) => {
            if (typeof dep === 'string') {
                this.stateVars.push(dep);
            }
        });
    }

    /**
     * Check a list of diff events for whether the cache has to be flushed as
     * described in [[constructor]] and flush the cache accordingly.
     * @param events Events to check
     */
    protected _checkDescriptors(...events: IDiffEvent[]) {
        // No checks necessary if cache is not valid
        if (this.cache === undefined) {
            return;
        }

        for (const v of this.stateVars) {
            for (const event of events) {
                if (event.path === v) {
                    this._invalidate();
                    return;
                }
            }
        }
    }
}
