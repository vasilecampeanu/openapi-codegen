/**
 * Utility class for generating TypeScript code with proper formatting
 *
 * Provides high-level methods for common code patterns that maintain
 * consistent style and reduce duplication in generator classes.
 */
export class CodeBuilder {
    // Static configuration for application-wide indentation
    private static defaultIndentSize = 2;

    // Instance properties
    private indentLevel = 0;
    private content = "";
    private readonly indentString: string;

    /**
     * Sets the default indentation size for all CodeBuilder instances
     * @param size - Number of spaces for indentation
     */
    public static setDefaultIndentLevel(size: number): void {
        CodeBuilder.defaultIndentSize = Math.max(1, size); // Minimum 1 space
    }

    /**
     * Creates a new CodeBuilder instance
     * @param indentSize - Optional indentation size override
     */
    constructor(indentSize?: number) {
        const size = indentSize ?? CodeBuilder.defaultIndentSize;
        this.indentString = " ".repeat(size);
    }

    /**
     * Appends a line of code with proper indentation
     * @param line - The line to append
     * @returns This instance for chaining
     */
    public appendLine(line: string): this {
        const indentation = this.indentString.repeat(this.indentLevel);
        this.content += indentation + line + "\n";
        return this;
    }

    /**
     * Appends multiple lines of code with proper indentation
     * @param lines - Array of lines to append
     * @returns This instance for chaining
     */
    public appendLines(lines: string[]): this {
        lines.forEach((line) => this.appendLine(line));
        return this;
    }

    /**
     * Appends an empty line
     * @returns This instance for chaining
     */
    public appendEmptyLine(): this {
        this.content += "\n";
        return this;
    }

    /**
     * Changes indentation by the specified amount
     * @param count - Number of levels to change (positive or negative)
     * @returns This instance for chaining
     */
    public indentBy(count: number): this {
        this.indentLevel = Math.max(0, this.indentLevel + count);
        return this;
    }

    /**
     * Sets the indentation to a specific level
     * @param level - Indentation level to set
     * @returns This instance for chaining
     */
    public setIndentLevel(level: number): this {
        this.indentLevel = Math.max(0, level);
        return this;
    }

    /**
     * Builds and returns the generated code
     * @param reset - Whether to reset the builder after building (default: true)
     * @returns The generated code as a string
     */
    public build(reset: boolean = true): string {
        const result = this.content;

        if (reset) {
            this.reset();
        }

        return result;
    }

    /**
     * Resets the builder to its initial state
     * @returns This instance for chaining
     */
    public reset(): this {
        this.indentLevel = 0;
        this.content = "";
        return this;
    }

    // -------------------- Documentation Methods --------------------

    /**
     * Creates a JSDoc comment block with proper indentation
     * @param description - Main description text
     * @param tags - Optional JSDoc tags (e.g., @param, @returns)
     * @returns This instance for chaining
     */
    public createJSDocBlock(
        description?: string | string[],
        tags?: Array<{ tag: string; text: string }>,
    ): this {
        this.appendLine("/**");

        // Handle description
        if (description) {
            const descLines = Array.isArray(description)
                ? description
                : [description];
            descLines.forEach((line) => this.appendLine(` * ${line}`));

            // Add empty line before tags if both description and tags exist
            if (tags && tags.length > 0 && descLines.length > 0) {
                this.appendLine(" *");
            }
        }

        // Handle tags
        if (tags && tags.length > 0) {
            tags.forEach(({ tag, text }) => {
                this.appendLine(` * @${tag} ${text}`);
            });
        }

        this.appendLine(" */");
        return this;
    }

    /**
     * Creates a multiline comment block (non-JSDoc)
     * @param lines - Comment lines
     * @returns This instance for chaining
     */
    public createCommentBlock(lines: string[]): this {
        if (!lines || lines.length === 0) return this;

        this.appendLine("/*");
        lines.forEach((line) => this.appendLine(` * ${line}`));
        this.appendLine(" */");
        return this;
    }

    /**
     * Creates a single-line comment
     * @param text - Comment text
     * @returns This instance for chaining
     */
    public createComment(text: string): this {
        this.appendLine(`// ${text}`);
        return this;
    }

    // -------------------- File Level Methods --------------------

    /**
     * Creates a standard file header with generation notice
     * @returns This instance for chaining
     */
    public createFileHeader(): this {
        return this.createJSDocBlock([
            "This code was generated using a code generation tool.",
            "",
            "Manual changes to this file may cause unexpected behavior.",
            "Manual changes will be overwritten if the code is regenerated.",
        ]);
    }

