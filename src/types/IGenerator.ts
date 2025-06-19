/**
 * Represents an import statement for generated code
 */
export interface ImportStatement {
    name: string;
    path: string;
    isDefault?: boolean;
}

/**
 * Represents a generated model property
 */
export interface ModelProperty {
    propertyName: string;
    type: string;
    isOptional: boolean;
    description?: string;
}

/**
 * Endpoint definition for request generation
 */
export interface EndpointDefinition {
    path: string;
    method: "get" | "post" | "put" | "delete";
    parameters: EndpointParameter[];
    responseType: string[];
    operationId?: string;
    summary?: string;
    description?: string;
}

/**
 * Parameter for an endpoint
 */
export interface EndpointParameter {
    name: string;
    type: string | { type: string; format?: string };
    isOptional: boolean;
    description?: string;
    in: "path" | "query" | "header" | "body";
}

/**
 * Interface for code generators
 * Enforces a common contract for all generator implementations
 */
export interface IGenerator {
    /**
     * Generates code based on the specific generator's implementation
     * @param paths - Generator-specific input (can be model paths, path patterns, etc.)
     * @returns Array of generated outputs
     */
    generate(paths: string | string[]): GeneratedOutput[];
}

/**
 * Generator output information
 */
export interface GeneratedOutput {
    content: string;
    path: string;
    filename: string;
}
