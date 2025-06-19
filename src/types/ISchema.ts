/**
 * OpenAPI/Swagger schema types
 * These interfaces represent OpenAPI 2.0 and 3.0 schema structures
 */

/**
 * Represents an OpenAPI document with all its components
 */
export interface OpenAPIDocument {
    swagger?: string; // OpenAPI 2.0
    openapi?: string; // OpenAPI 3.0
    info: InfoObject;
    paths: PathsObject;
    basePath?: string; // OpenAPI 2.0
    servers?: ServerObject[]; // OpenAPI 3.0
    definitions?: Record<string, SchemaObject>; // OpenAPI 2.0
    components?: ComponentsObject; // OpenAPI 3.0
}

/**
 * API information object
 */
export interface InfoObject {
    title: string;
    description?: string;
    version: string;
}

/**
 * Server object for OpenAPI 3.0
 */
export interface ServerObject {
    url: string;
    description?: string;
}

/**
 * All components for OpenAPI 3.0
 */
export interface ComponentsObject {
    schemas: Record<string, SchemaObject>;
    responses?: Record<string, ResponseObject>;
    parameters?: Record<string, ParameterObject>;
    requestBodies?: Record<string, RequestBodyObject>;
}

/**
 * All paths defined in the API
 */
export interface PathsObject {
    [path: string]: PathItemObject;
}

/**
 * A single path item with its operations
 */
export interface PathItemObject {
    get?: OperationObject;
    post?: OperationObject;
    put?: OperationObject;
    delete?: OperationObject;
    parameters?: ParameterObject[];
}

/**
 * An operation (endpoint method)
 */
export interface OperationObject {
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: ParameterObject[];
    requestBody?: RequestBodyObject; // OpenAPI 3.0
    responses: ResponsesObject;
}

/**
 * Operation parameters
 */
export interface ParameterObject {
    name: string;
    in: "path" | "query" | "header" | "cookie" | "body";
    description?: string;
    required?: boolean;
    schema?: SchemaObject;
    type?: string; // OpenAPI 2.0
    nullable?: boolean;
}

/**
 * Request body for OpenAPI 3.0
 */
export interface RequestBodyObject {
    description?: string;
    content: {
        [mediaType: string]: {
            schema: SchemaObject;
        };
    };
    required?: boolean;
}

/**
 * Operation responses
 */
export interface ResponsesObject {
    [statusCode: string]: ResponseObject;
}

/**
 * Single response definition
 */
export interface ResponseObject {
    description: string;
    content?: {
        [mediaType: string]: {
            schema: SchemaObject;
        };
    };
    schema?: SchemaObject; // OpenAPI 2.0
}

/**
 * Schema definition (model definition)
 */
export interface SchemaObject {
    type?: string;
    format?: string;
    nullable?: boolean;
    required?: string[];
    properties?: Record<string, SchemaObject>;
    additionalProperties?: SchemaObject | boolean;
    items?: SchemaObject;
    $ref?: string;
    allOf?: SchemaObject[];
    oneOf?: SchemaObject[];
    anyOf?: SchemaObject[];
    enum?: any[];
    description?: string;
}