    /**
     * Creates import statements
     * @param imports - Array of import specifications
     * @returns This instance for chaining
     */
    public createImports(
        imports: Array<{
            name: string;
            path: string;
            isDefault?: boolean;
            isTypeOnly?: boolean;
        }>,
    ): this {
        if (!imports || imports.length === 0) return this;

        // Group imports by path for better organization
        const importsByPath = new Map<
            string,
            Array<{ name: string; isDefault: boolean; isTypeOnly: boolean }>
        >();

        imports.forEach((imp) => {
            if (!importsByPath.has(imp.path)) {
                importsByPath.set(imp.path, []);
            }
            importsByPath.get(imp.path)!.push({
                name: imp.name,
                isDefault: imp.isDefault ?? false,
                isTypeOnly: imp.isTypeOnly ?? false,
            });
        });

        // Generate import statements
        importsByPath.forEach((items, path) => {
            const typePrefix = items.every((i) => i.isTypeOnly) ? "type " : "";

            // Handle default imports
            const defaultImports = items
                .filter((i) => i.isDefault)
                .map((i) => i.name);
            // Handle named imports
            const namedImports = items
                .filter((i) => !i.isDefault)
                .map((i) => i.name);

            let statement = `import ${typePrefix}`;

            if (defaultImports.length > 0) {
                statement += defaultImports.join(", ");
                if (namedImports.length > 0) {
                    statement += ", ";
                }
            }

            if (namedImports.length > 0) {
                statement += `{ ${namedImports.join(", ")} }`;
            }

            statement += ` from '${path}';`;
            this.appendLine(statement);
        });

        this.appendEmptyLine();
        return this;
    }

    // -------------------- Declaration Methods --------------------

    /**
     * Creates a code block with braces and automatic indentation
     * @param openingLine - Line before the opening brace
     * @param bodyContent - Function to generate block content
     * @returns This instance for chaining
     */
    public createBlock(openingLine: string, bodyContent?: () => void): this {
        this.appendLine(`${openingLine} {`);
        this.indentBy(1);

        if (bodyContent) {
            bodyContent();
        }

        this.indentBy(-1);
        this.appendLine("}");
        return this;
    }

    /**
     * Creates a class declaration with methods and properties
     *
     * @param options - Class options
     * @param bodyContent - Function to generate class body content
     * @returns This instance for chaining
     */
    public createClass(
        options: {
            name: string;
            exported?: boolean;
            extends?: string;
            implements?: string[];
            typeParams?: string;
            abstract?: boolean;
            description?: string;
            decorators?: string[];
        },
        bodyContent?: () => void,
    ): this {
        // Generate description
        if (options.description) {
            this.createJSDocBlock(options.description);
        }

        // Add decorators
        if (options.decorators && options.decorators.length > 0) {
            options.decorators.forEach((dec) => this.appendLine(dec));
        }

        // Build class declaration
        let declaration = "";

        if (options.abstract) {
            declaration += "abstract ";
        }

        declaration += options.exported !== false ? "export " : "";
        declaration += `class ${options.name}`;

        if (options.typeParams) {
            declaration += `<${options.typeParams}>`;
        }

        if (options.extends) {
            declaration += ` extends ${options.extends}`;
        }

        if (options.implements && options.implements.length > 0) {
            declaration += ` implements ${options.implements.join(", ")}`;
        }

        return this.createBlock(declaration, bodyContent);
    }

