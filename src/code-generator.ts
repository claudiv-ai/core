/**
 * Universal Code Generator - Pure generation logic
 *
 * This is the core generation engine. It does NOT perform file I/O.
 * File writing is handled by the CLI/SDK layers.
 */

import { logger } from './utils/logger.js';
import { generatorRegistry } from './generators/registry.js';
import type { ChatPattern, HierarchyContext, GeneratedCode } from './types.js';

export interface CodeBlock {
  language: string;
  code: string;
}

/**
 * Extract code blocks from AI response
 */
export function extractCodeBlocks(response: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Match code blocks with optional language identifier
  // Pattern: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || 'unknown';
    const code = match[2].trim();

    blocks.push({ language, code });
  }

  // Also look for inline HTML/CSS without code blocks
  if (blocks.length === 0) {
    // Try to extract HTML-like content
    const htmlRegex = /<[a-z][\s\S]*?>/i;
    if (htmlRegex.test(response)) {
      blocks.push({ language: 'html', code: response });
    }
  }

  logger.debug(`Extracted ${blocks.length} code block(s) from AI response`);
  return blocks;
}

/**
 * Universal code generation - delegates to appropriate generator
 *
 * @param response - AI response containing code
 * @param pattern - Chat pattern with target language/framework
 * @param context - Hierarchy context for generation
 * @returns Generated code object with code, file extension, and metadata
 */
export async function generateCode(
  response: string,
  pattern: ChatPattern,
  context: HierarchyContext
): Promise<GeneratedCode> {
  const { target, framework } = pattern;

  // Get the appropriate generator
  const generator = generatorRegistry.getOrThrow(target);

  logger.info(`Generating ${target} code${framework ? ` with ${framework}` : ''}...`);

  // Generate code using the language-specific generator
  const generated = await generator.generate(response, pattern, context);

  logger.success(`Generated ${target} code (${generated.code.length} bytes)`);

  return generated;
}
