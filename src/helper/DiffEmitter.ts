/**
 * @module Helper
 */

/**
 * Ignore.
 */
import { EventEmitter } from 'events';
import { flatMap, get, map, reduceRight, set, takeRight } from 'lodash';

import { IllegalStateError } from '../errors';

/**
 * Merge a new change into old ones in situ. This ensures that the list of
 * changes is minimal and only holds mutually exclusive changes.
 * @param olds Old changes
 * @param change New change
 * @return olds
 */
function mergeDiff(olds: IDiffEvent[], change: IDiffEvent): IDiffEvent[] {
    const { path, old } = change;
    for (let i = 0; i < olds.length; ) {
        const event = olds[i];
        // Skip if this diff is already pending
        if (path.startsWith(event.path)) {
            return olds;
            // Merge and pop already existing information into a single object
        } else if (event.path.startsWith(path)) {
            set(old, event.path.substr(path.length + 1), event.old);
            olds.splice(i, i + 1);
        } else {
            i++;
        }
    }
    olds.push({ path, old });
    return olds;
}

/**
 * Reflects a change to an object.
 */
export interface IDiffEvent {
    /** Object path of the property that changed */
    path: string;
    /** Old property value */
    old: any;
}

export interface IDiffTracker {
    /** Pending changes while events have been muted */
    prepared: IDiffEvent[];
    /** History of committed changes */
    history: IDiffEvent[][];
    /**
     * Tracks number of changes in history that have not been emitted. While not
     * NaN, changes will not be emitted.
     */
    muted: number;
    /** Object to track changes for. */
    source: object;
}

/**
 * This class can emit diff events for objects. A diff event is a list of
 * [[IDiffEvent]] objects that reflect a change to a certain point in the past.
 * The [[IDiffEvent]] objects emitted will be merged together such that there
 * are no overlaps/no duplicate information.
 */
export default class DiffEmitter extends EventEmitter {
    private types: { [event: string]: IDiffTracker } = {};

    /**
     * Reverts the object `by` number of steps into history.
     * @param [by=1] Number of steps to revert
     */
    public revert(type: string, by = 1) {
        const { history, muted, source } = this.types[type];
        if (by > muted) {
            throw new IllegalStateError('Can\'t revert more steps than muted');
        } // now: muted <= by || isNaN(muted)
        const changes = takeRight(history, by);
        // Reduce history to necessary changes only; reduce from right to give
        // priority to later changes in history
        const mergedChanges = reduceRight(flatMap(changes), mergeDiff, []);
        // We don't need to merge the new diffs as they're exclusive by merging
        // the history already
        const newDiffs = map(mergedChanges, (event) => {
            const { path, old } = event;
            const actual = get(source, path);
            set(source, path, old);
            return { path, actual };
        });
        if (isNaN(muted)) {
            this.emit(type, ...newDiffs);
        }
        // muted will be >= 0 because by <= muted
        this.types[type].muted -= by;
    }

    public tryWhileMuted(type: string, cb: () => any): any {
        this.types[type].muted = 0;
        const ret = cb();
        this.revert(type, this.types[type].muted);
        this.types[type].muted = NaN;
        return ret;
    }

    /**
     * Clear the history of a given type's object.
     * @param type Type to clear the history for
     */
    public clear(type: string) {
        this.types[type].history = [];
    }

    /**
     * Add an object to be tracked. Changes can be prepared by giving the
     * respective type.
     * @param source Object to track
     * @param type Event to emit
     */
    protected _trackFor(source: object, type: string) {
        if (this.types[type]) {
            throw new IllegalStateError(`Already tracking type ${type}`);
        }

        this.types[type] = { source, prepared: [], history: [], muted: NaN };
    }

    /**
     * Prepares a change to the source object by storing its current value and
     * preparing a [[IDiffEvent]] to be emitted.
     * @param type Event name
     * @param path Path to the property that will change
     */
    protected _prepare(type: string, path: string) {
        const old = get(this.types[type].source, path);

        // Iterate dynamically over the queue and pop some elements
        mergeDiff(this.types[type].prepared, { path, old });
    }

    /**
     * Emits all [[IDiffEvent]] objects that have been prepared for the given
     * event. If nothing has been prepared for the given event this function
     * will do nothing.
     * @param type Event name
     */
    protected _commit(type: string) {
        const { prepared, history, muted } = this.types[type];
        if (prepared.length === 0) {
            return;
        }
        history.push(prepared);
        this.types[type].prepared = [];
        if (isNaN(muted)) {
            this.emit(type, ...prepared);
        } else {
            this.types[type].muted++;
        }
    }
}
