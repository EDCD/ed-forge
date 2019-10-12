import { Ship, ShipProps } from '..';

function checkMonotonic(aggr, v) {
    const [lastV, monotonic] = aggr;
    return [v, monotonic && lastV <= v];
}

for (let { name, build } of TEST_SUITES) {
    describe(`Ship stats for ${name}`, () => {

        let ship;
        beforeEach(() => {
            ship = new Ship(build);
        });

        test('can calculate mass', () => {
            const { UNLADEN_MASS, LADEN_MASS, MAXIMUM_MASS } = ShipProps;
            expect(ship.get(UNLADEN_MASS)).not.toBeNaN();
            expect(ship.get(LADEN_MASS)).not.toBeNaN();
            expect(ship.get(MAXIMUM_MASS)).not.toBeNaN();
        });

        test('can calculate fuel/cargo capacity', () => {
            const { CARGO_CAPACITY, FUEL_CAPACITY } = ShipProps;
            expect(ship.get(CARGO_CAPACITY)).not.toBeNaN();
            expect(ship.get(FUEL_CAPACITY)).not.toBeNaN();
        });

        test('can calculate cost', () => {
            const { COST, REFUEL_COST } = ShipProps;
            expect(ship.get(COST)).not.toBeNaN();
            expect(ship.get(COST)).toBeGreaterThan(0);
            expect(ship.get(REFUEL_COST)).not.toBeNaN();
            expect(ship.get(REFUEL_COST)).toBeGreaterThan(0);
        });

        test('can calculate jump range', () => {
            const { JUMP_RANGE, TOTAL_RANGE } = ShipProps;
            expect(ship.get(JUMP_RANGE)).not.toBeNaN();
            expect(ship.get(TOTAL_RANGE)).not.toBeNaN();
        });

        test('can calculate speed metrics', () => {
            const { SPEED, YAW, ROLL, PITCH } = ShipProps;
            expect(ship.get(SPEED)).not.toBeNaN();
            expect(ship.get(YAW)).not.toBeNaN();
            expect(ship.get(ROLL)).not.toBeNaN();
            expect(ship.get(PITCH)).not.toBeNaN();
        });

        test('can calcuate shield metrics (individually)', () => {
            const { SHIELD_STRENGTH, EXPL_SHIELD_RES, EXPL_SHIELD_STRENGTH,
                KIN_SHIELD_RES, KIN_SHIELD_STRENGTH, THERM_SHIELD_RES,
                THERM_SHIELD_STRENGTH } = ShipProps;
            expect(ship.get(SHIELD_STRENGTH)).not.toBeNaN();
            expect(ship.get(EXPL_SHIELD_RES)).not.toBeNaN();
            expect(ship.get(EXPL_SHIELD_STRENGTH)).not.toBeNaN();
            expect(ship.get(KIN_SHIELD_RES)).not.toBeNaN();
            expect(ship.get(KIN_SHIELD_STRENGTH)).not.toBeNaN();
            expect(ship.get(THERM_SHIELD_RES)).not.toBeNaN();
            expect(ship.get(THERM_SHIELD_STRENGTH)).not.toBeNaN();
        });

        test('can calculate armour metrics (individually)', () => {
            const { ARMOUR, EXPL_ARMOUR_RES, EXPL_ARMOUR, KIN_ARMOUR_RES, KIN_ARMOUR,
                THERM_ARMOUR_RES, THERM_ARMOUR, CAUS_ARMOUR_RES,
                CAUS_ARMOUR } = ShipProps;
            expect(ship.get(ARMOUR)).not.toBeNaN();
            expect(ship.get(EXPL_ARMOUR_RES)).not.toBeNaN();
            expect(ship.get(EXPL_ARMOUR)).not.toBeNaN();
            expect(ship.get(KIN_ARMOUR_RES)).not.toBeNaN();
            expect(ship.get(KIN_ARMOUR)).not.toBeNaN();
            expect(ship.get(THERM_ARMOUR_RES)).not.toBeNaN();
            expect(ship.get(THERM_ARMOUR)).not.toBeNaN();
            expect(ship.get(CAUS_ARMOUR_RES)).not.toBeNaN();
            expect(ship.get(CAUS_ARMOUR)).not.toBeNaN();
        });

        test('can calculate module protection metrics (individually)', () => {
            const { MODULE_ARMOUR, MODULE_PROTECTION } = ShipProps;
            expect(ship.get(MODULE_ARMOUR)).not.toBeNaN();
            expect(ship.get(MODULE_PROTECTION)).not.toBeNaN();
        });

        test('can calculate damage metrics (individually)', () => {
            const { DPS, SDPS, EPS, DPE, HPS, ABS_DMG_PORTION, EXPL_DMG_PORTION,
                KIN_DMG_PORTION, THERM_DMG_PORTION } = ShipProps;
            expect(ship.get(DPS)).not.toBeNaN();
            expect(ship.get(SDPS)).not.toBeNaN();
            expect(ship.get(EPS)).not.toBeNaN();
            expect(ship.get(DPE)).not.toBeNaN();
            expect(ship.get(HPS)).not.toBeNaN();
            expect(ship.get(ABS_DMG_PORTION)).not.toBeNaN();
            expect(ship.get(EXPL_DMG_PORTION)).not.toBeNaN();
            expect(ship.get(KIN_DMG_PORTION)).not.toBeNaN();
            expect(ship.get(THERM_DMG_PORTION)).not.toBeNaN();
        });

        test('can calculate shield metrics', () => {
            const { SHIELD_METRICS } = ShipProps;
            expect(ship.getMetrics(SHIELD_METRICS)).toMatchObject({});
        });

        test('can calculate armour metrics', () => {
            const { ARMOUR_METRICS } = ShipProps;
            expect(ship.getMetrics(ARMOUR_METRICS)).toMatchObject({});
        });

        test('can calculate jump metrics', () => {
            const { JUMP_METRICS } = ShipProps;
            expect(ship.getMetrics(JUMP_METRICS)).toMatchObject({});
        });

        test('can calculate module protection metrics', () => {
            const { MODULE_PROTECTION_METRICS } = ShipProps;
            expect(ship.getMetrics(MODULE_PROTECTION_METRICS)).toMatchObject({});
        });

        test('can calculate damage metrics', () => {
            const { DAMAGE_METRICS } = ShipProps;
            expect(ship.getMetrics(DAMAGE_METRICS)).toMatchObject({});
        });

        test('can calculate power profile', () => {
            const {
                POWER_METRICS, PRODUCED, CONSUMED_DEPL, CONSUMED_RETR,
            } = ShipProps;
            const metrics = ship.getMetrics(POWER_METRICS);
            expect(metrics).toMatchObject({});
            expect(metrics.relativeConsumed.length).toBeGreaterThan(0);
            // Relative power consumption increases for each priority group
            expect(metrics.relativeConsumed.reduce(
                checkMonotonic, [0, true],
            )[1]).toEqual(true);
            expect(metrics.relativeConsumedRetracted.length).toBeGreaterThan(0);
            // Relative power consumption increases for each priority group
            expect(metrics.relativeConsumedRetracted.reduce(
                checkMonotonic, [0, true],
            )[1]).toEqual(true);
            expect(ship.get(PRODUCED)).toBeGreaterThan(0);
            const retracted = ship.get(CONSUMED_RETR);
            expect(retracted).toBeGreaterThan(0);
            expect(ship.get(CONSUMED_DEPL)).toBeGreaterThan(retracted);
        })
    });
}
