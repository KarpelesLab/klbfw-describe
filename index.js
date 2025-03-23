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

const https = require('https');
const url = require('url');

// Default API host
const DEFAULT_API_HOST = 'ws.atonline.com';
const API_PREFIX = '/_rest/';

// GitHub documentation repo URL
const DOC_REPO_URL = 'https://raw.githubusercontent.com/KarpelesLab/integration-docs/refs/heads/master/';

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
  return new Promise((resolve, reject) => {
    const { 
      rawOutput = false, 
      typeScriptOutput = false,
      output = console.log,      // Function to use for output
      useColors = true,          // Whether to use ANSI colors
      markdownFormat = false     // Whether to use markdown formatting
    } = options;
    
    // Choose output format based on options
    const printOutput = (text) => output(text);
    
    // Helper to format text with or without colors
    const format = (colorFn, text) => {
      if (!useColors) return text;
      return colorFn + text + colors.reset;
    };
    
    if (markdownFormat) {
      printOutput(`## Describing API endpoint: \`${apiPath}\``);
      printOutput(`**Host:** ${DEFAULT_API_HOST}\n`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Describing API endpoint:")} ${format(colors.green, apiPath)}`);
      printOutput(`${format(colors.dim, "Host: " + DEFAULT_API_HOST)}\n`);
    }
    
    const reqUrl = url.parse(`https://${DEFAULT_API_HOST}${API_PREFIX}${apiPath}`);
    
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
          if (markdownFormat) {
            printOutput(`**Status:** ${res.statusCode}`);
            printOutput(`**Error:** Unable to fetch API information`);
          } else {
            printOutput(`${format(colors.bright, "Status:")} ${format(colors.red, res.statusCode.toString())}`);
            printOutput(`${format(colors.red, "Error: Unable to fetch API information")}`);
          }
          resolve();
          return;
        }
        
        try {
          // Try to parse as JSON first
          const jsonData = JSON.parse(data);
          
          if (rawOutput) {
            // Raw JSON output without formatting
            if (markdownFormat) {
              printOutput(`\n### Raw Response:\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``);
            } else {
              printOutput('\n' + format(colors.bright, 'Raw Response:'));
              printOutput(JSON.stringify(jsonData, null, 2));
            }
          } else if (typeScriptOutput) {
            // TypeScript definition output
            generateTypeScriptDefinitions(jsonData, { output: printOutput, useColors, markdownFormat });
          } else {
            // Formatted output
            formatJsonResponse(jsonData, { output: printOutput, useColors, markdownFormat });
          }
          resolve();
        } catch (e) {
          // If not JSON, output as text
          if (markdownFormat) {
            printOutput(`\n### Response (Text):\n\`\`\`\n${data}\n\`\`\``);
          } else {
            printOutput(`\n${format(colors.bright, "Response (Text):")}`);
            printOutput(data);
          }
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      if (markdownFormat) {
        printOutput(`**Error:** ${e.message}`);
      } else {
        printOutput(`${format(colors.red, "Error:")} ${e.message}`);
      }
      reject(e);
    });
    
    req.end();
  });
}

/**
 * Fetch and display documentation from GitHub repository
 */
function fetchDocumentation(fileName = 'README.md', options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      output = console.log,      // Function to use for output
      useColors = true,          // Whether to use ANSI colors
      markdownFormat = false     // Whether to use markdown formatting
    } = options;
    
    // Choose output format based on options
    const printOutput = (text) => output(text);
    
    // Helper to format text with or without colors
    const format = (colorFn, text) => {
      if (!useColors) return text;
      return colorFn + text + colors.reset;
    };
    
    const docUrl = url.parse(`${DOC_REPO_URL}${fileName}`);
    
    if (markdownFormat) {
      printOutput(`## Fetching documentation: \`${fileName}\``);
      printOutput(`**Source:** ${DOC_REPO_URL}${fileName}\n`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Fetching documentation:")} ${format(colors.green, fileName)}`);
      printOutput(`${format(colors.dim, "Source: " + DOC_REPO_URL + fileName)}\n`);
    }
    
    const reqOptions = {
      hostname: docUrl.hostname,
      path: docUrl.pathname,
      method: 'GET',
      headers: {
        'Accept': 'text/plain, text/markdown'
      }
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          if (markdownFormat) {
            printOutput(`**Status:** ${res.statusCode}`);
            printOutput(`**Error:** Unable to fetch documentation`);
          } else {
            printOutput(`${format(colors.bright, "Status:")} ${format(colors.red, res.statusCode.toString())}`);
            printOutput(`${format(colors.red, "Error: Unable to fetch documentation")}`);
          }
          resolve();
          return;
        }
        
        // Display the markdown content
        if (markdownFormat) {
          // For MCP mode, we're already in markdown, so just output the raw documentation
          printOutput(`\n## Documentation\n`);
          printOutput(data); // Return the raw markdown directly
        } else {
          printOutput(`${format(colors.bright + colors.blue, "Documentation:")}\n`);
          
          // Apply some basic Markdown formatting for terminal output
          const formattedText = formatMarkdown(data);
          printOutput(formattedText);
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      if (markdownFormat) {
        printOutput(`**Error:** ${e.message}`);
      } else {
        printOutput(`${format(colors.red, "Error:")} ${e.message}`);
      }
      reject(e);
    });
    
    req.end();
  });
}

/**
 * Basic Markdown formatting for terminal display
 */
