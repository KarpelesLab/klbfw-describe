#!/usr/bin/env node

// Finding details on the actual MCP jsonrpc methods was surprisingly hard.
// See: https://spec.modelcontextprotocol.io/specification/2024-11-05/server/tools/

// A simple script to test the MCP server by sending a command
import { exec } from 'child_process';
import fs from 'fs';

// Choose which command to test 
// Options: tool, resource, raw, typescript, list
const testMode = process.argv[2] || 'tool';
const apiPath = process.argv[3] || 'User';

// Correct MCP format for tool calls
const toolCommand = {
  "jsonrpc": "2.0",
  "id": "test-1",
  "method": "tools/call",
  "params": {
    "name": "describe",
    "arguments": {
      "apiPath": apiPath
    }
  }
};

// Base URL for resources (must be a full URL)
const baseUrl = "http://localhost";

// Correct MCP format for resource read (formatted description)
const resourceCommand = {
  "jsonrpc": "2.0",
  "id": "test-2",
  "method": "resources/read",
  "params": {
    "uri": baseUrl + "/api/" + apiPath
  }
};

// Correct MCP format for raw resource read
const rawResourceCommand = {
  "jsonrpc": "2.0",
  "id": "test-3",
  "method": "resources/read",
  "params": {
    "uri": baseUrl + "/api/raw/" + apiPath
  }
};

// Correct MCP format for TypeScript resource read
const tsResourceCommand = {
  "jsonrpc": "2.0",
  "id": "test-4",
  "method": "resources/read",
  "params": {
    "uri": baseUrl + "/api/typescript/" + apiPath
  }
};

// Correct MCP format for listing available resources
const listResourcesCommand = {
  "jsonrpc": "2.0",
  "id": "test-5",
  "method": "resources/list",
  "params": {}
};

// Select the appropriate command based on test mode
let command;
switch (testMode) {
  case 'resource':
    command = resourceCommand;
    break;
  case 'raw':
    command = rawResourceCommand;
    break;
  case 'typescript':
    command = tsResourceCommand;
    break;
  case 'list':
    command = listResourcesCommand;
    break;
  default:
    command = toolCommand;
}

const serverProcess = exec('node index.js --mcp', {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Write the command as a newline-terminated JSON string
serverProcess.stdin.write(JSON.stringify(command) + '\n');

// Collect response
let responseData = '';
serverProcess.stdout.on('data', (data) => {
  responseData += data.toString();
  
  try {
    // Check if we have a complete JSON response
    const response = JSON.parse(responseData);
    console.log('Received response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Save to file for inspection
    const outputFile = `test-mcp-${testMode}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(response, null, 2));
    
    // Exit after getting response
    setTimeout(() => {
      serverProcess.kill();
      process.exit(0);
    }, 100);
  } catch (e) {
    // Not a complete JSON yet, continue collecting
  }
});

// Handle server exit
serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Exit after 10 seconds if no response
setTimeout(() => {
  console.log('Timeout waiting for response');
  serverProcess.kill();
  process.exit(1);
}, 10000);
