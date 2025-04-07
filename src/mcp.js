import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { describeApi, getApiResource, fetchDocumentation, fetchDocFileList } from './api.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Start an MCP server for programmatic access to the API description tool
 */
export async function startMcpServer() {
  // Get package version dynamically from package.json
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  // Create an MCP server
  const server = new McpServer({
    name: "klbfw-describe",
    version: packageJson.version
  }, {
    capabilities: {
      resources: {}
    }
  });
  
  // Add describe tool with explicit schema
  server.tool(
    "describe",
    "Describe an API endpoint by its path with formatted output",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: false,
        typeScriptOutput: false,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { content: [{ type: "text", text: output }] };
    }
  );
  
  // Add describe_raw tool with explicit schema
  server.tool(
    "describe_raw",
    "Obtain the raw json output description of an API",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: true,
        typeScriptOutput: false,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { content: [{ type: "text", text: output }] };
    }
  );
  
  // Add produce_ts tool with explicit schema
  server.tool(
    "produce_ts",
    "Generate TypeScript definitions for an API endpoint",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to generate TypeScript for")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: false,
        typeScriptOutput: true,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { content: [{ type: "text", text: output }] };
    }
  );
  
  // Add get tool with explicit schema
  server.tool(
    "get",
    "Perform a GET request to an API endpoint and return the result",
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
      
      return { content: [{ type: "text", text: output }] };
    }
  );
  
  // Set up resource handlers for the klb://intdoc/ scheme
  // List Resources Handler
  server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      // Fetch the list of available documentation resources
      // These come in MCP resource format with klb://intdoc/ prefixes
      const resources = await fetchDocFileList();
      
      // We don't need to add the list resource since it's not directly accessible
      return {
        resources
      };
    } catch (error) {
      // In case of error, return an empty list
      return { resources: [] };
    }
  });
  
  // Read Resource Handler
  server.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    
    // Only handle klb://intdoc/ URIs
    if (!uri.startsWith("klb://intdoc/")) {
      throw new Error("Unsupported resource URI scheme");
    }
    
    // Extract the file name from the URI
    const fileName = uri.substring("klb://intdoc/".length);
    
    // We don't allow fetching the list as a resource
    if (fileName === "list") {
      throw new Error("Resource not available");
    }
    
    // For regular documentation files, fetch and return the raw content
    const content = await fetchDocumentation(fileName);
    
    return {
      contents: [{
        uri,
        mimeType: "text/markdown",
        text: content
      }]
    };
  });
  
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
}