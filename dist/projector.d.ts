/**
 * View-filtered interface facet projection.
 *
 * When a component depends on another, it only sees the facets it needs.
 * This module resolves dependencies to their projected (filtered) interfaces.
 *
 * Example:
 *   <depends fqn="vm-arm" facet="compute" usage="deployment target" />
 *   → only returns the compute facet (OS, resources), not network/storage
 */
import type { ProjectedInterface, ComponentDefinition, InterfaceDefinition, DependencyDefinition, ProjectRegistry } from './types.js';
/**
 * Project (filter) interface facets for a dependency.
 *
 * Returns only the facets specified in the dependency definition.
 * If no facets specified, returns the full interface.
 */
export declare function projectFacets(dependency: DependencyDefinition, sourceInterface: InterfaceDefinition): ProjectedInterface;
/**
 * Resolve all dependencies for a component and return projected interfaces.
 */
export declare function resolveProjectedDependencies(component: ComponentDefinition, currentScope: string[], registry: ProjectRegistry): ProjectedInterface[];
/**
 * Format projected interfaces for inclusion in a prompt.
 */
export declare function formatProjectedInterfaces(projections: ProjectedInterface[]): string;
//# sourceMappingURL=projector.d.ts.map