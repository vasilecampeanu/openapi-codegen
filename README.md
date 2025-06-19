# OpenAPI Codegen

A TypeScript code generator that creates type-safe API clients from OpenAPI/Swagger specifications. This tool parses OpenAPI specs and generates TypeScript interfaces, DTOs, and request functions for specified endpoints.

## Features

- 🔧 **Selective Code Generation**: Generate code only for specific API endpoints
- 📝 **TypeScript Support**: Full TypeScript support with strict type checking
- 🔄 **Multiple HTTP Methods**: Supports GET and POST request generation
- 📊 **DTO Generation**: Automatically generates Data Transfer Objects from OpenAPI schemas
- 🎨 **Configurable Output**: Customizable indentation, comments, and JSDoc generation
- 🧹 **Clean Output**: Option to clean output directory and preserve specific files
- 📚 **JSDoc Comments**: Generates comprehensive documentation from OpenAPI descriptions
- ⚡ **CLI Tool**: Easy-to-use command-line interface

## Installation

This package is part of the Skillanvil monorepo and can be used as a development tool.

```bash
# Install dependencies
pnpm install

# Build the tool
pnpm run build:openapi-codegen
```

## Usage

### Command Line Interface

```bash
# Basic usage
openapi-codegen config.json

# With options
openapi-codegen config.json --clean --verbose

# Get help
openapi-codegen --help
```

### CLI Options

- `--config` - Path to configuration file (can also be provided as first argument)
- `--verbose, -v` - Enable verbose output for debugging
- `--clean` - Force cleaning output directory before generation
- `--help, -h` - Display help information

### Configuration File

Create a `config.json` file to specify which APIs and endpoints to generate code for:

```json
{
    "endpoints": [
        {
            "url": "https://api.example.com/swagger/docs/v1",
            "paths": [
                "/users/GetUser",
                "/users/CreateUser",
                "/auth/Login",
                "/auth/Logout"
            ]
        }
    ],
    "options": {
        "useStrictTypes": true,
        "generateComments": true,
        "generateJsDoc": true,
        "indentation": 4,
        "cleanOutputDir": true,
        "filesToKeep": [
            "CustomTypes.ts",
            "config.json"
        ]
    }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoints` | Array | Required | List of API endpoints to process |
| `endpoints[].url` | String | Required | OpenAPI/Swagger specification URL |
| `endpoints[].paths` | Array | Required | Specific API paths to generate code for |
| `options.useStrictTypes` | Boolean | `true` | Enable strict TypeScript type checking |
| `options.generateComments` | Boolean | `true` | Generate code comments |
| `options.generateJsDoc` | Boolean | `true` | Generate JSDoc documentation |
| `options.indentation` | Number | `4` | Number of spaces for code indentation |
| `options.cleanOutputDir` | Boolean | `false` | Clean output directory before generation |
| `options.filesToKeep` | Array | `[]` | Files to preserve when cleaning output directory |

## Generated Code Structure

The tool generates the following types of files:

### DTOs (Data Transfer Objects)
```typescript
/**
 * User information
 */
export interface UserDto {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
}
```

### Request Functions
```typescript
/**
 * Get user by ID
 * @param userId - The user ID
 * @returns Promise<UserDto>
 */
export async function getUser(userId: number): Promise<UserDto> {
    // Generated request implementation
}
```

## Development

### Scripts

- `pnpm run build:openapi-codegen` - Build the TypeScript source
- `pnpm run dev:openapi-codegen` - Run in development mode with hot reload
- `pnpm run test` - Run the test suite

### Testing

The tool includes comprehensive unit tests with Jest:

```bash
pnpm run test
```

Tests cover:
- Configuration parsing and validation
- OpenAPI specification parsing
- Code generation for different HTTP methods
- Error handling and edge cases

### Code Coverage

The project maintains high code coverage standards:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Architecture

The tool is structured into several key components:

- **`OpenAPICodeGenerator`** - Main orchestrator class
- **`APISpecParser`** - Parses OpenAPI specifications
- **`CodeBuilder`** - Utility for building TypeScript code
- **`DTOGenerator`** - Generates TypeScript interfaces from schemas
- **`GETRequestGenerator`** - Generates GET request functions
- **`POSTRequestGenerator`** - Generates POST request functions

## Error Handling

The tool provides detailed error messages for common issues:

- Invalid configuration files
- Network errors when fetching OpenAPI specs
- Invalid OpenAPI specifications
- File system errors during code generation

## Contributing

When contributing to this tool:

1. Add tests for new features
2. Maintain code coverage thresholds
3. Follow the existing TypeScript coding standards
4. Update documentation for new configuration options

## Example Workflow

1. **Identify API endpoints** you want to generate code for
2. **Create a configuration file** specifying the OpenAPI URL and specific paths
3. **Run the generator** with your configuration
4. **Import and use** the generated TypeScript code in your application

```typescript
// Import generated code
import { getUser, UserDto } from './generated/api';

// Use type-safe API calls
const user: UserDto = await getUser(123);
```

## License

Part of the Skillanvil project.
