import { API_OUTPUT_PATH } from "../../core/config";
import { ConfigOptions } from "../../types/ICodgenConfigs";
import {
    EndpointDefinition,
    EndpointParameter,
    GeneratedOutput,
} from "../../types/IGenerator";
import {
    OpenAPIDocument,
    OperationObject,
    ParameterObject,
    PathItemObject,
} from "../../types/ISchema";
import {
    buildFilePath,
    createCorrectPath,
    getModelPathAndName,
} from "../../utils/path";
import { regexFilter, sanitizePropertyName } from "../../utils/string";
import CodeBuilder from "../CodeBuilder";
import { BaseGenerator } from "./BaseGenerator";

/**
 * Generator for GET request classes
 */
export class GETRequestGenerator extends BaseGenerator {
    /**
     * Creates a new GET request generator
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
     * Generates request classes for all matching GET endpoints
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
    protected resolveEntities(pathPattern: string): EndpointDefinition[] {
        const endpoints: EndpointDefinition[] = [];

        Object.entries(this.apiSpec.paths).forEach(([path, item]) => {
            if (!item.get || !regexFilter(path, pathPattern)) return;

            const operation = item.get;

            endpoints.push({
                path,
                method: "get",
                parameters: this.extractParameters(item, operation),
                responseType: this.extractResponseTypes(operation),
                operationId: operation.operationId,
                summary: operation.summary,
                description: operation.description,
            });
        });

        return endpoints;
    }

    /**
     * Builds output for a single endpoint
     * @param endpoint - Endpoint definition
     * @param basePath - API base path
     * @returns Generated output
     */
    protected buildOutput(
        endpoint: EndpointDefinition,
        basePath: string,
    ): GeneratedOutput | null {
        const { modelPath: epPath, modelName: className } = getModelPathAndName(
            endpoint.path,
            "/",
        );

        const builder = new CodeBuilder();
        const isPdf = this.isPdfResponse(endpoint.responseType[0]);

        // Add file header
        this.addFileHeader(builder);

        // Generate imports
        const imports = this.generateImports(endpoint, isPdf);
        this.addImportStatements(builder, imports, className);

        // Generate query parameters type if needed
        if (endpoint.parameters.length) {
            this.generateQueryParamsInterface(builder, endpoint, className);
        }

        // Generate the main request class
        this.generateRequestClass(
            builder,
            endpoint,
            className,
            basePath,
            isPdf,
        );

        // Generate output file information
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

    /* ------------------------------------------------------------------ *
     *  Helper methods                                                    *
     * ------------------------------------------------------------------ */

    /**
     * Extracts and converts parameters from path item and operation
     * @param pathItem - Path item object
     * @param operation - Operation object
     * @returns Array of endpoint parameters
     */
    private extractParameters(
        pathItem: PathItemObject,
        operation: OperationObject,
    ): EndpointParameter[] {
        const parameters = [
            ...(pathItem.parameters  ?? []),
            ...(operation.parameters ?? []),
        ];

        return parameters.map((param) => this.convertParameter(param));
    }

    /**
     * Converts an OpenAPI parameter to an endpoint parameter
     * @param param - OpenAPI parameter
     * @returns Endpoint parameter
     */
    private convertParameter(param: ParameterObject): EndpointParameter {
        const isOpenApi3 = this.isOpenApi3(this.apiSpec);

        if (isOpenApi3) {
            const schema = param.schema ?? { type: "string" };
            return {
                name: param.name,
                type: { type: schema.type || "string", format: schema.format },
                isOptional: !param.required,
                description: param.description,
                in: param.in as any,
            };
        }

        return {
            name: param.name,
            type: param.type || "string",
            isOptional: !param.required,
            description: param.description,
            in: param.in as any,
        };
    }

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
     * Generates imports for an endpoint
     * @param endpoint - Endpoint definition
     * @param isPdf - Whether response is PDF
     * @returns Array of import statements
     */
    private generateImports(
        endpoint: EndpointDefinition,
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

        // Response type import
        const respType = endpoint.responseType[0];

        if (
            respType &&
            respType !== "void" &&
            !this.isPrimitiveType(respType)
        ) {
            const { modelPath, modelName } = getModelPathAndName(respType);
            imports.push({
                name: modelName,
                path: `${API_OUTPUT_PATH}/dto/${createCorrectPath(modelPath)}/${modelName}`,
            });
        }

        return imports;
    }

    /**
     * Generates query parameters interface
     * @param builder - Code builder
     * @param endpoint - Endpoint definition
     * @param className - Class name
     */
    private generateQueryParamsInterface(
        builder: CodeBuilder,
        endpoint: EndpointDefinition,
        className: string,
    ): void {
        builder.createInterface(
            {
                name: `${className}QueryParams`,
                exported: true,
                description: `Query parameters for ${className} request`,
            },
            () => {
                endpoint.parameters.forEach((param) => {
                    if (param.in !== "query" && param.in !== "path") return;

                    builder.createInterfaceProperty({
                        name: sanitizePropertyName(param.name),
                        type: this.getParameterType(param.type),
                        optional: param.isOptional,
                        description: param.description,
                    });
                });
            },
        );

        builder.appendEmptyLine();
    }

    /**
     * Generates the main request class
     * @param builder - Code builder
     * @param endpoint - Endpoint definition
     * @param className - Class name
     * @param basePath - API base path
     * @param isPdf - Whether response is PDF
     */
    private generateRequestClass(
        builder: CodeBuilder,
        endpoint: EndpointDefinition,
        className: string,
        basePath: string,
        isPdf: boolean,
    ): void {
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
                // Properties
                if (endpoint.parameters.length) {
                    builder.createProperty({
                        name: "queryParams",
                        type: `${className}QueryParams`,
                        optional: !this.options.useStrictTypes,
                        description: "Query parameters",
                    });
                    builder.appendEmptyLine();
                }

                // Constructor
                builder.createMethod(
                    {
                        name: "constructor",
                        returnType: undefined,
                    },
                    () => {
                        builder.appendLine(
                            `super('GET', '${basePath}${endpoint.path}');`,
                        );
                    },
                );
                builder.appendEmptyLine();

                // setupURL method if needed
                if (endpoint.parameters.length) {
                    this.generateSetupUrlMethod(builder, endpoint);
                }
            },
        );

        builder.appendEmptyLine();
        builder.appendLine(`export default ${className}WebServiceRequest;`);
    }

    /**
     * Generates the setupURL method
     * @param builder - Code builder
     * @param endpoint - Endpoint definition
     */
    private generateSetupUrlMethod(
        builder: CodeBuilder,
        endpoint: EndpointDefinition,
    ): void {
        builder.createMethod(
            {
                name: "setupURL",
                params: [{ name: "url", type: "URL" }],
                returnType: "void",
                description: "Appends query parameters to the URL",
            },
            () => {
                endpoint.parameters.forEach((param) => {
                    if (param.in !== "query" && param.in !== "path") return;

                    builder.appendLine(
                        `this.appendIfNotEmpty(url, '${param.name}', this.queryParams${
                            param.isOptional ? "?" : ""
                        }.${sanitizePropertyName(param.name)});`,
                    );
                });
            },
        );
    }

    /**
     * Gets TypeScript type for a parameter
     * @param paramType - Parameter type
     * @returns TypeScript type string
     */
    private getParameterType(
        paramType: string | { type: string; format?: string },
    ): string {
        return typeof paramType === "string"
            ? this.mapPrimitiveType(paramType)
            : this.mapPrimitiveType(paramType.type, paramType.format);
    }
}

export default GETRequestGenerator;
