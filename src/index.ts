/**
 * @claudiv/core — Declarative AI interaction platform core.
 *
 * Interface-first, diff-driven component model with FQN addressing,
 * context engine, and headless Claude execution.
 */

// Core types
export * from './types.js';

// SDK types
export * from './sdk-types.js';

// FQN parser & resolver
export { parseFQN, resolveFQN, buildFQN, stringifyFQN, isAbsoluteFQN } from './fqn.js';

// CDML differ
export { diffCdml, getChangedElements } from './differ.js';

// Context engine
export { assembleContext, resolveScope } from './context-engine.js';

// Context manifest parser
export { parseContextManifest, loadContextManifest, serializeContextManifest } from './context-parser.js';

// Headless executor
export { executeClaudeHeadless } from './executor.js';
export type { ExecutionResult, ExecutorConfig } from './executor.js';

// Response parser
export { parseResponse } from './response-parser.js';
export type { FileBlock } from './response-parser.js';

// File committer
export { commitFiles } from './committer.js';
export type { CommitResult } from './committer.js';

// Interface projection
export { projectFacets, resolveProjectedDependencies, formatProjectedInterfaces } from './projector.js';

// Plan processor
export { detectPlanDirectives, parsePlanQuestions, generatePlanQuestions, questionsToFacts, allQuestionsAnswered, buildPlanPrompt } from './plan-processor.js';

// App scanner
export { scanProject, generateCdmlFromScan } from './scanner.js';
export type { ScanResult } from './scanner.js';

// Environment cascade
export { mergeEnvironmentCascade, detectEnvironmentFiles } from './environment.js';

// Project manifest & component registry
export { loadProject, resolveComponent, resolveInterface } from './project.js';

// Aspects
export { parseAspect, discoverAspects, getAspectRelevantFacets, linkAspects } from './aspects.js';
export type { ParsedAspect } from './aspects.js';

// Parser
export { parseSpecFile, extractInterface, extractConstraints, extractDependencies, extractScopeConstraints, buildPromptContext } from './parser.js';
export type { ParsedCdml } from './parser.js';

// Hierarchy helpers
export { buildElementPath, buildScopeChain, getSiblingElements, getChildElementNames, buildFQNFromPosition, extractFullContent } from './utils/hierarchy-helpers.js';

// Logger
export { logger } from './utils/logger.js';
