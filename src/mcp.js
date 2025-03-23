import { MCP } from '../node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js';
import * as zod from 'zod';
import { describeApi, getApiResource, fetchDocumentation } from './api.js';

/**
 * Start an MCP server for programmatic access to the API description tool
 */
export function startMcpServer() {
  // Create MCP instance
  const mcp = new MCP();
  
  // Define schemas for input validation
  const describeSchema = zod.object({
    apiPath: zod.string().min(1),
    raw: zod.boolean().optional().default(false),
    typescriptOutput: zod.boolean().optional().default(false)
  });
  
  const getSchema = zod.object({
    apiPath: zod.string().min(1),
    raw: zod.boolean().optional().default(false)
  });
  
  const documentationSchema = zod.object({
    fileName: zod.string().optional().default('README.md')
  });
  
  // Register API methods
  mcp.registerMethod({
    name: 'describe',
    description: 'Describe an API endpoint',
    parameters: describeSchema,
    handler: async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: params.raw,
        typeScriptOutput: params.typescriptOutput,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  });
  
  mcp.registerMethod({
    name: 'get',
    description: 'Perform a GET request to an API endpoint',
    parameters: getSchema,
    handler: async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await getApiResource(params.apiPath, {
        rawOutput: params.raw,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  });
  
  mcp.registerMethod({
    name: 'documentation',
    description: 'Fetch documentation from GitHub repository',
    parameters: documentationSchema,
    handler: async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await fetchDocumentation(params.fileName, {
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  });
  
  // Start the MCP server
  mcp.listen({
    input: process.stdin,
    output: process.stdout
  });
  
  return mcp;
}