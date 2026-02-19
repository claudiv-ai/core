/**
 * Project manifest parser and component registry.
 *
 * Handles:
 * - Parsing `claudiv.project.cdml` manifests
 * - Auto-discovering components by directory patterns
 * - Mapping FQNs to file paths
 * - Loading and caching interface definitions on demand
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, basename, dirname } from 'path';
import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import type {
  ProjectManifest,
  AutoDiscoverPattern,
  ProjectRegistry,
  ComponentDefinition,
  InterfaceDefinition,
  FQN,
} from './types.js';
import { parseFQN } from './fqn.js';

/**
 * Load a project from its manifest file.
 */
export async function loadProject(manifestPath: string): Promise<ProjectRegistry> {
  const content = await readFile(manifestPath, 'utf-8');
  const manifest = parseManifest(content, manifestPath);
  const projectRoot = dirname(manifestPath);

  const registry: ProjectRegistry = {
    projects: new Map(),
    components: new Map(),
    currentProject: manifest.name,
  };

  registry.projects.set(manifest.name, manifest);

  // Auto-discover components
  if (manifest.autoDiscover) {
    for (const pattern of manifest.autoDiscover) {
      await discoverComponents(projectRoot, pattern, manifest.name, registry);
    }
  }

  return registry;
}

/**
 * Resolve a component by its FQN string.
 */
export function resolveComponent(
  fqnStr: string,
  registry: ProjectRegistry
): ComponentDefinition | undefined {
  // Try direct lookup
  const comp = registry.components.get(fqnStr);
  if (comp) return comp;

  // Try without project prefix
  for (const [key, value] of registry.components) {
    if (key.endsWith(`:${fqnStr}`) || key === fqnStr) {
      return value;
    }
  }

  // Try just the last segment (component name)
  const fqn = parseFQN(fqnStr);
  const name = fqn.segments[fqn.segments.length - 1];
  for (const [, value] of registry.components) {
    if (value.name === name) {
      return value;
    }
  }

  return undefined;
}

/**
 * Resolve only the interface definition for a component.
 * Returns the interface section without implementation details.
 */
export function resolveInterface(
  fqnStr: string,
  registry: ProjectRegistry
): InterfaceDefinition | undefined {
  const component = resolveComponent(fqnStr, registry);
  return component?.interface;
}

// ─── Internal ───────────────────────────────────────────────────

function parseManifest(content: string, manifestPath: string): ProjectManifest {
  const dom = parseDocument(content, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
  });

  const $ = cheerio.load(dom, { xmlMode: false });

  const projectEl = $('project');
  if (projectEl.length === 0) {
    throw new Error(`No <project> element found in ${manifestPath}`);
  }

  const name = projectEl.attr('name');
  if (!name) {
    throw new Error(`<project> element must have a name attribute in ${manifestPath}`);
  }

  const autoDiscover: AutoDiscoverPattern[] = [];
  projectEl.find('auto-discover > directory').each((_, el) => {
    const dirEl = el as Element;
    const path = dirEl.attribs?.path;
    const pattern = dirEl.attribs?.pattern || '*.cdml';
    if (path) {
      autoDiscover.push({ path, pattern });
    }
  });

  return {
    name,
    root: dirname(manifestPath),
    autoDiscover: autoDiscover.length > 0 ? autoDiscover : undefined,
  };
}

async function discoverComponents(
  projectRoot: string,
  pattern: AutoDiscoverPattern,
  projectName: string,
  registry: ProjectRegistry
): Promise<void> {
  const dirPath = join(projectRoot, pattern.path);

  if (!existsSync(dirPath)) return;

  // Simple glob: find .cdml files matching the pattern
  const { readdir } = await import('fs/promises');
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const fileName = entry.name;
    if (!matchPattern(fileName, pattern.pattern)) continue;

    // Skip aspect files for primary discovery (they're linked to base components)
    if (isAspectFile(fileName)) continue;

    const filePath = join(dirPath, fileName);
    try {
      const component = await loadComponentFile(filePath, projectRoot, projectName);
      if (component) {
        const fqnKey = component.fqn.segments.join(':');
        registry.components.set(fqnKey, component);
      }
    } catch {
      // Skip files that can't be parsed as components
    }
  }
}

