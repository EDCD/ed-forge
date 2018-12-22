import { EventEmitter } from 'events';
import { get, set } from 'lodash';

export interface DiffEvent {
    path: string;
    old: any;
}

export default class DiffEmitter extends EventEmitter {
    _preparedEvents : { [event: string]: DiffEvent[] } = {};

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

    _commit(type: string) {
        if (!this._preparedEvents[type] || this._preparedEvents[type].length == 0) {
            return;
        }
        this.emit(type, ...this._preparedEvents[type]);
        this._preparedEvents[type] = [];
    }
}
