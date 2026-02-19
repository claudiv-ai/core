/**
 * Environment Cascade — environment-specific CDML overrides.
 *
 * Naming convention:
 *   my-system.cdml                    — base system
 *   my-system.env.cdml                — base environment
 *   my-system.env.linux.cdml          — Linux
 *   my-system.env.linux.arm64.cdml    — Linux ARM64
 *   my-system.env.linux.ubuntu.cdml   — Linux Ubuntu
 *
 * The `.env.` segment separates system from environment.
 * Resolution: most general → most specific. Element-level merge.
 * Use `<element remove="true"/>` for explicit removal.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element, AnyNode } from 'domhandler';
import type { EnvironmentFileSet } from './types.js';

/**
 * Detect environment override files for a base CDML file.
 *
 * @param baseCdml - Path to the base .cdml file (e.g., 'my-system.cdml')
 * @param platform - OS platform (e.g., 'linux', 'darwin', 'win32')
 * @param arch - CPU architecture (e.g., 'arm64', 'x64')
 * @param distro - OS distribution (e.g., 'ubuntu', 'alpine')
 */
export function detectEnvironmentFiles(
  baseCdml: string,
  platform?: string,
  arch?: string,
  distro?: string
): EnvironmentFileSet {
  const dir = dirname(baseCdml);
  const name = basename(baseCdml, '.cdml');

  const overrides: string[] = [];

  // Build cascade chain: most general → most specific
  const candidates = [
    `${name}.env.cdml`,                                // base env
  ];

  if (platform) {
    candidates.push(`${name}.env.${platform}.cdml`);  // platform
    if (arch) {
      candidates.push(`${name}.env.${platform}.${arch}.cdml`);  // platform + arch
    }
    if (distro) {
      candidates.push(`${name}.env.${platform}.${distro}.cdml`); // platform + distro
    }
    if (arch && distro) {
      candidates.push(`${name}.env.${platform}.${distro}.${arch}.cdml`); // all
    }
  }

  for (const candidate of candidates) {
    const fullPath = join(dir, candidate);
    if (existsSync(fullPath)) {
      overrides.push(fullPath);
    }
  }

  return {
    base: baseCdml,
    overrides,
  };
}

/**
 * Merge environment cascade files into a single resolved CDML string.
 *
 * Resolution order: base → env → env.platform → env.platform.arch → ...
 * Each level can:
 * - Add new elements
 * - Override attributes on existing elements (by matching tag name + position)
 * - Remove elements with remove="true" attribute
 */
export async function mergeEnvironmentCascade(
  fileSet: EnvironmentFileSet
): Promise<string> {
  // Start with base
  let baseContent = await readFile(fileSet.base, 'utf-8');
  let $base = parseCdml(baseContent);

  // Apply each override in order
  for (const overrideFile of fileSet.overrides) {
    const overrideContent = await readFile(overrideFile, 'utf-8');
    const $override = parseCdml(overrideContent);

    $base = mergeDocuments($base, $override);
  }

  return $base.html() || '';
}

// ─── Internal ───────────────────────────────────────────────────

function parseCdml(content: string): CheerioAPI {
  const dom = parseDocument(content, {
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
  });

  return cheerio.load(dom, { xmlMode: false });
}

/**
 * Merge an override document into a base document.
 * Element-level merge: match by tag name and position within parent.
 */
function mergeDocuments($base: CheerioAPI, $override: CheerioAPI): CheerioAPI {
  const overrideContainer = $override('body').length > 0
    ? $override('body')
    : $override('*').first();

  const baseContainer = $base('body').length > 0
    ? $base('body')
    : $base('*').first();

  overrideContainer.children().each((_, child) => {
    if (child.type !== 'tag') return;
    mergeElement($base, $override, child as Element, baseContainer);
  });

  return $base;
}

function mergeElement(
  $base: CheerioAPI,
  $override: CheerioAPI,
  overrideEl: Element,
  baseParent: cheerio.Cheerio<any>
): void {
  const tagName = overrideEl.name;
  const overrideAttrs = overrideEl.attribs || {};

  // Check for explicit removal
  if (overrideAttrs.remove === 'true') {
    // Remove matching element from base
    baseParent.children(tagName).first().remove();
    return;
  }

  // Find matching element in base (by tag name within parent)
  const baseMatch = baseParent.children(tagName).first();

  if (baseMatch.length > 0) {
    // Merge attributes (override wins)
    for (const [key, value] of Object.entries(overrideAttrs)) {
      baseMatch.attr(key, String(value));
    }

    // Recursively merge children
    $override(overrideEl).children().each((_, child) => {
      if (child.type !== 'tag') return;
      mergeElement($base, $override, child as Element, baseMatch);
    });

    // Merge text content: override replaces if non-empty
    const overrideText = getDirectText($override, overrideEl);
    if (overrideText) {
      // Replace direct text content
      setDirectText($base, baseMatch, overrideText);
    }
  } else {
    // No match — append new element to base parent
    const clone = $override.html(overrideEl) || '';
    baseParent.append(clone);
  }
}

function getDirectText($: CheerioAPI, el: Element): string {
  let text = '';
  $(el).contents().each((_, child: AnyNode) => {
    if (child.type === 'text') {
      text += (child as any).data || '';
    }
  });
  return text.trim();
}

function setDirectText(
  $: CheerioAPI,
  $el: cheerio.Cheerio<any>,
  text: string
): void {
  // Remove existing text nodes
  $el.contents().each((_, child: AnyNode) => {
    if (child.type === 'text') {
      (child as any).data = '';
    }
  });

  // Prepend text
  $el.prepend(text);
}
