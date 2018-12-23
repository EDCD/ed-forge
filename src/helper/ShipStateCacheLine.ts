import ShipCacheLine, { Dependable } from "./ShipCacheLine";
import { DiffEvent } from "./DiffEmitter";

export default class ShipStateCacheLine<T> extends ShipCacheLine<T> {
    protected _listenTo: string = 'diff-state';
    private _stateVars: string[] = [];

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
