import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { describeApi, getApiResource, fetchDocumentation } from './api.js';

/**
 * Start an MCP server for programmatic access to the API description tool
 */
export async function startMcpServer() {
  // Create an MCP server
  const server = new McpServer({
    name: "klbfw-describe",
    version: "0.5.9"
  });
  
  // Add describe tool with explicit schema
  server.tool(
    "describe",
    "Describe an API endpoint",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe"),
      raw: z.boolean().optional().default(false).describe("Whether to show raw JSON output"),
      typescriptOutput: z.boolean().optional().default(false).describe("Whether to generate TypeScript definitions")
    },
    async (params) => {
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
  );
  
  // Add get tool with explicit schema
  server.tool(
    "get",
    "Perform a GET request to an API endpoint",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to request"),
      raw: z.boolean().optional().default(false).describe("Whether to show raw JSON output")
    },
    async (params) => {
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
  );
  
  // Add documentation tool with explicit schema
  server.tool(
    "documentation",
    "Fetch documentation from GitHub repository",
    {
      fileName: z.string().optional().default('README.md').describe("The documentation file to fetch")
    },
    async (params) => {
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
  );
  
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
}