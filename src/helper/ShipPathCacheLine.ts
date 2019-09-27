/**
 * @module Helper
 */

/**
 * Ignore.
 */
import { get } from 'lodash';

import { matchesAny } from '.';
import { IDiffEvent } from './DiffEmitter';
import ShipCacheLine, { IDependable } from './ShipCacheLine';

/**
 * Extends [[ShipCacheLine]] to listen to state changes of ships.
 */
export default class ShipPathCacheLine<T> extends ShipCacheLine<T> {
    private diffPaths: RegExp[] = [];

    /**
     * Create a new cache line and state its dependencies. When a dependency is
     * of type [[ShipCacheLine]] or [[IDependable]], behavior is the same as for
     * [[ShipCacheLine]]. If it is a string, the cache will be flushed whenever
     * some variable changes that matches one of the given regexes.
     * @param dependencies Dependencies that this cache relies upon
     */
    constructor(
        ...dependencies: (RegExp | ShipCacheLine<any> | IDependable)[]
    ) {
        super(
            ...(dependencies.filter(
                (dep) =>
                    dep instanceof ShipCacheLine ||
                    (typeof dep === 'object' && 'dependencies' in dep),
            ) as (ShipCacheLine<any> | IDependable)[]),
        );

        dependencies.forEach((dep) => {
            if (dep instanceof RegExp) {
                this.diffPaths.push(dep);
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

        for (const event of events) {
            if (
                matchesAny(event.path, ...this.diffPaths) &&
                event.old !== get(this.ship.object, event.path)
            ) {
                this._invalidate();
                return;
            }
        }
    }
}
