/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import { reduce, update } from 'lodash';

import { Ship } from '..';
import { TYPES } from '../data/slots';
import { add } from '../helper';

/**
 * Array that maps each index to the aggregated, relative draw of the respective
 * power-priority group. For example, `[0.43, 0.98, 1.02]` means that priority
 * group one draws 43% of all power generated, priority group two 98% and
 * priority groupd 102%.
 */
export type PriorityGroupsDraw = number[];

export interface IPowerMetrics {
    /** Power consumed with hardpoints deployed */
    consumed: number;
    /** Power consumption with hardpoints retracted */
    consumedRetracted: number;
    /** Power generated by the power plant */
    generated: number;
    /** Per-priority group relative power draw with hardpoints deployed */
    relativeConsumed: PriorityGroupsDraw;
    /** Per-priority group relative power draw with hardpoints retracted */
    relativeConsumedRetracted: PriorityGroupsDraw;
}

/**
 * Maps an array of per-priority group powerdraw to aggregated relative power
 * draw, i.e. index two will include the relative power draw indices zero and
 * one as well.
 * @param produced Power
 * @param groups Absolute power draw of priority groups
 * @returns Relative, aggregated power draw per priority group
 */
function absoluteToAggregatedRelative(
    produced: number,
    groups: number[],
): PriorityGroupsDraw {
    let consumed = 0;

    return reduce(
        groups,
        (aggr, groupDraw) => {
            if (!groupDraw) {
                aggr.push(undefined);
            } else {
                consumed += groupDraw;
                aggr.push(consumed / produced);
            }
            return aggr;
        },
        [],
    );
}

/**
 * Calculates power metrics for a ship.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Power metrics
 */
export function getPowerMetrics(ship: Ship, modified: boolean): IPowerMetrics {
    // TODO: Factor in guardian PD/PP combo
    const generated = ship.getPowerPlant().get('powercapacity', modified);

    let groupsDrawNoHP: number[] = [];
    let groupsDraw: number[] = [];
    for (const module of ship.getModules()) {
        const draws = module.get('powerdraw', modified);
        if (0 < draws && module.isEnabled()) {
            const priorityIndex = module.getPowerPriority();
            const updater = (val: number) => (val || 0) + draws;
            groupsDraw = update(groupsDraw, priorityIndex, updater);
            if (!module.isOnSlot(TYPES.HARDPOINT)) {
                groupsDrawNoHP = update(groupsDrawNoHP, priorityIndex, updater);
            }
        }
    }

    return {
        consumed: reduce(groupsDraw.filter(Boolean), add),
        consumedRetracted: reduce(groupsDrawNoHP.filter(Boolean), add),
        generated,
        relativeConsumed: absoluteToAggregatedRelative(generated, groupsDraw),
        relativeConsumedRetracted: absoluteToAggregatedRelative(
            generated,
            groupsDrawNoHP,
        ),
    };
}

/**
 * Retrieve all power generated by the given ship
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Total power generated
 */
export function getGenerated(ship: Ship, modified: boolean): number {
    return getPowerMetrics(ship, modified).generated;
}

/**
 * Get power draw with hardpoints deployed.
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Power draw with hardpoints deployed
 */
export function getConsumedDeployed(ship: Ship, modified: boolean): number {
    return getPowerMetrics(ship, modified).consumed;
}

/**
 * Get power draw with hardpoints retracted
 * @param ship Ship
 * @param modified True if modifications should be taken into account
 * @returns Power draw with hardpoints retracted
 */
export function getConsumedRetracted(ship: Ship, modified: boolean): number {
    return getPowerMetrics(ship, modified).consumedRetracted;
}