    /**
     * Creates a method declaration within a class
     *
     * @param options - Method options
     * @param bodyContent - Function to generate method body
     * @returns This instance for chaining
     */
    public createMethod(
        options: {
            name: string;
            params?: Array<{
                name: string;
                type: string;
                optional?: boolean;
                defaultValue?: string;
            }>;
            returnType?: string;
            access?: "public" | "private" | "protected";
            static?: boolean;
            async?: boolean;
            abstract?: boolean;
            override?: boolean;
            description?: string;
            paramDescriptions?: Record<string, string>;
            returnDescription?: string;
        },
        bodyContent?: () => void,
    ): this {
        // Generate JSDoc if needed
        if (
            options.description ||
            options.paramDescriptions ||
            options.returnDescription
        ) {
            const tags: Array<{ tag: string; text: string }> = [];

            // Add parameter descriptions
            if (options.params && options.paramDescriptions) {
                options.params.forEach((param) => {
                    if (options.paramDescriptions?.[param.name]) {
                        tags.push({
                            tag: "param",
                            text: `${param.name} - ${options.paramDescriptions[param.name]}`,
                        });
                    }
                });
            }

            // Add return description
            if (
                options.returnType &&
                options.returnType !== "void" &&
                options.returnDescription
            ) {
                tags.push({
                    tag: "returns",
                    text: options.returnDescription,
                });
            }

            this.createJSDocBlock(options.description, tags);
        }

        // Build method signature
        let signature = "";

        if (options.override) {
            signature += "override ";
        }

        if (options.access) {
            signature += `${options.access} `;
        }

        if (options.static) {
            signature += "static ";
        }

        if (options.abstract) {
            signature += "abstract ";
        }

        if (options.async) {
            signature += "async ";
        }

        signature += options.name;

        // Add parameters
        signature += "(";
        if (options.params && options.params.length > 0) {
            signature += options.params
                .map((param) => {
                    let paramStr = param.name;
                    if (param.optional) {
                        paramStr += "?";
                    }
                    paramStr += `: ${param.type}`;
                    if (param.defaultValue) {
                        paramStr += ` = ${param.defaultValue}`;
                    }
                    return paramStr;
                })
                .join(", ");
        }
        signature += ")";

        // Add return type
        if (options.returnType) {
            signature += `: ${options.returnType}`;
        }

        // Create method block
        if (options.abstract) {
            // Abstract methods don't have a body
            this.appendLine(`${signature};`);
            return this;
        } else {
            return this.createBlock(signature, bodyContent);
        }
    }

    /**
     * Creates a class property declaration
     *
     * @param options - Property options
     * @returns This instance for chaining
     */
    public createProperty(options: {
        name: string;
        type: string;
        access?: "public" | "private" | "protected";
        static?: boolean;
        readonly?: boolean;
        optional?: boolean;
        initializer?: string;
        description?: string;
        decorators?: string[];
    }): this {
        // Generate description
        if (options.description) {
            this.createJSDocBlock(options.description);
        }

        // Add decorators
        if (options.decorators && options.decorators.length > 0) {
            options.decorators.forEach((dec) => this.appendLine(dec));
        }

        // Build property declaration
        let declaration = "";

        if (options.access) {
            declaration += `${options.access} `;
        }

        if (options.static) {
            declaration += "static ";
        }

        if (options.readonly) {
            declaration += "readonly ";
        }

        declaration += options.name;

        if (options.optional) {
            declaration += "?";
        }

        declaration += `: ${options.type}`;

        if (options.initializer) {
            declaration += ` = ${options.initializer}`;
        }

        declaration += ";";
        this.appendLine(declaration);

        return this;
    }

    /**
     * Creates an interface declaration with properties and methods
     *
     * @param options - Interface options
     * @param bodyContent - Function to generate interface content
     * @returns This instance for chaining
     */
    public createInterface(
        options: {
            name: string;
            exported?: boolean;
            extends?: string[];
            typeParams?: string;
            description?: string;
        },
        bodyContent?: () => void,
    ): this {
        // Generate description
        if (options.description) {
            this.createJSDocBlock(options.description);
        }

        // Build interface declaration
        let declaration = options.exported !== false ? "export " : "";
        declaration += `interface ${options.name}`;

        if (options.typeParams) {
            declaration += `<${options.typeParams}>`;
        }

        if (options.extends && options.extends.length > 0) {
            declaration += ` extends ${options.extends.join(", ")}`;
        }

        return this.createBlock(declaration, bodyContent);
    }

    /**
     * Creates an interface property
     *
     * @param options - Property options
     * @returns This instance for chaining
     */
    public createInterfaceProperty(options: {
        name: string;
        type: string;
        optional?: boolean;
        readonly?: boolean;
        description?: string;
    }): this {
        // Generate description
        if (options.description) {
            this.createJSDocBlock(options.description);
        }

        // Build property declaration
        let declaration = "";

        if (options.readonly) {
            declaration += "readonly ";
        }

        declaration += options.name;

        if (options.optional) {
            declaration += "?";
        }

        declaration += `: ${options.type};`;
        this.appendLine(declaration);

        return this;
    }

    /**
     * Creates a type alias declaration
     *
     * @param options - Type options
     * @returns This instance for chaining
     */
    public createTypeAlias(options: {
        name: string;
        type: string;
        exported?: boolean;
        typeParams?: string;
        description?: string;
    }): this {
        // Generate description
        if (options.description) {
            this.createJSDocBlock(options.description);
        }

        // Build type declaration
        let declaration = options.exported !== false ? "export " : "";
        declaration += `type ${options.name}`;

        if (options.typeParams) {
            declaration += `<${options.typeParams}>`;
        }

        declaration += ` = ${options.type};`;
        this.appendLine(declaration);
        this.appendEmptyLine();

        return this;
    }
}

export default CodeBuilder;
