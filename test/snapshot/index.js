const Snapshot = require('./lib.js');

/**
 * @fileoverview
 * CLI for testing and generating snapshot tests.
 */

/* eslint-disable no-console */

const RESET = `\u001b[0m`;
const BOLD = '\u001b[1m';
const RED = '\u001b[31m';
const BLUE = `\u001b[34m`;
const GREEN = '\u001b[32m';
const GRAY = '\u001b[90m';

const isUpdatingSnapshots = process.argv.includes('--update');

const runSnapshotTest = async test => {
    try {
        const prefix = `### ${test}: `;

        const actualSnapshot = await Snapshot.generateActualSnapshot(test);
        const expectedSnapshot = Snapshot.getExpectedSnapshot(test);

        const result = Snapshot.compareSnapshots(expectedSnapshot, actualSnapshot);

        if (isUpdatingSnapshots) {
            if (result === 'VALID') {
                console.log(`${BOLD}${GREEN}${prefix}already matches${RESET}`);
                return 'VALID';
            }
            console.log(`${BOLD}${BLUE}### ${test}: updating${RESET}`);
            Snapshot.saveSnapshot(test, actualSnapshot);
            return 'UPDATED';
        }

        if (result === 'VALID') {
            console.log(`${BOLD}${GREEN}### ${test}: matches${RESET}`);
            return 'VALID';
        }

        if (result === 'INPUT_MODIFIED') {
            console.log(`${BOLD}${RED}### ${test}: INPUT WAS MODIFIED${RESET}`);
            return 'INPUT_MODIFIED';
        }

        if (expectedSnapshot === null) {
            console.log(`${BOLD}${BLUE}### ${test}: missing data, saving generated snapshot${RESET}`);
            Snapshot.saveSnapshot(test, actualSnapshot);
            return 'UPDATED';
        }

        console.log(`${BOLD}${RED}### ${test}: DOES NOT MATCH${RESET}`);
        console.log(`${RED}EXPECTED:\n${expectedSnapshot}${RESET}`);
        console.log(`${BLUE}GOT:\n${actualSnapshot}${RESET}`);
    } catch (e) {
        console.log(`${BOLD}${RED}### ${test}: ERROR${RESET}`);
        console.log(`${RED}${e}${RESET}`);
    }

    console.log('');
    return 'INVALID';
};

const run = async () => {
    console.log(`Running ${Snapshot.tests.length} snapshot tests.`);

    const fileToResult = {};
    for (const test of Snapshot.tests) {
        fileToResult[test] = await runSnapshotTest(test);
    }

    const getTestsByResult = r => Object.entries(fileToResult)
        .filter(i => i[1] === r)
        .map(i => i[0]);

    const passed = getTestsByResult('VALID');
    const failed = getTestsByResult('INVALID');
    const updated = getTestsByResult('UPDATED');
    const modified = getTestsByResult('INPUT_MODIFIED');

    console.log('');
    console.log(`${BOLD} === SUMMARY ===${RESET}`);
    if (passed.length) {
        console.log(`${BOLD}${GREEN}PASSED ${passed.length}${RESET}${GRAY} ${passed.join(', ')}${RESET}`);
    }
    if (failed.length) {
        console.log(`${BOLD}${RED}FAILED ${failed.length}${RESET}${GRAY} ${failed.join(', ')}${RESET}`);
    }
    if (modified.length) {
        console.log(`${BOLD}${RED}MODIFIED ${modified.length}${RESET}${GRAY} ${modified.join(', ')}${RESET}`);
    }
    if (updated.length) {
        console.log(`${BOLD}${BLUE}UPDATED ${updated.length}${RESET}${GRAY} ${updated.join(', ')}${RESET}`);
    }

    if (failed.length || modified.length) {
        console.log('');
        if (modified.length) {
            console.log(`One of the test projects have been modified, so this error is expected.`);
        }
        if (failed.length) {
            console.log(`If the compiler's behavior has changed, this failure is expected.`);
        }
        console.log(`Update snapshots with ${BOLD}node test/snapshot --update${RESET}`);
        console.log(`Review the diff in version control, then commit the updated snapshot files.`);
        process.exit(1);
    }
};

run()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
