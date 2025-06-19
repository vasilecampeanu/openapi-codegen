import * as path from "node:path";
import { camelize, replaceAll } from "./string";

/**
 * Splits a qualified model name into path and name components
 * @param model - The qualified model name (e.g., 'Namespace.Model')
 * @param divider - The character that separates path parts (default: '.')
 * @returns Object with model path and name
 */
export function getModelPathAndName(
    model: string,
    divider: string = ".",
): ModelPathAndName {
    let modelPath: string;
    let modelName: string;

    // Handle collection types (e.g. System.Collections.Generic.IEnumerable[[Model,]])
    if (model.includes("System.Collections.Generic.IEnumerable")) {
        model = model.substring(
            model.lastIndexOf("[[") + 2,
            model.indexOf(","),
        );
    }

    const lastIndex = model.lastIndexOf(divider);

    // If divider not found, the whole string is the model name
    if (lastIndex === -1) {
        modelPath = "";
        modelName = model;
    } else {
        modelPath = model.substring(0, lastIndex);
        modelName = model.substring(lastIndex + 1);
    }

    return { modelPath, modelName };
}

/**
 * Result of parsing a model path and name
 */
export interface ModelPathAndName {
    modelPath: string;
    modelName: string;
}

/**
 * Converts a model path to a correct filesystem path
 * @param modelPath - The model path (e.g., 'Namespace.SubNamespace')
 * @returns The filesystem path (e.g., 'namespace/subNamespace')
 */
export function createCorrectPath(modelPath: string): string {
    // Replace all dots with slashes
    const pathWithSlashes = replaceAll(modelPath, ".", "/");

    // Split the path and process each segment
    return pathWithSlashes
        .split("/")
        .map((segment) => {
            // If the segment is all uppercase, convert to lowercase
            if (segment === segment.toUpperCase()) {
                return segment.toLowerCase();
            } else {
                // Otherwise, camelize it (first char lowercase, rest unchanged)
                return camelize(segment);
            }
        })
        .join("/");
}

/**
 * Builds a full file path for a generated file
 * @param basePath - The base output path
 * @param category - The category (e.g., 'dto', 'request')
 * @param itemPath - The item-specific path
 * @param fileName - The file name
 * @returns The full file path
 */
export function buildFilePath(
    basePath: string,
    category: string,
    itemPath: string,
    fileName: string,
): string {
    return path.join(
        basePath,
        category,
        itemPath,
        `${fileName}.ts`, // Use .ts extension
    );
}
