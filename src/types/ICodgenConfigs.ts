/**
 * Full configuration file type
 */
export interface ConfigFile {
    endpoints: EndpointEntryConfig[];
    options?: ConfigOptions;
}

/**
 * Endpoint entry in normalized configuration
 */
export interface EndpointEntryConfig {
    url: string;
    paths: string[];
}

/**
 * Configuration options for the generator
 */
export interface ConfigOptions {
    useStrictTypes: boolean;
    generateComments: boolean;
    generateJsDoc: boolean;
    indentation: number;
    cleanOutputDir: boolean;
    filesToKeep: string[];
}
