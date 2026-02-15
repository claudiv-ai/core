/**
 * @claudiv/core - Pure generation engine
 *
 * Public API exports for Claudiv core functionality.
 * This package is framework-agnostic and can be used in:
 * - CLI tools
 * - Web applications
 * - VS Code extensions
 * - CI/CD pipelines
 * - Agentic systems
 */

// Core types
export * from './types.js';

// Parser
export { parseSpecFile, buildPromptContext } from './parser.js';

// Code generation
export { generateCode, extractCodeBlocks } from './code-generator.js';

// Generator registry
export { generatorRegistry } from './generators/registry.js';

// Individual generators
export { HtmlGenerator } from './generators/html-generator.js';
export { BashGenerator } from './generators/bash-generator.js';
export { PythonGenerator } from './generators/python-generator.js';
export { SystemMonitorGenerator, LiveMonitorGenerator } from './generators/system-monitor-generator.js';

// Utilities
export * from './utils/hierarchy-helpers.js';
export { logger } from './utils/logger.js';