function formatMarkdown(markdown) {
  let formatted = markdown;
  
  // Headers
  formatted = formatted.replace(/^# (.*?)$/gm, `${colors.bright}${colors.blue}$1${colors.reset}`);
  formatted = formatted.replace(/^## (.*?)$/gm, `${colors.bright}${colors.cyan}$1${colors.reset}`);
  formatted = formatted.replace(/^### (.*?)$/gm, `${colors.bright}${colors.green}$1${colors.reset}`);
  formatted = formatted.replace(/^#### (.*?)$/gm, `${colors.bright}${colors.yellow}$1${colors.reset}`);
  
  // Bold and italics
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, `${colors.bright}$1${colors.reset}`);
  formatted = formatted.replace(/\*(.*?)\*/g, `${colors.underscore}$1${colors.reset}`);
  
  // Code blocks
  formatted = formatted.replace(/```([^`]+)```/g, (match, code) => {
    return `\n${colors.dim}${code}${colors.reset}\n`;
  });
  
  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, `${colors.dim}$1${colors.reset}`);
  
  // Links - display link text and URL
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, `${colors.underscore}$1${colors.reset} (${colors.cyan}$2${colors.reset})`);
  
  // Lists
  formatted = formatted.replace(/^- (.*?)$/gm, `  • $1`);
  formatted = formatted.replace(/^  - (.*?)$/gm, `    • $1`);
  formatted = formatted.replace(/^\d+\. (.*?)$/gm, `  $&`);
  
  return formatted;
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
 * Perform a GET request to the specified API endpoint
 */
function getApiResource(apiPath, options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      rawOutput = false,
      output = console.log,      // Function to use for output
      useColors = true,          // Whether to use ANSI colors
      markdownFormat = false     // Whether to use markdown formatting
    } = options;
    
    // Choose output format based on options
    const printOutput = (text) => output(text);
    
    // Helper to format text with or without colors
    const format = (colorFn, text) => {
      if (!useColors) return text;
      return colorFn + text + colors.reset;
    };
    
    if (markdownFormat) {
      printOutput(`## Retrieving API resource: \`${apiPath}\``);
      printOutput(`**Host:** ${DEFAULT_API_HOST}\n`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Retrieving API resource:")} ${format(colors.green, apiPath)}`);
      printOutput(`${format(colors.dim, "Host: " + DEFAULT_API_HOST)}\n`);
    }
    
    const reqUrl = url.parse(`https://${DEFAULT_API_HOST}${API_PREFIX}${apiPath}`);
    
    const reqOptions = {
      hostname: reqUrl.hostname,
      path: reqUrl.path,
      method: 'GET',
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
        if (markdownFormat) {
          printOutput(`**Status:** ${res.statusCode}`);
        } else {
          printOutput(`${format(colors.bright, "Status:")} ${format(res.statusCode === 200 ? colors.green : colors.red, res.statusCode.toString())}`);
        }
        
        if (res.statusCode !== 200) {
          if (markdownFormat) {
            printOutput(`**Error:** Unable to fetch resource`);
          } else {
            printOutput(`${format(colors.red, "Error: Unable to fetch resource")}`);
          }
          
          try {
            // Try to parse error response as JSON
            const errorData = JSON.parse(data);
            if (errorData.error) {
              if (markdownFormat) {
                printOutput(`**Error message:** ${errorData.error}`);
              } else {
                printOutput(`${format(colors.red, "Error message:")} ${errorData.error}`);
              }
            }
          } catch (e) {
            // If not JSON, output as text
            if (markdownFormat) {
              printOutput(`**Response:**\n\`\`\`\n${data}\n\`\`\``);
            } else {
              printOutput(`${format(colors.red, "Response:")} ${data}`);
            }
          }
          resolve();
          return;
        }
        
        try {
          // Try to parse as JSON first
          const jsonData = JSON.parse(data);
          
          if (rawOutput) {
            // Raw JSON output without formatting
            if (markdownFormat) {
              printOutput(`\n### Raw Response:\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``);
            } else {
              printOutput('\n' + format(colors.bright, 'Response:'));
              printOutput(JSON.stringify(jsonData, null, 2));
            }
          } else {
            // Format the JSON output for display
            formatGetResponse(jsonData, { output: printOutput, useColors, markdownFormat });
          }
          resolve();
        } catch (e) {
          // If not JSON, output as text
          if (markdownFormat) {
            printOutput(`\n### Response (Text):\n\`\`\`\n${data}\n\`\`\``);
          } else {
            printOutput(`\n${format(colors.bright, "Response (Text):")}`);
            printOutput(data);
          }
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      if (markdownFormat) {
        printOutput(`**Error:** ${e.message}`);
      } else {
        printOutput(`${format(colors.red, "Error:")} ${e.message}`);
      }
      reject(e);
    });
    
    req.end();
  });
}

/**
 * Format a GET response in a more readable way
 */
function formatGetResponse(jsonData, options = {}) {
  const { 
    output = console.log,      // Function to use for output
    useColors = true,          // Whether to use ANSI colors
    markdownFormat = false     // Whether to use markdown formatting
  } = options;
  
  // Choose output format based on options
  const printOutput = (text) => output(text);
  
  // Helper to format text with or without colors
  const format = (colorFn, text) => {
    if (!useColors) return text;
    return colorFn + text + colors.reset;
  };
  
  // Check for standard KLB response structure
  if (jsonData.data !== undefined) {
    // Detect if it's a collection (array) or a single object
    const data = jsonData.data;
    
    if (Array.isArray(data)) {
      if (markdownFormat) {
        printOutput(`\n## Collection Response: ${data.length} items\n`);
      } else {
        printOutput(`\n${format(colors.bright + colors.blue, "Collection Response:")} ${data.length} items\n`);
      }
      
      // For large collections, show summary information
      if (data.length > 10) {
        if (markdownFormat) {
          printOutput(`*Showing first 10 items of ${data.length}*\n`);
        } else {
          printOutput(`${format(colors.dim, "Showing first 10 items of " + data.length)}\n`);
        }
        
        // Show first 10 items
        data.slice(0, 10).forEach((item, index) => {
          if (markdownFormat) {
            printOutput(`### Item ${index + 1}`);
            formatObject(item, 0, 2, { output: printOutput, useColors, markdownFormat });
            printOutput(''); // Add space between items
          } else {
            printOutput(`${format(colors.bright + colors.yellow, "Item " + (index + 1) + ":")}`);
            formatObject(item, 0, 2, { output: printOutput, useColors, markdownFormat });
            printOutput(''); // Add space between items
          }
        });
      } else {
        // Show all items for smaller collections
        data.forEach((item, index) => {
          if (markdownFormat) {
            printOutput(`### Item ${index + 1}`);
            formatObject(item, 0, 2, { output: printOutput, useColors, markdownFormat });
            printOutput(''); // Add space between items
          } else {
            printOutput(`${format(colors.bright + colors.yellow, "Item " + (index + 1) + ":")}`);
            formatObject(item, 0, 2, { output: printOutput, useColors, markdownFormat });
            printOutput(''); // Add space between items
          }
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      if (markdownFormat) {
        printOutput(`\n## Object Response\n`);
        formatObject(data, 0, 2, { output: printOutput, useColors, markdownFormat });
      } else {
        printOutput(`\n${format(colors.bright + colors.blue, "Object Response:")}\n`);
        formatObject(data, 0, 2, { output: printOutput, useColors, markdownFormat });
      }
    } else {
      // Simple scalar value
      if (markdownFormat) {
        printOutput(`\n## Value Response\n\`${data}\`\n`);
      } else {
        printOutput(`\n${format(colors.bright + colors.blue, "Value Response:")} ${data}\n`);
      }
    }
    
    // Show metadata if present
    if (jsonData.total !== undefined) {
      if (markdownFormat) {
        printOutput(`**Total Records:** ${jsonData.total}`);
      } else {
        printOutput(`${format(colors.bright, "Total Records:")} ${jsonData.total}`);
      }
    }
    if (jsonData.count !== undefined) {
      if (markdownFormat) {
        printOutput(`**Record Count:** ${jsonData.count}`);
      } else {
        printOutput(`${format(colors.bright, "Record Count:")} ${jsonData.count}`);
      }
    }
    if (jsonData.page !== undefined) {
      if (markdownFormat) {
        printOutput(`**Page:** ${jsonData.page}`);
      } else {
        printOutput(`${format(colors.bright, "Page:")} ${jsonData.page}`);
      }
    }
  } else {
    // Non-standard response structure, just pretty-print
    if (markdownFormat) {
      printOutput(`\n## Response\n`);
      formatObject(jsonData, 0, 2, { output: printOutput, useColors, markdownFormat });
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Response:")}\n`);
      formatObject(jsonData, 0, 2, { output: printOutput, useColors, markdownFormat });
    }
  }
}

/**
 * Format an object for display with color coding
 */
function formatObject(obj, depth = 0, maxDepth = 2, options = {}) {
  const { 
    output = console.log,      // Function to use for output
    useColors = true,          // Whether to use ANSI colors
    markdownFormat = false     // Whether to use markdown formatting
  } = options;
  
  // Choose output format based on options
  const printOutput = (text) => output(text);
  
  // Helper to format text with or without colors
  const format = (colorFn, text) => {
    if (!useColors) return text;
    return colorFn + text + colors.reset;
  };
  
  if (obj === null) {
    if (markdownFormat) {
      printOutput(`${' '.repeat(depth * 2)}null`);
    } else {
      printOutput(`${' '.repeat(depth * 2)}${format(colors.dim, "null")}`);
    }
    return;
  }
  
  if (typeof obj !== 'object') {
    // Handle primitive types
    if (typeof obj === 'string') {
      if (markdownFormat) {
        printOutput(`${' '.repeat(depth * 2)}"${obj}"`);
      } else {
        printOutput(`${' '.repeat(depth * 2)}${format(colors.green, `"${obj}"`)}`);
      }
    } else if (typeof obj === 'number') {
      if (markdownFormat) {
        printOutput(`${' '.repeat(depth * 2)}${obj}`);
      } else {
        printOutput(`${' '.repeat(depth * 2)}${format(colors.yellow, obj.toString())}`);
      }
    } else if (typeof obj === 'boolean') {
      if (markdownFormat) {
        printOutput(`${' '.repeat(depth * 2)}${obj}`);
      } else {
        printOutput(`${' '.repeat(depth * 2)}${format(colors.magenta, obj.toString())}`);
      }
    } else {
      printOutput(`${' '.repeat(depth * 2)}${obj}`);
    }
    return;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      if (markdownFormat) {
        printOutput(`${' '.repeat(depth * 2)}[]`);
      } else {
        printOutput(`${' '.repeat(depth * 2)}${format(colors.dim, "[]")}`);
      }
      return;
    }
    
    if (depth >= maxDepth) {
      if (markdownFormat) {
        printOutput(`${' '.repeat(depth * 2)}[Array with ${obj.length} items]`);
      } else {
        printOutput(`${' '.repeat(depth * 2)}${format(colors.dim, `[Array(${obj.length})]`)}`);
      }
      return;
    }
    
    // For simple arrays with primitive values, show inline
    const allPrimitive = obj.every(item => typeof item !== 'object' || item === null);
    if (allPrimitive && obj.length <= 5) {
      if (markdownFormat) {
        const values = obj.map(item => {
          if (item === null) return 'null';
          if (typeof item === 'string') return `"${item}"`;
          return item.toString();
        }).join(', ');
        
        printOutput(`${' '.repeat(depth * 2)}[${values}]`);
      } else {
        const values = obj.map(item => {
          if (item === null) return format(colors.dim, "null");
          if (typeof item === 'string') return format(colors.green, `"${item}"`);
          if (typeof item === 'number') return format(colors.yellow, item.toString());
          if (typeof item === 'boolean') return format(colors.magenta, item.toString());
          return item.toString();
        }).join(', ');
        
        printOutput(`${' '.repeat(depth * 2)}[${values}]`);
      }
      return;
    }
    
    // For more complex or larger arrays, show vertically
    printOutput(`${' '.repeat(depth * 2)}[`);
    
    // Limit large arrays in output
    const displayItems = obj.length > 5 ? obj.slice(0, 5) : obj;
    displayItems.forEach((item, i) => {
      formatObject(item, depth + 1, maxDepth, options);
      if (i < displayItems.length - 1) {
        printOutput(`${' '.repeat((depth + 1) * 2)},`);
      }
    });
    
    if (obj.length > 5) {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}... ${obj.length - 5} more items`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.dim, `... ${obj.length - 5} more items`)}`);
      }
    }
    
    printOutput(`${' '.repeat(depth * 2)}]`);
    return;
  }
  
  // Handle objects
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    if (markdownFormat) {
      printOutput(`${' '.repeat(depth * 2)}{}`);
    } else {
      printOutput(`${' '.repeat(depth * 2)}${format(colors.dim, "{}")}`);
    }
    return;
  }
  
  if (depth >= maxDepth) {
    if (markdownFormat) {
      printOutput(`${' '.repeat(depth * 2)}{Object with ${keys.length} properties}`);
    } else {
      printOutput(`${' '.repeat(depth * 2)}${format(colors.dim, `{Object with ${keys.length} properties}`)}`);
    }
    return;
  }
  
  printOutput(`${' '.repeat(depth * 2)}{`);
  
  // Special handling for KlbDateTime objects
  if (obj.unix !== undefined && obj.iso !== undefined && obj.tz !== undefined) {
    if (markdownFormat) {
      printOutput(`${' '.repeat((depth + 1) * 2)}"iso": "${obj.iso}"`);
    } else {
      printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, '"iso"')}: ${format(colors.green, `"${obj.iso}"`)}`);
    }
    printOutput(`${' '.repeat(depth * 2)}}`);
    return;
  }
  
  // Preprocessing: collect translatable text fields
  const textFields = {};
  
  // First pass: identify translatable text fields (_Text__)
  keys.forEach(key => {
    if (key.endsWith('_Text__') && typeof obj[key] === 'string') {
      const baseFieldName = key.slice(0, -7); // Remove _Text__ suffix
      textFields[baseFieldName] = true;
    }
  });
  
  // Create a sorted list of keys that puts related fields together
  const sortedKeys = [...keys].sort((a, b) => {
    // If one is a translatable field id and the other is the corresponding text field
    if (a.endsWith('_Text__') && b === a.slice(0, -7)) return -1;
    if (b.endsWith('_Text__') && a === b.slice(0, -7)) return 1;
    // Normal alphabetical sort
    return a.localeCompare(b);
  });
  
  // Second pass: display fields with special handling for translatable fields
  sortedKeys.forEach((key, i) => {
    const value = obj[key];
    
    // Skip auto-generated text fields (we'll display them with their ID field)
    if (textFields[key]) {
      // This is an auto-generated text field, we'll show it along with its ID
      return;
    }
    
    if (key.endsWith('_Text__') && typeof value === 'string') {
      // This is a translatable text ID field, show the ID and also the text value
      const baseFieldName = key.slice(0, -7); // Remove _Text__ suffix
      const textValue = obj[baseFieldName];
      
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}": "${value}" // Translatable ID`);
        
        if (textValue !== undefined) {
          printOutput(`${' '.repeat((depth + 1) * 2)}"${baseFieldName}": "${textValue}" // Translated text`);
        }
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:${format(colors.reset, "")} ${format(colors.green, `"${value}"`)} ${format(colors.dim, "// Translatable ID")}`);
        
        if (textValue !== undefined) {
          printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${baseFieldName}"`)}:${format(colors.reset, "")} ${format(colors.green, `"${textValue}"`)} ${format(colors.dim, "// Translated text")}`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}":`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:`);
      }
      formatObject(value, depth + 1, maxDepth, options);
    } else if (typeof value === 'string') {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}": "${value}"`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:${format(colors.reset, "")} ${format(colors.green, `"${value}"`)}`);
      }
    } else if (typeof value === 'number') {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}": ${value}`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:${format(colors.reset, "")} ${format(colors.yellow, value.toString())}`);
      }
    } else if (typeof value === 'boolean') {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}": ${value}`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:${format(colors.reset, "")} ${format(colors.magenta, value.toString())}`);
      }
    } else if (value === null) {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}": null`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:${format(colors.reset, "")} ${format(colors.dim, "null")}`);
      }
    } else {
      if (markdownFormat) {
        printOutput(`${' '.repeat((depth + 1) * 2)}"${key}": ${value}`);
      } else {
        printOutput(`${' '.repeat((depth + 1) * 2)}${format(colors.cyan, `"${key}"`)}:${format(colors.reset, "")} ${value}`);
      }
    }
    
    // Add comma after all fields except the last one
    if (i < sortedKeys.length - 1) {
      const nextKey = sortedKeys[i + 1];
      // Don't add comma if the next field is an auto-generated text field that corresponds to the current field
      if (!(textFields[nextKey] && nextKey === key.slice(0, -7))) {
        printOutput(`${' '.repeat((depth + 1) * 2)},`);
      }
    }
  });
  
  printOutput(`${' '.repeat(depth * 2)}}`);
}

/**
 * Generate TypeScript type definitions for API structures
 */
function generateTypeScriptDefinitions(jsonData) {
  if (!jsonData.data) {
    console.log(`${colors.red}Error: No API data found in response${colors.reset}`);
    return;
  }
  
  const data = jsonData.data;
  const apiPath = data.Path ? data.Path.join('/') : 'Unknown';
  
  console.log(`\n${colors.bright}${colors.blue}TypeScript definitions for:${colors.reset} ${colors.green}${apiPath}${colors.reset}\n`);
  
  // Check if we need to include KlbDateTime definition
  let hasDateTimeFields = false;
  
  // Check table structure for datetime/timestamp fields
  if (data.table && data.table.Struct) {
    const fields = Object.keys(data.table.Struct).filter(key => !key.startsWith('_'));
    for (const field of fields) {
      const info = data.table.Struct[field];
      if (info.type && (info.type.toLowerCase() === 'datetime' || info.type.toLowerCase() === 'timestamp')) {
        hasDateTimeFields = true;
        break;
      }
    }
  }
  
  // Check procedure args for datetime/timestamp fields
  if (!hasDateTimeFields && data.procedure && data.procedure.args) {
    for (const arg of data.procedure.args) {
      if (arg.type && (arg.type.toLowerCase() === 'datetime' || arg.type.toLowerCase() === 'timestamp')) {
        hasDateTimeFields = true;
        break;
      }
    }
  }
  
  // Check method args for datetime/timestamp fields
  if (!hasDateTimeFields && data.func) {
    for (const func of data.func) {
      if (func.args) {
        for (const arg of func.args) {
          if (arg.type && (arg.type.toLowerCase() === 'datetime' || arg.type.toLowerCase() === 'timestamp')) {
            hasDateTimeFields = true;
            break;
          }
        }
      }
      if (hasDateTimeFields) break;
    }
  }
  
  // Include KlbDateTime definition if needed
  if (hasDateTimeFields) {
    console.log(`/**
 * KLB DateTime object structure
 */
