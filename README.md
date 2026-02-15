# @claudiv/core

> Pure generation engine for Claudiv - Framework-agnostic CDML parser and code generator

[![npm version](https://img.shields.io/npm/v/@claudiv/core.svg)](https://www.npmjs.com/package/@claudiv/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

**@claudiv/core** is the foundational generation engine for the Claudiv platform. It provides pure, framework-agnostic functionality for parsing CDML (Claudiv Markup Language) and generating code across multiple target languages.

This package is designed to be embedded in:
- CLI tools (@claudiv/cli)
- Build plugins (@claudiv/vite-sdk, future webpack/rollup plugins)
- VS Code extensions
- CI/CD pipelines
- Custom integrations

**Core Principles:**
- ✅ Pure functions (no file I/O)
- ✅ Framework-agnostic
- ✅ TypeScript with full type definitions
- ✅ Extensible generator system
- ✅ Zero opinions about how code is executed

## Installation

```bash
npm install @claudiv/core
```

## Quick Start

```typescript
import { parseSpecFile, generateCode, buildPromptContext } from '@claudiv/core';

// Parse CDML content
const cdmlContent = `
  <app target="html">
    <dashboard gen>
      Create an analytics dashboard with charts
    </dashboard>
  </app>
`;

const parsed = parseSpecFile(cdmlContent);

// Build context for AI prompts
const context = buildPromptContext(pattern, parsed);

// Generate code from AI response
const aiResponse = "Here's your dashboard implementation...";
const generated = await generateCode(aiResponse, pattern, context);

console.log(generated.code);      // Generated HTML/Python/Bash/etc
console.log(generated.language);  // Target language
```

## API Documentation

### Core Functions

#### `parseSpecFile(content: string): CheerioAPI`

Parses CDML content into a hierarchical structure that can be traversed and manipulated.

**Parameters:**
- `content` - Raw CDML markup (XML-like)

**Returns:** Cheerio API instance for DOM-like traversal

**Example:**
```typescript
const parsed = parseSpecFile('<app><button gen>Blue button</button></app>');
const buttons = parsed('button[gen]'); // Find all elements with gen attribute
```

#### `buildPromptContext(pattern: ChatPattern, $: CheerioAPI): HierarchyContext`

Builds contextual information from the hierarchy to inform AI code generation.

**Parameters:**
- `pattern` - Detected chat pattern with target/framework info
- `$` - Parsed Cheerio instance

**Returns:** Rich context object including:
- Element hierarchy (parent chain)
- Sibling elements
- Attributes and specifications
- Rules and constraints

**Example:**
```typescript
const context = buildPromptContext(pattern, parsed);
// Context includes full parent chain, attributes, and scope information
```

#### `generateCode(response: string, pattern: ChatPattern, context: HierarchyContext): Promise<GeneratedCode>`

Generates code from an AI response using the appropriate language generator.

**Parameters:**
- `response` - AI-generated response (typically from Claude)
- `pattern` - Chat pattern specifying target language
- `context` - Hierarchical context

**Returns:** Promise resolving to:
```typescript
{
  code: string;              // Generated code
  language: string;          // Language identifier (html, python, bash, etc)
  fileExtension: string;     // Suggested file extension
  metadata?: {
    framework?: string;      // Framework used (react, vue, etc)
    executable?: boolean;    // Whether file should be executable
  }
}
```

**Example:**
```typescript
const generated = await generateCode(
  aiResponse,
  { target: 'python', framework: 'flask' },
  context
);

console.log(generated.code);           // Python code
console.log(generated.fileExtension);  // .py
```

#### `extractCodeBlocks(response: string): string[]`

Extracts code blocks from markdown-formatted AI responses.

**Parameters:**
- `response` - AI response potentially containing ```code blocks```

**Returns:** Array of extracted code strings

**Example:**
```typescript
const aiResponse = "Here's your code:\n```html\n<div>Hello</div>\n```";
const blocks = extractCodeBlocks(aiResponse);
// blocks = ['<div>Hello</div>']
```

### Generator Registry

The generator registry provides access to all built-in language generators.

```typescript
import { generatorRegistry } from '@claudiv/core';

// Get a specific generator
const htmlGen = generatorRegistry.get('html');
const pythonGen = generatorRegistry.get('python');

// Check if target is supported
const isSupported = generatorRegistry.has('rust'); // false (not built-in)

// Get all supported targets
const targets = generatorRegistry.list(); // ['html', 'bash', 'python', ...]
```

### Built-in Generators

Import generators directly for advanced use cases:

```typescript
import {
  HtmlGenerator,
  BashGenerator,
  PythonGenerator,
  SystemMonitorGenerator,
  LiveMonitorGenerator
} from '@claudiv/core';

const generator = new HtmlGenerator();
const result = await generator.generate(response, pattern, context);
```

**Available Generators:**
- `HtmlGenerator` - HTML/CSS/JavaScript generation
- `BashGenerator` - Shell scripts and CLI tools
- `PythonGenerator` - Python scripts and applications
- `SystemMonitorGenerator` - System monitoring tools
- `LiveMonitorGenerator` - Real-time monitoring dashboards

### Utility Functions

```typescript
import {
  findElements,
  getParentChain,
  extractAttributes,
  buildHierarchyPath
} from '@claudiv/core';

// Find specific elements in parsed CDML
const buttons = findElements(parsed, 'button[gen]');

// Get parent hierarchy
const parents = getParentChain(element);

// Extract all attributes
const attrs = extractAttributes(element);

// Build human-readable hierarchy path
const path = buildHierarchyPath(element); // "app > sidebar > menu[name=settings]"
```

### Logger

```typescript
import { logger } from '@claudiv/core';

logger.info('Parsing CDML file...');
logger.success('Generation complete!');
logger.error('Failed to parse:', error);
logger.warn('Deprecated syntax detected');
```

## TypeScript Types

All types are exported for strong typing in your applications:

```typescript
import type {
  ChatPattern,
  HierarchyContext,
  GeneratedCode,
  GeneratorInterface,
  ClaudivConfig
} from '@claudiv/core';
```

## Architecture

### Pure Generation Engine

@claudiv/core is intentionally pure - it does not:
- ❌ Read or write files
- ❌ Make network requests
- ❌ Execute generated code
- ❌ Manage state or caching

This makes it perfect for embedding in various contexts:
- CLI tools handle file I/O
- Build plugins handle caching
- VS Code extensions handle UI
- CI/CD pipelines handle execution

### Extensible Generator System

New language generators can be registered at runtime:

```typescript
import { generatorRegistry } from '@claudiv/core';

class RustGenerator implements GeneratorInterface {
  async generate(response, pattern, context) {
    // Your custom logic
    return {
      code: '...',
      language: 'rust',
      fileExtension: '.rs'
    };
  }
}

generatorRegistry.register('rust', new RustGenerator());
```

## Usage in Different Contexts

### CLI Tools

```typescript
import { parseSpecFile, generateCode } from '@claudiv/core';
import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('app.cdml', 'utf-8');
const parsed = parseSpecFile(content);
// ... generate code ...
const generated = await generateCode(response, pattern, context);
writeFileSync('output.html', generated.code);
```

### Build Plugins (Vite, Webpack)

```typescript
import { parseSpecFile, generateCode } from '@claudiv/core';

export function claudivPlugin() {
  return {
    name: 'claudiv',
    transform(code, id) {
      if (!id.endsWith('.cdml')) return;
      const parsed = parseSpecFile(code);
      // ... generation logic ...
      return generated.code;
    }
  };
}
```

### CI/CD Pipelines

```typescript
import { parseSpecFile, generateCode } from '@claudiv/core';

// In your GitHub Action or CI script
async function validateCDML(files: string[]) {
  for (const file of files) {
    const content = await fetchFile(file);
    const parsed = parseSpecFile(content); // Validates syntax
    // ... additional checks ...
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Clean dist
npm run clean
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT © 2026 Amir Guterman

See [LICENSE](./LICENSE) for details.

## Links

- **Homepage:** [https://claudiv.org](https://claudiv.org)
- **GitHub:** [https://github.com/claudiv-ai/core](https://github.com/claudiv-ai/core)
- **npm:** [https://npmjs.com/package/@claudiv/core](https://npmjs.com/package/@claudiv/core)
- **Documentation:** [https://docs.claudiv.org](https://docs.claudiv.org)

## Related Packages

- [@claudiv/cli](https://npmjs.com/package/@claudiv/cli) - CLI tool for CDML generation
- [@claudiv/vite-sdk](https://npmjs.com/package/@claudiv/vite-sdk) - Vite plugin for HMR

---

**Built with ❤️ for developers who want pure, reusable generation logic.**
