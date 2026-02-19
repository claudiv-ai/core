/**
 * Multi-aspect component view support.
 *
 * Components can have multiple aspect files providing different views:
 *   services/my-service.cdml          — base (interface + constraints + requires + impl)
 *   aspects/my-service.infra.cdml     — deployment, scaling, networking
 *   aspects/my-service.api.cdml       — detailed OpenAPI, validation, rate limits
 *   aspects/my-service.data.cdml      — database schema, migrations, seeds
 *   aspects/my-service.security.cdml  — auth, RBAC, encryption, secrets
 *   aspects/my-service.monitoring.cdml — health, metrics, logging, alerting
 *
 * Aspects augment but don't contradict the base interface.
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import type { AspectDefinition, ComponentDefinition } from './types.js';

const KNOWN_ASPECT_TYPES = [
  'infra',
  'infrastructure',
  'api',
  'data',
  'security',
  'monitoring',
];

export interface ParsedAspect {
  /** The aspect definition metadata */
  definition: AspectDefinition;

  /** The parsed aspect content */
  content: any;

  /** Raw CDML content */
  raw: string;
}

/**
 * Parse a single aspect file.
 */
export function parseAspect(content: string, filePath: string): ParsedAspect {
  const dom = parseDocument(content, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
  });

  const $ = cheerio.load(dom, { xmlMode: false });

  const aspectEl = $('aspect');
  if (aspectEl.length === 0) {
    throw new Error(`No <aspect> element found in ${filePath}`);
  }

  const componentFqn = aspectEl.attr('component');
  if (!componentFqn) {
    throw new Error(`<aspect> must have a component attribute in ${filePath}`);
  }

  const type = aspectEl.attr('type') || inferAspectType(filePath);
  if (!type) {
    throw new Error(`Cannot determine aspect type for ${filePath}`);
  }

  const definition: AspectDefinition = {
    type,
    file: filePath,
    component: componentFqn,
  };

  return {
    definition,
    content: aspectEl.html(),
    raw: content,
  };
}

/**
 * Discover all aspect files for components in a directory.
 *
 * Auto-discovers by naming convention: <name>.<aspect>.cdml
 */
export async function discoverAspects(
  searchDirs: string[]
): Promise<Map<string, ParsedAspect[]>> {
  const aspectsByComponent = new Map<string, ParsedAspect[]>();

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.cdml')) continue;

      const aspectType = extractAspectType(entry.name);
      if (!aspectType) continue;

      const filePath = join(dir, entry.name);

      try {
        const content = await readFile(filePath, 'utf-8');
        const parsed = parseAspect(content, filePath);

        const componentFqn = parsed.definition.component;
        if (!aspectsByComponent.has(componentFqn)) {
          aspectsByComponent.set(componentFqn, []);
        }
        aspectsByComponent.get(componentFqn)!.push(parsed);
      } catch {
        // Skip files that can't be parsed as aspects
      }
    }
  }

  return aspectsByComponent;
}

/**
 * Get aspect-filtered context for generating from an aspect file.
 *
 * When generating from an aspect file, the context engine includes:
 * - Base component's interface + constraints
 * - Full aspect content
 * - Only aspect-relevant interfaces of dependencies
 */
export function getAspectRelevantFacets(aspectType: string): string[] {
  switch (aspectType) {
    case 'infra':
    case 'infrastructure':
      return ['compute', 'network', 'storage'];
    case 'api':
      return ['api', 'data'];
    case 'data':
      return ['data', 'storage'];
    case 'security':
      return ['api', 'network'];
    case 'monitoring':
      return ['api', 'compute'];
    default:
      return ['api'];
  }
}

/**
 * Link discovered aspects to their base components.
 */
export function linkAspects(
  components: Map<string, ComponentDefinition>,
  aspects: Map<string, ParsedAspect[]>
): void {
  for (const [componentFqn, aspectList] of aspects) {
    const component = components.get(componentFqn);
    if (!component) continue;

    if (!component.aspects) {
      component.aspects = [];
    }

    for (const aspect of aspectList) {
      component.aspects.push(aspect.definition);
    }
  }
}

// ─── Internal ───────────────────────────────────────────────────

function extractAspectType(fileName: string): string | null {
  // Pattern: name.aspect-type.cdml
  const withoutExt = fileName.replace('.cdml', '');
  const parts = withoutExt.split('.');

  if (parts.length < 2) return null;

  const possibleType = parts[parts.length - 1];
  if (KNOWN_ASPECT_TYPES.includes(possibleType)) {
    return possibleType;
  }

  return null;
}

function inferAspectType(filePath: string): string | null {
  return extractAspectType(basename(filePath));
}
