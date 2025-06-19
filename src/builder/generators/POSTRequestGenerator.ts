import { API_OUTPUT_PATH } from "../../core/config";
import { ConfigOptions } from "../../types/ICodgenConfigs";
import { EndpointDefinition, GeneratedOutput } from "../../types/IGenerator";
import { OpenAPIDocument, OperationObject } from "../../types/ISchema";
import {
    buildFilePath,
    createCorrectPath,
    getModelPathAndName,
} from "../../utils/path";
import { regexFilter } from "../../utils/string";
import CodeBuilder from "../CodeBuilder";
import { BaseGenerator } from "./BaseGenerator";

/**
 * Generator for POST request classes
 */
export class POSTRequestGenerator extends BaseGenerator {
    /**
     * Creates a new POST request generator
     * @param apiSpec - OpenAPI specification
     * @param options - Generator options
     */
    constructor(
        private readonly apiSpec: OpenAPIDocument,
        options: ConfigOptions,
    ) {
        super(options);
    }

    /* ------------------------------------------------------------------ *
     *  Public API                                                        *
     * ------------------------------------------------------------------ */

    /**
     * Generates request classes for all matching POST endpoints
     * @param paths - Path patterns to match
     * @returns Array of generated outputs
     */
    public generate(paths: string | string[]): GeneratedOutput[] {
        return this.processAllPaths(paths, (pathPattern) => {
            return this.resolveEntities(pathPattern)
                .map((endpoint) =>
                    this.buildOutput(
                        endpoint,
                        this.getApiBasePath(this.apiSpec),
                    ),
                )
                .filter((output): output is GeneratedOutput => output !== null);
        });
    }

    /**
     * Resolves endpoints that match the specified path pattern
     * @param pathPattern - Path pattern to filter by
     * @returns Array of endpoint definitions
     */
    protected resolveEntities(
        pathPattern: string,
    ): (EndpointDefinition & { requestBody?: string })[] {
        const endpoints: (EndpointDefinition & { requestBody?: string })[] = [];

        Object.entries(this.apiSpec.paths).forEach(([path, item]) => {
            if (!item.post || !regexFilter(path, pathPattern)) return;

            const operation = item.post;

            endpoints.push({
                path,
                method: "post",
                parameters: [],
                responseType: this.extractResponseTypes(operation),
                operationId: operation.operationId,
                summary: operation.summary,
                description: operation.description,
                requestBody: this.extractRequestBodyType(operation),
            });
        });

        return endpoints;
    }

    /**
     * Builds output for a single endpoint
     * @param endpoint - Endpoint definition with optional requestBody
     * @param basePath - API base path
     * @returns Generated output
     */
    protected buildOutput(
        endpoint: EndpointDefinition & { requestBody?: string },
        basePath: string,
    ): GeneratedOutput | null {
        // For POST endpoints with a request body, use payload generator
        if (endpoint.requestBody) {
            return this.buildEndpointWithPayload(endpoint, basePath);
        }

        // For simple POST endpoints without a request body
        return this.buildSimpleEndpoint(endpoint, basePath);
    }

    /* ------------------------------------------------------------------ *
     *  Helper methods                                                    *
     * ------------------------------------------------------------------ */

    /**
     * Extracts possible response types from an operation
     * @param operation - Operation object
     * @returns Array of response type names
     */
    private extractResponseTypes(operation: OperationObject): string[] {
        const types: string[] = [];
        const isOpenApi3 = this.isOpenApi3(this.apiSpec);

        for (const resp of Object.values(operation.responses)) {
            if (isOpenApi3 && (resp as any).content) {
                for (const media of Object.values((resp as any).content)) {
                    const schema = (media as any).schema;
                    types.push(this.normalizeSchemaType(schema));
                }
            } else if ((resp as any).schema) {
                types.push(this.normalizeSchemaType((resp as any).schema));
            } else {
                types.push("void");
            }
        }

        return types;
    }