export interface KlbDateTime {
  unix: number;    // Unix timestamp (seconds)
  us: number;      // Microseconds part
  iso: string;     // ISO formatted date string
  tz: string;      // Timezone identifier
  full: string;    // Full timestamp as string (seconds + microseconds)
  unixms: string;  // Unix timestamp with milliseconds as string
}
`);
  }
  
  // Handle procedures (methods)
  if (data.procedure) {
    generateProcedureTypes(data);
    return;
  }
  
  // Handle resource objects (table-based)
  if (data.table) {
    generateResourceTypes(data);
  }
  
  // Handle available methods (functions)
  if (data.func && data.func.length > 0) {
    generateMethodTypes(data);
  }
}

/**
 * Generate TypeScript types for a procedure (method)
 */
function generateProcedureTypes(data) {
  const procedure = data.procedure;
  const pathName = data.Path ? data.Path.join('') : 'Unknown';
  const interfaceName = `I${pathName}${pascalCase(procedure.name)}`;
  
  console.log(`/**\n * ${procedure.name} procedure interface\n */`);
  
  // Generate request interface
  console.log(`export interface ${interfaceName}Request {`);
  
  if (procedure.args && procedure.args.length > 0) {
    procedure.args.forEach(arg => {
      const optional = !arg.required ? '?' : '';
      
      // For foreign key references (fields ending with __)
      let type = 'any';
      if (arg.name.endsWith('__')) {
        type = 'string'; // UUID reference
      } else if (arg.name === 'erase' || arg.name.startsWith('is_') || arg.name.startsWith('has_')) {
        type = 'boolean';
      } else if (arg.name.includes('password')) {
        type = 'string';
      } else if (arg.name.endsWith('_id') || arg.name.includes('Id')) {
        type = 'string';
      } else if (arg.type) {
        type = mapToTsType(arg.type, arg);
      }
      
      const comment = arg.description ? ` // ${arg.description}` : '';
      
      console.log(`  ${arg.name}${optional}: ${type};${comment}`);
    });
  }
  
  console.log(`}\n`);
  
  // Generate response interface if known
  if (procedure.return_type) {
    console.log(`export interface ${interfaceName}Response {`);
    console.log(`  // Return type: ${procedure.return_type}`);
    console.log(`  data: any; // Replace with specific structure if known`);
    console.log(`}\n`);
  }
  
  // Generate usage example as a comment
  console.log(`/**`);
  console.log(` * Usage Example:`);
  console.log(` * `);
  
  const path = data.Path ? data.Path.join('/') : '';
  const funcName = procedure.name;
  
  console.log(` * // TypeScript`);
  console.log(` * const request: ${interfaceName}Request = {`);
  
  if (procedure.args && procedure.args.length > 0) {
    procedure.args.forEach(arg => {
      const exampleValue = getExampleValue(arg.type);
      console.log(`  * ${arg.name}: ${exampleValue},`);
    });
  }
  
  console.log(` * };`);
  console.log(` * `);
  if (procedure.static) {
    console.log(` * const response = await klbfw.rest<${interfaceName}Response>('${path}:${funcName}', 'POST', request);`);
  } else {
    console.log(` * const response = await klbfw.rest<${interfaceName}Response>('${path}/\${id}:${funcName}', 'POST', request);`);
  }
  console.log(` */`);
}

