// Custom error types for better error handling
export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}

// Custom error for API specification issues
export class APISpecError extends Error {
    constructor(
        message: string,
        public readonly url: string,
    ) {
        super(message);
        this.name = "APISpecError";
    }
}

// Custom error for generation issues
export class GenerationError extends Error {
    constructor(
        message: string,
        public readonly context: string,
    ) {
        super(message);
        this.name = "GenerationError";
    }
}
