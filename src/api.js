import https from 'https';
import { parse } from 'url';
import { DEFAULT_API_HOST, API_PREFIX, DOC_REPO_URL, colors } from './constants.js';
import { formatMarkdown, createFormatter } from './utils.js';

/**
 * Perform an OPTIONS request to the specified API endpoint
 */
export function describeApi(apiPath, options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      rawOutput = false, 
      typeScriptOutput = false,
      output = console.log,
      useColors = true,
      markdownFormat = false
    } = options;
    
    const { printOutput, format } = createFormatter({ useColors, output });
    
    if (markdownFormat) {
      printOutput(`## Describing API endpoint: \`${apiPath}\``);
      printOutput(`**Host:** ${DEFAULT_API_HOST}\n`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Describing API endpoint:")} ${format(colors.green, apiPath)}`);
      printOutput(`${format(colors.dim, "Host: " + DEFAULT_API_HOST)}\n`);
    }
    
    const reqUrl = parse(`https://${DEFAULT_API_HOST}${API_PREFIX}${apiPath}`);
    
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
 * Perform a GET request to the specified API endpoint
 */
export function getApiResource(apiPath, options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      rawOutput = false,
      output = console.log,
      useColors = true,
      markdownFormat = false
    } = options;
    
    const { printOutput, format } = createFormatter({ useColors, output });
    
    if (markdownFormat) {
      printOutput(`## GET request to API endpoint: \`${apiPath}\``);
      printOutput(`**Host:** ${DEFAULT_API_HOST}\n`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "GET request to API endpoint:")} ${format(colors.green, apiPath)}`);
      printOutput(`${format(colors.dim, "Host: " + DEFAULT_API_HOST)}\n`);
    }
    
    const reqUrl = parse(`https://${DEFAULT_API_HOST}${API_PREFIX}${apiPath}`);
    
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
        if (res.statusCode !== 200) {
          if (markdownFormat) {
            printOutput(`**Status:** ${res.statusCode}`);
            printOutput(`**Error:** Unable to fetch API resource`);
          } else {
            printOutput(`${format(colors.bright, "Status:")} ${format(colors.red, res.statusCode.toString())}`);
            printOutput(`${format(colors.red, "Error: Unable to fetch API resource")}`);
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
export function fetchDocumentation(fileName = 'README.md', options = {}) {
  return new Promise((resolve, reject) => {
    const { 
      output = console.log,
      useColors = true,
      markdownFormat = false
    } = options;
    
    const { printOutput, format } = createFormatter({ useColors, output });
    
    const docUrl = parse(`${DOC_REPO_URL}${fileName}`);
    
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
 * Format JSON API response for display
 */
export function formatJsonResponse(jsonData, options = {}) {
  const { 
    output = console.log,
    useColors = true,
    markdownFormat = false,
    depth = 0
  } = options;
  
  const { printOutput, format } = createFormatter({ useColors, output });
  
  if (!jsonData.data) {
    if (markdownFormat) {
      printOutput(`**Error:** No API data found in response`);
    } else {
      printOutput(`${format(colors.red, "Error: No API data found in response")}`);
    }
    return;
  }
  
  const data = jsonData.data;
  
  // Display API path information
  if (data.Path) {
    const apiPath = data.Path.join('/');
    if (markdownFormat) {
      printOutput(`\n### API Path: \`${apiPath}\``);
    } else {
      printOutput(`\n${format(colors.bright + colors.green, "API Path:")} ${format(colors.cyan, apiPath)}`);
    }
  }
  
  // Display type information if available
  if (data.type) {
    if (markdownFormat) {
      printOutput(`\n### Type: \`${data.type}\``);
    } else {
      printOutput(`\n${format(colors.bright, "Type:")} ${format(colors.yellow, data.type)}`);
    }
  }
  
  // Display class description if available (from the description field)
  if (data.description) {
    if (markdownFormat) {
      printOutput(`\n### Class Description\n${data.description}`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Class Description:")}`);
      printOutput(data.description);
    }
  } else if (data.desc) {
    // For backward compatibility, also check the desc field
    if (markdownFormat) {
      printOutput(`\n### Description\n${data.desc}`);
    } else {
      printOutput(`\n${format(colors.bright, "Description:")}`);
      printOutput(data.desc);
    }
  }
  
  // Display access level if available
  if (data.access) {
    if (markdownFormat) {
      printOutput(`\n### Access Level: \`${data.access}\``);
    } else {
      printOutput(`\n${format(colors.bright, "Access Level:")} ${format(colors.yellow, data.access)}`);
    }
  }
  
  // Display allowed methods if available
  if (data.allowed_methods && data.allowed_methods.length > 0) {
    if (markdownFormat) {
      printOutput(`\n### Allowed Methods: \`${data.allowed_methods.join(', ')}\``);
    } else {
      printOutput(`\n${format(colors.bright, "Allowed Methods:")} ${format(colors.cyan, data.allowed_methods.join(', '))}`);
    }
  }
  
  // Display allowed object methods if available
  if (data.allowed_methods_object && data.allowed_methods_object.length > 0) {
    if (markdownFormat) {
      printOutput(`\n### Allowed Object Methods: \`${data.allowed_methods_object.join(', ')}\``);
    } else {
      printOutput(`\n${format(colors.bright, "Allowed Object Methods:")} ${format(colors.cyan, data.allowed_methods_object.join(', '))}`);
    }
  }
  
  // Display available prefixes/subresources if available
  if (data.prefix && data.prefix.length > 0) {
    if (markdownFormat) {
      printOutput(`\n### Available Subresources\n`);
      printOutput(`| Name | Methods |`);
      printOutput(`| ---- | ------- |`);
      
      for (const prefix of data.prefix) {
        const name = prefix.name || '';
        const methods = prefix.methods ? prefix.methods.join(', ') : '';
        
        printOutput(`| ${name} | ${methods} |`);
      }
    } else {
      printOutput(`\n${format(colors.bright + colors.magenta, "Available Subresources:")}\n`);
      
      for (const prefix of data.prefix) {
        const name = prefix.name || '';
        const methods = prefix.methods ? prefix.methods.join(', ') : '';
        
        printOutput(`  ${format(colors.green, name.padEnd(20))} ${format(colors.cyan, methods)}`);
      }
    }
  }
  
  // Display table structure if available
  if (data.table && data.table.Struct) {
    if (markdownFormat) {
      printOutput(`\n### Table Structure\n`);
      printOutput(`| Field | Type | Required | Description |`);
      printOutput(`| ----- | ---- | -------- | ----------- |`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Table Structure:")}\n`);
    }
    
    const fields = Object.keys(data.table.Struct).filter(key => !key.startsWith('_'));
    
    for (const field of fields) {
      const info = data.table.Struct[field];
      const required = info.null === false ? 'Yes' : 'No';
      const desc = info.desc || '';
      
      if (markdownFormat) {
        printOutput(`| ${field} | ${info.type || ''} | ${required} | ${desc} |`);
      } else {
        printOutput(`  ${format(colors.green, field.padEnd(20))} ${(info.type || '').padEnd(15)} ${required.padEnd(10)} ${desc}`);
      }
    }
  }
  
  // Display procedure information if available
  if (data.procedure) {
    if (markdownFormat) {
      printOutput(`\n### Procedure: \`${data.procedure.name || ''}\``);
      
      if (data.procedure.description) {
        printOutput(`\n${data.procedure.description}`);
      } else if (data.procedure.desc) {
        printOutput(`\n${data.procedure.desc}`);
      }
      
      if (data.procedure.return_description) {
        printOutput(`\n**Returns:** ${data.procedure.return_description}`);
      }
      
      if (data.procedure.args && data.procedure.args.length > 0) {
        printOutput(`\n#### Arguments\n`);
        printOutput(`| Name | Type | Required | Description |`);
        printOutput(`| ---- | ---- | -------- | ----------- |`);
        
        for (const arg of data.procedure.args) {
          const required = arg.required ? 'Yes' : 'No';
          const desc = arg.description || arg.desc || '';
          const type = arg.type || '';
          
          printOutput(`| ${arg.name || ''} | ${type} | ${required} | ${desc} |`);
        }
      }
    } else {
      printOutput(`\n${format(colors.bright + colors.magenta, "Procedure:")} ${format(colors.green, data.procedure.name || '')}`);
      
      if (data.procedure.description) {
        printOutput(`\n${data.procedure.description}`);
      } else if (data.procedure.desc) {
        printOutput(`\n${data.procedure.desc}`);
      }
      
      if (data.procedure.return_description) {
        printOutput(`\n${format(colors.bright, "Returns:")} ${data.procedure.return_description}`);
      }
      
      if (data.procedure.args && data.procedure.args.length > 0) {
        printOutput(`\n${format(colors.bright, "Arguments:")}\n`);
        
        for (const arg of data.procedure.args) {
          const required = arg.required ? 'Yes' : 'No';
          const desc = arg.description || arg.desc || '';
          const type = arg.type || '';
          
          printOutput(`  ${format(colors.cyan, (arg.name || '').padEnd(20))} ${type.padEnd(15)} ${required.padEnd(10)} ${desc}`);
        }
      }
    }
  }
  
  // Display available methods if available
  if (data.func && data.func.length > 0) {
    if (markdownFormat) {
      printOutput(`\n### Available Methods\n`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Available Methods:")}\n`);
    }
    
    for (const func of data.func) {
      const methodName = func.name || '';
      const isStatic = func.static ? 'static ' : '';
      
      if (markdownFormat) {
        printOutput(`#### \`${isStatic}${methodName}()\``);
        
        if (func.description) {
          printOutput(`\n${func.description}`);
        } else if (func.desc) {
          printOutput(`\n${func.desc}`);
        }
        
        if (func.return_description) {
          printOutput(`\n**Returns:** ${func.return_description}`);
        }
        
        if (func.args && func.args.length > 0) {
          printOutput(`\n##### Arguments\n`);
          printOutput(`| Name | Type | Required | Description |`);
          printOutput(`| ---- | ---- | -------- | ----------- |`);
          
          for (const arg of func.args) {
            const required = arg.required ? 'Yes' : 'No';
            const desc = arg.description || arg.desc || '';
            const type = arg.type || '';
            
            printOutput(`| ${arg.name || ''} | ${type} | ${required} | ${desc} |`);
          }
        }
      } else {
        printOutput(`  ${format(colors.bright + colors.green, `${isStatic}${methodName}()`)}`);
        
        if (func.description) {
          printOutput(`    ${func.description}`);
        } else if (func.desc) {
          printOutput(`    ${func.desc}`);
        }
        
        if (func.return_description) {
          printOutput(`    ${format(colors.bright, "Returns:")} ${func.return_description}`);
        }
        
        if (func.args && func.args.length > 0) {
          printOutput(`    ${format(colors.dim, "Arguments:")}`);
          
          for (const arg of func.args) {
            const required = arg.required ? 'Yes' : 'No';
            const desc = arg.description || arg.desc || '';
            const type = arg.type || '';
            
            printOutput(`      ${format(colors.cyan, (arg.name || '').padEnd(20))} ${type.padEnd(15)} ${required.padEnd(10)} ${desc}`);
          }
        }
        
        printOutput(''); // Blank line between methods
      }
    }
  }
}

/**
 * Generate TypeScript type definitions for API structures
 */
export function generateTypeScriptDefinitions(jsonData, options = {}) {
  const { 
    output = console.log,
    useColors = true,
    markdownFormat = false
  } = options;
  
  const { printOutput, format } = createFormatter({ useColors, output });
  
  if (!jsonData.data) {
    if (markdownFormat) {
      printOutput(`**Error:** No API data found in response`);
    } else {
      printOutput(`${format(colors.red, "Error: No API data found in response")}`);
    }
    return;
  }
  
  const data = jsonData.data;
  const apiPath = data.Path ? data.Path.join('/') : 'Unknown';
  
  if (markdownFormat) {
    printOutput(`\n## TypeScript definitions for: ${apiPath}\n`);
  } else {
    printOutput(`\n${format(colors.bright + colors.blue, "TypeScript definitions for:")} ${format(colors.green, apiPath)}\n`);
  }
  
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
    const klbDateTime = `/**
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
`;
    
    if (markdownFormat) {
      printOutput("```typescript\n" + klbDateTime + "```\n");
    } else {
      printOutput(klbDateTime + "\n");
    }
  }
  
  // Generate type definitions for the API
  let typeScript = '';
  
  // Generate main interface
  if (data.table && data.table.Struct) {
    const typeName = getTypeName(apiPath);
    const fields = Object.keys(data.table.Struct).filter(key => !key.startsWith('_'));
    
    typeScript += `/**
 * ${data.desc || typeName + ' object structure'}
 */
export interface ${typeName} {
`;
    
    for (const field of fields) {
      const info = data.table.Struct[field];
      const tsType = convertToTypeScriptType(info.type);
      const nullable = !info.required ? ' | null' : '';
      const comment = info.desc ? ` // ${info.desc}` : '';
      
      typeScript += `  ${field}: ${tsType}${nullable};${comment}\n`;
    }
    
    typeScript += `}\n\n`;
  }
  
  // Generate request types for procedures
  if (data.procedure) {
    const typeName = getTypeName(apiPath);
    const procedureName = data.procedure.name;
    
    if (data.procedure.args && data.procedure.args.length > 0) {
      typeScript += `/**
 * Request parameters for ${procedureName || typeName} procedure
 */
export interface ${typeName}${procedureName ? pascalCase(procedureName) : ''}Params {
`;
      
      for (const arg of data.procedure.args) {
        const tsType = convertToTypeScriptType(arg.type);
        const nullable = !arg.required ? '?' : '';
        const comment = arg.desc ? ` // ${arg.desc}` : '';
        
        typeScript += `  ${arg.name}${nullable}: ${tsType};${comment}\n`;
      }
      
      typeScript += `}\n\n`;
    }
  }
  
  // Generate request types for methods
  if (data.func && data.func.length > 0) {
    const typeName = getTypeName(apiPath);
    
    for (const func of data.func) {
      const methodName = func.name;
      
      if (func.args && func.args.length > 0) {
        typeScript += `/**
 * Request parameters for ${typeName}.${methodName} method
 */
export interface ${typeName}${pascalCase(methodName)}Params {
`;
        
        for (const arg of func.args) {
          const tsType = convertToTypeScriptType(arg.type);
          const nullable = !arg.required ? '?' : '';
          const comment = arg.desc ? ` // ${arg.desc}` : '';
          
          typeScript += `  ${arg.name}${nullable}: ${tsType};${comment}\n`;
        }
        
        typeScript += `}\n\n`;
      }
    }
  }
  
  if (markdownFormat) {
    printOutput("```typescript\n" + typeScript + "```");
  } else {
    printOutput(typeScript);
  }
}

/**
 * Convert KLB API type to TypeScript type
 */
function convertToTypeScriptType(type) {
  if (!type) return 'any';
  
  const lowerType = type.toLowerCase();
  
  switch (lowerType) {
    case 'int':
    case 'integer':
    case 'float':
    case 'double':
    case 'number':
      return 'number';
    case 'string':
    case 'text':
    case 'varchar':
      return 'string';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'datetime':
    case 'timestamp':
      return 'KlbDateTime';
    case 'json':
    case 'array':
      return 'any[]';
    case 'object':
    case 'json_object':
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

/**
 * Generate a TypeScript interface name from an API path
 */
function getTypeName(apiPath) {
  if (!apiPath) return 'ApiObject';
  
  // Handle paths like "User", "User/123", "User:create"
  const parts = apiPath.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Check if there's a method call indicated with a colon
  if (lastPart.includes(':')) {
    const [entity, method] = lastPart.split(':');
    return pascalCase(entity);
  }
  
  // Check if the last part is an ID (contains non-letter characters)
  if (/[^a-zA-Z]/.test(lastPart)) {
    return pascalCase(parts[parts.length - 2] || 'ApiObject');
  }
  
  // Otherwise use the last part
  return pascalCase(lastPart);
}

/**
 * Convert a string to PascalCase
 */
function pascalCase(str) {
  if (!str) return '';
  
  return str
    .split(/[^a-zA-Z0-9]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}