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
export declare function buildElementPath($: CheerioAPI, element: Element): string;
/**
 * Build recursive parent scope chain.
 */
export declare function buildScopeChain($: CheerioAPI, element: Element): Array<{
    element: string;
    attributes: Record<string, string>;
    level: number;
}>;
/**
 * Get sibling elements of an element.
 */
export declare function getSiblingElements($: CheerioAPI, element: Element): Element[];
/**
 * Get child element tag names.
 */
export declare function getChildElementNames($: CheerioAPI, element: Element): string[];
/**
 * Build an FQN string from an element's position in the DOM.
 */
export declare function buildFQNFromPosition($: CheerioAPI, element: Element, projectName?: string): string;
/**
 * Extract all text content from an element (including nested tags).
 */
export declare function extractFullContent($: CheerioAPI, element: Element): string;
//# sourceMappingURL=hierarchy-helpers.d.ts.map