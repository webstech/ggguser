import { Command } from "commander";
import * as fs from "fs";
import path from "path";

const commander = new Command();

commander.version("1.0.0")
    .usage("[options]")
    .description(`Command-line helper for generating GitGitGadget style
config.  The \`-c\` parameter identifies the source file.  It may be a
javascript file, typscript converted javascript file or a json file
(with a .json extension).  The output format may be commonJS,
javascript (typescript style) or json.  All three formats are supported for
subsequent loading by the gitgitgadget utilities.  Existing values in the
config will be changed by environment variables that match the existing
config values.
`)
    .option("-c, --config <string>", "Use this configuration.", "")
    .option("-f, --format <string>", "Output format is common, ts or json.", "common")
    .option("--file <string>", "Name of new config file.", undefined)
    .parse(process.argv);

// types that can be specifed on --format parameter
type formatType = "common" | "ts" | "json";

interface ICommanderOptions {
    config: string;
    format: formatType;
    file: string | undefined;
}

const commonJSPrefix = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default =
`;

const tsPrefix = `export default
`;

const prefix = {
    common: commonJSPrefix,
    ts: tsPrefix,
    json: "",
};

const commandOptions = commander.opts<ICommanderOptions>();

// gitgitgadget is assumed to be a parallel project at this time
const fileggg = path.resolve("../gitgitgadget/build/lib/project-config.js");

(async (): Promise<void> => {
    const { loadConfig: loader } = await import(fileggg);

    const file = path.resolve(process.env.config || commandOptions.config);
    const config = await loader(file);

    // Update any overrides from environment variables of the form:
    // GITGITGADGET_<section>_<variable> in upper case.
    // Examples:
    // GITGITGADGET_LINT_MAXCOMMITS=40
    // GITGITGADGET_PROJECT_CC=["foo","bar"]

    for (const property0 in config) {
        if (config.hasOwnProperty(property0)) {

            if (typeof config[property0] === "object") {
                const child = config[property0];

                for (const property1 in child) {

                    if (child.hasOwnProperty(property1)) {
                        const key = `GITGITGADGET_${property0.toUpperCase()}_${property1.toUpperCase()}`;

                        if (process.env[key]) {
                            const value = process.env[key] as string;

                            if (typeof child[property1] === "string") {
                                config[property0][property1] = value;
                            } else {
                                config[property0][property1] = JSON.parse(value);
                            }
                        }
                    }
                }
            }
        }
    }

    const configOut = `${prefix[commandOptions.format]}${JSON.stringify(config, null, 2)}`;
    console.info(configOut);

    if (commandOptions.file) {
        const fd = fs.openSync(path.resolve(commandOptions.file), "w");

        fs.writeSync(fd, configOut);
        fs.closeSync(fd);
    }
})().catch((reason: Error) => {
    console.log(`Caught error ${reason}:\n${reason.stack}\n`);
    process.stderr.write(`Caught error ${reason}:\n${reason.stack}\n`);
    process.exit(1);
});
