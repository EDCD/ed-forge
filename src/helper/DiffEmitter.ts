/**
 * @module Helper
 */

/**
 * Ignore.
 */
import { EventEmitter } from 'events';
import { get, set, reduceRight, takeRight, flatMap, map } from 'lodash';
import { IllegalStateError } from '../errors';

/**
 * Merge a new change into old ones in situ. This ensures that the list of
 * changes is minimal and only holds mutually exclusive changes.
 * @param olds Old changes
 * @param change New change
 * @return olds
 */
function mergeDiff(olds: DiffEvent[], change: DiffEvent): DiffEvent[] {
    let { path, old } = change;
    for (let i = 0; i < olds.length;) {
        let event = olds[i];
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
export interface DiffEvent {
    /** Object path of the property that changed */
    path: string;
    /** Old property value */
    old: any;
}

/**
 * This class can emit diff events for objects. A diff event is a list of
 * [[DiffEvent]] objects that reflect a change to a certain point in the past.
 * The [[DiffEvent]] objects emitted will be merged together such that there are
 * no overlaps/no duplicate information.
 */
export default class DiffEmitter extends EventEmitter {
    _types : { [event: string]: {
        prepared: DiffEvent[],
        history: DiffEvent[][],
        source: Object,
    }} = {};

    /**
     * Add an object to be tracked. Changes can be prepared by giving the
     * respective type.
     * @param source Object to track
     * @param type Event to emit
     */
    _trackFor(source: Object, type: string) {
        if (this._types[type]) {
            throw new IllegalStateError(`Already tracking type ${type}`);
        }

        this._types[type] = { source, prepared: [], history: [] };
    }

    /**
     * Prepares a change to the source object by storing its current value and
     * preparing a [[DiffEvent]] to be emitted.
     * @param type Event name
     * @param path Path to the property that will change
     */
    _prepare(type: string, path: string) {
        let old = get(this._types[type].source, path);

        // Iterate dynamically over the queue and pop some elements
        mergeDiff(this._types[type].prepared, { path, old });
    }

    /**
     * Emits all [[DiffEvent]] objects that have been prepared for the given
     * event. If nothing has been prepared for the given event this function
     * will do nothing.
     * @param type Event name
     */
    _commit(type: string) {
        let { prepared, history } = this._types[type];
        if (prepared.length == 0) {
            return;
        }
        history.push(prepared);
        this._types[type].prepared = [];
        this.emit(type, ...prepared);
    }

    /**
     * Reverts the object `by` number of steps into history.
     * @param [by=1] Number of steps to revert
     */
    revert(type: string, by = 1) {
        let { source, history } = this._types[type];
        let changes = takeRight(history, by);
        // Reduce history to necessary changes only; reduce from right to give
        // priority to later changes in history
        let mergedChanges = reduceRight(flatMap(changes), mergeDiff, []);
        // We don't need to merge the new diffs as they're exclusive by merging
        // the history already
        let newDiffs = map(mergedChanges, event => {
            let { path, old } = event;
            let actual = get(source, path);
            set(source, path, old);
            return { path, actual };
        });
        this.emit(type, ...newDiffs);
    }

    /**
     * Clear the history of a given type's object.
     * @param type Type to clear the history for
     */
    clear(type: string) {
        this._types[type].history = [];
    }
}
