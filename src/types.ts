/**
 * Core type definitions for Claudiv - Universal Code Generation
 */

// Supported target languages and frameworks
export type TargetLanguage =
  | 'html'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'python'
  | 'bash'
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'rust'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'php';

export type TargetFramework =
  | 'none'
  | 'fastapi'
  | 'flask'
  | 'django'
  | 'express'
  | 'nextjs'
  | 'astro'
  | 'gin'
  | 'actix'
  | 'spring';

export interface Config {
  mode: 'cli' | 'api';
  apiKey?: string;
  specFile: string;
  debounceMs: number;
  claudeTimeout: number;
  defaultTarget?: TargetLanguage; // Default output language
  defaultFramework?: TargetFramework; // Default framework
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
  target: TargetLanguage; // Output language (from target attribute or config)
  framework?: TargetFramework; // Output framework (from framework attribute)
}

export interface ElementRegistry {
  [key: string]: ReferencedElement;
}

export interface ParsedSpec {
  dom: any; // cheerio instance
  chatPatterns: ChatPattern[];
  registry: ElementRegistry;
  rootTarget?: TargetLanguage; // Root-level target from .cdml file
  rootFramework?: TargetFramework; // Root-level framework
}

/**
 * Code generator interface - each target language implements this
 */
export interface CodeGenerator {
  readonly language: TargetLanguage;
  readonly supportedFrameworks: TargetFramework[];

  /**
   * Generate code from AI response
   */
  generate(
    response: string,
    pattern: ChatPattern,
    context: HierarchyContext
  ): Promise<GeneratedCode>;

  /**
   * Reverse engineer: existing code → .cdml spec
   */
  reverse(sourceCode: string, sourceFile: string): Promise<string>;

  /**
   * Apply .cdml changes to existing code file
   */
  apply(
    cdmlContent: string,
    targetFile: string,
    existingCode: string
  ): Promise<string>;

  /**
   * Get file extension for generated code
   */
  getFileExtension(framework?: TargetFramework): string;
}

export interface GeneratedCode {
  code: string; // The generated code
  language: TargetLanguage;
  framework?: TargetFramework;
  fileExtension: string; // .html, .py, .sh, etc.
  metadata?: Record<string, any>; // Additional metadata
}
