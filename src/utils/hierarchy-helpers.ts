/**
 * Hierarchy traversal and context building utilities.
 *
 * Provides DOM navigation helpers for CDML documents.
 */

import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

/**
 * Build full hierarchy path for an element.
 */
export function buildElementPath($: CheerioAPI, element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.type === 'tag') {
    parts.unshift(current.name);
    const parent: any = $(current).parent();
    current = parent.length > 0 && parent[0].type === 'tag'
      ? parent[0] as Element
      : null;
  }

  return parts.join(' > ');
}

/**
 * Build recursive parent scope chain.
 */
export function buildScopeChain(
  $: CheerioAPI,
  element: Element
): Array<{ element: string; attributes: Record<string, string>; level: number }> {
  const scopes: Array<{ element: string; attributes: Record<string, string>; level: number }> = [];
  let current: Element | null = element;
  let level = 0;

  while (current && current.type === 'tag') {
    scopes.unshift({
      element: current.name,
      attributes: current.attribs || {},
      level,
    });

    const parent: any = $(current).parent();
    current = parent.length > 0 && parent[0].type === 'tag'
      ? parent[0] as Element
      : null;
    level++;
  }

  return scopes;
}

/**
 * Get sibling elements of an element.
 */
export function getSiblingElements($: CheerioAPI, element: Element): Element[] {
  const siblings: Element[] = [];
  $(element).siblings().each((_, sibling) => {
    if (sibling.type === 'tag') {
      siblings.push(sibling as Element);
    }
  });
  return siblings;
}

/**
 * Get child element tag names.
 */
export function getChildElementNames($: CheerioAPI, element: Element): string[] {
  const names: string[] = [];
  $(element).children().each((_, child) => {
    if (child.type === 'tag') {
      names.push((child as Element).name);
    }
  });
  return names;
}

/**
 * Build an FQN string from an element's position in the DOM.
 */
export function buildFQNFromPosition(
  $: CheerioAPI,
  element: Element,
  projectName?: string
): string {
  const parts: string[] = [];

  if (projectName) {
    parts.push(projectName);
  }

  let current: Element | null = element;
  const stack: string[] = [];

  while (current && current.type === 'tag') {
    const name = current.attribs?.name || current.name;
    // Skip structural tags that aren't meaningful for FQN
    if (!['body', 'html', 'head'].includes(current.name)) {
      stack.unshift(name);
    }
    const parent: any = $(current).parent();
    current = parent.length > 0 && parent[0].type === 'tag'
      ? parent[0] as Element
      : null;
  }

  parts.push(...stack);
  return parts.join(':');
}

/**
 * Extract all text content from an element (including nested tags).
 */
export function extractFullContent($: CheerioAPI, element: Element): string {
  const parts: string[] = [];

  function traverse(node: Element) {
    $(node).contents().each((_, child) => {
      if (child.type === 'text') {
        const text = $(child).text().trim();
        if (text) parts.push(text);
      } else if (child.type === 'tag') {
        traverse(child as Element);
      }
    });
  }

  traverse(element);
  return parts.join('\n').trim();
}
