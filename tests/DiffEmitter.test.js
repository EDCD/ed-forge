
import DiffEmitter from '../lib/helper/DiffEmitter';
import { set, cloneDeep } from 'lodash';

const TYPE = 'event';

let o;
let e;
let cb;
beforeEach(() => {
    o = { a: { b: 0, }, };
    e = new DiffEmitter();
    e._trackFor(o, TYPE);
    cb = jest.fn(() => {});
    e.addListener(TYPE, cb);
});

function applyChanges(changes) {
    for (let change of changes) {
        e._prepare(TYPE, change[0]);
        set(o, ...change);
    }
    e._commit(TYPE);
}

test('can merge from low to high', () => {
    applyChanges([
        ['a.b', 1],
        ['a', { b: 2 }],
    ]);
    expect(cb.mock.calls[0]).toEqual([{ path: 'a', old: { b: 0 } }]);
    expect(o.a.b).toEqual(2);
});

test('can merge from high to low', () => {
    applyChanges([
        ['a', { b: 1 }],
        ['a.b', 2],
    ]);
    expect(cb.mock.calls[0]).toEqual([{ path: 'a', old: { b: 0 } }]);
    expect(o.a.b).toEqual(2);
});

test('can revert', () => {
    let org = cloneDeep(o);
    applyChanges([
        ['a', { b: 1 }],
        ['b', 0],
    ]);
    e.revert(TYPE, 2);
    expect(o).toEqual(org);
});

test('can clear', () => {
    let org = cloneDeep(o);
    applyChanges([
        [ 'a', 0 ],
    ]);
    e.clear(TYPE);
    e.revert(TYPE);
    expect(o).not.toEqual(org);
    expect(o.a).toBe(0);
});