/**
 * Generate TypeScript types for a resource (table-based object)
 */
function generateResourceTypes(data) {
  const table = data.table;
  const pathName = data.Path ? data.Path.join('') : 'Unknown';
  const interfaceName = `I${pathName}`;
  
  console.log(`/**\n * ${table.Name} resource interface\n */`);
  console.log(`export interface ${interfaceName} {`);
  
  // Add fields from the structure
  if (table.Struct) {
    const fields = Object.keys(table.Struct).filter(key => !key.startsWith('_'));
    
    // Collect translatable text fields
    const textFields = {};
    fields.forEach(field => {
      if (field.endsWith('_Text__')) {
        const baseFieldName = field.slice(0, -7); // Remove _Text__ suffix
        textFields[baseFieldName] = true;
      }
    });
    
    fields.forEach(field => {
      const info = table.Struct[field];
      const optional = info.null !== false ? '?' : '';
      const type = mapToTsType(info.type, info);
      
      // Add comment for special fields or validators
      let comment = '';
      if (info.validator) {
        comment = ` // ${info.validator}`;
      } else if (info.protect) {
        comment = ` // protected`;
      }
      
      console.log(`  ${field}${optional}: ${type};${comment}`);
      
      // Add generated text field for fields ending with _Text__
      if (field.endsWith('_Text__')) {
        const baseFieldName = field.slice(0, -7); // Remove _Text__ suffix
        console.log(`  ${baseFieldName}?: string; // Auto-generated translated text field`);
      }
    });
  }
  
  console.log(`}\n`);
  
  // Generate ID type if there's a primary key
  if (table.Struct && table.Struct._primary) {
    const primaryKeys = table.Struct._primary;
    
    if (primaryKeys.length === 1) {
      const keyField = primaryKeys[0];
      const keyInfo = table.Struct[keyField] || {};
      const keyType = keyInfo ? mapToTsType(keyInfo.type, keyInfo) : 'string';
      
      console.log(`/**\n * ID type for ${table.Name}\n */`);
      console.log(`export type ${interfaceName}ID = ${keyType};\n`);
    } else if (primaryKeys.length > 1) {
      console.log(`/**\n * Composite ID type for ${table.Name}\n */`);
      console.log(`export interface ${interfaceName}ID {`);
      
      primaryKeys.forEach(key => {
        const keyInfo = table.Struct[key] || {};
        const keyType = keyInfo ? mapToTsType(keyInfo.type, keyInfo) : 'string';
        console.log(`  ${key}: ${keyType};`);
      });
      
      console.log(`}\n`);
    }
  }
}

