import fs from 'fs';

// This is a simple script that pretends to be an MCP client.
// It reads the test-mcp-resource.json fixture and sends it to stdout in the proper format.

// Simulate the MCP request from the fixture
const resourceFixture = JSON.parse(fs.readFileSync('./test-mcp-resource.json', 'utf8'));

// Send the fixture data to stdout
console.log('Conversation using MCP resources:');
console.log(JSON.stringify(resourceFixture, null, 2));