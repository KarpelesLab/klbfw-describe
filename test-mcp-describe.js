#!/usr/bin/env node

// A simple script to test the MCP server 'describe' tool
import { exec } from 'child_process';
import fs from 'fs';

// Correct MCP format for tool calls
const command = {
  "jsonrpc": "2.0",
  "id": "test-describe",
  "method": "tools/call",
  "params": {
    "name": "describe",
    "arguments": {
      "apiPath": "User"
    }
  }
};

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
    fs.writeFileSync('test-mcp-describe.json', JSON.stringify(response, null, 2));
    
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