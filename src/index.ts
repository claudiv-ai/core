/**
 * Main orchestrator for GUI-driven spec editor
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { loadConfig } from './config.js';
import { logger } from './utils/logger.js';
import { SpecFileWatcher } from './watcher.js';
import { parseSpecFile } from './parser.js';
import { createClaudeClient, verifyClaudeAvailable } from './claude-client.js';
import { updateSpecWithResponse } from './updater.js';
import { generateCodeFile, regenerateCodeFromConversation, extractCodeBlocks } from './code-generator.js';
import { DevServer } from './dev-server.js';
import type { ChatPattern } from './types.js';
import * as cheerio from 'cheerio';
import type { Element, AnyNode } from 'domhandler';

/**
 * Main application entry point
 */
async function main() {
  logger.info('🚀 GUI-driven spec editor starting...');

  // Load configuration
  const config = loadConfig();

  // Create Claude client
  const claudeClient = createClaudeClient(config);

  // Verify Claude is available
  await verifyClaudeAvailable(claudeClient, config.mode);

  // Regenerate code file if missing or requested
  const codeFilePath = config.specFile.replace('.cdml', '.html');
  if (!existsSync(codeFilePath)) {
    logger.info('Generated code file not found, regenerating from conversation history...');
    try {
      await regenerateCodeFromConversation(config.specFile);
    } catch (error) {
      const err = error as Error;
      logger.warn(`Could not regenerate code file: ${err.message}`);
    }
  }

  // Create file watcher
  const watcher = new SpecFileWatcher(config);

  // Handle file changes
  watcher.on('change', async (filePath: string) => {
    try {
      await processSpecFile(filePath, config, claudeClient, watcher);
    } catch (error) {
      const err = error as Error;
      logger.error(`Error processing ${filePath}: ${err.message}`);
      if (process.env.DEBUG) {
        console.error(err.stack);
      }
    }
  });

  // Start watching
  watcher.start();

  logger.success(`✓ Watching ${config.specFile.split('/').pop()} for changes...`);
  logger.info('💡 Tip: Add gen/retry/undo attribute to any element to trigger AI');
  logger.info('💡 Example: <create-button gen>Make a blue button</create-button>');
  logger.info('💡 Example: <my-button color="blue" size="large" gen />');
  logger.info('');

  // Start Vite dev server
  const devServer = new DevServer();
  await devServer.start();
  logger.info('');

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('\n👋 Shutting down...');
    watcher.stop();
    await devServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Process .cdml file for chat patterns
 */
async function processSpecFile(
  filePath: string,
  config: any,
  claudeClient: any,
  watcher: SpecFileWatcher
): Promise<void> {
  // Skip if we're updating the file ourselves
  if (watcher.isCurrentlyUpdating()) {
    logger.debug('Skipping processing (internal update in progress)');
    return;
  }

  logger.processing(`Processing ${filePath.split('/').pop()}...`);

  // Read file content
  const content = await readFile(filePath, 'utf-8');

  // Parse spec file
  const parsed = parseSpecFile(content);

  if (parsed.chatPatterns.length === 0) {
    logger.debug('No new chat patterns found');
    return;
  }

  logger.info(`Found ${parsed.chatPatterns.length} chat pattern(s) to process`);

  // Process each chat pattern
  for (const pattern of parsed.chatPatterns) {
    await processChatPattern(pattern, config, claudeClient, watcher, parsed.dom);
  }
}

/**
 * Process a single chat pattern
 */
async function processChatPattern(
  pattern: ChatPattern,
  config: any,
  claudeClient: any,
  watcher: SpecFileWatcher,
  $: any
): Promise<void> {
  const { action, element, elementName, specAttributes, userMessage, context, elementPath } = pattern;

  // Build display message
  const attrPreview = Object.entries(specAttributes).length > 0
    ? ` [${Object.entries(specAttributes).slice(0, 2).map(([k, v]) => `${k}="${v}"`).join(', ')}...]`
    : '';
  const messagePreview = userMessage
    ? userMessage.substring(0, 60) + (userMessage.length > 60 ? '...' : '')
    : 'attribute-based spec';

  logger.info(`Processing ${action}: <${elementName}${attrPreview}>`);
  logger.info(`  Message: "${messagePreview}"`);
  logger.debug(`  Context: ${elementPath}`);

  try {
    // Read existing code if spec.code.html exists
    const codeFilePath = config.specFile.replace('.html', '.code.html');
    if (existsSync(codeFilePath)) {
      const existingCode = await readFile(codeFilePath, 'utf-8');
      context.existingCode = existingCode;
      logger.debug('Loaded existing code for context');
    }

    // Build full prompt combining element name, attributes, and user message
    const fullPrompt = buildFullPrompt($, element, elementName, specAttributes, userMessage);

    // Debug: log the prompt to see what's being sent
    logger.debug('=== FULL PROMPT BEING SENT ===');
    logger.debug(fullPrompt);
    logger.debug('=== END PROMPT ===');

    // Accumulate full response
    let fullResponse = '';

    // Send to Claude and stream response
    for await (const chunk of claudeClient.sendPrompt(fullPrompt, context)) {
      fullResponse += chunk;
      // Optionally: show progress
      if (process.env.DEBUG) {
        process.stdout.write('.');
      }
    }

    if (process.env.DEBUG) {
      process.stdout.write('\n');
    }

    logger.success('Received response from Claude');

    // Check if response contains code blocks
    const codeBlocks = extractCodeBlocks(fullResponse);
    const hasCode = codeBlocks.length > 0;

    // Generate code file first (if there's code)
    if (hasCode) {
      await generateCodeFile(elementPath, fullResponse);
    }

    // Update spec.html: remove action attribute and add <ai> child with response
    watcher.setUpdating(true);
    try {
      await updateSpecWithResponse($, element, action, fullResponse, config.specFile, hasCode);
    } finally {
      watcher.setUpdating(false);
    }

  } catch (error) {
    const err = error as Error;
    logger.error(`Failed to process chat pattern: ${err.message}`);
    throw error;
  }
}

/**
 * Build full prompt from element name, spec attributes, and user message
 */
function buildFullPrompt(
  $: cheerio.CheerioAPI,
  element: Element,
  elementName: string,
  specAttributes: Record<string, string>,
  userMessage: string
): string {
  const parts: string[] = [];

  // Add element name as semantic header
  parts.push(`Element: ${elementName}`);
  parts.push('');

  // Add spec attributes if any
  if (Object.keys(specAttributes).length > 0) {
    parts.push('Specifications:');
    for (const [key, value] of Object.entries(specAttributes)) {
      parts.push(`  ${key}: ${value}`);
    }
    parts.push('');
  }

  // Extract nested element specifications directly from the element's children
  const nestedSpecs = extractNestedSpecifications($, element);
  if (nestedSpecs.length > 0) {
    parts.push('NESTED COMPONENTS TO IMPLEMENT:');
    parts.push('The following components MUST be implemented (do not use placeholder comments):');
    parts.push('');

    function formatSpec(spec: NestedSpec, indent: string, index: number): void {
      const prefix = index > 0 ? `${index}. ` : '';
      const lockStatus = spec.isLocked ? ' [LOCKED - DO NOT REGENERATE]' : '';
      parts.push(`${indent}${prefix}<${spec.elementName}>${lockStatus}`);

      if (spec.isLocked) {
        parts.push(`${indent}   ⚠️ This component is LOCKED - keep existing implementation, do NOT regenerate`);
      }

      if (Object.keys(spec.attributes).length > 0) {
        parts.push(`${indent}   Attributes:`);
        for (const [key, value] of Object.entries(spec.attributes)) {
          parts.push(`${indent}     - ${key}: ${value}`);
        }
      }

      if (spec.textContent) {
        parts.push(`${indent}   Content: ${spec.textContent}`);
      }

      // Recursively format children
      if (spec.children && spec.children.length > 0) {
        parts.push(`${indent}   Contains nested components:`);
        spec.children.forEach((child, childIndex) => {
          formatSpec(child, indent + '     ', childIndex + 1);
        });
      }

      parts.push('');
    }

    nestedSpecs.forEach((spec, index) => {
      formatSpec(spec, '', index + 1);
    });
  }

  // Add user message if any
  if (userMessage) {
    parts.push('Full Description:');
    parts.push(userMessage);
  }

  return parts.join('\n');
}

interface NestedSpec {
  elementName: string;
  attributes: Record<string, string>;
  textContent: string;
  hasChildren: boolean;
  depth: number;
  isLocked: boolean;
  children?: NestedSpec[];
}

function extractNestedSpecifications($: cheerio.CheerioAPI, element: Element): NestedSpec[] {
  const specs: NestedSpec[] = [];

  function extractRecursive(parentElement: Element, depth: number, parentLocked: boolean): NestedSpec[] {
    const result: NestedSpec[] = [];
    const $parent = $(parentElement);

    $parent.children().each((_: number, child: AnyNode) => {
      if (child.type === 'tag') {
        const childElement = child as Element;
        const elementName = childElement.name;

        // Skip <ai> elements (these are AI responses, not specifications)
        if (elementName === 'ai') {
          return;
        }

        const $child = $(childElement);
        const attrs = childElement.attribs || {};

        // Check lock/unlock status
        const hasLock = 'lock' in attrs;
        const hasUnlock = 'unlock' in attrs;

        // Determine if this element is locked:
        // - If parent is locked and element doesn't have unlock => locked
        // - If element has lock attribute => locked
        // - If element has unlock attribute => unlocked (overrides parent lock)
        const isLocked = hasLock || (parentLocked && !hasUnlock);

        // Extract attributes (exclude lock/unlock/gen/retry/undo as they're control attributes)
        const attributes: Record<string, string> = {};
        for (const [key, value] of Object.entries(attrs)) {
          if (key !== 'lock' && key !== 'unlock' && key !== 'gen' && key !== 'retry' && key !== 'undo') {
            attributes[key] = value as string;
          }
        }

        // Get direct text content (not from children)
        const textContent = $child.contents()
          .filter((_: number, node: AnyNode) => node.type === 'text')
          .text()
          .trim();

        // Recursively extract children, passing down the locked state
        const children = extractRecursive(childElement, depth + 1, isLocked);
        const hasChildren = children.length > 0;

        result.push({
          elementName,
          attributes,
          textContent,
          hasChildren,
          depth,
          isLocked,
          children: hasChildren ? children : undefined,
        });
      }
    });

    return result;
  }

  try {
    // Check if the root element (the one with gen/retry/undo) has a lock attribute
    // If it does, all its children are locked by default (unless they have unlock)
    const rootAttrs = element.attribs || {};
    const rootHasLock = 'lock' in rootAttrs;

    specs.push(...extractRecursive(element, 0, rootHasLock));
  } catch (error) {
    logger.debug(`Could not parse nested specifications: ${error}`);
  }

  return specs;
}

// Start the application
main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
