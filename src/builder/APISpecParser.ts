import {
    OpenAPIDocument,
    OperationObject,
    ParameterObject,
    PathItemObject,
    SchemaObject,
} from "../types/ISchema";
import { regexFilter } from "../utils/string";

/**
 * Parser for discovering model references in API specifications
 */
export class APISpecParser {
    private readonly isOpenApi3: boolean;
    private readonly modelRefs = new Set<string>();
    private readonly processedRefs = new Set<string>();

    /**
     * Creates a new API specification parser
     * @param apiSpec - OpenAPI specification document
     */
    constructor(private readonly apiSpec: OpenAPIDocument) {
        this.isOpenApi3 = !!apiSpec.openapi;
    }

    /**
     * Discovers all model references used in the API
     * @param pathPattern - Optional path pattern to filter endpoints
     * @returns Array of model reference paths
     */
    public discoverModelPaths(pathPattern?: string): string[] {
        // Reset internal state for new discovery
        this.modelRefs.clear();
        this.processedRefs.clear();

        // Process all matching paths
        this.processMatchingPaths(pathPattern);

        // Return discovered references
        return Array.from(this.modelRefs);
    }

    /**
     * Processes all paths matching the pattern
     * @param pathPattern - Optional path pattern
     */
    private processMatchingPaths(pathPattern?: string): void {
        const { paths } = this.apiSpec;

        // Filter paths by pattern if provided
        const pathsToProcess = pathPattern
            ? Object.entries(paths).filter(([path]) =>
                  regexFilter(path, pathPattern),
              )
            : Object.entries(paths);

        // Process each matching path
        for (const [_, pathItem] of pathsToProcess) {
            this.processPathOperations(pathItem);
        }
    }

    /**
     * Processes all operations in a path item
     * @param pathItem - Path item with operations
     */
    private processPathOperations(pathItem: PathItemObject): void {
        // Process each HTTP method if it exists
        const operations = [
            { type: "get", op: pathItem.get },
            { type: "post", op: pathItem.post },
            { type: "put", op: pathItem.put },
            { type: "delete", op: pathItem.delete },
        ];

        // Process each operation that exists
        operations
            .filter(({ op }) => op !== undefined)
            .forEach(({ op }) => this.processOperation(pathItem, op!));
    }

    /**
     * Processes an operation to extract references
     * @param pathItem - Path item
     * @param operation - Operation object
     */
    private processOperation(
        pathItem: PathItemObject,
        operation: OperationObject,
    ): void {
        // Process request models (params and body)
        this.processRequestModels(pathItem, operation);

        // Process response models
        this.processResponseModels(operation);
    }

    /**
     * Processes request parameters and body for references
     * @param pathItem - Path item
     * @param operation - Operation object
     */
    private processRequestModels(
        pathItem: PathItemObject,
        operation: OperationObject,
    ): void {
        // Combine path-level and operation-level parameters
        const parameters = [
            ...(pathItem.parameters || []),
            ...(operation.parameters || []),
        ];

        // Process each parameter
        parameters.forEach((param) => this.processParameter(param));

        // Process request body (OpenAPI 3.0)
        if (this.isOpenApi3 && operation.requestBody) {
            this.processRequestBody(operation.requestBody);
        }
    }

    /**
     * Processes a request body for references
     * @param requestBody - Request body object
     */
    private processRequestBody(requestBody: any): void {
        // Extract schemas from each content type
        Object.values(requestBody.content || {}).forEach((content) => {
            const { schema } = content as any;
            if (schema) {
                this.processSchema(schema);
            }
        });
    }

    /**
     * Processes a parameter for references
     * @param param - Parameter object
     */
    private processParameter(param: ParameterObject): void {
        if (param.schema) {
            this.processSchema(param.schema);
        }
    }

    /**
     * Processes response objects for references
     * @param operation - Operation object
     */
    private processResponseModels(operation: OperationObject): void {
        // Process each response
        Object.values(operation.responses || {}).forEach((response) => {
            if (this.isOpenApi3 && (response as any).content) {
                // OpenAPI 3.0 - process each content type
                Object.values((response as any).content || {}).forEach(
                    (content) => {
                        const { schema } = content as any;
                        if (schema) {
                            this.processSchema(schema);
                        }
                    },
                );
            } else if ((response as any).schema) {
                // Swagger 2.0 - process schema directly
                this.processSchema((response as any).schema);
            }
        });
    }

    /**
     * Processes a schema object for references
     * @param schema - Schema object
     */
    private processSchema(schema: SchemaObject): void {
        // Skip if no schema
        if (!schema) {
            return;
        }

        // Handle $ref - most important case
        if (schema.$ref) {
            const refPath = this.extractRefName(schema.$ref);
            this.addModelReference(refPath);

            // Process referenced schema to find nested references
            // Only process if we haven't already processed this reference
            if (!this.processedRefs.has(refPath)) {
                this.processReferencedSchema(refPath);
            }

            return; // Exit early after processing a reference
        }

        // Handle composite schema types
        this.processCompositeSchema(schema);
    }

    /**
     * Processes composite schema types
     * @param schema - Schema object
     */
    private processCompositeSchema(schema: SchemaObject): void {
        // Array with items
        if (schema.type === "array" && schema.items) {
            this.processSchema(schema.items);
            return;
        }

        // Process composition schemas
        const composites = [
            ...(schema.allOf || []),
            ...(schema.oneOf || []),
            ...(schema.anyOf || []),
        ];

        composites.forEach((subSchema) => this.processSchema(subSchema));

        // Handle additionalProperties for objects
        if (
            schema.additionalProperties &&
            typeof schema.additionalProperties === "object"
        ) {
            this.processSchema(schema.additionalProperties);
        }

        // Process object properties
        if (schema.properties) {
            Object.values(schema.properties).forEach((propSchema) => {
                this.processSchema(propSchema);
            });
        }
    }

    /**
     * Processes a referenced schema to find nested references
     * @param refName - Reference name
     */
    private processReferencedSchema(refName: string): void {
        // Mark this reference as processed to prevent circular references
        this.processedRefs.add(refName);

        // Get the definitions based on OpenAPI version
        const definitions = this.isOpenApi3
            ? this.apiSpec.components?.schemas || {}
            : this.apiSpec.definitions || {};

        const schema = definitions[refName];

        if (schema) {
            this.processSchema(schema);
        }
    }

    /**
     * Extracts a reference name from a $ref string
     * @param ref - Reference string ($ref)
     * @returns Reference name
     */
    private extractRefName(ref: string): string {
        return ref.substring(ref.lastIndexOf("/") + 1);
    }

    /**
     * Adds a model reference to the set
     * @param refName - Reference name
     */
    private addModelReference(refName: string): void {
        this.modelRefs.add(refName);
    }
}

export default APISpecParser;
