#!/usr/bin/env node

/**
 * Command-line interface for OpenAPI Codegen
 *
 * This file serves as the entry point for the command-line tool.
 * It parses arguments, loads configuration, and runs the generator.
 */

import commandLineArgs from "command-line-args";
import { createConfig } from "./core/config";
import { OpenAPICodeGenerator } from "./OpenAPICodeGenerator";
import { ConfigFile } from "./types/ICodgenConfigs";
import { ConfigError } from "./utils/error";
import { readJsonFile } from "./utils/fileSystem";

/**
 * Command line options structure
 */
interface CLIOptions {
    config: string;
    verbose: boolean;
    clean: boolean;
    help: boolean;
}

/**
 * Parses command line arguments
 * @returns Parsed command line options
 */
function parseCommandLineArgs(): CLIOptions {
    const optionDefinitions = [
        { name: "config", type: String, defaultOption: true },
        { name: "verbose", alias: "v", type: Boolean, defaultValue: false },
        { name: "clean", type: Boolean, defaultValue: false },
        { name: "help", alias: "h", type: Boolean, defaultValue: false },
    ];

    try {
        const options = commandLineArgs(optionDefinitions) as CLIOptions;

        if (options.help) {
            displayHelp();
            process.exit(0);
        }

        if (!options.config) {
            throw new ConfigError(
                "Config file path is required. Use --config option or provide it as the first argument.",
            );
        }

        return options;
    } catch (error) {
        if (error instanceof ConfigError) {
            throw error;
        }
        throw new ConfigError(
            `Failed to parse command line arguments: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

/**
 * Reads and validates the configuration file
 * @param configPath - Path to the configuration file
 * @returns Parsed configuration
 */
function loadConfiguration(configPath: string): ConfigFile {
    try {
        console.log(`Reading config from ${configPath}`);
        const config = readJsonFile<ConfigFile>(configPath);

        // Validate required fields
        if (!config.endpoints || !Array.isArray(config.endpoints)) {
            throw new ConfigError("Configuration must include an 'apis' array");
        }

        return config;
    } catch (error) {
        throw new ConfigError(
            `Failed to read config file ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

/**
 * Displays help information
 */
function displayHelp(): void {
    console.log(`
        OpenAPI Codegen - TypeScript code generator for OpenAPI/Swagger specifications

        Usage:
            > openapi-codegen [options] <config-file>

        Options:
            --config        Path to configuration file (default: first argument)
            --verbose, -v   Enable verbose output
            --clean         Force cleaning output directory before generation
            --help, -h      Display this help information

        Example:
            > openapi-codegen config.json --clean --verbose
  `);
}

/**
 * Main function to run the code generator
 */
async function main(): Promise<void> {
    try {
        // Parse command line arguments
        const cliOptions = parseCommandLineArgs();

        // Load configuration file
        const configFile = loadConfiguration(cliOptions.config);

        // Create standardized config with CLI overrides
        const config = createConfig(configFile);

        // Apply CLI overrides
        config.verbose = cliOptions.verbose;

        if (cliOptions.clean) {
            config.options.cleanOutputDir = true;
        }

        // Create and run generator
        const generator = new OpenAPICodeGenerator(config);
        await generator.generate();

        console.log("\nCode generation completed successfully");
    } catch (error) {
        if (error instanceof ConfigError) {
            console.error(`Configuration Error: ${error.message}`);
            console.log("\nUse --help for usage information");
        } else {
            console.error(
                "Fatal error:",
                error instanceof Error ? error.message : String(error),
            );
        }
        process.exit(1);
    }
}

// Execute the main function
main().catch((error) => {
    console.error(
        "Unhandled error:",
        error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
});
