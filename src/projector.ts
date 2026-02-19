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

import type {
  ProjectedInterface,
  ComponentDefinition,
  InterfaceDefinition,
  InterfaceFacet,
  DependencyDefinition,
  FQN,
  ProjectRegistry,
} from './types.js';
import { resolveFQN } from './fqn.js';

/**
 * Project (filter) interface facets for a dependency.
 *
 * Returns only the facets specified in the dependency definition.
 * If no facets specified, returns the full interface.
 */
export function projectFacets(
  dependency: DependencyDefinition,
  sourceInterface: InterfaceDefinition
): ProjectedInterface {
  let facets: InterfaceFacet[];

  if (dependency.facets && dependency.facets.length > 0) {
    // Filter to requested facets only
    facets = sourceInterface.facets.filter((f) =>
      dependency.facets!.includes(f.type)
    );
  } else {
    // No facet filter — return all facets (default for #api references)
    facets = sourceInterface.facets;
  }

  return {
    sourceFqn: dependency.fqn,
    facets,
    purpose: dependency.usage || '',
  };
}

/**
 * Resolve all dependencies for a component and return projected interfaces.
 */
export function resolveProjectedDependencies(
  component: ComponentDefinition,
  currentScope: string[],
  registry: ProjectRegistry
): ProjectedInterface[] {
  if (!component.requires || component.requires.length === 0) {
    return [];
  }

  const projected: ProjectedInterface[] = [];

  for (const dep of component.requires) {
    try {
      const resolved = resolveFQN(dep.fqn, currentScope, registry);
      const depInterface = resolved.component.interface;

      if (depInterface) {
        projected.push(projectFacets(dep, depInterface));
      }
    } catch {
      // Unresolvable dependency — skip (will be caught at validation time)
    }
  }

  return projected;
}

/**
 * Format projected interfaces for inclusion in a prompt.
 */
export function formatProjectedInterfaces(
  projections: ProjectedInterface[]
): string {
  if (projections.length === 0) return '';

  const parts: string[] = ['## Dependency Interfaces'];

  for (const proj of projections) {
    const fqnStr = proj.sourceFqn.raw || proj.sourceFqn.segments.join(':');
    parts.push('');
    parts.push(`### ${fqnStr}`);
    if (proj.purpose) {
      parts.push(`Purpose: ${proj.purpose}`);
    }

    for (const facet of proj.facets) {
      parts.push(`Facet [${facet.type}]:`);
      if (typeof facet.content === 'string') {
        parts.push(facet.content);
      } else {
        parts.push(JSON.stringify(facet.content, null, 2));
      }
    }
  }

  return parts.join('\n');
}
