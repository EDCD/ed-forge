import { DiffEvent } from "./DiffEmitter";
import { getModuleInfo } from "../data/items";
import { chain, get, keys } from 'lodash';
import { matchesAny } from ".";
import ShipCacheLine, { Dependable } from "./ShipCacheLine";

export interface ModuleDiffDescriptor {
    slot?: RegExp[];
    type?: RegExp[];
    props: string[];
}

/**
 * Checks whether two arrays don't share common elements.
 * @returns True if arrays are disjunct
 */
function disjunct<T>(array: T[], otherArray: T[]): boolean {
    if (!array.length || !otherArray.length) {
        // empty arrays are disjunct to everything
        return true;
    }
    return undefined === chain(array).intersection(otherArray).head().value();
}

const MODULE_DIFF_PATH = /Modules\.([^\.]+)\.(.+)/;

export default class ShipPropsCacheLine<T> extends ShipCacheLine<T> {
    private _diffDescriptors : ModuleDiffDescriptor[] = [];

    constructor(...dependencies: (string | ModuleDiffDescriptor | ShipCacheLine<any> | Dependable)[]) {
        super(...dependencies.filter(
            dep => dep instanceof ShipCacheLine || (typeof dep === 'object' && 'dependencies' in dep)
        ) as (ShipCacheLine<any> | Dependable)[]);

        let unconstrainedDescriptor: ModuleDiffDescriptor = { props: [] };
        dependencies.forEach(dependency => {
            if (typeof dependency === 'string') {
                unconstrainedDescriptor.props.push(dependency);
            } else if (typeof dependency === 'object' && 'props' in dependency) {
                this._diffDescriptors.push(dependency);
            }
        });
        if (unconstrainedDescriptor.props.length) {
            this._diffDescriptors.push(unconstrainedDescriptor);
        }
    }

    protected _checkDescriptors(...events: DiffEvent[]) {
        // No checks necessary if cache is not valid
        if (this._cache === undefined) {
            return;
        }

        for (let descriptor of this._diffDescriptors) {
            for (let event of events) {
                let match = event.path.match(MODULE_DIFF_PATH);
                if (!match) continue; // check only events that changed a module

                let slotChanged = match[1], modulePath = match[2].split('.');
                let pathHead = modulePath.shift();
                let { slot = [], type = [], props } = descriptor;
                if (!matchesAny(slotChanged, ...slot)) continue;

                let module = this._ship.getModule(slotChanged);
                let item = module.getItem();
                let oldItem = pathHead === 'Item' ? event.old : '';
                let moduleInfo = getModuleInfo(item);
                let modifiers = get(module._object, 'Engineering.Modifiers', []);
                if (!matchesAny(item, ...type) && (!oldItem || !matchesAny(oldItem, ...type))) continue;

                let changedProps = [];
                // Check the module property that has changed
                switch (pathHead) {
                    case 'On':
                        if (!moduleInfo.props.power) break;
                        changedProps = keys(moduleInfo.props).concat(modifiers);
                        break;
                    case 'Item':
                        // We don't need to care about whether Engineering has
                        // changed due to changing the item because this will be
                        // part of the events if it has
                        changedProps = keys(getModuleInfo(oldItem).props);
                        changedProps.push(...keys(moduleInfo.props));
                        break;
                    case 'Engineering':
                        switch (modulePath.shift()) {
                            case undefined: // event.old is Engineering object
                                changedProps = modifiers;
                                changedProps.push(...get(event.old, 'Modifiers', []));
                                break;
                            case 'Modifiers':
                                let prop;
                                switch (prop = modulePath.shift()) {
                                    case undefined: // event.old is Modifiers object
                                        changedProps = keys(event.old).concat(modifiers);
                                        break;
                                    default: // event.old is a property
                                        changedProps = [ prop ];
                                }
                                break;
                        }
                }

                if (!disjunct(props, changedProps)) {
                    this._invalidate();
                    return;
                }
            }
        }
    }
}
