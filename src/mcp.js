import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { describeApi, getApiResource, fetchDocumentation, fetchDocFileList } from './api.js';
import { stripParametersFromPath } from './utils.js';
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
    "Describe an API endpoint by its path with formatted output. Automatically strips parameters (segments not starting with uppercase) for OPTIONS request.",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe (parameters will be auto-stripped for OPTIONS)")
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
    "Obtain the raw json output description of an API. Automatically strips parameters (segments not starting with uppercase) for OPTIONS request.",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe (parameters will be auto-stripped for OPTIONS)")
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
    "Generate TypeScript definitions for an API endpoint. Automatically strips parameters (segments not starting with uppercase) for OPTIONS request.",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to generate TypeScript for (parameters will be auto-stripped for OPTIONS)")
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
  
  // Add intdoc_list tool to list available documentation resources
  server.tool(
    "intdoc_list",
    "List available KLBFW backend integration documentation resources",
    {},
    async () => {
      try {
        // Fetch documentation resource list
        const resources = await fetchDocFileList();
        
        // Format the resources for display
        let output = '## Available KLBFW Backend Integration Documentation\n\n';
        output += '| Resource | Title |\n';
        output += '| -------- | ----- |\n';
        
        resources.forEach(resource => {
          const uri = resource.uri.replace('klb://intdoc/', '');
          const title = resource.title || uri;
          output += `| \`${uri}\` | ${title} |\n`;
        });
        
        return { content: [{ type: "text", text: output }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error retrieving documentation list: ${error.message}` }] };
      }
    }
  );
  
  // Add intdoc_get tool to fetch a specific documentation resource
  server.tool(
    "intdoc_get",
    "Fetch a specific KLBFW backend integration documentation resource by filename",
    {
      filename: z.string().min(1).describe("The documentation filename to retrieve from the integration docs")
    },
    async (params) => {
      try {
        // Fetch the documentation content
        const content = await fetchDocumentation(params.filename);
        
        if (!content) {
          return { content: [{ type: "text", text: `Resource not found: ${params.filename}` }] };
        }
        
        return { content: [{ type: "text", text: content }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error retrieving documentation: ${error.message}` }] };
      }
    }
  );
  
  // Set up dynamic resource handler for the klb://intdoc/ scheme
  server.resource(
    "documentation",
    new ResourceTemplate("klb://intdoc/{filename}", { 
      list: async () => {
        try {
          // Fetch the list of available documentation resources
          // These come in MCP resource format with klb://intdoc/ prefixes
          const resources = await fetchDocFileList();
          return { resources };
        } catch (error) {
          // In case of error, return an empty list
          return { resources: [] };
        }
      }
    }),
    async (uri, { filename }) => {
      try {
        // We don't allow fetching the list as a resource
        if (filename === "list") {
          throw new Error("Resource not available");
        }
        
        // For regular documentation files, fetch and return the raw content
        const content = await fetchDocumentation(filename);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/markdown",
            text: content
          }]
        };
      } catch (error) {
        // In case of error, return an empty content
        throw new Error(`Failed to fetch documentation resource: ${error.message}`);
      }
    }
  );
  
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
}