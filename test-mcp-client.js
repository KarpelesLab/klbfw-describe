#!/usr/bin/env node

// A simple script to test the MCP server using the official SDK client
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from 'fs';

// Choose which command to test 
// Options: tool, resource, list_resources, list_tools
const testMode = process.argv[2] || 'tool';
const apiPath = process.argv[3] || 'User';

async function main() {
  // Set a timeout to ensure the script doesn't hang
  const timeout = setTimeout(() => {
    console.error("Timeout: MCP operation took too long");
    process.exit(1);
  }, 10000); // 10 second timeout
  const transport = new StdioClientTransport({
    command: "node",
    args: ["index.js", "--mcp"]
  });

  const client = new Client({
    name: "klbfw-describe-test-client",
    version: "1.0.0"
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP server");

    let result;
    const outputFile = `test-mcp-${testMode}.json`;

    switch (testMode) {
      case 'tool':
        console.log(`Calling describe tool with path: ${apiPath}`);
        result = await client.callTool({
          name: "describe",
          arguments: {
            apiPath: apiPath
          }
        });
        break;
        
      case 'tool_raw':
        console.log(`Calling describe_raw tool with path: ${apiPath}`);
        result = await client.callTool({
          name: "describe_raw",
          arguments: {
            apiPath: apiPath
          }
        });
        break;

      case 'tool_ts':
        console.log(`Calling produce_ts tool with path: ${apiPath}`);
        result = await client.callTool({
          name: "produce_ts",
          arguments: {
            apiPath: apiPath
          }
        });
        break;
        
      case 'tool_get':
        console.log(`Calling get tool with path: ${apiPath}`);
        result = await client.callTool({
          name: "get",
          arguments: {
            apiPath: apiPath,
            raw: false
          }
        });
        break;

      case 'resource':
        console.log(`Reading documentation resource: ${apiPath}`);
        result = await client.readResource({
          uri: `klb://intdoc/${apiPath}`
        });
        break;

      case 'list_resources':
        console.log("Listing available resources");
        result = await client.listResources();
        break;

      case 'list_tools':
        console.log("Listing available tools");
        result = await client.listTools();
        break;

      default:
        console.error(`Unknown test mode: ${testMode}`);
        process.exit(1);
    }

    console.log("Result:");
    console.log(JSON.stringify(result, null, 2));
    
    // Save to file for inspection
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    
    // Close the client connection
    await client.close();
  } catch (error) {
    console.error("Error:", error.message);
    // Close the client connection on error
    try {
      await client.close();
    } catch (closeError) {
      // Ignore any errors during close
    }
    process.exit(1);
  } finally {
    // Clear the timeout
    clearTimeout(timeout);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});