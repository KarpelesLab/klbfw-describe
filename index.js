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
 * 
 * Examples:
 *   npx @karpeleslab/klbfw-describe User
 *   npx @karpeleslab/klbfw-describe Misc/Debug
 *   npx @karpeleslab/klbfw-describe Misc/Debug:testUpload
 *   npx @karpeleslab/klbfw-describe --raw User
 *   npx @karpeleslab/klbfw-describe --ts User
 */

const https = require('https');
const url = require('url');

// Default API host
const DEFAULT_API_HOST = 'ws.atonline.com';
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
  const { rawOutput = false, typeScriptOutput = false } = options;
  
  console.log(`\n${colors.bright}${colors.blue}Describing API endpoint:${colors.reset} ${colors.green}${apiPath}${colors.reset}`);
  console.log(`${colors.dim}Host: ${DEFAULT_API_HOST}${colors.reset}\n`);
  
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
        } else if (typeScriptOutput) {
          // TypeScript definition output
          generateTypeScriptDefinitions(jsonData);
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
        console.log(fieldDesc);
        
        // Show field description if available
        if (info.description) {
          console.log(`    ${colors.dim}${info.description}${colors.reset}`);
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
function describeRootObjects() {
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
        console.log(`${colors.bright}Status:${colors.reset} ${colors.red}${res.statusCode}${colors.reset}`);
        console.log(`${colors.red}Error: Unable to fetch root API information${colors.reset}`);
        return;
      }
      
      try {
        const jsonData = JSON.parse(data);
        
        if (jsonData.data && jsonData.data.prefix) {
          console.log(`\n${colors.bright}${colors.blue}Available API Objects:${colors.reset}\n`);
          
          // Group by first letter to organize large lists
          const groups = {};
          jsonData.data.prefix.forEach(prefix => {
            const firstChar = prefix.name.charAt(0).toUpperCase();
            if (!groups[firstChar]) groups[firstChar] = [];
            groups[firstChar].push(prefix);
          });
          
          // Display grouped endpoints
          Object.keys(groups).sort().forEach(letter => {
            console.log(`  ${colors.bright}${letter}${colors.reset}`);
            
            // Sort endpoints within each group
            const sortedEndpoints = groups[letter].sort((a, b) => a.name.localeCompare(b.name));
            
            sortedEndpoints.forEach(endpoint => {
              console.log(`    ${colors.green}${endpoint.name}${colors.reset}${endpoint.description ? ` - ${colors.dim}${endpoint.description}${colors.reset}` : ''}`);
            });
            console.log(''); // Add space between groups
          });
          
          console.log(`${colors.dim}Run with a specific API path to get more details about an object.${colors.reset}`);
          console.log(`${colors.dim}Example: npx @karpeleslab/klbfw-describe User${colors.reset}`);
        } else {
          console.log(`${colors.red}Error: Could not retrieve API object list.${colors.reset}`);
        }
      } catch (e) {
        console.log(`${colors.red}Error parsing API response:${colors.reset} ${e.message}`);
      }
    });
  });
  
  req.on('error', (e) => {
    console.error(`${colors.red}Error:${colors.reset} ${e.message}`);
  });
  
  req.end();
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`${colors.bright}Usage:${colors.reset} npx @karpeleslab/klbfw-describe [options] <api-path>`);
  console.log(`\n${colors.bright}Options:${colors.reset}`);
  console.log(`  --raw              Show raw JSON output without formatting`);
  console.log(`  --ts, --types      Generate TypeScript type definitions`);
  console.log(`  --help, -h         Show this help message`);
  console.log(`\n${colors.bright}Examples:${colors.reset}`);
  console.log(`  npx @karpeleslab/klbfw-describe User`);
  console.log(`  npx @karpeleslab/klbfw-describe Misc/Debug`);
  console.log(`  npx @karpeleslab/klbfw-describe Misc/Debug:testUpload`);
  console.log(`  npx @karpeleslab/klbfw-describe --raw User`);
  console.log(`  npx @karpeleslab/klbfw-describe --ts User`);
}

// Parse command line arguments
let rawOutput = false;
let typeScriptOutput = false;
let apiPath = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--raw') {
    rawOutput = true;
  } else if (arg === '--ts' || arg === '--types') {
    typeScriptOutput = true;
  } else if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  } else if (!apiPath && !arg.startsWith('--')) {
    apiPath = arg;
  }
}

if (!apiPath) {
  printUsage();
  console.log('\n' + colors.bright + 'Retrieving available API objects...' + colors.reset);
  // Get root objects with OPTIONS on /_rest/
  describeRootObjects();
  return; // Return here to avoid calling describeApi without a path
}

// Execute the API description
describeApi(apiPath, { rawOutput, typeScriptOutput });