/**
 * Generate TypeScript types for available methods
 */
function generateMethodTypes(data) {
  const funcs = data.func;
  const pathName = data.Path ? data.Path.join('') : 'Unknown';
  
  funcs.forEach(func => {
    const interfaceName = `I${pathName}${pascalCase(func.name)}`;
    
    console.log(`/**\n * ${func.name} method interface${func.static ? ' (static)' : ''}\n */`);
    
    // Generate request interface
    console.log(`export interface ${interfaceName}Request {`);
    
    if (func.args && func.args.length > 0) {
      func.args.forEach(arg => {
        const optional = !arg.required ? '?' : '';
        
        // For foreign key references (fields ending with __)
        let type = 'any';
        if (arg.name.endsWith('__')) {
          type = 'string'; // UUID reference
        } else if (arg.name === 'erase' || arg.name.startsWith('is_') || arg.name.startsWith('has_')) {
          type = 'boolean';
        } else if (arg.name.includes('password')) {
          type = 'string';
        } else if (arg.name.endsWith('_id') || arg.name.includes('Id')) {
          type = 'string';
        } else if (arg.type) {
          type = mapToTsType(arg.type, arg);
        }
        
        const comment = arg.description ? ` // ${arg.description}` : '';
        
        console.log(`  ${arg.name}${optional}: ${type};${comment}`);
      });
    }
    
    console.log(`}\n`);
    
    // Generate response interface if return type is known
    if (func.return_type) {
      console.log(`export interface ${interfaceName}Response {`);
      console.log(`  // Return type: ${func.return_type}`);
      console.log(`  data: any; // Replace with specific structure if known`);
      console.log(`}\n`);
    }
    
    // Generate usage example as a comment
    console.log(`/**`);
    console.log(` * Usage Example:`);
    console.log(` * `);
    
    const path = data.Path ? data.Path.join('/') : '';
    const funcName = func.name;
    
    console.log(` * // TypeScript`);
    console.log(` * const request: ${interfaceName}Request = {`);
    
    if (func.args && func.args.length > 0) {
      func.args.forEach(arg => {
        const exampleValue = getExampleValue(arg.type);
        console.log(`  * ${arg.name}: ${exampleValue},`);
      });
    }
    
    console.log(` * };`);
    console.log(` * `);
    if (func.static) {
      console.log(` * const response = await klbfw.rest<${interfaceName}Response>('${path}:${funcName}', 'POST', request);`);
    } else {
      console.log(` * const response = await klbfw.rest<${interfaceName}Response>('${path}/\${id}:${funcName}', 'POST', request);`);
    }
    console.log(` */\n`);
  });
}

/**
 * Map API types to TypeScript types
 */
