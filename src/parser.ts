/**
 * Lenient XML-ish parser with chat pattern detection and context building
 */

import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { logger } from './utils/logger.js';
import {
  buildElementPath,
  buildScopeChain,
  extractFullContent,
  getPreviousChatMessages,
  describeContext,
} from './utils/hierarchy-helpers.js';
import type {
  ParsedSpec,
  ChatPattern,
  ElementRegistry,
  HierarchyContext,
  ReferencedElement,
} from './types.js';

/**
 * Parse spec.html content with extreme leniency
 */
export function parseSpecFile(content: string): ParsedSpec {
  logger.debug('Parsing spec.html with lenient parser...');

  // Use htmlparser2 - extremely lenient, handles malformed HTML/XML
  const dom = parseDocument(content, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false, // Preserve original case
    recognizeSelfClosing: true,
  });

  // Load into cheerio for easy manipulation
  const $ = cheerio.load(dom, {
    xmlMode: false, // HTML mode is more lenient
  });

  // Build element registry for cross-referencing
  const registry = buildElementRegistry($);

  // Detect chat patterns
  const chatPatterns = detectChatPatterns($, registry);

  logger.debug(`Found ${chatPatterns.length} chat pattern(s) to process`);

  return {
    dom: $,
    chatPatterns,
    registry,
  };
}

/**
 * Build registry of named elements for cross-referencing
 */
function buildElementRegistry($: CheerioAPI): ElementRegistry {
  const registry: ElementRegistry = {};

  // Traverse all elements and register those with meaningful names
  $('*').each((_, element) => {
    if (element.type !== 'tag') return;

    const $element = $(element as Element);
    const tagName = (element as Element).name;
    const content = $element.text().trim();
    const attrs = (element as Element).attribs || {};

    // Register elements that look like they could be referenced
    // (have content or attributes, and are in special sections like api, models, workflows)
    const parent = $element.parent();
    const parentName = parent.length > 0 && parent[0].type === 'tag' ? (parent[0] as Element).name : '';

    const isInReferenceableSection = ['api', 'apis', 'models', 'model', 'workflows', 'workflow', 'entities', 'entity'].includes(parentName);

    if ((content || Object.keys(attrs).length > 0) && (isInReferenceableSection || tagName === 'api' || tagName === 'model')) {
      const key = tagName.toLowerCase();
      const location = buildElementPath($, element as Element);

      registry[key] = {
        name: tagName,
        type: determineElementType(parentName, tagName),
        location,
        content,
        attributes: attrs,
      };
    }
  });

  logger.debug(`Built element registry with ${Object.keys(registry).length} entries`);
  return registry;
}

/**
 * Determine element type based on context
 */
function determineElementType(parentName: string, tagName: string): string {
  if (parentName.includes('api') || tagName === 'api') return 'api';
  if (parentName.includes('model') || tagName === 'model') return 'model';
  if (parentName.includes('workflow') || tagName === 'workflow') return 'workflow';
  if (parentName.includes('entit')) return 'entity';
  return 'component';
}

/**
 * Detect chat patterns: ANY element with gen/retry/undo attribute
 */
function detectChatPatterns($: CheerioAPI, registry: ElementRegistry): ChatPattern[] {
  const patterns: ChatPattern[] = [];
  const actionAttributes = ['gen', 'retry', 'undo'];

  // Find all elements with gen, retry, or undo attributes
  $('*').each((_, element) => {
    if (element.type !== 'tag') return;

    const $element = $(element as Element);
    const tagName = (element as Element).name;
    const attrs = (element as Element).attribs || {};

    // Check for action attributes
    let action: 'gen' | 'retry' | 'undo' | null = null;
    for (const attr of actionAttributes) {
      if (attr in attrs) {
        action = attr as 'gen' | 'retry' | 'undo';
        break;
      }
    }

    if (!action) return;

    // Extract specifications (all attributes except the action attribute)
    const specAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (!actionAttributes.includes(key)) {
        specAttributes[key] = value;
      }
    }

    // Extract user message (text content + nested elements, excluding <ai> children)
    const userMessage = extractUserMessage($, element as Element);

    if (!userMessage && Object.keys(specAttributes).length === 0) {
      logger.debug(`Skipping element <${tagName}> with ${action} but no content or attributes`);
      return;
    }

    // Build hierarchy context
    const context = buildHierarchyContext($, element as Element, userMessage, registry, specAttributes, tagName);

    // Get element path for tracking
    const elementPath = buildElementPath($, element as Element);

    patterns.push({
      action,
      element: element as Element,
      elementName: tagName,
      specAttributes,
      userMessage,
      context,
      elementPath,
    });

    logger.debug(`Found ${action} pattern in <${tagName}> with ${Object.keys(specAttributes).length} spec attributes`);
  });

  return patterns;
}

/**
 * Extract user message from element (excluding <ai> children)
 */
