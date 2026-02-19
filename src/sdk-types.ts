/**
 * SDK interface types for Claudiv platform SDKs (e.g., Vite SDK)
 *
 * Each SDK implements ClaudivSDK to integrate with a specific framework.
 * The SDK is an add-on package that provides `claudiv:*` npm scripts.
 */

export interface ClaudivSDK {
  /** SDK name (e.g., 'vite', 'next', 'astro') */
  name: string;

  /** Framework detector for this SDK */
  frameworkDetector: FrameworkDetector;

  /** Initialize a project for Claudiv usage */
  init(projectRoot: string): Promise<InitResult>;

  /** Start dev mode: watch .cdml files, diff, process changes */
  dev(projectRoot: string, opts: DevOptions): Promise<void>;

  /** One-shot generation: diff → process → exit */
  gen(projectRoot: string, opts: GenOptions): Promise<void>;

  /** Get npm scripts this SDK provides */
  getScripts(): Record<string, string>;
}

export interface FrameworkDetector {
  /** Check if this framework is present in the project */
  detect(projectRoot: string): Promise<boolean>;

  /** Get the application name from project config */
  getAppName(projectRoot: string): Promise<string>;

  /** Get source file paths for scanning */
  getSourcePaths(projectRoot: string): Promise<string[]>;

  /** Get ignore patterns for this framework */
  getIgnorePatterns(): string[];
}

export interface InitResult {
  /** Whether initialization succeeded */
  success: boolean;

  /** Files created during init */
  filesCreated: string[];

  /** Scripts added to package.json */
  scriptsAdded: Record<string, string>;

  /** Any warnings during init */
  warnings?: string[];
}

export interface DevOptions {
  /** Claude execution mode */
  mode?: 'cli' | 'api';

  /** API key for API mode */
  apiKey?: string;

  /** Debounce interval for file watching (ms) */
  debounceMs?: number;

  /** Whether to open browser on start */
  openBrowser?: boolean;
}

export interface GenOptions {
  /** Claude execution mode */
  mode?: 'cli' | 'api';

  /** API key for API mode */
  apiKey?: string;

  /** Specific scope to generate (FQN path) */
  scope?: string;

  /** Dry run — don't write files */
  dryRun?: boolean;
}
