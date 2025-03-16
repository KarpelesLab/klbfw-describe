# klbfw-describe

A command-line tool for exploring and documenting KLB API endpoints.

## Installation

You can use this tool with npx without installing:

```bash
npx @karpeleslab/klbfw-describe User
```

Or install it globally:

```bash
npm install -g @karpeleslab/klbfw-describe
klbfw-describe User
```

## Usage

```
npx @karpeleslab/klbfw-describe [options] <api-path>
```

### Options

- `--raw`: Show raw JSON output without formatting
- `--host <hostname>`: Specify a custom API host (default: hub.atonline.com)
- `--help`, `-h`: Show help message

### Examples

```bash
# Describe a top-level endpoint
npx @karpeleslab/klbfw-describe User

# Describe a nested endpoint
npx @karpeleslab/klbfw-describe Misc/Debug

# Describe a procedure
npx @karpeleslab/klbfw-describe Misc/Debug:testUpload

# Get raw JSON output
npx @karpeleslab/klbfw-describe --raw User

# Use a custom API host
npx @karpeleslab/klbfw-describe --host api.example.com User
```

## Features

- Colorized, formatted output for easy reading
- Shows allowed HTTP methods with color-coding (GET, POST, etc.)
- Displays API endpoint type (Procedure, Resource, or Collection)
- Shows code examples for calling procedures
- Lists arguments with their types and required status
- Displays sample fields for resources
- Groups sub-endpoints alphabetically for easy reference

## Output

The tool provides different information based on the endpoint type:

### For Procedures
- Procedure name and type (static/instance)
- Usage examples in JavaScript and URL format
- Required and optional arguments with types

### For Resources
- Resource name and field count
- Primary key information
- Sample fields with types and nullability

### For Collections
- Available methods with argument information
- Available sub-endpoints grouped alphabetically

## License

MIT