import { ConfigFile, ConfigOptions } from "../types/ICodgenConfigs";

/**
 * Application constants
 */
export const API_OUTPUT_PATH = "data-access/web-service";

/**
 * Default generator configuration
 */
export const DEFAULT_CONFIG: ConfigOptions = {
    indentation: 2,
    cleanOutputDir: false,
    filesToKeep: ["config.json"],
    useStrictTypes: true,
    generateComments: true,
    generateJsDoc: true,
};

/**
 * Creates a standardized configuration by merging defaults with user options
 * @param config - User-provided configuration
 * @returns Normalized configuration
 */
export function createConfig(config: ConfigFile) {
    return {
        endpoints: config.endpoints.map((endpoint) => ({
            url: endpoint.url,
            paths: endpoint.paths || [".*"],
        })),
        options: {
            ...DEFAULT_CONFIG,
            ...(config.options || {}),
        },
        verbose: false,
    };
}

/**
 * Type defining the standardized configuration
 */
export type CodegenConfig = ReturnType<typeof createConfig>;
