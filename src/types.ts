/**
 * Core type definitions for GUI-driven spec editor
 */

export interface Config {
  mode: 'cli' | 'api';
  apiKey?: string;
  specFile: string;
  debounceMs: number;
  claudeTimeout: number;
}

export interface HierarchyContext {
  elementPath: string;
  scopes: ScopeContext[];
  previousMessages: ChatMessage[];
  referencedElements: ReferencedElement[];
  existingCode?: string; // Current implementation from generated HTML
}

export interface ScopeContext {
  element: string;
  attributes: Record<string, string>;
  description: string;
  level: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface ReferencedElement {
  name: string;
  type: string;
  location: string;
  content: string;
  attributes: Record<string, string>;
}

export interface ChatPattern {
  action: 'gen' | 'retry' | 'undo'; // Action type from attribute
  element: any; // cheerio element with gen/retry/undo attribute
  elementName: string; // Tag name (semantic header)
  specAttributes: Record<string, string>; // All attributes except action
  userMessage: string; // Text content + nested elements
  context: HierarchyContext;
  elementPath: string;
}

export interface ElementRegistry {
  [key: string]: ReferencedElement;
}

export interface ParsedSpec {
  dom: any; // cheerio instance
  chatPatterns: ChatPattern[];
  registry: ElementRegistry;
}
