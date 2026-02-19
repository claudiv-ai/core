/**
 * @claudiv/core — Declarative AI interaction platform core.
 *
 * Interface-first, diff-driven component model with FQN addressing,
 * context engine, and headless Claude execution.
 */
export * from './types.js';
export * from './sdk-types.js';
export { parseFQN, resolveFQN, buildFQN, stringifyFQN, isAbsoluteFQN } from './fqn.js';
export { diffCdml, getChangedElements } from './differ.js';
export { assembleContext, resolveScope } from './context-engine.js';
export { parseContextManifest, loadContextManifest, serializeContextManifest } from './context-parser.js';
export { executeClaudeHeadless } from './executor.js';
export type { ExecutionResult, ExecutorConfig } from './executor.js';
export { projectFacets, resolveProjectedDependencies, formatProjectedInterfaces } from './projector.js';
export { detectPlanDirectives, parsePlanQuestions, generatePlanQuestions, questionsToFacts, allQuestionsAnswered, buildPlanPrompt } from './plan-processor.js';
export { scanProject, generateCdmlFromScan } from './scanner.js';
export type { ScanResult } from './scanner.js';
export { mergeEnvironmentCascade, detectEnvironmentFiles } from './environment.js';
export { loadProject, resolveComponent, resolveInterface } from './project.js';
export { parseAspect, discoverAspects, getAspectRelevantFacets, linkAspects } from './aspects.js';
export type { ParsedAspect } from './aspects.js';
export { parseSpecFile, extractInterface, extractConstraints, extractDependencies, extractScopeConstraints, buildPromptContext } from './parser.js';
export type { ParsedCdml } from './parser.js';
export { buildElementPath, buildScopeChain, getSiblingElements, getChildElementNames, buildFQNFromPosition, extractFullContent } from './utils/hierarchy-helpers.js';
export { logger } from './utils/logger.js';
//# sourceMappingURL=index.d.ts.map