#!/usr/bin/env node

/**
 * KLB API Describe Tool
 * 
 * This tool performs OPTIONS requests on API endpoints to discover
 * their capabilities and structure.
 * 
 * Usage:
 *   npx @karpeleslab/klbfw-describe [options] <api-path>
 * 
 * Options:
 *   --raw          Show raw JSON output without formatting
 *   --ts, --types  Generate TypeScript type definitions
 *   --get          Perform a GET request instead of OPTIONS
 *   --doc [file]   Fetch documentation from GitHub (default: README.md)
 *   --mcp          Start an MCP server on stdio for programmatic access
 * 
 * Examples:
 *   npx @karpeleslab/klbfw-describe User
 *   npx @karpeleslab/klbfw-describe Misc/Debug
 *   npx @karpeleslab/klbfw-describe Misc/Debug:testUpload
 *   npx @karpeleslab/klbfw-describe --raw User
 *   npx @karpeleslab/klbfw-describe --ts User
 *   npx @karpeleslab/klbfw-describe --get User/ce8b57ca-8961-49c5-863a-b79ab3e1e4a0
 *   npx @karpeleslab/klbfw-describe --doc
 *   npx @karpeleslab/klbfw-describe --doc apibasics.md
 *   npx @karpeleslab/klbfw-describe --mcp
 */

import { processArguments } from './src/cli.js';

// Start processing command-line arguments, skipping the first two (node and script name)
processArguments(process.argv.slice(2));