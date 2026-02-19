/**
 * CDML Parser — interface-first, diff-driven component model.
 *
 * No gen/retry/undo attributes. Changes detected by diffing.
 * Extracts: interface, constraints, dependencies, implementation,
 * plan directives, and plan:questions.
 */

import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type {
  InterfaceDefinition,
  InterfaceFacet,
  ConstraintDefinition,
  DependencyDefinition,
  ComponentDefinition,
  FQN,
} from './types.js';
import { parseFQN } from './fqn.js';

export interface ParsedCdml {
  /** Cheerio DOM instance */
  dom: CheerioAPI;

  /** Parsed component (if this is a component file) */
  component?: ComponentDefinition;

  /** Whether this file contains a <component> element */
  isComponent: boolean;

  /** Whether this file contains plan directives */
  hasPlanDirectives: boolean;

  /** Whether this file contains plan:questions */
  hasPlanQuestions: boolean;
}

/**
 * Parse a CDML file into its structured representation.
 */
export function parseSpecFile(content: string): ParsedCdml {
  const dom = parseDocument(content, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
  });

  const $ = cheerio.load(dom, { xmlMode: false });

  const componentEl = $('component');
  const isComponent = componentEl.length > 0;

  let component: ComponentDefinition | undefined;

  if (isComponent) {
    component = parseComponent($);
  }

  const hasPlanDirectives = $('[plan]').length > 0 || $('plan').length > 0;
  const hasPlanQuestions = $('plan\\:questions').length > 0;

  return {
    dom: $,
    component,
    isComponent,
    hasPlanDirectives,
    hasPlanQuestions,
  };
}

/**
 * Parse a <component> element into a ComponentDefinition.
 */
function parseComponent($: CheerioAPI): ComponentDefinition {
  const componentEl = $('component');
  const name = componentEl.attr('name') || 'unnamed';
  const fqnAttr = componentEl.attr('fqn');

  const fqn: FQN = fqnAttr ? parseFQN(fqnAttr) : {
    segments: [name],
    raw: name,
  };

  return {
    fqn,
    name,
    file: '',
    interface: extractInterface($) || undefined,
    constraints: extractConstraints($) || undefined,
    requires: extractDependencies($),
    implementation: extractImplementation($),
  };
}

/**
 * Extract the <interface> section from a component.
 */
