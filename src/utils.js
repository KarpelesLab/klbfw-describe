import { colors } from './constants.js';

/**
 * Basic Markdown formatting for terminal display
 */
export function formatMarkdown(markdown) {
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
 * Helper function to create a formatter based on options
 */
export function createFormatter(options = {}) {
  const { 
    useColors = true,
    output = console.log
  } = options;
  
  // Choose output format based on options
  const printOutput = (text) => output(text);
  
  // Helper to format text with or without colors
  const format = (colorFn, text) => {
    if (!useColors) return text;
    return colorFn + text + colors.reset;
  };
  
  return {
    printOutput,
    format
  };
}

/**
 * Strip parameters from an API path for OPTIONS requests
 * 
 * Removes path segments that are arguments (not starting with uppercase letter)
 * Examples:
 *   - User/:user/Wallet -> User/Wallet
 *   - Order/ord-123456-12456 -> Order
 *   - User/ce8b57ca-8961-49c5-863a-b79ab3e1e4a0 -> User
 *   - Content/Cms/page-123/History -> Content/Cms/History
 * 
 * @param {string} apiPath - The API path to strip parameters from
 * @returns {string} The stripped API path
 */
export function stripParametersFromPath(apiPath) {
  if (!apiPath) return apiPath;
  
  // Split the path by forward slashes
  const segments = apiPath.split('/');
  
  // Filter out segments that don't start with an uppercase letter
  const filteredSegments = segments.filter(segment => {
    // Keep empty segments (for leading slash)
    if (!segment) return true;
    
    // Keep segments that start with an uppercase letter
    return /^[A-Z]/.test(segment);
  });
  
  // Join the filtered segments back together
  return filteredSegments.join('/');
}