import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Deletes all files and directories in a path except those specified
 * @param dirPath - The directory path to clean
 * @param ignoreMatches - Array of substrings to ignore in file paths
 * @returns Object with counts of files and folders removed
 */
export function deleteAllFiles(
    dirPath: string,
    ignoreMatches: string[] = [],
): CleanupResult {
    let filesRemoved = 0;
    let foldersRemoved = 0;

    // Skip if directory doesn't exist
    if (!fs.existsSync(dirPath)) {
        return { filesRemoved, foldersRemoved };
    }

    // Read all files in the directory
    const files = fs.readdirSync(dirPath);

    // Process each file/directory
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const isDirectory = fs.lstatSync(fullPath).isDirectory();

        if (isDirectory) {
            // Recursively clean subdirectories
            const result = deleteAllFiles(fullPath, ignoreMatches);
            filesRemoved += result.filesRemoved;
            foldersRemoved += result.foldersRemoved;
        } else if (!ignoreMatches.some(match => fullPath.includes(match))) {
            // Delete file if path does not contain any ignore match substrings
            fs.unlinkSync(fullPath);
            filesRemoved++;
        }
    }

    // Try to remove the directory if it's empty now
    if (fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
        foldersRemoved++;
    }

    return { filesRemoved, foldersRemoved };
}

/**
 * Result of deleting files and folders
 */
export interface CleanupResult {
    filesRemoved: number;
    foldersRemoved: number;
}

/**
 * Reads and parses a JSON file
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON content
 */
export function readJsonFile<T>(filePath: string): T {
    try {
        const buffer = fs.readFileSync(filePath);
        return JSON.parse(buffer.toString("utf-8")) as T;
    } catch (error) {
        console.error(`Failed to read or parse JSON file ${filePath}:`, error);
        throw error;
    }
}

/**
 * Writes content to a file, creating directories as needed
 * @param filePath - Full path to the file
 * @param content - Content to write
 */
export function writeToFile(filePath: string, content: string): void {
    try {
        const dirPath = path.dirname(filePath);
        ensureDirectoryExists(dirPath);
        fs.writeFileSync(filePath, content);
    } catch (error) {
        console.error(`Failed to write to file ${filePath}:`, error);
        throw error;
    }
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath - The directory path to ensure
 */
export function ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