export function extractInterface($: CheerioAPI): InterfaceDefinition | null {
  const interfaceEl = $('component > interface');
  if (interfaceEl.length === 0) return null;

  const facets: InterfaceFacet[] = [];

  // Check for explicit <facet> elements
  interfaceEl.find('> facet').each((_, el) => {
    const facetEl = el as Element;
    const type = facetEl.attribs?.type;
    if (type) {
      facets.push({
        type,
        content: $(facetEl).html(),
      });
    }
  });

  // If no explicit facets, infer from children
  if (facets.length === 0) {
    // Check for well-known interface sections
    const sectionTypes: Record<string, string> = {
      endpoints: 'api',
      events: 'events',
      health: 'health',
      connection: 'data',
      ports: 'network',
      volumes: 'storage',
    };

    for (const [tag, facetType] of Object.entries(sectionTypes)) {
      const section = interfaceEl.find(`> ${tag}`);
      if (section.length > 0) {
        facets.push({
          type: facetType,
          content: $.html(section),
        });
      }
    }

    // If still nothing, treat entire content as 'api' facet
    if (facets.length === 0) {
      const content = interfaceEl.html();
      if (content && content.trim()) {
        facets.push({ type: 'api', content });
      }
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

/**
 * Extract the <constraints> section from a component.
 */
export function extractConstraints($: CheerioAPI): ConstraintDefinition | null {
  const constraintsEl = $('component > constraints');
  if (constraintsEl.length === 0) return null;

  const attrs = (constraintsEl[0] as Element).attribs || {};

  const resources: Record<string, string> = {};
  constraintsEl.find('ram, cpu, memory, disk').each((_, el) => {
    const resEl = el as Element;
    for (const [key, value] of Object.entries(resEl.attribs || {})) {
      resources[`${resEl.name}.${key}`] = String(value);
    }
  });

  const ports: ConstraintDefinition['ports'] = [];
  constraintsEl.find('ports > map').each((_, el) => {
    const mapEl = el as Element;
    ports.push({
      external: mapEl.attribs?.external || '',
      internal: mapEl.attribs?.internal || '',
    });
  });

  const services: ConstraintDefinition['services'] = [];
  constraintsEl.find('services > *').each((_, el) => {
    const svcEl = el as Element;
    services.push({
      name: svcEl.name,
      ...svcEl.attribs,
    });
  });

  return {
    os: attrs.os,
    distro: attrs.distro,
    arch: attrs.arch,
    resources: Object.keys(resources).length > 0 ? resources : undefined,
    ports: ports.length > 0 ? ports : undefined,
    services: services.length > 0 ? services : undefined,
    raw: attrs,
  };
}

/**
 * Extract the <requires> section — dependencies referenced by interface only.
 */
export function extractDependencies($: CheerioAPI): DependencyDefinition[] {
  const deps: DependencyDefinition[] = [];

  $('component > requires > dependency').each((_, el) => {
    const depEl = el as Element;
    const fqnStr = depEl.attribs?.fqn;
    if (!fqnStr) return;

    const facets = depEl.attribs?.facet
      ? String(depEl.attribs.facet).split(',').map((f: string) => f.trim())
      : undefined;

    deps.push({
      fqn: parseFQN(fqnStr),
      facets,
      usage: depEl.attribs?.usage,
      config: extractConfig(depEl),
    });
  });

  return deps;
}

/**
 * Extract the <implementation> section (opaque to external consumers).
 */
function extractImplementation($: CheerioAPI): any {
  const implEl = $('component > implementation');
  if (implEl.length === 0) return undefined;

  const attrs = (implEl[0] as Element).attribs || {};
  return {
    target: attrs.target,
    framework: attrs.framework,
    content: implEl.html(),
  };
}

/**
 * Extract siblings as locked constraints for scoped generation.
 */
export function extractScopeConstraints(
  $: CheerioAPI,
  element: Element
): string[] {
  const constraints: string[] = [];
  const $element = $(element);

  $element.siblings().each((_, sibling) => {
    if (sibling.type !== 'tag') return;
    const sibEl = sibling as Element;
    const attrs = Object.entries(sibEl.attribs || {})
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    constraints.push(`<${sibEl.name}${attrs ? ' ' + attrs : ''}>`);
  });

  return constraints;
}

/**
 * Build a prompt context string from the parsed component.
 * Used as a simpler alternative to full context engine for standalone files.
 */
export function buildPromptContext(component: ComponentDefinition): string {
  const parts: string[] = [];

  parts.push(`Component: ${component.name}`);
  parts.push(`FQN: ${component.fqn.raw}`);
  parts.push('');

  if (component.interface) {
    parts.push('Interface:');
    for (const facet of component.interface.facets) {
      parts.push(`  [${facet.type}]: ${typeof facet.content === 'string' ? facet.content : JSON.stringify(facet.content)}`);
    }
    parts.push('');
  }

  if (component.constraints) {
    parts.push('Constraints:');
    if (component.constraints.os) parts.push(`  OS: ${component.constraints.os}`);
    if (component.constraints.arch) parts.push(`  Arch: ${component.constraints.arch}`);
    parts.push('');
  }

  if (component.requires && component.requires.length > 0) {
    parts.push('Dependencies:');
    for (const dep of component.requires) {
      const facetStr = dep.facets ? ` [${dep.facets.join(', ')}]` : '';
      const usageStr = dep.usage ? ` — ${dep.usage}` : '';
      parts.push(`  ${dep.fqn.raw}${facetStr}${usageStr}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

// ─── Internal Helpers ───────────────────────────────────────────

function extractConfig(el: Element): Record<string, string> | undefined {
  const config: Record<string, string> = {};
  const skipKeys = ['fqn', 'facet', 'usage'];

  for (const [key, value] of Object.entries(el.attribs || {})) {
    if (!skipKeys.includes(key)) {
      config[key] = String(value);
    }
  }

  return Object.keys(config).length > 0 ? config : undefined;
}