function extractUserMessage($: CheerioAPI, element: Element): string {
  const $element = $(element);

  // Clone the element
  const $clone = $element.clone();

  // Remove all <ai> children
  $clone.find('ai').remove();

  // Extract full content
  return extractFullContent($, $clone[0] as Element);
}

/**
 * Build hierarchy context for an element
 */
function buildHierarchyContext(
  $: CheerioAPI,
  element: Element,
  userMessage: string,
  registry: ElementRegistry,
  specAttributes: Record<string, string>,
  elementName: string
): HierarchyContext {
  // Build scope chain (recursive parent hierarchy)
  const scopes = buildScopeChain($, element);

  // Add current element's specifications to the first scope
  if (scopes.length > 0) {
    scopes[scopes.length - 1] = {
      ...scopes[scopes.length - 1],
      attributes: {
        ...scopes[scopes.length - 1].attributes,
        ...specAttributes,
      },
      description: `${scopes[scopes.length - 1].description} [Element: ${elementName}]`,
    };
  }

  // Get previous messages from <ai> children in this element
  const previousMessages = getPreviousAIMessages($, element);

  // Detect referenced elements in user message and spec attributes
  const allText = userMessage + ' ' + Object.values(specAttributes).join(' ');
  const referencedElements = detectReferences(allText, registry);

  // Build element path
  const elementPath = buildElementPath($, element);

  return {
    elementPath,
    scopes,
    previousMessages,
    referencedElements,
  };
}

/**
 * Get previous AI messages from <ai> children in element
 */
function getPreviousAIMessages($: CheerioAPI, element: Element): { role: 'user' | 'ai'; content: string }[] {
  const messages: { role: 'user' | 'ai'; content: string }[] = [];
  const $element = $(element);

  // Find all <ai> children (previous responses)
  $element.children('ai').each((_, aiChild) => {
    if (aiChild.type !== 'tag') return;
    const aiContent = extractFullContent($, aiChild as Element);
    if (aiContent) {
      messages.push({
        role: 'ai',
        content: aiContent,
      });
    }
  });

  return messages;
}

/**
 * Detect references to other elements in user message
 */
function detectReferences(userMessage: string, registry: ElementRegistry): ReferencedElement[] {
  const references: ReferencedElement[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Check if user message contains any registered element names
  for (const [key, definition] of Object.entries(registry)) {
    if (lowerMessage.includes(key)) {
      references.push(definition);
      logger.debug(`Detected reference to "${key}" in user message`);
    }
  }

  return references;
}

/**
 * Build complete prompt context for Claude
 */
export function buildPromptContext(context: HierarchyContext): string {
  const parts: string[] = [];

  // Hierarchy description
  if (context.scopes.length > 0) {
    parts.push('**Hierarchy Context:**');
    parts.push(describeContext(context.scopes));
    parts.push('');

    // Detailed scope breakdown
    parts.push('**Scope Stack (from outermost to innermost):**');
    context.scopes.forEach((scope, i) => {
      const attrStr = Object.entries(scope.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');
      parts.push(`${i + 1}. ${scope.element}${attrStr ? ` [${attrStr}]` : ''}`);
    });
    parts.push('');
  }

  // Referenced elements
  if (context.referencedElements.length > 0) {
    parts.push('**Referenced Elements:**');
    context.referencedElements.forEach((ref) => {
      parts.push(`- "${ref.name}" (${ref.type}):`);
      parts.push(`  Location: ${ref.location}`);
      if (ref.content) {
        parts.push(`  Description: ${ref.content}`);
      }
      if (Object.keys(ref.attributes).length > 0) {
        const attrStr = Object.entries(ref.attributes)
          .map(([k, v]) => `${k}="${v}"`)
          .join(', ');
        parts.push(`  Attributes: ${attrStr}`);
      }
    });
    parts.push('');
  }

  // Existing code implementation
  if (context.existingCode) {
    parts.push('**Existing Implementation:**');
    parts.push('The current spec.code.html contains:');
    parts.push('```html');
    parts.push(context.existingCode);
    parts.push('```');
    parts.push('');
    parts.push('CRITICAL INSTRUCTIONS for modifying existing code:');
    parts.push('1. Extract the relevant parts from the existing code above');
    parts.push('2. Modify ONLY what the user explicitly requested (e.g., if they said "change color to pink", only change the color values)');
    parts.push('3. Preserve ALL other existing functionality, text content, styling, and structure');
    parts.push('4. Return the complete modified code in HTML code blocks');
    parts.push('5. DO NOT ask for permission - just generate the code directly');
    parts.push('');
  }

  // Previous messages
  if (context.previousMessages.length > 0) {
    parts.push('**Previous Messages in this chat:**');
    context.previousMessages.forEach((msg) => {
      parts.push(`${msg.role.toUpperCase()}: ${msg.content}`);
    });
    parts.push('');
  }

  return parts.join('\n');
}
