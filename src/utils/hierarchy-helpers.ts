/**
 * Hierarchy traversal and context building utilities
 */

import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type { ScopeContext, HierarchyContext, ReferencedElement } from '../types.js';

/**
 * Build full hierarchy path for an element
 */
export function buildElementPath($: CheerioAPI, element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.type === 'tag') {
    const $current: any = $(current);
    const name = current.name;
    const attrs = current.attribs;

    // Add attributes if any
    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');

    const part = attrStr ? `${name}[${attrStr}]` : name;
    parts.unshift(part);

    // Move to parent
    const parent: any = $current.parent();
    current = parent.length > 0 && parent[0].type === 'tag' ? parent[0] as Element : null;
  }

  return parts.join(' > ');
}

/**
 * Build recursive parent scope chain
 */
export function buildScopeChain($: CheerioAPI, element: Element): ScopeContext[] {
  const scopes: ScopeContext[] = [];
  let current: Element | null = element;
  let level = 0;

  while (current && current.type === 'tag') {
    const $current: any = $(current);
    const name = current.name;
    const attrs = current.attribs || {};

    // Build description
    const attrDescriptions = Object.entries(attrs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const description = attrDescriptions
      ? `${name} (${attrDescriptions})`
      : name;

    scopes.unshift({
      element: name,
      attributes: attrs,
      description,
      level,
    });

    // Move to parent
    const parent: any = $current.parent();
    current = parent.length > 0 && parent[0].type === 'tag' ? parent[0] as Element : null;
    level++;
  }

  return scopes;
}

/**
 * Extract all text content from an element (including nested tags)
 */
export function extractFullContent($: CheerioAPI, element: Element): string {
  const $element = $(element);

  // Extract text recursively, preserving structure
  const parts: string[] = [];

  function traverse(node: Element) {
    $(node).contents().each((_, child) => {
      if (child.type === 'text') {
        const text = $(child).text().trim();
        if (text) {
          parts.push(text);
        }
      } else if (child.type === 'tag') {
        const $child = $(child as Element);
        const tagName = (child as Element).name;
        const childText = $child.text().trim();

        if (childText) {
          // Format nested tags as "Tag name: content"
          const formatted = `${formatTagName(tagName)}: ${childText}`;
          parts.push(formatted);
        }

        // Also traverse deeper
        traverse(child as Element);
      }
    });
  }

  traverse(element);

  const content = parts.join('\n').trim();

  // If no content found, use the tag name itself as the message
  // This handles self-closing tags like <change to purple />
  if (!content) {
    const tagName = element.name;
    return formatTagName(tagName);
  }

  return content;
}

/**
 * Format tag name for display (convert kebab-case to Title Case)
 */
function formatTagName(tagName: string): string {
  return tagName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get previous chat messages in the same chat scope
 */
export function getPreviousChatMessages($: CheerioAPI, chatElement: Element): Array<{role: 'user' | 'ai', content: string}> {
  const messages: Array<{role: 'user' | 'ai', content: string}> = [];
  const $chat = $(chatElement);

  $chat.children().each((_, child) => {
    if (child.type !== 'tag') return;

    const $child = $(child as Element);
    const tagName = (child as Element).name;
    const content = $child.text().trim();

    if (tagName === 'ai' && content) {
      // Previous AI response
      messages.push({ role: 'ai', content });
    } else if (tagName !== 'ai' && content) {
      // Previous user message
      messages.push({ role: 'user', content });
    }
  });

  return messages;
}

/**
 * Describe the context for Claude in natural language
 */
export function describeContext(scopes: ScopeContext[]): string {
  if (scopes.length === 0) {
    return 'You are working at the root level.';
  }

  const descriptions: string[] = [];

  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    const attrStr = Object.entries(scope.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');

    if (i === scopes.length - 1) {
      // Current scope
      descriptions.push(`a ${scope.element}${attrStr ? ` with ${attrStr}` : ''}`);
    } else {
      // Parent scopes
      descriptions.push(`inside ${scope.element}${attrStr ? ` (${attrStr})` : ''}`);
    }
  }

  return `You are working on ${descriptions.join(', ')}.`;
}
