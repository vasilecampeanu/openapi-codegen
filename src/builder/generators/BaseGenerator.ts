import { ConfigOptions } from "../../types/ICodgenConfigs";
import { GeneratedOutput, IGenerator } from "../../types/IGenerator";
import { OpenAPIDocument, SchemaObject } from "../../types/ISchema";
import CodeBuilder from "../CodeBuilder";

/**
 * Abstract base class for all code generators
 * Provides common functionality and enforces a consistent structure
 */
export abstract class BaseGenerator implements IGenerator {
    /**
     * @param options - Configuration options for the generator
     */
    protected constructor(protected readonly options: ConfigOptions) { }

    /**
     * Main method to generate code for the specified paths
     * @param paths - Path patterns to generate code for
     * @returns Array of generated outputs
     */
    public abstract generate(paths: string | string[]): GeneratedOutput[];

    /**
     * Builds output for a single entity
     * @param entity - Entity to build output for
     * @param basePath - Base path (unused for DTOs)
     * @returns Generated output
     */
    protected abstract buildOutput(
        entity: any,
        basePath?: string,
    ): GeneratedOutput | null;

    /**
     * Resolves entities that should be processed based on path pattern
     * @param pathPattern - Path pattern to filter by
     * @returns Array of entities to process
     */
    protected abstract resolveEntities(pathPattern: string): any[];

    /* ------------------------------------------------------------------ *
     *  Shared helper utilities                                           *
     * ------------------------------------------------------------------ */

    /**
     * Adds the standard file header to the code builder
     * @param builder - Code builder instance
     */
    protected addFileHeader(builder: CodeBuilder): void {
        builder.createFileHeader()
        builder.appendEmptyLine();
    }

    /**
     * Adds import statements to a code builder
     * @param builder - Code builder instance
     * @param imports - Array of imports to add
     * @param currentName - Current model name (to avoid self-imports)
     */
    protected addImportStatements(
        builder: CodeBuilder,
        imports: Array<{ name: string; path: string; isDefault?: boolean }>,
        currentName: string,
    ): void {
        // Filter out duplicates and self-imports
        const uniqueImports = imports.filter(
            (imp, idx, arr) =>
                imp.name !== currentName &&
                arr.findIndex(
                    (i) => i.path === imp.path && i.name === imp.name,
                ) === idx,
        );

        if (uniqueImports.length > 0) {
            builder.createImports(uniqueImports);
        }
    }

    /**
     * Process a collection of paths for generation
     * @param paths - String or array of paths
     * @param processor - Function to process each path
     * @returns Combined results from all paths
     */
    protected processAllPaths<T>(
        paths: string | string[],
        processor: (path: string) => T[],
    ): T[] {
        return (Array.isArray(paths) ? paths : [paths]).flatMap(processor);
    }

    /**
     * Determines if an OpenAPI spec is v3.x
     * @param spec - API specification
     * @returns Whether the spec is OpenAPI 3.x
     */
    protected isOpenApi3(spec: OpenAPIDocument): boolean {
        return !!spec.openapi;
    }

    /**
     * Gets the base path from an API specification
     * Works for both OpenAPI 3.x and Swagger 2.0
     * @param api - API specification
     * @returns Base path string
     */
    protected getApiBasePath(api: OpenAPIDocument): string {
        if (api.openapi && api.servers?.length) {
            return api.servers[0].url;
        }
        return api.basePath || "";
    }

    /**
     * Gets the schema definitions based on OpenAPI version
     * @param spec - API specification
     * @returns Schema definitions object
     */
    protected getDefinitions(
        spec: OpenAPIDocument,
    ): Record<string, SchemaObject> {
        return this.isOpenApi3(spec)
            ? (spec.components?.schemas ?? {})
            : (spec.definitions ?? {});
    }

    /**
     * Determines if a type is a primitive TypeScript type
     * @param type - The type name to check
     * @returns Whether the type is a primitive
     */
    protected isPrimitiveType(type: string): boolean {
        return [
            "string",
            "number",
            "boolean",
            "any",
            "void",
            "Object",
            "Array",
        ].includes(type);
    }

    /**
     * Maps OpenAPI primitive types to TypeScript types
     * @param type - OpenAPI type
     * @param format - Optional format specifier
     * @returns TypeScript type
     */
    protected mapPrimitiveType(type: string, format?: string): string {
        switch (type) {
            case "integer":
            case "number":
                return "number";

            case "string":
                if (format === "date" || format === "date-time")
                    return "string";
                if (format === "binary") return "Blob";
                if (format === "byte") return "string";
                return "string";

            case "boolean":
                return "boolean";

            case "object":
                return "Record<string, any>";

            case "array":
                return "Array<any>";

            default:
                return "any";
        }
    }

    /**
     * Normalizes a schema definition to a TypeScript type
     * @param schema - Schema object to normalize
     * @returns TypeScript type name
     */
    protected normalizeSchemaType(schema: SchemaObject | undefined): string {
        if (!schema) return "void";

        if (schema.$ref) {
            return schema.$ref.substring(schema.$ref.lastIndexOf("/") + 1);
        }

        if (schema.type) {
            return `${schema.type.charAt(0).toUpperCase()}${schema.type.slice(1)}`;
        }

        return "void";
    }

    /**
     * Detects if the response type indicates a PDF
     * @param type - Response type to check
     * @returns Whether response is a PDF
     */
    protected isPdfResponse(type?: string): boolean {
        return !!type?.includes("Stream");
    }
}

export default BaseGenerator;
