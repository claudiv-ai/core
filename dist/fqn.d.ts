/**
 * Fully Qualified Name (FQN) parser and resolver.
 *
 * FQN Grammar:
 *   fqn        = [project ":"] scope-path ["#" fragment] ["@" version]
 *   scope-path = segment (":" segment)*
 *   fragment   = aspect-or-section [":" sub-path]
 *   segment    = kebab-case-identifier
 *
 * Examples:
 *   my-service                              — relative, current scope
 *   my-service#api                          — service's interface
 *   my-service#api:users-add                — specific endpoint
 *   system:cloud:arm:my-service             — absolute within project
 *   acme-platform:system:cloud:arm:my-service — cross-project
 *   redis@7.2#api                           — versioned
 *   my-service#infra                        — infrastructure aspect
 */
import type { FQN, ResolvedRef, ProjectRegistry } from './types.js';
/**
 * Parse a raw FQN string into its constituent parts.
 */
export declare function parseFQN(raw: string): FQN;
/**
 * Resolve an FQN to a concrete component reference within a project registry.
 *
 * Resolution rules:
 * 1. Absolute FQNs (start with known project name): resolve from project root
 * 2. Relative FQNs: walk up current scope chain, match at each level
 * 3. Fragment '#': separates component from facet/aspect
 * 4. Within fragment, colons drill into sub-structures
 */
export declare function resolveFQN(fqn: FQN, currentScope: string[], registry: ProjectRegistry): ResolvedRef;
/**
 * Build an FQN string from a DOM element's position in the hierarchy.
 */
export declare function buildFQN(elementName: string, ancestors: string[], projectName?: string): string;
/**
 * Convert FQN back to string representation.
 */
export declare function stringifyFQN(fqn: FQN): string;
/**
 * Check if an FQN is absolute (starts with a project name).
 */
export declare function isAbsoluteFQN(fqn: FQN, registry: ProjectRegistry): boolean;
//# sourceMappingURL=fqn.d.ts.map