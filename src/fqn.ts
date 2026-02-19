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

import type { FQN, ResolvedRef, ProjectRegistry, ComponentDefinition } from './types.js';

const KEBAB_CASE_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Parse a raw FQN string into its constituent parts.
 */
export function parseFQN(raw: string): FQN {
  if (!raw || typeof raw !== 'string') {
    throw new Error(`Invalid FQN: empty or non-string value`);
  }

  let remaining = raw.trim();
  let version: string | undefined;
  let fragment: string | undefined;
  let fragmentPath: string[] | undefined;

  // 1. Extract version (@version) — must come last
  const atIdx = remaining.lastIndexOf('@');
  if (atIdx !== -1) {
    version = remaining.slice(atIdx + 1);
    remaining = remaining.slice(0, atIdx);
    if (!version) {
      throw new Error(`Invalid FQN "${raw}": empty version after @`);
    }
  }

  // 2. Extract fragment (#fragment[:sub-path])
  const hashIdx = remaining.indexOf('#');
  if (hashIdx !== -1) {
    const fragmentStr = remaining.slice(hashIdx + 1);
    remaining = remaining.slice(0, hashIdx);

    if (!fragmentStr) {
      throw new Error(`Invalid FQN "${raw}": empty fragment after #`);
    }

    // Split fragment by ':' — first part is the fragment type, rest is sub-path
    const fragmentParts = fragmentStr.split(':');
    fragment = fragmentParts[0];
    if (fragmentParts.length > 1) {
      fragmentPath = fragmentParts.slice(1);
    }
  }

  // 3. Parse scope path (colon-separated segments)
  if (!remaining) {
    throw new Error(`Invalid FQN "${raw}": no scope path`);
  }

  const segments = remaining.split(':');

  // Validate segments are non-empty
  for (const seg of segments) {
    if (!seg) {
      throw new Error(`Invalid FQN "${raw}": empty segment in scope path`);
    }
  }

  // 4. Detect project prefix: if the first segment matches a known project
  //    pattern, it's a project name. We can't know at parse-time without
  //    a registry, so we leave project undefined. Resolution sets it.
  return {
    segments,
    fragment,
    fragmentPath,
    version,
    raw,
  };
}

/**
 * Resolve an FQN to a concrete component reference within a project registry.
 *
 * Resolution rules:
 * 1. Absolute FQNs (start with known project name): resolve from project root
 * 2. Relative FQNs: walk up current scope chain, match at each level
 * 3. Fragment '#': separates component from facet/aspect
 * 4. Within fragment, colons drill into sub-structures
 */
export function resolveFQN(
  fqn: FQN,
  currentScope: string[],
  registry: ProjectRegistry
): ResolvedRef {
  // Check if first segment is a known project name
  const firstSegment = fqn.segments[0];

  if (registry.projects.has(firstSegment)) {
    // Absolute cross-project reference
    return resolveAbsolute(
      { ...fqn, project: firstSegment, segments: fqn.segments.slice(1) },
      registry
    );
  }

  // Check if it's the current project name
  if (firstSegment === registry.currentProject) {
    return resolveAbsolute(
      { ...fqn, project: firstSegment, segments: fqn.segments.slice(1) },
      registry
    );
  }

  // Relative resolution: try from current scope, walking up
  return resolveRelative(fqn, currentScope, registry);
}

/**
 * Build an FQN string from a DOM element's position in the hierarchy.
 */
export function buildFQN(
  elementName: string,
  ancestors: string[],
  projectName?: string
): string {
  const parts: string[] = [];

  if (projectName) {
    parts.push(projectName);
  }

  parts.push(...ancestors, elementName);

  return parts.join(':');
}

/**
 * Convert FQN back to string representation.
 */
export function stringifyFQN(fqn: FQN): string {
  const parts: string[] = [];

  if (fqn.project) {
    parts.push(fqn.project);
  }
  parts.push(...fqn.segments);

  let result = parts.join(':');

  if (fqn.version) {
    result += `@${fqn.version}`;
  }

  if (fqn.fragment) {
    result += `#${fqn.fragment}`;
    if (fqn.fragmentPath && fqn.fragmentPath.length > 0) {
      result += ':' + fqn.fragmentPath.join(':');
    }
  }

  return result;
}

/**
 * Check if an FQN is absolute (starts with a project name).
 */
export function isAbsoluteFQN(fqn: FQN, registry: ProjectRegistry): boolean {
  return (
    fqn.project !== undefined ||
    registry.projects.has(fqn.segments[0]) ||
    fqn.segments[0] === registry.currentProject
  );
}

// ─── Internal Resolution ────────────────────────────────────────

function resolveAbsolute(
  fqn: FQN & { project: string },
  registry: ProjectRegistry
): ResolvedRef {
  const key = fqn.segments.join(':');

  // Look up in component registry
  const component = registry.components.get(key);
  if (!component) {
    // Try with project prefix
    const fullKey = `${fqn.project}:${key}`;
    const comp = registry.components.get(fullKey);
    if (!comp) {
      throw new Error(`Component not found: ${fqn.raw} (looked up "${key}" and "${fullKey}")`);
    }
    return buildResolvedRef(fqn, comp);
  }

  return buildResolvedRef(fqn, component);
}

function resolveRelative(
  fqn: FQN,
  currentScope: string[],
  registry: ProjectRegistry
): ResolvedRef {
  // Try progressively shorter scope prefixes
  for (let i = currentScope.length; i >= 0; i--) {
    const prefix = currentScope.slice(0, i);
    const candidate = [...prefix, ...fqn.segments].join(':');

    const component = registry.components.get(candidate);
    if (component) {
      return buildResolvedRef(fqn, component);
    }
  }

  // Try bare lookup (no scope prefix)
  const bareKey = fqn.segments.join(':');
  const component = registry.components.get(bareKey);
  if (component) {
    return buildResolvedRef(fqn, component);
  }

  throw new Error(
    `Cannot resolve FQN "${fqn.raw}" from scope [${currentScope.join(':')}]`
  );
}

function buildResolvedRef(fqn: FQN, component: ComponentDefinition): ResolvedRef {
  const ref: ResolvedRef = {
    fqn,
    file: component.file,
    component,
  };

  // Resolve fragment if specified
  if (fqn.fragment) {
    ref.fragmentContent = resolveFragment(fqn, component);
  }

  return ref;
}

function resolveFragment(fqn: FQN, component: ComponentDefinition): any {
  const fragment = fqn.fragment;
  if (!fragment) return undefined;

  switch (fragment) {
    case 'api':
    case 'interface':
      return component.interface;

    case 'impl':
    case 'implementation':
      return component.implementation;

    case 'infra':
    case 'data':
    case 'security':
    case 'monitoring':
      return component.aspects?.find((a) => a.type === fragment);

    default:
      // Try to find as an aspect type
      const aspect = component.aspects?.find((a) => a.type === fragment);
      if (aspect) return aspect;

      // Try as an interface facet
      const facet = component.interface?.facets?.find((f) => f.type === fragment);
      if (facet) return facet;

      return undefined;
  }
}
