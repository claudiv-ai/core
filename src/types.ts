/**
 * Core type definitions for Claudiv - Universal Generation Platform
 */

// Supported target types - UNIVERSAL (not just code!)
export type TargetType =
  // Programming Languages
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
  | 'php'
  // Documentation & Concepts
  | 'markdown'
  | 'concept'
  | 'plan'
  | 'architecture'
  | 'workflow'
  | 'rules'
  | 'definition'
  | 'memo'
  | 'documentation'
  // Data & APIs
  | 'api-protocol'
  | 'openapi'
  | 'graphql-schema'
  | 'protobuf'
  | 'database-schema'
  | 'migration'
  // Diagrams & Visual
  | 'mermaid'
  | 'plantuml'
  | 'system-design'
  | 'flowchart'
  | 'erd'
  // Infrastructure & Config
  | 'dockerfile'
  | 'kubernetes'
  | 'terraform'
  | 'ansible'
  | 'cicd'
  | 'environment'
  // Filesystem & Structure
  | 'filesystem'
  | 'directory-structure'
  | 'file-tree'
  // System State & Monitoring
  | 'system-state'
  | 'startup-programs'
  | 'services'
  | 'system-config'
  | 'env-vars'
  | 'file-mapping'
  | 'live-monitoring'
  | 'log-report'
  | 'file-operations-log'
  // QA & Testing
  | 'test-suite'
  | 'qa-automation'
  | 'test-execution'
  | 'test-report'
  // Debugging
  | 'debug-trace'
  | 'debugging'
  | 'diagnostics'
  // Desktop & GUI
  | 'gui-automation'
  | 'desktop-automation'
  | 'screenshot'
  // External Integrations
  | 'github'
  | 'jira'
  | 'slack'
  | 'email'
  | 'confluence'
  // Workflows
  | 'automation'
  | 'workflow'
  | 'chatops'
  // Documents & Media
  | 'pdf'
  | 'excel'
  | 'powerpoint'
  | 'word'
  | 'csv'
  | 'json'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'css'
  | 'scss'
  | 'less'
  // Images
  | 'svg'
  | 'png'
  | 'jpg'
  | 'image-ocr'
  | 'diagram-image'
  // Audio & Video
  | 'audio-transcription'
  | 'video-transcription'
  | 'subtitle';

// Legacy alias for backward compatibility
export type TargetLanguage = TargetType;

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

/**
 * Meta-configuration: .cdml files can configure how Claudiv operates
 */
export interface ClaudivMetaConfig {
  model?: 'opus' | 'sonnet' | 'haiku'; // Which Claude model to use
  useAgents?: boolean; // Use Claude Code agents for generation
  tools?: string[]; // Which tools Claude can use
  permissions?: {
    bash?: string[]; // Allowed bash commands
    filesystem?: 'read' | 'write' | 'full' | 'none';
    network?: boolean;
  };
  reverseGeneration?: {
    enabled: boolean;
    useAgent?: boolean; // Use agent for reverse generation
    sources?: string[]; // Allowed source types (websites, postman, etc.)
  };
  monitoring?: {
    enabled: boolean;
    trackFileOps?: boolean; // Track file operations
    aggregateLogs?: boolean; // Aggregate logs
    generateReport?: boolean; // Generate structured report
    hooks?: string[]; // System hooks to listen to
    startTime?: Date; // When monitoring started
    stopTime?: Date; // When monitoring stopped
  };
}

/**
 * System monitoring configuration
 */
export interface SystemMonitoringConfig {
  target: TargetType; // Output format for logs/reports
  trackFileOperations: boolean;
  trackProcesses: boolean;
  trackNetworkActivity: boolean;
  aggregateLogs: boolean;
  logSources?: string[]; // Paths to log files
  hooks?: SystemHook[]; // File system hooks
  reportFormat?: 'markdown' | 'json' | 'html';
}

/**
 * System hook for monitoring live changes
 */
export interface SystemHook {
  type: 'file' | 'process' | 'network' | 'service';
  event: 'create' | 'modify' | 'delete' | 'start' | 'stop' | 'all';
  path?: string; // For file hooks
  filter?: string; // Filter pattern
  action?: 'log' | 'report' | 'notify';
}

/**
 * File operation record
 */
export interface FileOperation {
  timestamp: Date;
  type: 'create' | 'modify' | 'delete' | 'move' | 'chmod';
  path: string;
  user?: string;
  process?: string;
  details?: Record<string, any>;
}

/**
 * System state snapshot
 */
export interface SystemState {
  timestamp: Date;
  hostname: string;
  os: string;
  startupPrograms: Array<{
    name: string;
    path: string;
    enabled: boolean;
  }>;
  services: Array<{
    name: string;
    status: 'running' | 'stopped' | 'disabled';
    enabled: boolean;
  }>;
  environmentVariables: Record<string, string>;
  systemConfigs: Array<{
    file: string;
    content: string;
    modified: Date;
  }>;
  fileMappings: Array<{
    source: string;
    target: string;
    type: 'symlink' | 'mount' | 'bind';
  }>;
}

export interface Config {
  mode: 'cli' | 'api';
  apiKey?: string;
  specFile: string;
  debounceMs: number;
  claudeTimeout: number;
  defaultTarget?: TargetLanguage; // Default output language
  defaultFramework?: TargetFramework; // Default framework
  meta?: ClaudivMetaConfig; // Meta-configuration from .cdml file
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
