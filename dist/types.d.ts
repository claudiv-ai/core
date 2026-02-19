/**
 * Core type definitions for Claudiv - Universal Generation Platform
 */
export type TargetType = 'html' | 'react' | 'vue' | 'svelte' | 'python' | 'bash' | 'javascript' | 'typescript' | 'go' | 'rust' | 'java' | 'csharp' | 'ruby' | 'php' | 'markdown' | 'concept' | 'plan' | 'architecture' | 'workflow' | 'rules' | 'definition' | 'memo' | 'documentation' | 'api-protocol' | 'openapi' | 'graphql-schema' | 'protobuf' | 'database-schema' | 'migration' | 'mermaid' | 'plantuml' | 'system-design' | 'flowchart' | 'erd' | 'dockerfile' | 'kubernetes' | 'terraform' | 'ansible' | 'cicd' | 'environment' | 'filesystem' | 'directory-structure' | 'file-tree' | 'system-state' | 'startup-programs' | 'services' | 'system-config' | 'env-vars' | 'file-mapping' | 'live-monitoring' | 'log-report' | 'file-operations-log' | 'test-suite' | 'qa-automation' | 'test-execution' | 'test-report' | 'debug-trace' | 'debugging' | 'diagnostics' | 'gui-automation' | 'desktop-automation' | 'screenshot' | 'github' | 'jira' | 'slack' | 'email' | 'confluence' | 'automation' | 'workflow' | 'chatops' | 'pdf' | 'excel' | 'powerpoint' | 'word' | 'csv' | 'json' | 'yaml' | 'toml' | 'xml' | 'css' | 'scss' | 'less' | 'svg' | 'png' | 'jpg' | 'image-ocr' | 'diagram-image' | 'audio-transcription' | 'video-transcription' | 'subtitle';
export type TargetLanguage = TargetType;
export type TargetFramework = 'none' | 'fastapi' | 'flask' | 'django' | 'express' | 'nextjs' | 'astro' | 'gin' | 'actix' | 'spring';
/**
 * Meta-configuration: .cdml files can configure how Claudiv operates
 */
export interface ClaudivMetaConfig {
    model?: 'opus' | 'sonnet' | 'haiku';
    useAgents?: boolean;
    tools?: string[];
    permissions?: {
        bash?: string[];
        filesystem?: 'read' | 'write' | 'full' | 'none';
        network?: boolean;
    };
    reverseGeneration?: {
        enabled: boolean;
        useAgent?: boolean;
        sources?: string[];
    };
    monitoring?: {
        enabled: boolean;
        trackFileOps?: boolean;
        aggregateLogs?: boolean;
        generateReport?: boolean;
        hooks?: string[];
        startTime?: Date;
        stopTime?: Date;
    };
}
/**
 * System monitoring configuration
 */
export interface SystemMonitoringConfig {
    target: TargetType;
    trackFileOperations: boolean;
    trackProcesses: boolean;
    trackNetworkActivity: boolean;
    aggregateLogs: boolean;
    logSources?: string[];
    hooks?: SystemHook[];
    reportFormat?: 'markdown' | 'json' | 'html';
}
/**
 * System hook for monitoring live changes
 */
export interface SystemHook {
    type: 'file' | 'process' | 'network' | 'service';
    event: 'create' | 'modify' | 'delete' | 'start' | 'stop' | 'all';
    path?: string;
    filter?: string;
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
    defaultTarget?: TargetLanguage;
    defaultFramework?: TargetFramework;
    meta?: ClaudivMetaConfig;
}
export interface HierarchyContext {
    elementPath: string;
    scopes: ScopeContext[];
    previousMessages: ChatMessage[];
    referencedElements: ReferencedElement[];
    existingCode?: string;
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
    action: 'gen' | 'retry' | 'undo';
    actionInstructions?: string;
    element: any;
    elementName: string;
    specAttributes: Record<string, string>;
    userMessage: string;
    context: HierarchyContext;
    elementPath: string;
    target: TargetLanguage;
    framework?: TargetFramework;
}
export interface ElementRegistry {
    [key: string]: ReferencedElement;
}
export interface ParsedSpec {
    dom: any;
    chatPatterns: ChatPattern[];
    registry: ElementRegistry;
    rootTarget?: TargetLanguage;
    rootFramework?: TargetFramework;
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
    generate(response: string, pattern: ChatPattern, context: HierarchyContext): Promise<GeneratedCode>;
    /**
     * Reverse engineer: existing code → .cdml spec
     */
    reverse(sourceCode: string, sourceFile: string): Promise<string>;
    /**
     * Apply .cdml changes to existing code file
     */
    apply(cdmlContent: string, targetFile: string, existingCode: string): Promise<string>;
    /**
     * Get file extension for generated code
     */
    getFileExtension(framework?: TargetFramework): string;
}
export interface GeneratedCode {
    code: string;
    language: TargetLanguage;
    framework?: TargetFramework;
    fileExtension: string;
    metadata?: Record<string, any>;
}
/**
 * Parsed Fully Qualified Name for cross-file component addressing.
 *
 * Grammar: [project ":"] scope-path ["#" fragment [":" sub-path]] ["@" version]
 *
 * Examples:
 *   my-service                              — relative, current scope
 *   my-service#api                          — service's interface
 *   my-service#api:users-add                — specific endpoint
 *   system:cloud:arm:my-service             — absolute within project
 *   acme-platform:system:cloud:arm:my-service — cross-project
 *   redis@7.2#api                           — versioned
 */
