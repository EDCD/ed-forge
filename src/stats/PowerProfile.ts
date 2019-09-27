/**
 * @module StatGetters
 */

/**
 * Ignore
 */
import autoBind from 'auto-bind';
import { reduce, update } from 'lodash';

import { Ship } from '..';
import { REG_HARDPOINT_SLOT } from '../data/slots';
import { add } from '../helper';
import ShipPathCacheLine from '../helper/ShipPathCacheLine';
import ShipPropsCacheLine from '../helper/ShipPropsCacheLine';

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
            consumed += groupDraw;
            aggr.push(consumed / produced);
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
function calculatePowerMetrics(ship: Ship, modified: boolean): IPowerMetrics {
    // TODO: Factor in guardian PD/PP combo
    const generated = ship.getPowerPlant().get('powercapacity', modified);

    let groupsDrawNoHP: number[] = [];
    let groupsDraw: number[] = [];
    for (const module of ship.getModules()) {
        const draws = module.get('powerdraw', modified);
        if (0 < draws && module.isEnabled()) {
            const priorityIndex = module.getPowerPriority() - 1;
            const updater = (val: number) => (val || 0) + draws;
            groupsDraw = update(groupsDraw, priorityIndex, updater);
            if (!module.object.Slot.match(REG_HARDPOINT_SLOT)) {
                groupsDrawNoHP = update(groupsDrawNoHP, priorityIndex, updater);
            }
        }
    }

    return {
        consumed: reduce(groupsDraw, add),
        consumedRetracted: reduce(groupsDrawNoHP, add),
        generated,
        relativeConsumed: absoluteToAggregatedRelative(generated, groupsDraw),
        relativeConsumedRetracted: absoluteToAggregatedRelative(
            generated,
            groupsDrawNoHP,
        ),
    };
}

export default class PowerProfile {
    private powerSettings: ShipPathCacheLine<any> = new ShipPathCacheLine(
        /Modules\.[^\.]\.object\.Priority/,
        /Modules\.[^\.]\.object\.On/,
    );
    private powerMetrics: ShipPropsCacheLine<
        IPowerMetrics
    > = new ShipPropsCacheLine(this.powerSettings, {
        props: ['powercapacity', 'powerdraw'],
    });

    constructor() {
        autoBind(this);
    }

    /**
     * Retrieve power metrics for the given ship.
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Power metrics
     */
    public getPowerMetrics(ship: Ship, modified: boolean): IPowerMetrics {
        return this.powerMetrics.get(ship, calculatePowerMetrics, [
            ship,
            modified,
        ]);
    }

    /**
     * Retrieve all power generated by the given ship
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Total power generated
     */
    public getGenerated(ship: Ship, modified: boolean): number {
        return this.getPowerMetrics(ship, modified).generated;
    }

    /**
     * Get power draw with hardpoints deployed.
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Power draw with hardpoints deployed
     */
    public getConsumedDeployed(ship: Ship, modified: boolean): number {
        return this.getPowerMetrics(ship, modified).consumed;
    }

    /**
     * Get power draw with hardpoints retracted
     * @param ship Ship
     * @param modified True if modifications should be taken into account
     * @returns Power draw with hardpoints retracted
     */
    public getConsumedRetracted(ship: Ship, modified: boolean): number {
        return this.getPowerMetrics(ship, modified).consumedRetracted;
    }
}
