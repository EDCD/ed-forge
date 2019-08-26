
const NodeEnvironment = require('jest-environment-node');
const _ = require('lodash');
const fs = require('fs');

/**
 * This test environment loads the `suites` object from the test environment
 * configuration and stores it into the global variable `TEST_SUITES`. If any
 * string are provided at the `build` key, they are interpreted as file paths
 * pointing to a JSON which is then loaded to replace the file path.
 */
class LoadoutsEnvironment extends NodeEnvironment {
    constructor(config, context) {
        super(config, context);

        this.global.TEST_SUITES = _.map(
            config.testEnvironmentOptions.suites,
            descr => _.update(
                descr,
                'build',
                o => typeof(o) == 'string' ? JSON.parse(fs.readFileSync(o)) : o
            )
        );
    }
}
module.exports = LoadoutsEnvironment;