export interface FQN {
    /** Project name (e.g., 'acme-platform'). Absent for relative FQNs. */
    project?: string;
    /** Scope path segments (e.g., ['cloud', 'arm', 'my-service']) */
    segments: string[];
    /** Fragment type after '#' (e.g., 'api', 'impl', 'infra') */
    fragment?: string;
    /** Sub-path within fragment after fragment's ':' (e.g., ['users-add']) */
    fragmentPath?: string[];
    /** Version after '@' (e.g., '1.2.0') */
    version?: string;
    /** Original unparsed string */
    raw: string;
}
export interface ResolvedRef {
    /** The resolved FQN */
    fqn: FQN;
    /** File path where the component is defined */
    file: string;
    /** The component definition */
    component: ComponentDefinition;
    /** Resolved fragment content (if fragment specified) */
    fragmentContent?: any;
}
export interface ProjectRegistry {
    /** Known project names for absolute resolution */
    projects: Map<string, ProjectManifest>;
    /** All known components by FQN string */
    components: Map<string, ComponentDefinition>;
    /** Current project name */
    currentProject: string;
}
export interface ProjectManifest {
    /** Project name */
    name: string;
    /** Root directory */
    root: string;
    /** Auto-discover patterns */
    autoDiscover?: AutoDiscoverPattern[];
    /** Explicitly registered components */
    components?: string[];
}
export interface AutoDiscoverPattern {
    /** Directory path relative to project root */
    path: string;
    /** Glob pattern for matching files */
    pattern: string;
}
export type CdmlChangeType = 'added' | 'removed' | 'modified' | 'unchanged';
export interface CdmlElementChange {
    /** Type of change */
    type: CdmlChangeType;
    /** Element tag name */
    tagName: string;
    /** Element path in the tree (e.g., 'component > interface > endpoints') */
    path: string;
    /** Old attributes (if modified or removed) */
    oldAttributes?: Record<string, string>;
    /** New attributes (if modified or added) */
    newAttributes?: Record<string, string>;
    /** Old text content */
    oldText?: string;
    /** New text content */
    newText?: string;
    /** Child element changes */
    children?: CdmlElementChange[];
}
export interface CdmlDiffResult {
    /** Whether any changes were detected */
    hasChanges: boolean;
    /** Root-level element changes */
    changes: CdmlElementChange[];
    /** Summary of change counts */
    summary: {
        added: number;
        removed: number;
        modified: number;
        unchanged: number;
    };
}
export interface PlanDirective {
    /** Scope path where the plan directive was found */
    scope: string;
    /** The plan instruction (from plan attribute value or <plan> element text) */
    instruction: string;
    /** Existing children that are immutable constraints */
    existingChildren: string[];
    /** The element with the plan directive */
    element: any;
}
export type PlanQuestionType = 'open' | 'yes-no' | 'value' | 'select' | 'multi-select';
export interface PlanQuestion {
    /** Question type */
    type: PlanQuestionType;
    /** The question text */
    question: string;
    /** Available options (for select/multi-select) */
    options?: string[];
    /** User's answer (filled after user responds) */
    answer?: string;
}
export interface ComponentDefinition {
    /** Fully qualified name */
    fqn: FQN;
    /** Component display name */
    name: string;
    /** File where this component is defined */
    file: string;
    /** What other components see */
    interface?: InterfaceDefinition;
    /** Environment requirements */
    constraints?: ConstraintDefinition;
    /** Dependencies referenced by interface only */
    requires?: DependencyDefinition[];
    /** Internal details, never exposed to dependents */
    implementation?: any;
    /** Additional aspect views */
    aspects?: AspectDefinition[];
}
export interface InterfaceDefinition {
    /** Interface facets (compute, network, api, storage, data, etc.) */
    facets: InterfaceFacet[];
    /** Interface type this component implements (e.g., 'sql-database') */
    implements?: string;
    /** Parent interface this extends */
    extends?: string;
}
export interface InterfaceFacet {
    /** Facet type identifier (e.g., 'compute', 'network', 'api', 'storage', 'data') */
    type: string;
    /** The facet-specific interface content */
    content: any;
}
export interface ConstraintDefinition {
    /** OS requirement */
    os?: string;
    /** Distribution */
    distro?: string;
    /** Architecture */
    arch?: string;
    /** Resource constraints */
    resources?: Record<string, string>;
    /** Port mappings */
    ports?: Array<{
        external: string;
        internal: string;
    }>;
    /** Required services */
    services?: Array<{
        name: string;
        port?: string;
        [key: string]: any;
    }>;
    /** Raw constraint attributes */
    raw?: Record<string, string>;
}
export interface DependencyDefinition {
    /** FQN of the dependency */
    fqn: FQN;
    /** Which facets the consumer needs (e.g., ['compute']) */
    facets?: string[];
    /** Brief purpose annotation */
    usage?: string;
    /** Additional config for the dependency */
    config?: Record<string, string>;
}
export interface AspectDefinition {
    /** Aspect type (infrastructure, api, data, security, monitoring) */
    type: string;
    /** File where this aspect is defined */
    file: string;
    /** FQN of the base component */
    component: string;
}
export interface ProjectedInterface {
    /** Where the interface came from */
    sourceFqn: FQN;
    /** Only the requested facets */
    facets: InterfaceFacet[];
    /** From dependency's usage/description */
    purpose: string;
}
export interface SystemProject {
    /** System name */
    name: string;
    /** Components within the system */
    components: SystemComponent[];
    /** Project manifest path */
    manifestPath: string;
}
export interface SystemComponent {
    /** Component name */
    name: string;
    /** Component type (webapp, rest, service, etc.) */
    type: string;
    /** Whether this is a git submodule */
    submodule: boolean;
    /** Description */
    description?: string;
}
export interface EnvironmentFileSet {
    /** Base system file */
    base: string;
    /** Ordered override files (most general → most specific) */
    overrides: string[];
}
export interface ContextManifest {
    /** The .cdml file this context is for */
    forFile: string;
    /** Whether this was auto-generated */
    autoGenerated: boolean;
    /** Global refs and facts */
    global: ContextGlobal;
    /** Per-scope context mappings */
    scopes: ContextScope[];
}
export interface ContextGlobal {
    /** Global code/config references */
    refs: ContextRef[];
    /** Global architectural facts */
    facts: ContextFact[];
}
export interface ContextScope {
    /** Scope path (e.g., 'my-service > implementation > user-controller') */
    path: string;
    /** Interface contracts this scope fulfills or depends on */
    interfaces: {
        fulfills: Array<{
            fqn: string;
        }>;
        depends: Array<{
            fqn: string;
            facet?: string;
            usage?: string;
        }>;
    };
    /** Code artifact references */
    refs: ContextRef[];
    /** Architectural facts */
    facts: ContextFact[];
    /** Tool access directives */
    tools: ContextTool[];
}
export interface ContextRef {
    /** File path */
    file: string;
    /** Role of this file (implementation, tests, type-definitions, etc.) */
    role: string;
    /** Specific line range (e.g., '15-22') */
    lines?: string;
    /** For config files: specific keys to include */
    keys?: string;
}
export interface ContextFact {
    /** The fact content */
    content: string;
    /** Decision source (e.g., 'plan:2025-02-18') */
    decision?: string;
}
export interface ContextTool {
    /** Tool name (Read, Write, etc.) */
    name: string;
    /** Scope restriction (glob pattern) */
    scope: string;
}
/**
 * Assembled prompt ready for headless Claude execution.
 * This is the final output of the context engine.
 */
export interface AssembledPrompt {
    /** The target state: changed .cdml element content */
    target: string;
    /** The current state: source code from refs */
    current: Record<string, string>;
    /** Interface contracts this scope must satisfy */
    contracts: ProjectedInterface[];
    /** Dependency interfaces (view-filtered) */
    dependencies: ProjectedInterface[];
    /** Locked siblings/children (immutable constraints) */
    constraints: string[];
    /** Persistent architectural decisions */
    facts: ContextFact[];
    /** Exact files to modify with their roles */
    changeTargets: ContextRef[];
    /** The final assembled prompt string */
    prompt: string;
}
//# sourceMappingURL=types.d.ts.map