function mapToTsType(apiType, info = {}) {
  if (!apiType) return 'any';
  
  // Convert to lowercase for case-insensitive matching
  const type = apiType.toLowerCase();
  
  // Map SQL types to TypeScript types
  const sqlTypeMap = {
    // Numeric types
    'int': 'number',
    'integer': 'number',
    'tinyint': 'number',
    'smallint': 'number',
    'mediumint': 'number',
    'bigint': info.unsigned ? 'number' : 'number',
    'decimal': 'number',
    'float': 'number',
    'double': 'number',
    'number': 'number',
    
    // String types
    'char': info.validator === 'uuid' ? 'string' : 'string',
    'varchar': 'string',
    'text': 'string',
    'tinytext': 'string',
    'mediumtext': 'string',
    'longtext': 'string',
    'string': 'string',
    
    // Date/time types
    'date': 'string', // ISO date string
    'datetime': 'KlbDateTime', // KlbDateTime object
    'timestamp': 'KlbDateTime', // KlbDateTime object
    'time': 'string',
    'year': 'number',
    
    // Special types
    'enum': info.values ? `'${info.values.join('\' | \'')}' | null` : 'string',
    'set': info.values ? `string[]` : 'string[]',
    'json': 'Record<string, any>',
    'blob': 'string', // Base64 encoded
    'binary': 'string', // Base64 encoded
    'varbinary': 'string', // Base64 encoded
    
    // Boolean (often stored as TINYINT(1))
    'bool': 'boolean',
    'boolean': 'boolean',
    
    // Array and object types
    'array': 'any[]',
    'object': 'Record<string, any>',
  };
  
  // Map validator types to more specific TypeScript types
  const validatorMap = {
    'uuid': 'string', // UUIDs
    'email': 'string', // Email addresses
    'url': 'string', // URLs
    'phone': 'string', // Phone numbers
    'password': 'string', // Passwords (hashed)
    'login': 'string', // Login names
    'language': 'string', // Language codes
  };
  
  // Check for validators
  if (info.validator && validatorMap[info.validator]) {
    return validatorMap[info.validator];
  }
  
  // Handle ENUM types with specific literal union type
  if (type === 'enum' && info.values) {
    return `'${info.values.join('\' | \'')}'${info.null !== false ? ' | null' : ''}`;
  }
  
  // Handle SET types
  if (type === 'set' && info.values) {
    return 'string[]';
  }
  
  // Foreign key references (usually CHAR(36) with UUID validator)
  if (info.validator === 'uuid') {
    return 'string'; // UUID string
  }
  
  // Use the SQL type map for regular types
  return sqlTypeMap[type] || 'any';
}

/**
 * Convert a string to PascalCase (for interface names)
 */
function pascalCase(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return letter.toUpperCase();
    })
    .replace(/[\s-_]+/g, '');
}

/**
 * Get example values for different types
 */
function getExampleValue(type) {
  if (!type) return 'null';
  
  const examples = {
    'bool': 'true',
    'boolean': 'true',
    'int': '123',
    'integer': '123',
    'float': '12.34',
    'double': '12.34',
    'number': '123',
    'string': '"example"',
    'text': '"example text"',
    'json': '{ key: "value" }',
    'array': '[]',
    'object': '{}',
    'date': '"2023-01-01"',
    'datetime': '{ unix: 1742172348, us: 311592, iso: "2025-03-17 09:45:48.311592", tz: "Asia/Tokyo", full: "1742172348311592", unixms: "1742172348311" }',
    'timestamp': '{ unix: 1742172348, us: 311592, iso: "2025-03-17 09:45:48.311592", tz: "Asia/Tokyo", full: "1742172348311592", unixms: "1742172348311" }',
    'email': '"user@example.com"',
    'url': '"https://example.com"',
    'file': '"file_id"',
  };
  
  return examples[type.toLowerCase()] || 'null';
}

/**
 * Format JSON response in a more readable way
 */
