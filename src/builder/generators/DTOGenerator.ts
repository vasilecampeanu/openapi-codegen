import { API_OUTPUT_PATH } from "../../core/config";
import { ConfigOptions } from "../../types/ICodgenConfigs";
import {
    GeneratedOutput,
    ImportStatement,
    ModelProperty,
} from "../../types/IGenerator";
import { SchemaObject } from "../../types/ISchema";
import {
    buildFilePath,
    createCorrectPath,
    getModelPathAndName,
} from "../../utils/path";
import { sanitizePropertyName } from "../../utils/string";
import CodeBuilder from "../CodeBuilder";
import { BaseGenerator } from "./BaseGenerator";

/**
 * Generator for Data Transfer Object (DTO) models
 */
export class DTOGenerator extends BaseGenerator {
    private readonly processedRefs = new Set<string>();
    private readonly processingStack = new Set<string>();

    /**
     * Creates a new DTO generator
     * @param definitions - Schema definitions from OpenAPI specification
     * @param options - Generator options
     */
    constructor(
        private readonly definitions: Record<string, SchemaObject>,
        options: ConfigOptions,
    ) {
        super(options);
    }

    /* ------------------------------------------------------------------ *
     *  Public API                                                        *
     * ------------------------------------------------------------------ */

    /**
     * Generates DTOs for all model references
     * @param paths - Array of model references to generate
     * @returns Array of generated outputs
     */
    public generate(paths: string | string[]): GeneratedOutput[] {
        return this.processAllPaths(paths, (path) => {
            return (output => output ? [output] : [])(this.buildOutput(path));
        });
    }

    /**
     * Resolves entities to process
     * @param pathPattern - Path pattern (not used in DTOGenerator)
     * @returns Array of entities
     */
    protected resolveEntities(pathPattern: string): string[] {
        // Not used in DTOGenerator since we process refs directly
        return [];
    }

    /**
     * Builds output for a single model reference
     * @param modelRef - Model reference to generate
     * @returns Generated output
     */
    protected buildOutput(modelRef: string): GeneratedOutput | null {
        if (this.processedRefs.has(modelRef)) return null;

        if (this.processingStack.has(modelRef)) {
            // Handle circular reference - mark as processed but don't generate
            this.processedRefs.add(modelRef);
            return null;
        }

        const { modelPath, modelName } = getModelPathAndName(modelRef);
        const definition = this.definitions[modelRef];

        if (!definition) {
            console.warn(`Definition not found for model: ${modelRef}`);
            return null;
        }

        // Mark as being processed to prevent circular references
        this.processingStack.add(modelRef);
        this.processedRefs.add(modelRef);

        const builder = new CodeBuilder();
        const imports: ImportStatement[] = [];

        try {
            /* Process inheritance with allOf */
            const inheritance = definition.allOf
                ? this.processInheritance(definition)
                : { imports: [], typeDef: "" };

            imports.push(...inheritance.imports);

            // Generate parent types first
            for (const imp of inheritance.imports) {
                const parentRef = imp.name;
                this.buildOutput(parentRef);
            }

            /* Process properties and collect needed imports */
            const { properties, imports: propImports } = this.collectProperties(definition);
            imports.push(...propImports);

            /* Generate file content */
            this.addFileHeader(builder);
            this.addImportStatements(builder, imports, modelName);

            /* Generate type/interface definition */
            if (definition.allOf) {
                this.generateTypeDefinition(
                    builder,
                    modelName,
                    properties,
                    inheritance.typeDef,
                );
            } else {
                this.generateInterfaceDefinition(
                    builder,
                    modelName,
                    properties,
                );
            }

            /* Create output object */
            const filePath = buildFilePath(
                API_OUTPUT_PATH + "/",
                "dto",
                createCorrectPath(modelPath),
                modelName,
            );

            return {
                content: builder.build(),
                path: filePath,
                filename: modelName,
            };
        } finally {
            this.processingStack.delete(modelRef);
        }
    }

    /* ------------------------------------------------------------------ *
     *  Helper methods                                                    *
     * ------------------------------------------------------------------ */

    /**
     * Processes inheritance (allOf) in schema
     * @param definition - Schema definition with allOf
     * @returns Imports and type definition for inheritance
     */
    private processInheritance(definition: SchemaObject): {
        imports: ImportStatement[];
        typeDef: string;
    } {
        const imports: ImportStatement[] = [];
        let typeDef = "";

        definition.allOf?.forEach((item) => {
            if (!item.$ref) return;

            const refPath = item.$ref.substring(item.$ref.lastIndexOf("/") + 1);
            const { modelPath, modelName } = getModelPathAndName(refPath);

            imports.push({
                name: modelName,
                path: `${API_OUTPUT_PATH}/dto/${createCorrectPath(modelPath)}/${modelName}`,
            });

            typeDef = typeDef ? `${typeDef} & ${modelName}` : modelName;
        });

        return { imports, typeDef };
    }

