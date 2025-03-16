#!/usr/bin/env node

'use strict';

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
 *   --raw         Show raw JSON output without formatting
 *   --host <host> Specify a custom API host (default: hub.atonline.com)
 * 
 * Examples:
 *   npx @karpeleslab/klbfw-describe User
 *   npx @karpeleslab/klbfw-describe Misc/Debug
 *   npx @karpeleslab/klbfw-describe Misc/Debug:testUpload
 *   npx @karpeleslab/klbfw-describe --raw User
 */

const https = require('https');
const url = require('url');

// Default API host
const DEFAULT_API_HOST = 'hub.atonline.com';
const API_PREFIX = '/_rest/';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Perform an OPTIONS request to the specified API endpoint
 */
function describeApi(apiPath, options = {}) {
  const { rawOutput = false, host = DEFAULT_API_HOST } = options;
  
  console.log(`\n${colors.bright}${colors.blue}Describing API endpoint:[0m ${colors.green}${apiPath}${colors.reset}`);
  console.log(`${colors.dim}Host: ${host}${colors.reset}\n`);
  
  const reqUrl = url.parse(`https://${host}${API_PREFIX}${apiPath}`);
  
  const reqOptions = {
    hostname: reqUrl.hostname,
    path: reqUrl.path,
    method: 'OPTIONS',
    headers: {
      'Accept': 'application/json'
    }
  };
  
  const req = https.request(reqOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log(`${colors.bright}Status:${colors.reset} ${colors.red}${res.statusCode}${colors.reset}`);
        console.log(`${colors.red}Error: Unable to fetch API information${colors.reset}`);
        return;
      }
      
      try {
        // Try to parse as JSON first
        const jsonData = JSON.parse(data);
        
        if (rawOutput) {
          // Raw JSON output without formatting
          console.log('\n' + colors.bright + 'Raw Response:' + colors.reset);
          console.log(JSON.stringify(jsonData, null, 2));
        } else {
          // Formatted output
          formatJsonResponse(jsonData);
        }
      } catch (e) {
        // If not JSON, output as text
        console.log(`\n${colors.bright}Response (Text):${colors.reset}`);
        console.log(data);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error(`${colors.red}Error:${colors.reset} ${e.message}`);
  });
  
  req.end();
}

/**
 * Format response headers for display
 */
function formatHeaders(headers) {
  return Object.keys(headers).map(key => {
    return `\n  ${colors.cyan}${key}:${colors.reset} ${headers[key]}`;
  }).join('');
}

/**
 * Format JSON response in a more readable way
 */