    /**
     * Extracts request body type reference from an operation
     * @param operation - Operation object
     * @returns Request body type reference or undefined
     */
    private extractRequestBodyType(
        operation: OperationObject,
    ): string | undefined {
        // OpenAPI 3.0 style
        if (this.isOpenApi3(this.apiSpec) && operation.requestBody) {
            for (const media of Object.values(
                (operation.requestBody as any).content,
            )) {
                const schema = (media as any).schema;
                if (schema?.$ref) {
                    return schema.$ref.substring(
                        schema.$ref.lastIndexOf("/") + 1,
                    );
                }
            }
        }

        // Swagger 2.0 style
        if (!this.isOpenApi3(this.apiSpec)) {
            for (const param of operation.parameters ?? []) {
                if (param.in === "body" && (param as any).schema?.$ref) {
                    return (param as any).schema.$ref.substring(
                        (param as any).schema.$ref.lastIndexOf("/") + 1,
                    );
                }
            }
        }

        return undefined;
    }

    /**
     * Builds an endpoint with request body (payload)
     * @param endpoint - Endpoint definition
     * @param basePath - API base path
     * @returns Generated output
     */
    private buildEndpointWithPayload(
        endpoint: EndpointDefinition & { requestBody?: string },
        basePath: string,
    ): GeneratedOutput {
        const { modelPath: epPath, modelName: className } = getModelPathAndName(
            endpoint.path,
            "/",
        );

        const builder = new CodeBuilder();
        const isPdf = this.isPdfResponse(endpoint.responseType[0]);

        // Add file header
        this.addFileHeader(builder);

        // Generate imports
        const imports = this.generateImportsWithPayload(endpoint, isPdf);
        this.addImportStatements(builder, imports, className);

        // Generate class
        this.generateWithPayloadClass(
            builder,
            endpoint,
            className,
            basePath,
            isPdf,
        );

        // Create output file information
        const apiName = basePath.substring(basePath.lastIndexOf("/") + 1);
        const outputPath = buildFilePath(
            API_OUTPUT_PATH + "/",
            "request/" + createCorrectPath(apiName),
            createCorrectPath(epPath),
            `${className}WebServiceRequest`,
        );

        return {
            content: builder.build(),
            path: outputPath,
            filename: `${className}WebServiceRequest`,
        };
    }

    /**
     * Builds a simple endpoint without request body
     * @param endpoint - Endpoint definition
     * @param basePath - API base path
     * @returns Generated output
     */
    private buildSimpleEndpoint(
        endpoint: EndpointDefinition,
        basePath: string,
    ): GeneratedOutput {
        const { modelPath: epPath, modelName: className } = getModelPathAndName(
            endpoint.path,
            "/",
        );

        const builder = new CodeBuilder();
        const isPdf = this.isPdfResponse(endpoint.responseType[0]);

        // Add file header
        this.addFileHeader(builder);

        // Add base import
        const baseImport = isPdf
            ? "PdfWebServiceRequest"
            : "JsonWebServiceRequest";
        builder.createImports([
            {
                name: baseImport,
                path: "data-access/data-service/" + baseImport,
                isDefault: true,
            },
        ]);

        // Generate class
        const baseClass = isPdf
            ? baseImport
            : `${baseImport}<${endpoint.responseType[0] || "any"}>`;

        builder.createClass(
            {
                name: `${className}WebServiceRequest`,
                extends: baseClass,
                exported: true,
                description: `Request class for ${endpoint.path}`,
            },
            () => {
                // Constructor
                builder.createMethod(
                    {
                        name: "constructor",
                        returnType: undefined,
                    },
                    () => {
                        builder.appendLine(
                            `super('POST', '${basePath}${endpoint.path}');`,
                        );
                    },
                );
                builder.appendEmptyLine();

                // Empty setupBody method
                builder.createMethod(
                    {
                        name: "setupBody",
                        params: [{ name: "body", type: "Record<string, any>" }],
                        returnType: "void",
                        description: "Sets up request body",
                    },
                    () => {
                        // Empty method - no parameters to set
                    },
                );
            },
        );

        builder.appendEmptyLine();
        builder.appendLine(`export default ${className}WebServiceRequest;`);

        // Create output file information
        const apiName = basePath.substring(basePath.lastIndexOf("/") + 1);
        const outputPath = buildFilePath(
            API_OUTPUT_PATH + "/",
            "request/" + createCorrectPath(apiName),
            createCorrectPath(epPath),
            `${className}WebServiceRequest`,
        );

        return {
            content: builder.build(),
            path: outputPath,
            filename: `${className}WebServiceRequest`,
        };
    }

