import { EventEmitter } from "events";
import Ship from "../Ship";
import { DiffEvent } from "./DiffEmitter";
import autoBind from 'auto-bind';

export interface Dependable {
    dependencies: EventEmitter[];
}

export default class ShipCacheLine<T> extends EventEmitter {
    protected _cache: T;
    protected _ship: Ship;
    protected _listenTo: string = 'diff';

    constructor(...dependencies: (ShipCacheLine<any> | Dependable)[]) {
        super();
        autoBind(this);
        dependencies.forEach(dep => {
            if (dep instanceof ShipCacheLine) {
                dep.on('flush', this._invalidate)
            } else {
                dep.dependencies.forEach(dep => dep.on('flush', this._invalidate));
            }
        });
    }

    protected _invalidate() {
        this._cache = undefined;
        this.emit('flush');
    }

    protected _checkDescriptors(...events: DiffEvent[]) {
        // No checks necessary if cache is not valid
        if (this._cache === undefined) {
            return;
        }

        for (let event of events) {
            if (event.path.startsWith('Modules')) {
                this._invalidate();
                return;
            }
        }
    }

    get(ship: Ship, fn: (...args: any[]) => T, args: any[]): T {
        if (this._ship != ship) {
            this._invalidate();
            this._ship.removeListener(this._listenTo, this._checkDescriptors);
            ship.on(this._listenTo, this._checkDescriptors);
            this._ship = ship;
        }
        if (!this._cache) {
            this._cache = fn.apply(undefined, args);
        }
        return this._cache;
    }
}
