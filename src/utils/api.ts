import axios from "axios";
import { OpenAPIDocument } from "../types/ISchema";
import { APISpecError } from "./error";

/**
 * Fetches OpenAPI specification from a URL
 * @param url - URL to fetch from
 * @returns OpenAPI document
 */
export async function fetchAPISpec(url: string): Promise<OpenAPIDocument> {
    try {
        console.log(`Fetching API spec from ${url}`);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw new APISpecError(
            `Failed to fetch API spec: ${error instanceof Error ? error.message : String(error)}`,
            url
        );
    }
}
