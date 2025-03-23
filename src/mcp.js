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
  
  // Add describe tool
  server.tool("describe",
    {
      apiPath: z.string().min(1),
      raw: z.boolean().optional().default(false),
      typescriptOutput: z.boolean().optional().default(false)
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
  
  // Add get tool
  server.tool("get",
    {
      apiPath: z.string().min(1),
      raw: z.boolean().optional().default(false)
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
  
  // Add documentation tool
  server.tool("documentation",
    {
      fileName: z.string().optional().default('README.md')
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