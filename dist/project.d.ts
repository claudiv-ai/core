/**
 * Project manifest parser and component registry.
 *
 * Handles:
 * - Parsing `claudiv.project.cdml` manifests
 * - Auto-discovering components by directory patterns
 * - Mapping FQNs to file paths
 * - Loading and caching interface definitions on demand
 */
import type { ProjectRegistry, ComponentDefinition, InterfaceDefinition } from './types.js';
/**
 * Load a project from its manifest file.
 */
export declare function loadProject(manifestPath: string): Promise<ProjectRegistry>;
/**
 * Resolve a component by its FQN string.
 */
export declare function resolveComponent(fqnStr: string, registry: ProjectRegistry): ComponentDefinition | undefined;
/**
 * Resolve only the interface definition for a component.
 * Returns the interface section without implementation details.
 */
export declare function resolveInterface(fqnStr: string, registry: ProjectRegistry): InterfaceDefinition | undefined;
//# sourceMappingURL=project.d.ts.map