    /**
     * Generates imports for endpoint with payload (request body)
     * @param endpoint - Endpoint definition with requestBody
     * @param isPdf - Whether response is PDF
     * @returns Array of import statements
     */
    private generateImportsWithPayload(
        endpoint: EndpointDefinition & { requestBody?: string },
        isPdf: boolean,
    ): Array<{ name: string; path: string; isDefault?: boolean }> {
        const imports: Array<{
            name: string;
            path: string;
            isDefault?: boolean;
        }> = [];

        // Base class import
        const baseImport = isPdf
            ? "PdfWebServiceRequest"
            : "JsonWebServiceRequest";
        imports.push({
            name: baseImport,
            path: `data-access/data-service/${baseImport}`,
            isDefault: true,
        });

        // Request DTO import
        if (endpoint.requestBody) {
            const { modelPath: reqPath, modelName: reqName } =
                getModelPathAndName(endpoint.requestBody);
            imports.push({
                name: reqName,
                path: `${API_OUTPUT_PATH}/dto/${createCorrectPath(reqPath)}/${reqName}`,
            });
        }

        // Response type import
        const respType = endpoint.responseType[0];
        if (
            respType &&
            respType !== "void" &&
            !this.isPrimitiveType(respType)
        ) {
            const { modelPath: resPath, modelName: resName } =
                getModelPathAndName(respType);

            // Only add if not the same as request
            if (
                !endpoint.requestBody ||
                getModelPathAndName(endpoint.requestBody).modelName !== resName
            ) {
                imports.push({
                    name: resName,
                    path: `${API_OUTPUT_PATH}/dto/${createCorrectPath(resPath)}/${resName}`,
                });
            }
        }

        return imports;
    }

    /**
     * Generates class definition for endpoint with payload (request body)
     * @param builder - Code builder
     * @param endpoint - Endpoint definition
     * @param className - Class name
     * @param basePath - API base path
     * @param isPdf - Whether response is PDF
     */
    private generateWithPayloadClass(
        builder: CodeBuilder,
        endpoint: EndpointDefinition & { requestBody?: string },
        className: string,
        basePath: string,
        isPdf: boolean,
    ): void {
        // Response type handling
        const respType = endpoint.responseType[0];
        let responseDTOName: string | undefined;

        if (
            respType &&
            respType !== "void" &&
            !this.isPrimitiveType(respType)
        ) {
            const { modelName } = getModelPathAndName(respType);
            responseDTOName = modelName;
        }

        // Request type handling
        const { modelName: reqName } = getModelPathAndName(
            endpoint.requestBody!,
        );

        // Base class definition
        const baseClass = isPdf
            ? "PdfWebServiceRequest"
            : `JsonWebServiceRequest<${responseDTOName ?? "any"}>`;

        builder.createClass(
            {
                name: `${className}WebServiceRequest`,
                extends: baseClass,
                exported: true,
                description: `Request class for ${endpoint.path}`,
            },
            () => {
                // Data property
                builder.createProperty({
                    name: "data",
                    type: reqName,
                    optional: !this.options.useStrictTypes,
                    description: "Request data",
                });
                builder.appendEmptyLine();

                // Constructor
                builder.createMethod(
                    {
                        name: "constructor",
                        returnType: undefined,
                    },
                    () => {
                        builder.appendLine(
                            `super('POST', '${basePath}${endpoint.path}');`,
                        );
                    },
                );
                builder.appendEmptyLine();

                // setupBody method
                this.generateSetupBodyMethod(builder, endpoint.requestBody!);
            },
        );

        builder.appendEmptyLine();
        builder.appendLine(`export default ${className}WebServiceRequest;`);
    }

    /**
     * Generates setupBody method for complex endpoint
     * @param builder - Code builder
     * @param requestBodyType - Request body type reference
     */
    private generateSetupBodyMethod(
        builder: CodeBuilder,
        requestBodyType: string,
    ): void {
        const definitions = this.getDefinitions(this.apiSpec);
        const schema = definitions[requestBodyType];

        builder.createMethod(
            {
                name: "setupBody",
                params: [{ name: "body", type: "Record<string, any>" }],
                returnType: "void",
                description: "Sets up request body",
            },
            () => {
                if (schema?.properties) {
                    for (const propName of Object.keys(schema.properties)) {
                        builder.appendLine(
                            `this.setIfNotEmpty(body, '${propName}', this.data.${propName});`,
                        );
                    }
                }
            },
        );
    }
}

export default POSTRequestGenerator;