    /**
     * Collects properties and their imports from a schema
     * @param definition - Schema definition
     * @returns Properties and required imports
     */
    private collectProperties(definition: SchemaObject): {
        properties: ModelProperty[];
        imports: ImportStatement[];
    } {
        if (!definition.properties) return { properties: [], imports: [] };

        const properties: ModelProperty[] = [];
        const imports: ImportStatement[] = [];

        for (const [propName, schema] of Object.entries(definition.properties)) {
            const { type } = this.resolvePropertyType(schema);
            const isRequired = definition.required?.includes(propName) ?? false;
            const isNullable = schema.nullable ?? false;
            const isOptional = !isRequired || isNullable;

            // Process references
            if (schema.$ref) {
                this.addReferenceImport(schema.$ref, imports);
            } else if (schema.items?.$ref) {
                this.addReferenceImport(schema.items.$ref, imports);
            }

            properties.push({
                propertyName: sanitizePropertyName(propName),
                type,
                isOptional,
                description: schema.description,
            });
        }

        return { properties, imports };
    }

    /**
     * Adds an import for a referenced type
     * @param ref - Reference string ($ref)
     * @param imports - Import array to update
     */
    private addReferenceImport(ref: string, imports: ImportStatement[]): void {
        const refPath = ref.substring(ref.lastIndexOf("/") + 1);
        const { modelPath, modelName } = getModelPathAndName(refPath);

        imports.push({
            name: modelName,
            path: `${API_OUTPUT_PATH}/dto/${createCorrectPath(modelPath)}/${modelName}`,
        });
    }

    /**
     * Resolves a schema to a TypeScript type
     * @param schema - Schema object
     * @returns TypeScript type information
     */
    private resolvePropertyType(schema: SchemaObject): { type: string } {
        if (schema.$ref) {
            const refPath = schema.$ref.substring(schema.$ref.lastIndexOf("/") + 1);
            const { modelName } = getModelPathAndName(refPath);
            return { type: modelName };
        }

        if (schema.type === "array") {
            const itemType = schema.items?.$ref
                ? getModelPathAndName(
                    schema.items.$ref.substring(schema.items.$ref.lastIndexOf("/") + 1),
                ).modelName
                : this.mapPrimitiveType(schema.items?.type || "any");

            return { type: `${itemType}[]` };
        }

        if (schema.type === "object" && schema.additionalProperties) {
            const valueType =
                typeof schema.additionalProperties === "object"
                    ? this.resolvePropertyType(schema.additionalProperties).type
                    : "any";

            return { type: `Record<string, ${valueType}>` };
        }

        return {
            type: this.mapPrimitiveType(schema.type || "any", schema.format),
        };
    }

    /**
     * Generates an interface definition
     * @param builder - Code builder
     * @param modelName - Model name
     * @param properties - Properties to include
     */
    private generateInterfaceDefinition(
        builder: CodeBuilder,
        modelName: string,
        properties: ModelProperty[],
    ): void {
        builder.createInterface(
            {
                name: modelName,
                exported: true,
                description: `Interface representing a ${modelName} model`,
            },
            () => {
                properties.forEach((prop) => {
                    builder.createInterfaceProperty({
                        name: prop.propertyName,
                        type: prop.type,
                        optional: prop.isOptional,
                        description: prop.description,
                    });
                });
            },
        );
    }

    /**
     * Generates a type definition with inheritance
     * @param builder - Code builder
     * @param modelName - Model name
     * @param properties - Properties to include
     * @param baseType - Base type for inheritance
     */
    private generateTypeDefinition(
        builder: CodeBuilder,
        modelName: string,
        properties: ModelProperty[],
        baseType: string,
    ): void {
        if (!properties.length) {
            builder.createTypeAlias({
                name: modelName,
                type: baseType,
                exported: true,
                description: `Type representing a ${modelName} model`,
            });
            return;
        }

        // We need to create a type with an intersection
        builder.createJSDocBlock(`Type representing a ${modelName} model`);
        builder.appendLine(`export type ${modelName} = ${baseType} & {`);
        builder.indentBy(1);

        properties.forEach((prop) => {
            if (prop.description && this.options.generateJsDoc) {
                builder.createJSDocBlock(prop.description);
            }
            builder.appendLine(
                `${prop.propertyName}${prop.isOptional ? "?" : ""}: ${prop.type};`,
            );
        });

        builder.indentBy(-1);
        builder.appendLine("};");
        builder.appendEmptyLine();
    }
}

export default DTOGenerator;
