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

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type {
  ContextManifest,
  ContextScope,
  ContextFact,
  ContextRef,
  AssembledPrompt,
  ProjectedInterface,
  CdmlElementChange,
  ProjectRegistry,
} from './types.js';
import { parseContextManifest } from './context-parser.js';
import { resolveComponent } from './project.js';
import { projectFacets } from './projector.js';
import { formatProjectedInterfaces } from './projector.js';
import { parseFQN } from './fqn.js';

/**
 * Resolve scope context from a context manifest.
 *
 * Walks up the scope chain merging context from each level:
 * target scope → parent scope → ... → global
 */
export function resolveScope(
  manifest: ContextManifest,
  scopePath: string
): {
  refs: ContextRef[];
  facts: ContextFact[];
  interfaces: ContextScope['interfaces'];
} {
  const matchingScopes: ContextScope[] = [];

  // Find all scopes in the chain (from specific to general)
  const scopeParts = scopePath.split(' > ');
  for (let i = scopeParts.length; i > 0; i--) {
    const candidate = scopeParts.slice(0, i).join(' > ');
    const scope = manifest.scopes.find((s) => s.path === candidate);
    if (scope) {
      matchingScopes.push(scope);
    }
  }

  // Merge: most specific first, then less specific, then global
  const refs = [...manifest.global.refs];
  const facts = [...manifest.global.facts];
  const fulfills: ContextScope['interfaces']['fulfills'] = [];
  const depends: ContextScope['interfaces']['depends'] = [];

  // Add scope-specific context (reverse order: general → specific)
  for (const scope of matchingScopes.reverse()) {
    refs.push(...scope.refs);
    facts.push(...scope.facts);
    fulfills.push(...scope.interfaces.fulfills);
    depends.push(...scope.interfaces.depends);
  }

  return {
    refs,
    facts,
    interfaces: { fulfills, depends },
  };
}

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
export async function assembleContext(
  change: CdmlElementChange,
  scopePath: string,
  manifest: ContextManifest,
  registry: ProjectRegistry | null,
  projectRoot: string
): Promise<AssembledPrompt> {
  // 1. Resolve scope context
  const scopeContext = resolveScope(manifest, scopePath);

  // 2. Build target (the changed .cdml element)
  const target = formatChangeAsTarget(change);

  // 3. Read current code from refs
  const current: Record<string, string> = {};
  for (const ref of scopeContext.refs) {
    const filePath = join(projectRoot, ref.file);
    if (existsSync(filePath)) {
      try {
        let content = await readFile(filePath, 'utf-8');

        // If specific lines requested, extract them
        if (ref.lines) {
          content = extractLines(content, ref.lines);
        }

        // If specific keys requested (for config files), extract them
        if (ref.keys) {
          content = extractKeys(content, ref.keys);
        }

        current[ref.file] = content;
      } catch {
        // File unreadable — skip
      }
    }
  }

  // 4. Resolve interface contracts
  const contracts: ProjectedInterface[] = [];
  const dependencies: ProjectedInterface[] = [];

  if (registry) {
    // Resolve fulfills — what this scope must satisfy
    for (const f of scopeContext.interfaces.fulfills) {
      const component = resolveComponent(f.fqn, registry);
      if (component?.interface) {
        contracts.push({
          sourceFqn: component.fqn,
          facets: component.interface.facets,
          purpose: 'contract to fulfill',
        });
      }
    }

    // Resolve depends — external service interfaces (view-filtered)
    for (const d of scopeContext.interfaces.depends) {
      const component = resolveComponent(d.fqn, registry);
      if (component?.interface) {
        const dep = {
          fqn: parseFQN(d.fqn),
          facets: d.facet ? [d.facet] : undefined,
          usage: d.usage,
        };
        dependencies.push(projectFacets(dep, component.interface));
      }
    }
  }

  // 5. Collect locked constraints (siblings that must not change)
  const constraints: string[] = [];

  // 6. Assemble the prompt
  const prompt = buildPromptString({
    target,
    current,
    contracts,
    dependencies,
    constraints,
    facts: scopeContext.facts,
    changeTargets: scopeContext.refs,
  });

  return {
    target,
    current,
    contracts,
    dependencies,
    constraints,
    facts: scopeContext.facts,
    changeTargets: scopeContext.refs,
    prompt,
  };
}