function formatJsonResponse(jsonData, options = {}) {
  const { fullOutput = true } = options;
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
  
  // Display description if available
  if (data.description) {
    console.log(`\n${colors.bright}Description:${colors.reset}`);
    console.log(`${colors.dim}${data.description}${colors.reset}`);
  }
  
  // Display procedure info
  if (data.procedure) {
    // For procedures, show detailed information
    console.log(`\n${colors.bright}${colors.blue}Procedure Details:${colors.reset}`);
    console.log(`${colors.cyan}Name:${colors.reset} ${data.procedure.name}`);
    console.log(`${colors.cyan}Type:${colors.reset} ${data.procedure.static ? 'Static' : 'Instance'} Method`);
    
    // Display procedure description if available
    if (data.procedure.description) {
      console.log(`\n${colors.bright}Description:${colors.reset}`);
      console.log(`${colors.dim}${data.procedure.description}${colors.reset}`);
    }
    
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
      if (data.procedure.static) {
        console.log(`klbfw.rest('${pathStr}:${procName}', 'POST', {${argPairs.join(', ')}})`);
      } else {
        console.log(`klbfw.rest('${pathStr}/\${id}:${procName}', 'POST', {${argPairs.join(', ')}})`);
      }
      
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
        if (data.procedure.static) {
          console.log(`GET /_rest/${pathStr}:${procName}?${queryParams}`);
        } else {
          console.log(`GET /_rest/${pathStr}/\${id}:${procName}?${queryParams}`);
        }
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
        
        // Show argument description if available
        if (arg.description) {
          console.log(`    ${colors.dim}${arg.description}${colors.reset}`);
        }
      });
    } else {
      console.log(`\n${colors.dim}No arguments required${colors.reset}`);
    }
    
    // Show return description if available
    if (data.procedure.return_description) {
      console.log(`\n${colors.bright}Returns:${colors.reset}`);
      console.log(`  ${colors.dim}${data.procedure.return_description}${colors.reset}`);
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
    
    // Show all fields by default
    const headerText = 'All Fields:';
    
    if (fields.length > 0) {
      // Collect translatable text fields
      const textFields = {};
      fields.forEach(field => {
        if (field.endsWith('_Text__')) {
          const baseFieldName = field.slice(0, -7); // Remove _Text__ suffix
          textFields[baseFieldName] = true;
        }
      });
      
      console.log(`\n${colors.bright}${headerText}${colors.reset}`);
      fields.forEach(field => {
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
        
        // Add note for translatable fields
        if (field.endsWith('_Text__')) {
          fieldDesc += ` ${colors.dim}(translatable text ID)${colors.reset}`;
        } else if (textFields[field]) {
          fieldDesc += ` ${colors.dim}(auto-generated translated text)${colors.reset}`;
        }
        
        console.log(fieldDesc);
        
        // Show field description if available
        if (info.description) {
          console.log(`    ${colors.dim}${info.description}${colors.reset}`);
        }
        
        // For translatable fields, add a note about the auto-generated text field
        if (field.endsWith('_Text__')) {
          const baseFieldName = field.slice(0, -7); // Remove _Text__ suffix
          console.log(`    ${colors.dim}Translatable text ID. The translated text will be available in the '${baseFieldName}' field.${colors.reset}`);
        }
      });
    }
  }
  
  // Display available functions
  if (data.func && data.func.length > 0) {
    console.log(`\n${colors.bright}${colors.blue}Available Methods:${colors.reset}`);
    data.func.forEach(func => {
      console.log(`  ${colors.green}${func.name}${colors.reset}${func.static ? ' (static)' : ''}`);
      
      // Show method description if available
      if (func.description) {
        console.log(`    ${colors.dim}${func.description}${colors.reset}`);
      }
      
      if (func.args && func.args.length > 0) {
        // Always show detailed arguments
        console.log(`    ${colors.bright}Arguments:${colors.reset}`);
        func.args.forEach(arg => {
          let argDesc = `      ${colors.yellow}${arg.name}${colors.reset}`;
          if (arg.type) {
            argDesc += ` (${arg.type})`;
          }
          if (arg.required) {
            argDesc += ` ${colors.red}*${colors.reset}`;
          }
          console.log(argDesc);
          
          // Show description if available
          if (arg.description) {
            console.log(`        ${colors.dim}${arg.description}${colors.reset}`);
          }
        });
      }
      
      // Show return type and description if available
      if (func.return_type) {
        console.log(`    ${colors.dim}Returns: ${func.return_type}${colors.reset}`);
      }
      if (func.return_description) {
        console.log(`    ${colors.dim}Return Description: ${func.return_description}${colors.reset}`);
      }
      
      // Show usage example
      if (data.Path) {
        const pathStr = data.Path.join('/');
        const funcName = func.name;
        console.log(`    ${colors.bright}Usage:${colors.reset}`);
        
        // Arguments for usage example
        const args = func.args || [];
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
        
        if (func.static) {
          console.log(`    ${colors.dim}klbfw.rest('${pathStr}:${funcName}', 'POST', {${argPairs.join(', ')}})${colors.reset}`);
        } else {
          console.log(`    ${colors.dim}klbfw.rest('${pathStr}/\${id}:${funcName}', 'POST', {${argPairs.join(', ')}})${colors.reset}`);
        }
      }
      
      // Add a couple of empty lines between methods for better readability
      console.log('\n');
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
 * Retrieve and display available API objects from the root endpoint
 */
function describeRootObjects(options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      output = console.log,      // Function to use for output
      useColors = true,          // Whether to use ANSI colors
      markdownFormat = false     // Whether to use markdown formatting
    } = options;
    
    // Choose output format based on options
    const printOutput = (text) => output(text);
    
    // Helper to format text with or without colors
    const format = (colorFn, text) => {
      if (!useColors) return text;
      return colorFn + text + colors.reset;
    };

    const reqUrl = url.parse(`https://${DEFAULT_API_HOST}${API_PREFIX}`);
    
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
          if (markdownFormat) {
            printOutput(`**Status:** ${res.statusCode}`);
            printOutput(`**Error:** Unable to fetch root API information`);
          } else {
            printOutput(`${format(colors.bright, "Status:")} ${format(colors.red, res.statusCode.toString())}`);
            printOutput(`${format(colors.red, "Error: Unable to fetch root API information")}`);
          }
          resolve();
          return;
        }
        
        try {
          const jsonData = JSON.parse(data);
          
          if (jsonData.data && jsonData.data.prefix) {
            if (markdownFormat) {
              printOutput(`\n## Available API Objects\n`);
            } else {
              printOutput(`\n${format(colors.bright + colors.blue, "Available API Objects:")}\n`);
            }
            
            // Group by first letter to organize large lists
            const groups = {};
            jsonData.data.prefix.forEach(prefix => {
              const firstChar = prefix.name.charAt(0).toUpperCase();
              if (!groups[firstChar]) groups[firstChar] = [];
              groups[firstChar].push(prefix);
            });
            
            // Display grouped endpoints
            Object.keys(groups).sort().forEach(letter => {
              if (markdownFormat) {
                printOutput(`### ${letter}`);
              } else {
                printOutput(`  ${format(colors.bright, letter)}`);
              }
              
              // Sort endpoints within each group
              const sortedEndpoints = groups[letter].sort((a, b) => a.name.localeCompare(b.name));
              
              if (markdownFormat) {
                const endpointList = sortedEndpoints.map(endpoint => {
                  return endpoint.description 
                    ? `- \`${endpoint.name}\` - ${endpoint.description}` 
                    : `- \`${endpoint.name}\``;
                }).join('\n');
                printOutput(endpointList);
                printOutput(''); // Add space between groups
              } else {
                sortedEndpoints.forEach(endpoint => {
                  printOutput(`    ${format(colors.green, endpoint.name)}${endpoint.description ? ` - ${format(colors.dim, endpoint.description)}` : ''}`);
                });
                printOutput(''); // Add space between groups
              }
            });
            
            if (markdownFormat) {
              printOutput(`*Run with a specific API path to get more details about an object.*`);
              printOutput(`*Example: \`npx @karpeleslab/klbfw-describe User\`*`);
            } else {
              printOutput(`${format(colors.dim, "Run with a specific API path to get more details about an object.")}`);
              printOutput(`${format(colors.dim, "Example: npx @karpeleslab/klbfw-describe User")}`);
            }
          } else {
            if (markdownFormat) {
              printOutput(`**Error:** Could not retrieve API object list.`);
            } else {
              printOutput(`${format(colors.red, "Error: Could not retrieve API object list.")}`);
            }
          }
          resolve();
        } catch (e) {
          if (markdownFormat) {
            printOutput(`**Error parsing API response:** ${e.message}`);
          } else {
            printOutput(`${format(colors.red, "Error parsing API response:")} ${e.message}`);
          }
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      if (markdownFormat) {
        printOutput(`**Error:** ${e.message}`);
      } else {
        printOutput(`${format(colors.red, "Error:")} ${e.message}`);
      }
      reject(e);
    });
    
    req.end();
  });
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`${colors.bright}Usage:${colors.reset} npx @karpeleslab/klbfw-describe [options] <api-path>`);
  console.log(`\n${colors.bright}Options:${colors.reset}`);
  console.log(`  --raw              Show raw JSON output without formatting`);
  console.log(`  --ts, --types      Generate TypeScript type definitions`);
  console.log(`  --get              Perform a GET request instead of OPTIONS`);
  console.log(`  --doc [file]       Fetch documentation from GitHub (default: README.md)`);
  console.log(`  --mcp              Start an MCP server on stdio for programmatic access`);
  console.log(`  --help, -h         Show this help message`);
  console.log(`\n${colors.bright}Examples:${colors.reset}`);
  console.log(`  npx @karpeleslab/klbfw-describe User`);
  console.log(`  npx @karpeleslab/klbfw-describe Misc/Debug`);
  console.log(`  npx @karpeleslab/klbfw-describe Misc/Debug:testUpload`);
  console.log(`  npx @karpeleslab/klbfw-describe --raw User`);
  console.log(`  npx @karpeleslab/klbfw-describe --ts User`);
  console.log(`  npx @karpeleslab/klbfw-describe --get User/12345`);
  console.log(`  npx @karpeleslab/klbfw-describe --doc`);
  console.log(`  npx @karpeleslab/klbfw-describe --doc apibasics.md`);
  console.log(`  npx @karpeleslab/klbfw-describe --mcp`);
}

// Import MCP SDK dependencies
// We'll need to import dynamically since MCP SDK is an ESM module
let z;
try {
  // Zod is used for schema validation in MCP tool parameter definitions
  z = require('zod');
} catch (err) {
  console.error(`Error loading zod module: ${err.message}`);
  // We'll handle missing dependencies in startMcpServer()
}

