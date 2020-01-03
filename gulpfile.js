const path = require("path");
// Allow use of TS files.
require('ts-node').register({ project: path.join(__dirname, "tsconfig.json") });

const gulp = require("gulp");
const del = require("del");
const _ = require("lodash");
const spawn = require("./src/depot/spawn").spawn;
const toGulpError = require("./src/depot/gulpHelpers").toGulpError;
const os = require("./src/depot/os");


////////////////////////////////////////////////////////////////////////////////
// Default
////////////////////////////////////////////////////////////////////////////////

gulp.task("default", () => {
    const usage = [
        "Gulp tasks",
        "  clean   - Delete built and temporary files",
        "  tslint  - Run TSLint on all source files",
        // "  ut      - Run unit tests",
        "  build   - Build the toad library (does not compile scripts)",
        "  compile - Compile all TS files (src and bin)"
    ];
    console.log(usage.join("\n"));
});


////////////////////////////////////////////////////////////////////////////////
// Clean
////////////////////////////////////////////////////////////////////////////////

gulp.task("clean", () => {
    return clean();
});


function clean() {
    return del([
        "tmp/**",
        "dist/**"
    ]);
}


////////////////////////////////////////////////////////////////////////////////
// TSLint
////////////////////////////////////////////////////////////////////////////////

/**
 * This task runs TSLint on **all** ts files (both src and bin).
 */
gulp.task("tslint", function () {
    "use strict";
    const sourceGlobs = getSrcGlobs(true);
    return runTslint(true, sourceGlobs);
});


/**
 * Helper function that runs TSLint.
 * @param {boolean} rejectOnViolation - Whether the returned promise should
 * reject when a TSLint violation is encountered.  Setting this to true can be
 * used to stop the Gulp task.
 * @param {Array<string>} sourceGlobs - Globbing patterns that define the files
 * to be linted.
 * @return {Promise} A promise that is resolved when finished.  It rejects when
 * a violation is encountered and rejectOnViolation is true.
 */
function runTslint(rejectOnViolation, sourceGlobs) {
    "use strict";
    console.log("Running TSLint...");
    sourceGlobs = _.flattenDeep(sourceGlobs);

    let tslintArgs = [
        "--project", "./tsconfig.json",
        "--format", "stylish"
    ];

    // Add the globs defining source files to the list of arguments.
    tslintArgs = tslintArgs.concat(sourceGlobs);

    const tslintCmd = path.join("node_modules", ".bin", "tslint.cmd");
    return spawn(
        getTslintCmd(),
        tslintArgs,
        {cwd: __dirname}
    )
    .closePromise
    .then((stdout) => {
        console.log(stdout);
    })
    .catch((err) => {
        console.error(err.stdout);
        console.error(err.stderr);

        // If we're supposed to emit an error, then go ahead and rethrow it.
        // Otherwise, just eat it.
        if (rejectOnViolation) {
            throw toGulpError(new Error("TSLint errors found."));
        }
    });
}


////////////////////////////////////////////////////////////////////////////////
// Unit Tests
////////////////////////////////////////////////////////////////////////////////


// gulp.task("ut", () => {
//     return runUnitTests();
// });


// function runUnitTests() {
//     console.log("Running unit tests...");
//
//     const Jasmine = require("jasmine");
//     const runJasmine = require("./devLib/jasmineHelpers").runJasmine;
//
//     const jasmine = new Jasmine({});
//     const config = require("./test/ut/jasmine");
//     jasmine.loadConfig(config);
//
//     return runJasmine(jasmine)
//         .catch((err) => {
//             // Convert the normal error to a Gulp error so we don't get the annoying
//             // stack trace.
//             throw toGulpError(err);
//         });
//
// }


////////////////////////////////////////////////////////////////////////////////
// Build
////////////////////////////////////////////////////////////////////////////////

/**
 * This gulp task builds the toad library.
 */
gulp.task("build", () => {

    const sourceGlobs = getSrcGlobs(false);

    let firstError;

    return clean()
    .then(() => {
        // Do not build if there are TSLint errors.
        return runTslint(true, sourceGlobs);
    })
    .catch((err) => {
        firstError = firstError || err;
    })
    // .then(() => {
    //     return runUnitTests();
    // })
    // .catch((err) => {
    //     firstError = firstError || err;
    // })
    .then(() => {
        return compileTypeScript();
    })
    .catch((err) => {
        firstError = firstError || err;
    })
    .then(() => {
        if (firstError) {
            throw firstError;
        }
    });

});


////////////////////////////////////////////////////////////////////////////////
// Compile
////////////////////////////////////////////////////////////////////////////////

/**
 * This Gulp task compiles **all** TS files (src and bin).
 */
gulp.task("compile", () => {
    "use strict";
    const sourceGlobs = getSrcGlobs(true);

    return clean()
    .then(() => {
        // Do not build if there are TSLint errors.
        return runTslint(true, sourceGlobs);
    })
    .then(() => {
        // Everything seems ok.  Go ahead and compile.
        return compileTypeScript();
    });
});


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * Compiles TypeScript sources.
 * @return {Promise<void>} A promise that is resolved or rejected when
 * transpilation finishes.
 */
function compileTypeScript() {
    console.log("Compiling TypeScript...");

    // ./node_modules/.bin/tsc --project ./tsconfig_release.json

    const cmd = getTscCmd();

    return spawn(
        cmd,
        [
            "--project", "./tsconfig.json"
        ],
        {cwd: __dirname}
    )
    .closePromise
    .catch((err) => {
        console.error(_.trim(err.stdout + err.stderr));
        throw toGulpError(new Error("TypeScript compilation failed."));
    });
}


////////////////////////////////////////////////////////////////////////////////
// Project Management
////////////////////////////////////////////////////////////////////////////////

/**
 * Gets globbing patterns for the the toad library source files.  This does not
 * include the scripts.  For that see getBinGlobs().
 * @param includeSpecs - Whether to include unit test *.spec.ts files.
 * @return {Array<string>} An array of string globbing patterns
 */
function getSrcGlobs(includeSpecs) {
    "use strict";
    const srcGlobs = ["src/**/*.ts"];
    if (!includeSpecs) {
        srcGlobs.push("!src/**/*.spec.ts");
    }

    return srcGlobs;
}


function getTslintCmd() {
    let tslintCmd = path.join(".", "node_modules", ".bin", "tslint");
    if (os.getOs() === os.OperatingSystem.WINDOWS) {
        tslintCmd += ".cmd";
    }
    return tslintCmd;
}


function getTscCmd() {
    let tscCmd = path.join(".", "node_modules", ".bin", "tsc");
    if (os.getOs() === os.OperatingSystem.WINDOWS) {
        tscCmd += ".cmd";
    }
    return tscCmd;
}
