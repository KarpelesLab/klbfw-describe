import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { describeApi, getApiResource, fetchDocumentation } from './api.js';
import https from 'https';
import { parse } from 'url';
import { DEFAULT_API_HOST, API_PREFIX } from './constants.js';

/**
 * Fetch the API tree structure from the server
 * This is used to dynamically build the resource list
 */
async function fetchApiTree() {
  return new Promise((resolve, reject) => {
    const reqUrl = parse(`https://${DEFAULT_API_HOST}${API_PREFIX}`);
    
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
          resolve({ available: [] });
          return;
        }
        
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve({ available: [] });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ available: [] });
    });
    
    req.end();
  });
}

/**
 * Start an MCP server for programmatic access to the API description tool
 */
export async function startMcpServer() {
  // Create an MCP server
  const server = new McpServer({
    name: "klbfw-describe",
    version: "0.5.10"
  });
  
  // Add describe tool with explicit schema
  server.tool(
    "describe",
    "Describe an API endpoint by its path with formatted output",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: false,
        typeScriptOutput: false,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  );
  
  // Add describe_raw tool with explicit schema
  server.tool(
    "describe_raw",
    "Obtain the raw json output description of an API",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to describe")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: true,
        typeScriptOutput: false,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  );
  
  // Add produce_ts tool with explicit schema
  server.tool(
    "produce_ts",
    "Generate TypeScript definitions for an API endpoint",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to generate TypeScript for")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(params.apiPath, {
        rawOutput: false,
        typeScriptOutput: true,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  );
  
  // Add get tool with explicit schema
  server.tool(
    "get",
    "Perform a GET request to an API endpoint and return the result",
    {
      apiPath: z.string().min(1).describe("The API endpoint path to request"),
      raw: z.boolean().optional().default(false).describe("Whether to show raw JSON output")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await getApiResource(params.apiPath, {
        rawOutput: params.raw,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  );
  
  // Add documentation tool with explicit schema
  server.tool(
    "documentation",
    "Fetch integration documentation useful when integrating the KLB API",
    {
      fileName: z.string().optional().default('README.md').describe("The documentation file to fetch")
    },
    async (params) => {
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await fetchDocumentation(params.fileName, {
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return { markdown: output };
    }
  );
  
  // Get the API tree to create a dynamic resource list
  const apiTree = await fetchApiTree();
  
  // Create a flat list of all available endpoints for completion
  const availableEndpoints = [];
  const processEndpoint = (endpoint, prefix = '') => {
    const path = prefix + endpoint.path;
    
    if (endpoint.type === 'api' || endpoint.type === 'object') {
      availableEndpoints.push(path);
    }
    
    if (endpoint.children) {
      for (const child of endpoint.children) {
        processEndpoint(child, path + '/');
      }
    }
  };
  
  // Process the API tree to build a flat list of endpoints
  if (apiTree.available && Array.isArray(apiTree.available)) {
    for (const endpoint of apiTree.available) {
      processEndpoint(endpoint);
    }
  }
  
  // API resources should use simple string paths without wildcards
  // Add API endpoints resource with fixed patterns
  
  // Example endpoints to list as resources
  const defaultEndpoints = [
    'User', 'Product', 'Order', 'Auth', 'Category'
  ];
  
  // Add demo endpoints if we couldn't get the real ones
  if (availableEndpoints.length === 0) {
    availableEndpoints.push(...defaultEndpoints);
  }
  
  // Use absolute URIs with a base URL
  const baseUrl = "http://localhost";
  
  // Register each endpoint as a separate resource
  for (const endpoint of availableEndpoints) {
    const uri = `${baseUrl}/api/${endpoint}`;
    
    // Register the standard resource
    server.resource(
      `api_${endpoint}`,
      uri,
      {
        description: `API description for ${endpoint}`,
        name: endpoint
      },
      async (uri, extra) => {
        // Handle resource read requests
        let output = '';
        const appendOutput = (text) => {
          output += text + '\n';
        };
        
        await describeApi(endpoint, {
          rawOutput: false,
          typeScriptOutput: false,
          output: appendOutput,
          useColors: false,
          markdownFormat: true
        });
        
        return {
          content: {
            type: 'markdown',
            markdown: output
          },
          metadata: {
            endpoint,
            uri: uri.toString()
          }
        };
      }
    );
    
    // Register the raw version
    server.resource(
      `api_raw_${endpoint}`,
      `${baseUrl}/api/raw/${endpoint}`,
      {
        description: `Raw API description for ${endpoint}`,
        name: `${endpoint} (Raw)`
      },
      async (uri, extra) => {
        // Handle resource read requests
        let output = '';
        const appendOutput = (text) => {
          output += text + '\n';
        };
        
        await describeApi(endpoint, {
          rawOutput: true,
          typeScriptOutput: false,
          output: appendOutput,
          useColors: false,
          markdownFormat: true
        });
        
        return {
          content: {
            type: 'markdown',
            markdown: output
          },
          metadata: {
            endpoint,
            isRawOutput: true,
            uri: uri.toString()
          }
        };
      }
    );
    
    // Register the TypeScript version
    server.resource(
      `api_ts_${endpoint}`,
      `${baseUrl}/api/typescript/${endpoint}`,
      {
        description: `TypeScript definitions for ${endpoint}`,
        name: `${endpoint} (TypeScript)`
      },
      async (uri, extra) => {
        // Handle resource read requests
        let output = '';
        const appendOutput = (text) => {
          output += text + '\n';
        };
        
        await describeApi(endpoint, {
          rawOutput: false,
          typeScriptOutput: true,
          output: appendOutput,
          useColors: false,
          markdownFormat: true
        });
        
        return {
          content: {
            type: 'markdown',
            markdown: output
          },
          metadata: {
            endpoint,
            isTypeScriptOutput: true,
            uri: uri.toString()
          }
        };
      }
    );
  }
  
  // Add resource template for autocompletion of path
  const apiResourceTemplate = new ResourceTemplate(`${baseUrl}/api/{endpoint}`, {
    list: async () => {
      // List resources - this won't be called directly since we register each endpoint separately
      const resources = availableEndpoints.map(endpoint => ({
        uri: `${baseUrl}/api/${endpoint}`,
        name: endpoint,
        description: `API endpoint: ${endpoint}`
      }));
      
      return { resources };
    },
    complete: {
      // Provide autocompletion for the 'endpoint' variable in the template
      endpoint: (value) => {
        return availableEndpoints.filter(path => path.toLowerCase().startsWith(value.toLowerCase()));
      }
    }
  });

  // Register the template (just for completing - actual resources are registered individually)
  server.resource(
    'apiResources',
    apiResourceTemplate,
    {
      description: 'API resources available for exploration',
      documentationLink: 'https://ws.atonline.com/_rest/'
    },
    async (uri, variables, extra) => {
      // This will only be called if the actual resource is not found
      const endpoint = variables.endpoint || '';
      
      let output = '';
      const appendOutput = (text) => {
        output += text + '\n';
      };
      
      await describeApi(endpoint, {
        rawOutput: false,
        typeScriptOutput: false,
        output: appendOutput,
        useColors: false,
        markdownFormat: true
      });
      
      return {
        content: {
          type: 'markdown',
          markdown: output
        },
        metadata: {
          endpoint,
          uri: uri.toString()
        }
      };
    }
  );
  
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  return server;
}
