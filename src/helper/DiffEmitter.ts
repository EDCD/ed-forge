/**
 * @module Helper
 */

/**
 * Ignore.
 */
import { EventEmitter } from 'events';
import { get, set } from 'lodash';

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
    _preparedEvents : { [event: string]: DiffEvent[] } = {};

    /**
     * Prepares a change to an object by storing its current value and
     * preparing a [[DiffEvent]] to be emitted.
     * @param type Event name
     * @param source Object that will change
     * @param path Path to the property that will change
     */
    _prepare(type: string, source: any, path: string) {
        if (!this._preparedEvents[type]) {
            this._preparedEvents[type] = [];
        }
        let old = get(source, path);

        // Iterate dynamically over the queue and pop some elements
        let queue = this._preparedEvents[type];
        for (let i = 0; i < queue.length;) {
            let event = queue[i];
            // Skip if this diff is already pending
            if (path.startsWith(event.path)) {
                return;
            // Merge and pop already existing information into a single object
            } else if (event.path.startsWith(path)) {
                set(old, event.path, event.old);
                queue.splice(i, i + 1);
            } else {
                i++;
            }
        }
        queue.push({ path, old });
    }

    /**
     * Emits all [[DiffEvent]] objects that have been prepared for the given
     * event. If nothing has been prepared for the given event this function
     * will do nothing.
     * @param type Event name
     */
    _commit(type: string) {
        if (!this._preparedEvents[type] || this._preparedEvents[type].length == 0) {
            return;
        }
        this.emit(type, ...this._preparedEvents[type]);
        this._preparedEvents[type] = [];
    }
}