/**
 * Start a simple JSON-RPC server on stdio
 * 
 * This implements a basic JSON-RPC server for programmatic access to the
 * API description functionality. It handles requests in the MCP format.
 */
async function startMcpServer() {
  console.log(`${colors.bright}${colors.blue}Starting MCP server...${colors.reset}`);
  
  try {
    // Create output collectors for our APIs
    const bufferOutput = async (fn, args) => {
      // Create a buffer to collect output
      let buffer = [];
      
      // Create a collecting function
      const collect = (text) => {
        if (text !== undefined && text !== null) {
          buffer.push(text);
        }
      };
      
      // Call the function with our collector
      await fn(args, {
        output: collect,
        useColors: false,
        markdownFormat: true
      });
      
      // Return the collected output
      return buffer.join('\n');
    };
    
    // Define our available tools and their handlers
    const tools = {
      // Describe API endpoint
      describe: async (args) => {
        try {
          const apiPath = args.apiPath;
          const raw = args.raw || false;
          const typescript = args.typescript || false;
          
          // Create a buffer to collect output
          let buffer = [];
          const collect = (text) => {
            if (text !== undefined && text !== null) {
              buffer.push(text);
            }
          };
          
          // Call the API description function with all options
          await describeApi(apiPath, {
            rawOutput: raw,
            typeScriptOutput: typescript,
            output: collect,
            useColors: false,
            markdownFormat: true
          });
          
          return {
            content: [{ type: "text", text: buffer.join('\n') }]
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `## Error\n${err.message}` }],
            isError: true
          };
        }
      },
      
      // GET request
      get: async (args) => {
        try {
          const apiPath = args.apiPath;
          const raw = args.raw || false;
          
          // Create a buffer to collect output
          let buffer = [];
          const collect = (text) => {
            if (text !== undefined && text !== null) {
              buffer.push(text);
            }
          };
          
          // Call the API description function with all options
          await getApiResource(apiPath, {
            rawOutput: raw,
            output: collect,
            useColors: false,
            markdownFormat: true
          });
          
          return {
            content: [{ type: "text", text: buffer.join('\n') }]
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `## Error\n${err.message}` }],
            isError: true
          };
        }
      },
      
      // List objects
      listObjects: async () => {
        try {
          // For the listObjects method, we need a special handler since it doesn't take arguments
          let buffer = [];
          const collect = (text) => {
            if (text !== undefined && text !== null) {
              buffer.push(text);
            }
          };
          
          await describeRootObjects({ 
            output: collect,
            useColors: false,
            markdownFormat: true
          });
          
          return {
            content: [{ type: "text", text: buffer.join('\n') || "## Available API Objects\n\nNo API objects found." }]
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `## Error\n${err.message}` }],
            isError: true
          };
        }
      },
      
      // Fetch documentation
      doc: async (args) => {
        try {
          const fileName = args.fileName || 'README.md';
          const output = await bufferOutput(fetchDocumentation, fileName);
          return {
            content: [{ type: "text", text: output }]
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `## Error\n${err.message}` }],
            isError: true
          };
        }
      }
    };
    
    // Start listening for JSON-RPC requests on stdin
    process.stdin.setEncoding('utf8');
    
    console.log(`${colors.dim}MCP server started on stdio. Waiting for commands...${colors.reset}`);
    
    // Listen for JSON-RPC requests
    process.stdin.on('data', async (data) => {
      try {
        // Parse the JSON-RPC request
        const request = JSON.parse(data);
        
        // Check if it's a valid JSON-RPC request
        if (request.jsonrpc !== '2.0' || !request.id || !request.method) {
          const error = {
            jsonrpc: '2.0',
            id: request.id || null,
            error: {
              code: -32600,
              message: 'Invalid Request'
            }
          };
          process.stdout.write(JSON.stringify(error) + '\n');
          return;
        }
        
        // Handle tools/call method
        if (request.method === 'tools/call') {
          const toolName = request.params.name;
          const toolArgs = request.params.arguments;
          
          // Check if the tool exists
          if (!tools[toolName]) {
            const error = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: 'Method not found'
              }
            };
            process.stdout.write(JSON.stringify(error) + '\n');
            return;
          }
          
          try {
            // Call the tool handler
            const result = await tools[toolName](toolArgs);
            
            // Send the response
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: result
            };
            process.stdout.write(JSON.stringify(response) + '\n');
          } catch (err) {
            // Handle tool execution error
            const error = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32000,
                message: err.message
              }
            };
            process.stdout.write(JSON.stringify(error) + '\n');
          }
        } else {
          // Method not supported
          const error = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
          process.stdout.write(JSON.stringify(error) + '\n');
        }
      } catch (err) {
        // Handle parse error
        const error = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error'
          }
        };
        process.stdout.write(JSON.stringify(error) + '\n');
      }
    });
    
    // Keep the process running
    process.stdin.resume();
  } catch (err) {
    console.error(`${colors.red}Error starting MCP server:${colors.reset} ${err.message}`);
    console.error(`${colors.red}Stack:${colors.reset} ${err.stack}`);
    
    // Create a JSON-RPC error response for the client
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32000,
        message: `Server initialization error: ${err.message}`
      }
    };
    
    // Send the error to stdout and exit
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
    process.exit(1);
  }
}

// Parse command line arguments
let rawOutput = false;
let typeScriptOutput = false;
let getRequest = false;
let docMode = false;
let docFileName = 'README.md';
let mcpMode = false;
let apiPath = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--raw') {
    rawOutput = true;
  } else if (arg === '--ts' || arg === '--types') {
    typeScriptOutput = true;
  } else if (arg === '--get') {
    getRequest = true;
  } else if (arg === '--doc') {
    docMode = true;
    // Check if there's a filename specified after --doc
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      docFileName = args[i + 1];
      i++; // Skip the next argument as we've already processed it
    }
  } else if (arg === '--mcp') {
    mcpMode = true;
  } else if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  } else if (!apiPath && !arg.startsWith('--')) {
    apiPath = arg;
  }
}

// Execute in the appropriate mode
if (mcpMode) {
  // Need to use top-level await for ESM import
  (async () => {
    await startMcpServer();
  })();
} else if (docMode) {
  // Fetch documentation from GitHub
  fetchDocumentation(docFileName);
} else if (!apiPath) {
  printUsage();
  console.log('\n' + colors.bright + 'Retrieving available API objects...' + colors.reset);
  // Get root objects with OPTIONS on /_rest/
  describeRootObjects();
} else if (getRequest) {
  // Execute a GET request
  getApiResource(apiPath, { rawOutput });
} else {
  // Execute the API description
  describeApi(apiPath, { rawOutput, typeScriptOutput });
}