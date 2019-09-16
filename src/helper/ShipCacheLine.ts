/**
 * @module Helper
 */

/**
 * Ignore.
 */
import autoBind from 'auto-bind';
import { EventEmitter } from 'events';

import Ship from '../Ship';
import { IDiffEvent } from './DiffEmitter';

/**
 * Some object that has cache dependencies. Dependencies must emit `'flush'`
 * whenever their value changes.
 */
export interface IDependable {
    dependencies: EventEmitter[];
}

/**
 * Caches a value of type `T` for a ship. Emits a `flush` event when its cache
 * gets invalidated. Listens to events of name [[listenTo]] of ships it got a
 * value for and invalidates the cache if any value in Modules changes.
 */
export default class ShipCacheLine<T> extends EventEmitter {
    protected cache: T;
    protected ship: Ship;
    protected listenTo: string = 'diff';

    /**
     * Creates a new cache line and adds dependencies. Whenever the dependency
     * itself (in case of [[ShipCacheLine]]) or on of its dependencies (in case
     * of [[IDependable]]) changes, i.e. emits a `'flush'` event, the cache of
     * this cache line will be invalidated.
     * @param dependencies Objects that this value relies upon
     */
    constructor(...dependencies: (ShipCacheLine<any> | IDependable)[]) {
        super();
        autoBind(this);
        dependencies.forEach((dep) => {
            if (dep instanceof ShipCacheLine) {
                dep.on('flush', () => this._invalidate());
            } else {
                dep.dependencies.forEach((nestedDep) =>
                    nestedDep.on('flush', () => this._invalidate()),
                );
            }
        });
    }

    /**
     * Get or calculate and cache a value for a ship.
     * @param ship Ship to get the value for
     * @param fn Function that determines the value if the cache is invalid
     * @param args Args to `fn`
     */
    public get(ship: Ship, fn: (...args: any[]) => T, args: any[]): T {
        if (this.ship !== ship) {
            this._invalidate();
            if (this.ship) {
                this.ship.removeListener(this.listenTo, this._checkDescriptors);
            }
            if (ship) {
                ship.on(this.listenTo, this._checkDescriptors);
            }
            this.ship = ship;
        }
        if (!this.cache) {
            this.cache = fn.apply(undefined, args);
        }
        return this.cache;
    }

    /**
     * Invalidate the cache and notify other objects depending on it by emitting
     * a `'flush'` event.
     */
    protected _invalidate() {
        this.cache = undefined;
        this.emit('flush');
    }

    /**
     * Check a list of diff events for whether the cache should be flushed and
     * flushes the cache accordingly.
     * @param events List of diff events to check
     */
    protected _checkDescriptors(...events: IDiffEvent[]) {
        // No checks necessary if cache is not valid
        if (this.cache === undefined) {
            return;
        }

        for (const event of events) {
            if (event.path.startsWith('Modules')) {
                this._invalidate();
                return;
            }
        }
    }
}
