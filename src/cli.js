import { describeApi, getApiResource } from './api.js';
import { startMcpServer } from './mcp.js';

/**
 * Process command-line arguments and execute appropriate function
 */
export async function processArguments(args) {
  // Default options
  let rawOutput = false;
  let typeScriptOutput = false;
  let getMode = false;
  let mcpMode = false;
  let apiPath = '';
  
  // Process command-line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--raw') {
      rawOutput = true;
    } else if (arg === '--ts' || arg === '--types') {
      typeScriptOutput = true;
    } else if (arg === '--get') {
      getMode = true;
    } else if (arg === '--mcp') {
      mcpMode = true;
    } else if (!arg.startsWith('--')) {
      apiPath = arg;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      return;
    }
  }
  
  // Start MCP server if requested
  if (mcpMode) {
    await startMcpServer();
    return; // MCP server handles its own lifecycle
  }
  
  try {
    if (getMode) {
      // GET request mode
      if (!apiPath) {
        console.error('Error: API path is required for GET mode');
        printUsage();
        process.exit(1);
      }
      
      await getApiResource(apiPath, { rawOutput });
    } else {
      // OPTIONS request mode (default)
      if (!apiPath) {
        console.error('Error: API path is required');
        printUsage();
        process.exit(1);
      }
      
      await describeApi(apiPath, { rawOutput, typeScriptOutput });
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
export function printUsage() {
  console.log(`
KLB API Describe Tool

Usage:
  npx @karpeleslab/klbfw-describe [options] <api-path>

Options:
  --raw          Show raw JSON output without formatting
  --ts, --types  Generate TypeScript type definitions
  --get          Perform a GET request instead of OPTIONS
  --mcp          Start an MCP server on stdio for programmatic access
  --help, -h     Show this help message

Examples:
  npx @karpeleslab/klbfw-describe User
  npx @karpeleslab/klbfw-describe Misc/Debug
  npx @karpeleslab/klbfw-describe Misc/Debug:testUpload
  npx @karpeleslab/klbfw-describe --raw User
  npx @karpeleslab/klbfw-describe --ts User
  npx @karpeleslab/klbfw-describe --get User/ce8b57ca-8961-49c5-863a-b79ab3e1e4a0
  npx @karpeleslab/klbfw-describe --mcp
`);
}