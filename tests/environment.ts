import NodeEnvironment from 'jest-environment-node';
import { map, update } from 'lodash';
import { readFileSync } from 'fs';
import { TestSuites } from './types';
import { IShipObject } from '../src/Ship';

/**
 * This test environment loads the `suites` object from the test environment
 * configuration and stores it into the global variable `TEST_SUITES`. If any
 * string are provided at the `build` key, they are interpreted as file paths
 * pointing to a JSON which is then loaded to replace the file path.
 */
export default class LoadoutsEnvironment extends NodeEnvironment {
    constructor(config) {
        super(config);

        this.global.TEST_SUITES = map(
            config.testEnvironmentOptions.suites as { name: string, build: string }[],
            descr => update(
                descr,
                'build',
                (o: string) => typeof o === 'string' ?
                    JSON.parse(readFileSync(o).toString()) as any as IShipObject :
                    o,
            )
        ) as TestSuites;
    }
}