// ─── Prompt Assembly ────────────────────────────────────────────

function buildPromptString(ctx: Omit<AssembledPrompt, 'prompt'>): string {
  const sections: string[] = [];

  // Target state (what should exist)
  sections.push('## Target State');
  sections.push('The following CDML change describes what should be implemented:');
  sections.push('');
  sections.push(ctx.target);
  sections.push('');

  // Current state (what exists now)
  if (Object.keys(ctx.current).length > 0) {
    sections.push('## Current State');
    sections.push('These are the current source files:');
    sections.push('');
    for (const [file, content] of Object.entries(ctx.current)) {
      const ref = ctx.changeTargets.find((r) => r.file === file);
      const roleLabel = ref?.role ? ` (${ref.role})` : '';
      sections.push(`### ${file}${roleLabel}`);
      sections.push('```');
      sections.push(content);
      sections.push('```');
      sections.push('');
    }
  }

  // Contracts (what this scope must satisfy)
  if (ctx.contracts.length > 0) {
    sections.push('## Interface Contracts');
    sections.push('This scope must satisfy these interface contracts:');
    sections.push('');
    sections.push(formatProjectedInterfaces(ctx.contracts));
    sections.push('');
  }

  // Dependencies (external service interfaces)
  if (ctx.dependencies.length > 0) {
    sections.push(formatProjectedInterfaces(ctx.dependencies));
    sections.push('');
  }

  // Constraints (locked siblings)
  if (ctx.constraints.length > 0) {
    sections.push('## Constraints');
    sections.push('The following elements are locked and must NOT be modified:');
    sections.push('');
    for (const c of ctx.constraints) {
      sections.push(`- ${c}`);
    }
    sections.push('');
  }

  // Architectural facts
  if (ctx.facts.length > 0) {
    sections.push('## Architectural Decisions');
    for (const fact of ctx.facts) {
      const source = fact.decision ? ` [${fact.decision}]` : '';
      sections.push(`- ${fact.content}${source}`);
    }
    sections.push('');
  }

  // Change targets
  if (ctx.changeTargets.length > 0) {
    sections.push('## Files to Modify');
    sections.push('Generate or modify these files:');
    for (const ref of ctx.changeTargets) {
      const lines = ref.lines ? ` (lines ${ref.lines})` : '';
      sections.push(`- ${ref.file} [${ref.role}]${lines}`);
    }
    sections.push('');
  }

  // Instructions
  sections.push('## Instructions');
  sections.push('1. Implement the Target State changes');
  sections.push('2. Satisfy all interface contracts');
  sections.push('3. Use dependency interfaces as specified');
  sections.push('4. Do not modify locked/constrained elements');
  sections.push('5. Follow architectural decisions listed above');
  sections.push('6. Return complete file contents for each modified file');

  return sections.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────

function formatChangeAsTarget(change: CdmlElementChange): string {
  const parts: string[] = [];

  parts.push(`Element: <${change.tagName}>`);
  parts.push(`Change type: ${change.type}`);
  parts.push(`Path: ${change.path}`);

  if (change.newAttributes && Object.keys(change.newAttributes).length > 0) {
    parts.push('Attributes:');
    for (const [k, v] of Object.entries(change.newAttributes)) {
      parts.push(`  ${k}="${v}"`);
    }
  }

  if (change.newText) {
    parts.push(`Content: ${change.newText}`);
  }

  if (change.children && change.children.length > 0) {
    parts.push('Children:');
    for (const child of change.children) {
      parts.push(`  - <${child.tagName}> [${child.type}]`);
    }
  }

  return parts.join('\n');
}

function extractLines(content: string, lineSpec: string): string {
  const lines = content.split('\n');
  const [start, end] = lineSpec.split('-').map(Number);

  if (end) {
    return lines.slice(start - 1, end).join('\n');
  }

  return lines[start - 1] || '';
}

function extractKeys(content: string, keysSpec: string): string {
  const keys = keysSpec.split(',').map((k) => k.trim());
  const lines = content.split('\n');

  return lines
    .filter((line) => {
      const key = line.split('=')[0]?.trim();
      return keys.includes(key);
    })
    .join('\n');
}
