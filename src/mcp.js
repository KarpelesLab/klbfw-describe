import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { describeApi, getApiResource, fetchDocumentation } from './api.js';

/**
 * Start an MCP server for programmatic access to the API description tool
 */
export function startMcpServer() {
  // Create MCP server with stdio transport
  const server = new McpServer({
    name: "klbfw-describe",
    version: "0.5.9",
    displayName: "KLB API Describe Tool"
  });
  
  // Register tools
  server.registerTool({
    name: "describe",
    description: "Describe an API endpoint",
    parameters: z.object({
      apiPath: z.string().min(1).describe("The API endpoint path to describe"),
      raw: z.boolean().optional().default(false).describe("Whether to show raw JSON output"),
      typescriptOutput: z.boolean().optional().default(false).describe("Whether to generate TypeScript definitions")
    }),
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
  
  server.registerTool({
    name: "get",
    description: "Perform a GET request to an API endpoint",
    parameters: z.object({
      apiPath: z.string().min(1).describe("The API endpoint path to request"),
      raw: z.boolean().optional().default(false).describe("Whether to show raw JSON output")
    }),
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
  
  server.registerTool({
    name: "documentation",
    description: "Fetch documentation from GitHub repository",
    parameters: z.object({
      fileName: z.string().optional().default('README.md').describe("The documentation file to fetch")
    }),
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
  
  // Start the MCP server with stdio transport
  const transport = new StdioServerTransport();
  server.listen(transport);
  
  return server;
}