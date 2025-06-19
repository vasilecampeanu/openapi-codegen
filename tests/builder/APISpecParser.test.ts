import * as fs from "node:fs";
import * as path from "node:path";
import { APISpecParser } from "../../src/builder/APISpecParser";
import { OpenAPIDocument } from "../../src/types/ISchema";
import { getModelPathAndName } from "../../src/utils/path";

describe('APISpecParser', () => {
    let mockApiSpec: OpenAPIDocument;

    beforeEach(() => {
        const specPath = path.join(__dirname, '../mocks/authority.json');
        mockApiSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    });

    describe('discoverModelPaths', () => {
        it('should verify that GetAuthTokenRequest is among the discovered model names', () => {
            const parser = new APISpecParser(mockApiSpec);
            const modelPaths = parser.discoverModelPaths();

            const modelNames = modelPaths.map(p => getModelPathAndName(p).modelName);

            expect(modelNames).toContain('GetAuthTokenRequest');
        });
    });
});