function formatJsonResponse(jsonData) {
  if (!jsonData.data) {
    console.log(`${colors.red}Error: No API data found in response${colors.reset}`);
    return;
  }
  
  const data = jsonData.data;
  
  // Print API path
  if (data.Path) {
    console.log(`\n${colors.bright}${colors.green}API:${colors.reset} ${colors.blue}${data.Path.join('/')}${colors.reset}`);
  }
  
  // Display endpoint type (normal, procedure, etc.)
  if (data.procedure) {
    console.log(`${colors.bright}Type:${colors.reset} Procedure`);
  } else if (data.table) {
    console.log(`${colors.bright}Type:${colors.reset} Resource`);
  } else if (data.prefix || data.func) {
    console.log(`${colors.bright}Type:${colors.reset} Collection`);
  }
  
  // Display allowed methods - Most important for developers
  if (data.allowed_methods) {
    const methodsOutput = data.allowed_methods.map(method => {
      const color = method === 'GET' ? colors.green : 
                    method === 'POST' ? colors.yellow :
                    method === 'DELETE' ? colors.red :
                    method === 'PATCH' || method === 'PUT' ? colors.magenta : 
                    colors.cyan;
      return `${color}${method}${colors.reset}`;
    }).join(', ');
    
    console.log(`${colors.bright}Methods:${colors.reset} ${methodsOutput}`);
  }
  
  // Display access info
  if (data.access) {
    console.log(`${colors.bright}Access:${colors.reset} ${data.access}`);
  }
  
  // Display procedure info
  if (data.procedure) {
    // For procedures, show detailed information
    console.log(`\n${colors.bright}${colors.blue}Procedure Details:${colors.reset}`);
    console.log(`${colors.cyan}Name:${colors.reset} ${data.procedure.name}`);
    console.log(`${colors.cyan}Type:${colors.reset} ${data.procedure.static ? 'Static' : 'Instance'} Method`);
    
    // Generate usage example
    if (data.Path) {
      const pathStr = data.Path.join('/');
      const procName = data.procedure.name;
      console.log(`\n${colors.bright}Usage:${colors.reset}`);
      
      // Arguments for usage example
      const args = data.procedure.args || [];
      const argPairs = args.map(arg => {
        const argName = arg.name;
        let argValue;
        
        // Provide appropriate sample values based on type
        switch(arg.type) {
          case 'bool':   argValue = 'true'; break;
          case 'number': argValue = '123'; break;
          case 'string': argValue = '"value"'; break;
          default:       argValue = '"..."'; break;
        }
        
        return `${argName}: ${argValue}`;
      });
      
      console.log(`${colors.dim}# JavaScript${colors.reset}`);
      console.log(`klbfw.rest('${pathStr}:${procName}', 'POST', {${argPairs.join(', ')}})`);
      
      // URL format for direct GET requests if applicable
      if (data.allowed_methods.includes('GET') && args.length > 0) {
        const queryParams = args.map(arg => {
          const argName = arg.name;
          let argValue;
          
          // Provide appropriate sample values based on type
          switch(arg.type) {
            case 'bool':   argValue = 'true'; break;
            case 'number': argValue = '123'; break;
            case 'string': argValue = 'value'; break;
            default:       argValue = '...'; break;
          }
          
          return `${argName}=${argValue}`;
        }).join('&');
        
        console.log(`\n${colors.dim}# URL Format${colors.reset}`);
        console.log(`GET /_rest/${pathStr}:${procName}?${queryParams}`);
      }
    }
    
    // Show arguments
    if (data.procedure.args && data.procedure.args.length > 0) {
      console.log(`\n${colors.bright}Arguments:${colors.reset}`);
      data.procedure.args.forEach(arg => {
        let argDesc = `  ${colors.yellow}${arg.name}${colors.reset}`;
        if (arg.type) {
          argDesc += ` (${arg.type})`;
        }
        if (arg.required) {
          argDesc += ` ${colors.red}*${colors.reset}`;
        }
        console.log(argDesc);
      });
    } else {
      console.log(`\n${colors.dim}No arguments required${colors.reset}`);
    }
    
    return; // For procedures, we're done
  }
  
  // Display resource info for table-based endpoints
  if (data.table) {
    console.log(`\n${colors.bright}${colors.blue}Resource Details:${colors.reset}`);
    console.log(`${colors.cyan}Name:${colors.reset} ${data.table.Name}`);
    
    // Count and show fields
    const fields = Object.keys(data.table.Struct).filter(key => !key.startsWith('_'));
    console.log(`${colors.cyan}Fields:${colors.reset} ${fields.length} fields`);
    
    // Show primary key
    if (data.table.Struct._primary) {
      console.log(`${colors.cyan}Primary Key:${colors.reset} ${data.table.Struct._primary.join(', ')}`);
    }
    
    // Show first few fields as examples
    const sampleFields = fields.slice(0, 5);
    if (sampleFields.length > 0) {
      console.log(`\n${colors.bright}Sample Fields:${colors.reset}`);
      sampleFields.forEach(field => {
        const info = data.table.Struct[field];
        let fieldDesc = `  ${colors.yellow}${field}${colors.reset}`;
        if (info.type) {
          fieldDesc += ` (${info.type}`;
          if (info.size) fieldDesc += `[${info.size}]`;
          fieldDesc += ')';
        }
        if (info.null === false) {
          fieldDesc += ` ${colors.red}*${colors.reset}`;
        }
        console.log(fieldDesc);
      });
      
      if (fields.length > 5) {
        console.log(`  ${colors.dim}...and ${fields.length - 5} more fields${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.dim}Use --raw for complete field definitions${colors.reset}`);
  }
  
  // Display available functions
  if (data.func && data.func.length > 0) {
    console.log(`\n${colors.bright}${colors.blue}Available Methods:${colors.reset}`);
    data.func.forEach(func => {
      console.log(`  ${colors.green}${func.name}${colors.reset}${func.static ? ' (static)' : ''}`);
      
      if (func.args && func.args.length > 0) {
        const argList = func.args.map(arg => {
          let str = arg.name;
          if (arg.required) str += '*';
          if (arg.type) str += `: ${arg.type}`;
          return str;
        }).join(', ');
        
        console.log(`    ${colors.dim}Arguments: ${argList}${colors.reset}`);
      }
      
      if (func.return_type) {
        console.log(`    ${colors.dim}Returns: ${func.return_type}${colors.reset}`);
      }
    });
  }
  
  // Display available sub-endpoints
  if (data.prefix && data.prefix.length > 0) {
    console.log(`\n${colors.bright}${colors.blue}Sub-endpoints:${colors.reset}`);
    
    // Group by first letter to organize large lists
    const groups = {};
    data.prefix.forEach(prefix => {
      const firstChar = prefix.name.charAt(0).toUpperCase();
      if (!groups[firstChar]) groups[firstChar] = [];
      groups[firstChar].push(prefix);
    });
    
    // Display grouped endpoints
    Object.keys(groups).sort().forEach(letter => {
      const endpointList = groups[letter].map(endpoint => {
        return `${colors.green}${endpoint.name}${colors.reset}`;
      }).join(', ');
      
      console.log(`  ${colors.bright}${letter}${colors.reset}: ${endpointList}`);
    });
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`${colors.bright}Usage:${colors.reset} npx @karpeleslab/klbfw-describe [options] <api-path>`);
  console.log(`\n${colors.bright}Options:${colors.reset}`);
  console.log(`  --raw              Show raw JSON output without formatting`);
  console.log(`  --host <hostname>  Specify a custom API host (default: ${DEFAULT_API_HOST})`);
  console.log(`  --help, -h         Show this help message`);
  console.log(`\n${colors.bright}Examples:${colors.reset}`);
  console.log(`  npx @karpeleslab/klbfw-describe User`);
  console.log(`  npx @karpeleslab/klbfw-describe Misc/Debug`);
  console.log(`  npx @karpeleslab/klbfw-describe Misc/Debug:testUpload`);
  console.log(`  npx @karpeleslab/klbfw-describe --raw User`);
  console.log(`  npx @karpeleslab/klbfw-describe --host api.example.com User`);
}

// Parse command line arguments
let rawOutput = false;
let apiPath = null;
let host = DEFAULT_API_HOST;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--raw') {
    rawOutput = true;
  } else if (arg === '--host' && i + 1 < args.length) {
    host = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  } else if (!apiPath && !arg.startsWith('--')) {
    apiPath = arg;
  }
}

if (!apiPath) {
  printUsage();
  process.exit(1);
}

// Execute the API description
describeApi(apiPath, { rawOutput, host });