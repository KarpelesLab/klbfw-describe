# CLAUDE.md for klbfw-describe

## Commands
- **Install**: `npm install`
- **Run locally**: `node index.js <api-path>`
- **Run with options**: `node index.js --raw <api-path>`
- **Test**: `npm test` (Note: no tests are currently implemented)
- **Package**: `npm pack`
- **Publish**: `npm publish`

## Code Style
- **Format**: 2-space indentation, single quotes for strings
- **Comments**: JSDoc style comments for functions with descriptions, params and examples
- **Error Handling**: Use try/catch for JSON parsing, error event handlers for requests
- **Variables**: camelCase for variables and functions
- **Constants**: UPPER_SNAKE_CASE for constants like DEFAULT_API_HOST
- **Colors**: Use ANSI color constants for terminal output styling
- **Functions**: Prefer small, focused functions (formatHeaders, formatJsonResponse, etc.)
- **Prefer**: ES6 features like arrow functions, template literals, const/let

## Project Structure
This is a simple CLI tool for exploring KLB API endpoints with a single JavaScript file.