async function loadComponentFile(
  filePath: string,
  projectRoot: string,
  projectName: string
): Promise<ComponentDefinition | null> {
  const content = await readFile(filePath, 'utf-8');
  const dom = parseDocument(content, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
  });

  const $ = cheerio.load(dom, { xmlMode: false });

  // Look for <component> element
  const componentEl = $('component');
  if (componentEl.length === 0) return null;

  const name = componentEl.attr('name') || basename(filePath, '.cdml');
  const fqnAttr = componentEl.attr('fqn');

  const relPath = relative(projectRoot, filePath);

  // Build FQN from attribute or derive from file path
  let fqn: FQN;
  if (fqnAttr) {
    fqn = parseFQN(fqnAttr);
  } else {
    fqn = parseFQN(name);
    fqn.project = projectName;
  }

  // Extract interface section
  const interfaceDef = extractInterfaceFromDom($);

  // Extract constraints
  const constraints = extractConstraintsFromDom($);

  // Extract dependencies
  const requires = extractDependenciesFromDom($);

  return {
    fqn,
    name,
    file: relPath,
    interface: interfaceDef || undefined,
    constraints: constraints || undefined,
    requires: requires.length > 0 ? requires : undefined,
  };
}

function extractInterfaceFromDom($: cheerio.CheerioAPI): InterfaceDefinition | null {
  const interfaceEl = $('component > interface');
  if (interfaceEl.length === 0) return null;

  const facets: InterfaceDefinition['facets'] = [];

  // Check for explicit <facet> elements
  interfaceEl.find('> facet').each((_, el) => {
    const facetEl = el as Element;
    const type = facetEl.attribs?.type;
    if (type) {
      facets.push({
        type,
        content: cheerio.load(facetEl)('facet').html(),
      });
    }
  });

  // If no explicit facets, treat all children as implicit 'api' facet content
  if (facets.length === 0) {
    const content = interfaceEl.html();
    if (content && content.trim()) {
      facets.push({ type: 'api', content });
    }
  }

  const implements_ = interfaceEl.attr('implements');
  const extends_ = interfaceEl.attr('extends');

  return {
    facets,
    implements: implements_ || undefined,
    extends: extends_ || undefined,
  };
}

function extractConstraintsFromDom($: cheerio.CheerioAPI) {
  const constraintsEl = $('component > constraints');
  if (constraintsEl.length === 0) return null;

  const attrs = (constraintsEl[0] as Element).attribs || {};

  return {
    os: attrs.os,
    distro: attrs.distro,
    arch: attrs.arch,
    raw: attrs,
  };
}

function extractDependenciesFromDom($: cheerio.CheerioAPI) {
  const deps: ComponentDefinition['requires'] = [];

  $('component > requires > dependency').each((_, el) => {
    const depEl = el as Element;
    const fqnStr = depEl.attribs?.fqn;
    if (!fqnStr) return;

    const facets = depEl.attribs?.facet ? String(depEl.attribs.facet).split(',').map((f: string) => f.trim()) : undefined;
    const usage = depEl.attribs?.usage;

    deps.push({
      fqn: parseFQN(fqnStr),
      facets,
      usage,
    });
  });

  return deps;
}

function matchPattern(fileName: string, pattern: string): boolean {
  // Simple glob matching: *.cdml, *.*.cdml
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${regexStr}$`).test(fileName);
}

function isAspectFile(fileName: string): boolean {
  // Aspect files follow the pattern: name.aspect-type.cdml
  const parts = fileName.replace('.cdml', '').split('.');
  return parts.length >= 2;
}
