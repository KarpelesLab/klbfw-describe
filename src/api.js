import https from 'https';
import { parse } from 'url';
import { DEFAULT_API_HOST, API_PREFIX, DOC_REPO_URL, colors } from './constants.js';
import { formatMarkdown, createFormatter } from './utils.js';

/**
 * Fetch the list of available documentation files
 * Returns resources in MCP format with klb://intdoc/ URI prefix
 */
export function fetchDocFileList() {
  return new Promise((resolve, reject) => {
    const docUrl = parse(`${DOC_REPO_URL}list.json`);
    
    const reqOptions = {
      hostname: docUrl.hostname,
      path: docUrl.pathname,
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
          resolve([]);
          return;
        }
        
        try {
          // Parse the JSON response
          const resources = JSON.parse(data);
          
          // Add klb://intdoc/ prefix to each resource URI
          resources.forEach(resource => {
            resource.uri = `klb://intdoc/${resource.uri}`;
          });
          
          resolve(resources);
        } catch (e) {
          // Return empty array on parsing error
          resolve([]);
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.end();
  });
}

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
 * Fetch raw documentation content from GitHub repository
 * Simplified version that just returns the raw content
 */
export function fetchDocumentation(fileName = 'README.md') {
  return new Promise((resolve, reject) => {
    const docUrl = parse(`${DOC_REPO_URL}${fileName}`);
    
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
          resolve(''); // Return empty string on error
          return;
        }
        
        // Return the raw markdown content
        resolve(data);
      });
    });
    
    req.on('error', (e) => {
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
      printOutput(`| Field | Type | Size | Required | Validator | Description |`);
      printOutput(`| ----- | ---- | ---- | -------- | --------- | ----------- |`);
    } else {
      printOutput(`\n${format(colors.bright + colors.blue, "Table Structure:")}\n`);
    }
    
    const fields = Object.keys(data.table.Struct).filter(key => !key.startsWith('_'));
    
    for (const field of fields) {
      const info = data.table.Struct[field];
      const required = info.null === false ? 'Yes' : 'No';
      const desc = info.desc || '';
      const size = info.size !== undefined ? info.size.toString() : '';
      const validator = info.validator || '';
      const isFK = field.endsWith('__') ? ' (Foreign Key)' : '';
      const isPK = info.key === 'PRIMARY' ? ' (Primary Key)' : '';
      const typeInfo = info.type || '';
      
      // Add additional type information for ENUMs and SETs
      let expandedType = typeInfo;
      if (info.values && Array.isArray(info.values)) {
        expandedType = `${typeInfo} (${info.values.join(', ')})`;
      }
      
      const fieldDetails = isPK + isFK;
      const fullDesc = fieldDetails ? (desc ? `${desc} ${fieldDetails}` : fieldDetails) : desc;
      
      if (markdownFormat) {
        printOutput(`| ${field} | ${expandedType} | ${size} | ${required} | ${validator} | ${fullDesc} |`);
      } else {
        printOutput(`  ${format(colors.green, field.padEnd(20))} ${expandedType.padEnd(20)} ${size.padEnd(6)} ${required.padEnd(10)} ${validator.padEnd(12)} ${fullDesc}`);
      }
    }
    
    // Display primary key if available
    if (data.table.Struct._primary) {
      const primaryKey = Array.isArray(data.table.Struct._primary) ? data.table.Struct._primary.join(', ') : data.table.Struct._primary;
      
      if (markdownFormat) {
        printOutput(`\n**Primary Key:** ${primaryKey}`);
      } else {
        printOutput(`\n  ${format(colors.bright + colors.blue, "Primary Key:")} ${format(colors.green, primaryKey)}`);
      }
    }
    
    // Display indexes if available
    if (data.table.Struct._keys) {
      const keyInfo = data.table.Struct._keys;
      const keys = Object.keys(keyInfo);
      
      if (keys.length > 0) {
        if (markdownFormat) {
          printOutput(`\n**Indexes:**`);
          for (const key of keys) {
            const keyValue = keyInfo[key];
            const keyType = key.startsWith('@') ? 'Unique' : (keyValue === 'FOREIGN' ? 'Foreign Key' : 'Index');
            const keyFields = Array.isArray(keyValue) ? keyValue.join(', ') : keyValue;
            printOutput(`- ${key}: ${keyType} (${keyFields})`);
          }
        } else {
          printOutput(`\n  ${format(colors.bright + colors.blue, "Indexes:")}`);
          for (const key of keys) {
            const keyValue = keyInfo[key];
            const keyType = key.startsWith('@') ? 'Unique' : (keyValue === 'FOREIGN' ? 'Foreign Key' : 'Index');
            const keyFields = Array.isArray(keyValue) ? keyValue.join(', ') : keyValue;
            printOutput(`    ${format(colors.yellow, key.padEnd(20))} ${keyType.padEnd(15)} ${keyFields}`);
          }
        }
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
    
    // Add description from either data.description (new) or data.desc (legacy)
    const description = data.description || data.desc || typeName + ' object structure';
    
    typeScript += `/**
 * ${description}
 */
export interface ${typeName} {
`;
    
    for (const field of fields) {
      const info = data.table.Struct[field];
      const tsType = convertToTypeScriptType(info.type, field, info);
      const isNullable = info.null !== false;
      const nullable = isNullable ? ' | null' : '';
      
      // Build a comprehensive comment with all relevant field info
      let commentParts = [];
      
      // Add field description if available
      if (info.desc) {
        commentParts.push(info.desc);
      }
      
      // Add primary key info
      if (info.key === 'PRIMARY') {
        commentParts.push('Primary key');
      }
      
      // Add foreign key info
      if (field.endsWith('__')) {
        const refEntity = field.replace(/__$/, '');
        commentParts.push(`Foreign key to ${refEntity}`);
      }
      
      // Add validator info
      if (info.validator) {
        commentParts.push(`Validator: ${info.validator}`);
      }
      
      // Add size info
      if (info.size !== undefined) {
        commentParts.push(`Size: ${info.size}`);
      }
      
      // Add enum/set values info
      if ((info.type === 'ENUM' || info.type === 'SET') && info.values && Array.isArray(info.values)) {
        commentParts.push(`Values: ${info.values.join(', ')}`);
      }
      
      // Add default value info
      if (info.default !== undefined && info.default !== null) {
        commentParts.push(`Default: ${info.default}`);
      }
      
      // Format the final comment
      const comment = commentParts.length > 0 ? ` // ${commentParts.join('; ')}` : '';
      
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
        // Add the function description as a comment
        const description = func.description || func.desc || `Request parameters for ${typeName}.${methodName} method`;
        const returnDesc = func.return_description ? `\n\n@returns ${func.return_description}` : '';
        
        typeScript += `/**
 * ${description}${returnDesc}
 */
export interface ${typeName}${pascalCase(methodName)}Params {
`;
        
        for (const arg of func.args) {
          // Try to determine a more specific type based on parameter name patterns
          let inferredType = 'any';
          
          // Get a better description
          const argDesc = arg.description || arg.desc || '';
          
          // Check for common parameter naming patterns
          if (arg.name === 'id' || arg.name.endsWith('_id')) {
            inferredType = 'string'; // IDs are likely strings
          } else if (arg.name.endsWith('__')) {
            inferredType = 'string'; // Foreign keys are UUIDs/strings
          } else if (arg.name === 'email') {
            inferredType = 'string'; // Email is a string
          } else if (arg.name === 'status' || arg.name === 'type') {
            inferredType = 'string'; // Status/Type typically strings or enums
          } else if (arg.name === 'page' || arg.name === 'limit' || arg.name === 'offset') {
            inferredType = 'number'; // Pagination params are numbers
          } else if (arg.name === 'options' || arg.name === 'config' || arg.name === 'meta') {
            inferredType = 'Record<string, any>'; // Options are typically objects
          } else if (arg.name.startsWith('is_') || arg.name.startsWith('has_') || arg.name === 'active' || arg.name === 'enabled') {
            inferredType = 'boolean'; // Boolean flags
          }
          
          // If an explicit type was provided, use that instead
          const tsType = arg.type ? convertToTypeScriptType(arg.type) : inferredType;
          const nullable = !arg.required ? '?' : '';
          const comment = argDesc ? ` // ${argDesc}` : '';
          
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
function convertToTypeScriptType(type, field = '', info = {}) {
  if (!type) return 'any';
  
  const lowerType = type.toLowerCase();
  
  // Special handling for foreign keys (fields ending with __)
  if (field.endsWith('__') && info.validator === 'uuid') {
    return 'string'; // UUID foreign key
  }
  
  // Handle ENUM and SET types with literal unions
  if ((lowerType === 'enum' || lowerType === 'set') && info.values && Array.isArray(info.values)) {
    // Create a union type of the possible values
    return info.values.map(v => `'${v}'`).join(' | ');
  }
  
  switch (lowerType) {
    case 'int':
    case 'integer':
    case 'bigint':
    case 'tinyint':
    case 'smallint':
    case 'mediumint':
    case 'float':
    case 'double':
    case 'decimal':
    case 'number':
      return 'number';
    case 'char':
      if (info.validator === 'uuid') {
        return 'string'; // UUID
      }
      return 'string';
    case 'string':
    case 'text':
    case 'tinytext':
    case 'mediumtext':
    case 'longtext':
    case 'varchar':
      return 'string';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'datetime':
    case 'timestamp':
      return 'KlbDateTime';
    case 'date':
      return 'string'; // ISO date string
    case 'time':
      return 'string'; // Time string
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
  
  // If dealing with a nested path like "Content/Cms", combine them
  if (parts.length > 1) {
    // Only combine last two parts to avoid overly long names
    return pascalCase(parts[parts.length - 2] + parts[parts.length - 1]);
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