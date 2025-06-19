import APISpecParser from "./builder/APISpecParser";
import { CodeBuilder } from "./builder/CodeBuilder";
import DTOGenerator from "./builder/generators/DTOGenerator";
import GETRequestGenerator from "./builder/generators/GETRequestGenerator";
import POSTRequestGenerator from "./builder/generators/POSTRequestGenerator";
import { API_OUTPUT_PATH, CodegenConfig } from "./core/config";
import { EndpointEntryConfig } from "./types/ICodgenConfigs";
import { GeneratedOutput } from "./types/IGenerator";
import { OpenAPIDocument } from "./types/ISchema";
import { fetchAPISpec } from "./utils/api";
import { APISpecError, GenerationError } from "./utils/error";
import { deleteAllFiles, writeToFile } from "./utils/fileSystem";

/**
 * Main class responsible for generating TypeScript code from OpenAPI specifications
 */
export class OpenAPICodeGenerator {
    /**
     * Creates a new OpenAPI code generator with the given configuration
     */
    constructor(private readonly config: CodegenConfig) {
        // Configure global builder settings
        CodeBuilder.setDefaultIndentLevel(config.options.indentation);
    }

    /**
     * Generates code for all API endpoints in the configuration
     */
    public async generate(): Promise<void> {
        if (this.config.options.cleanOutputDir) {
            this.cleanOutputDirectory();
        }

        for (const endpoint of this.config.endpoints) {
            try {
                await this.generateForEndpoint(endpoint);
            } catch (error) {
                console.error(
                    `Error processing API ${endpoint.url}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }
    }

    /**
     * Generates code for a single API endpoint
     * @param endpoint - API endpoint configuration
     */
    private async generateForEndpoint(
        endpoint: EndpointEntryConfig,
    ): Promise<void> {
        console.log(`\nProcessing API: ${endpoint.url}`);

        try {
            // Fetch the OpenAPI specification
            const apiSpec = await fetchAPISpec(endpoint.url);

            // Process each path pattern
            for (const pathPattern of endpoint.paths) {
                await this.generateForPathPattern(apiSpec, pathPattern);
            }

            console.log(`Successfully processed API spec from ${endpoint.url}`);
        } catch (error) {
            if (error instanceof APISpecError) {
                throw error;
            }
            throw new Error(
                `Failed to process API ${endpoint.url}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Cleans the output directory before generation
     */
    private cleanOutputDirectory(): void {
        console.log(`Cleaning output directory: ${API_OUTPUT_PATH}`);

        try {
            const result = deleteAllFiles(
                API_OUTPUT_PATH + "/",
                this.config.options.filesToKeep,
            );
            console.log(
                `Removed ${result.filesRemoved} files and ${result.foldersRemoved} folders`,
            );
        } catch (error) {
            throw new Error(
                `Failed to clean output directory: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Generates code for a specific path pattern within an API
     * @param apiSpec - OpenAPI specification
     * @param pathPattern - Path pattern to generate for
     */
    private async generateForPathPattern(
        apiSpec: OpenAPIDocument,
        pathPattern: string,
    ): Promise<void> {
        console.log(`\nGenerating code for path pattern: ${pathPattern}`);

        try {
            // Create a generator factory with the API spec
            const isOpenAPI3: boolean = !!apiSpec.openapi;
            const definitions: Record<string, any> = isOpenAPI3
                ? apiSpec.components?.schemas || {}
                : apiSpec.definitions || {};

            // Step 1: Discover model references
            const modelPaths = this.discoverModels(apiSpec, pathPattern);

            // Step 2: Generate DTO models
            const dtoGenerator = new DTOGenerator(
                definitions,
                this.config.options,
            );
            const dtoOutputs = dtoGenerator.generate(modelPaths);
            console.log(`Generated ${dtoOutputs.length} DTO models`);

            // Step 3: Generate GET request classes
            const getGenerator = new GETRequestGenerator(
                apiSpec,
                this.config.options,
            );
            const getOutputs = getGenerator.generate(pathPattern);
            console.log(`Generated ${getOutputs.length} GET request classes`);

            // Step 4: Generate POST request classes
            const postGenerator = new POSTRequestGenerator(
                apiSpec,
                this.config.options,
            );
            const postOutputs = postGenerator.generate(pathPattern);
            console.log(`Generated ${postOutputs.length} POST request classes`);

            // Step 5: Write all outputs to files
            const allOutputs = [...dtoOutputs, ...getOutputs, ...postOutputs];
            this.writeOutputs(allOutputs);

            console.log(
                `Successfully generated code for pattern ${pathPattern}`,
            );
        } catch (error) {
            throw new GenerationError(
                `Error processing path pattern ${pathPattern}: ${error instanceof Error ? error.message : String(error)}`,
                pathPattern,
            );
        }
    }

    /**
     * Discovers model references in an API specification
     * @param apiSpec - OpenAPI specification
     * @param pathPattern - Path pattern to filter
     * @returns Array of model paths
     */
    private discoverModels(
        apiSpec: OpenAPIDocument,
        pathPattern: string,
    ): string[] {
        console.log("Discovering model references...");
        const apiSpecParser = new APISpecParser(apiSpec);
        const modelPaths = apiSpecParser.discoverModelPaths(pathPattern);
        console.log(`Discovered ${modelPaths.length} model references`);
        return modelPaths;
    }

    /**
     * Writes outputs to files
     * @param outputs - Generated outputs
     */
    private writeOutputs(outputs: GeneratedOutput[]): void {
        console.log(`Writing ${outputs.length} files to disk...`);

        let successCount = 0;
        let errorCount = 0;

        for (const output of outputs) {
            try {
                if (this.config.verbose) {
                    console.log(`Writing file: ${output.path}`);
                }

                writeToFile(output.path, output.content);
                successCount++;
            } catch (error) {
                console.error(
                    `Error writing file ${output.path}: ${error instanceof Error ? error.message : String(error)}`,
                );
                errorCount++;
            }
        }

        console.log(
            `Successfully wrote ${successCount} files (${errorCount} errors)`,
        );
    }
}
