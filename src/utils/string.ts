/**
 * Checks if a string matches a regular expression pattern
 * @param text - The text to check
 * @param pattern - The regex pattern to match against
 * @returns Whether the text matches the pattern
 */
export function regexFilter(text: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(text);
}

/**
 * Sanitizes a string to be used as a property name
 * @param name - The property name to sanitize
 * @returns Sanitized property name
 */
export function sanitizePropertyName(name: string): string {
    // Replace dots with underscores (common in some APIs)
    return replaceAll(name, ".", "_");
}

/**
 * Replaces all occurrences of a string with another string
 * @param text - The text to process
 * @param search - The string to find
 * @param replace - The string to replace with
 * @returns The processed text
 */
export function replaceAll(
    text: string,
    search: string,
    replace: string,
): string {
    return text.split(search).join(replace);
}

/**
 * Converts a string to camelCase
 * @param str - The string to camelize
 * @returns The camelCase string
 */
export function camelize(str: string): string {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
}
