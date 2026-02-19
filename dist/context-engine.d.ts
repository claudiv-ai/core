/**
 * Claudiv Context Engine — the architectural centerpiece.
 *
 * Zero raw conversations. Pure reference-based context.
 *
 * Core principles:
 * 1. No Claude sessions — every invocation is headless
 * 2. No raw conversations — .cdml IS the target, codebase IS current state
 * 3. Architectural delta model — diff between code and .cdml IS the task
 * 4. Complete reference mapping — every scope maps to contracts, artifacts, facts
 * 5. Scope isolation — each scope's context is independent
 * 6. View-filtered projection — dependencies expose only relevant facets
 */
import type { ContextManifest, ContextScope, ContextFact, ContextRef, AssembledPrompt, CdmlElementChange, ProjectRegistry } from './types.js';
/**
 * Resolve scope context from a context manifest.
 *
 * Walks up the scope chain merging context from each level:
 * target scope → parent scope → ... → global
 */
export declare function resolveScope(manifest: ContextManifest, scopePath: string): {
    refs: ContextRef[];
    facts: ContextFact[];
    interfaces: ContextScope['interfaces'];
};
/**
 * Assemble a complete prompt for a specific scope and change.
 *
 * This is the main entry point for the context engine.
 *
 * Flow:
 * 1. Determine the delta: .cdml change = target state
 * 2. Resolve scope chain from context manifest
 * 3. Resolve interface contracts (fulfills + depends)
 * 4. Read current code from refs
 * 5. Collect architectural facts
 * 6. Assemble the final prompt
 */
export declare function assembleContext(change: CdmlElementChange, scopePath: string, manifest: ContextManifest, registry: ProjectRegistry | null, projectRoot: string): Promise<AssembledPrompt>;
//# sourceMappingURL=context-engine.d.ts.map