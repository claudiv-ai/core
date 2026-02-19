/**
 * Plan Processor — handles plan directives and plan:questions lifecycle.
 *
 * Detection:
 * - `plan` attribute: <cloud plan="custom private cloud">
 * - `<plan>` child element: <cloud><plan>custom private cloud</plan></cloud>
 *
 * Processing:
 * 1. Extract instruction
 * 2. Collect existing children as immutable constraints
 * 3. Assemble context via context engine
 * 4. Claude proposes one-level-deep expansion only
 * 5. If input needed, insert <plan:questions> temporarily
 *
 * Question lifecycle:
 * 1. Claude needs input → <plan:questions> inserted in .cdml
 * 2. User fills <answer> values, saves
 * 3. Diff detects answers → plan processor reads them
 * 4. <plan:questions> block removed from .cdml
 * 5. Decisions persisted as <fact decision="..."> in context.cdml
 */

import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type { PlanDirective, PlanQuestion, PlanQuestionType, ContextFact } from './types.js';

/**
 * Detect plan directives in a parsed CDML document.
 *
 * Finds elements with:
 * - `plan` attribute (e.g., <cloud plan="custom private cloud">)
 * - `<plan>` child elements (e.g., <cloud><plan>custom private cloud</plan></cloud>)
 */
export function detectPlanDirectives($: CheerioAPI): PlanDirective[] {
  const directives: PlanDirective[] = [];

  // Find elements with plan attribute
  $('[plan]').each((_, el) => {
    const element = el as Element;
    const $element = $(element);
    const instruction = $element.attr('plan') || '';

    const existingChildren = getExistingChildNames($, element);
    const scope = buildScopePath($, element);

    directives.push({
      scope,
      instruction,
      existingChildren,
      element,
    });
  });

  // Find elements with <plan> child elements
  $('plan').each((_, el) => {
    const planEl = el as Element;
    const $plan = $(planEl);
    const instruction = $plan.text().trim();

    const parent = $plan.parent();
    if (parent.length === 0) return;

    const parentEl = parent[0] as Element;
    const existingChildren = getExistingChildNames($, parentEl)
      .filter((name) => name !== 'plan');
    const scope = buildScopePath($, parentEl);

    directives.push({
      scope,
      instruction,
      existingChildren,
      element: parentEl,
    });
  });

  return directives;
}

/**
 * Parse plan:questions from a CDML document.
 *
 * Question types:
 * - <select question="..."><a>opt1</a><b>opt2</b><answer></answer></select>
 * - <input question="..."><answer></answer></input>
 * - <yesno question="..."><answer></answer></yesno>
 * - <multiselect question="..."><a>opt1</a><b>opt2</b><answer></answer></multiselect>
 */
export function parsePlanQuestions($: CheerioAPI): PlanQuestion[] {
  const questions: PlanQuestion[] = [];

  $('plan\\:questions').children().each((_, el) => {
    const element = el as Element;
    const $el = $(element);
    const tagName = element.name;
    const question = element.attribs?.question || '';
    const answer = $el.find('answer').text().trim() || undefined;

    let type: PlanQuestionType;
    let options: string[] | undefined;

    switch (tagName) {
      case 'select':
        type = 'select';
        options = extractOptions($, element);
        break;
      case 'multiselect':
        type = 'multi-select';
        options = extractOptions($, element);
        break;
      case 'yesno':
        type = 'yes-no';
        options = ['yes', 'no'];
        break;
      case 'input':
        type = 'open';
        break;
      case 'value':
        type = 'value';
        break;
      default:
        type = 'open';
    }

    questions.push({ type, question, options, answer });
  });

  return questions;
}

/**
 * Check if all plan:questions have been answered.
 */
export function allQuestionsAnswered(questions: PlanQuestion[]): boolean {
  return questions.every(
    (q) => q.answer !== undefined && q.answer.trim() !== ''
  );
}

/**
 * Generate plan:questions CDML block from question definitions.
 */
export function generatePlanQuestions(questions: PlanQuestion[]): string {
  const lines: string[] = ['<plan:questions>'];

  for (const q of questions) {
    switch (q.type) {
      case 'select':
        lines.push(`  <select question="${escapeAttr(q.question)}">`);
        if (q.options) {
          q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(97 + i);
            lines.push(`    <${letter}>${opt}</${letter}>`);
          });
        }
        lines.push('    <answer></answer>');
        lines.push('  </select>');
        break;

      case 'multi-select':
        lines.push(`  <multiselect question="${escapeAttr(q.question)}">`);
        if (q.options) {
          q.options.forEach((opt, i) => {
            const letter = String.fromCharCode(97 + i);
            lines.push(`    <${letter}>${opt}</${letter}>`);
          });
        }
        lines.push('    <answer></answer>');
        lines.push('  </multiselect>');
        break;

      case 'yes-no':
        lines.push(`  <yesno question="${escapeAttr(q.question)}"><answer></answer></yesno>`);
        break;

      case 'value':
        lines.push(`  <value question="${escapeAttr(q.question)}"><answer></answer></value>`);
        break;

      case 'open':
      default:
        lines.push(`  <input question="${escapeAttr(q.question)}"><answer></answer></input>`);
        break;
    }
  }

  lines.push('</plan:questions>');
  return lines.join('\n');
}

/**
 * Convert answered plan questions into context facts.
 */
export function questionsToFacts(
  questions: PlanQuestion[],
  decisionSource: string
): ContextFact[] {
  return questions
    .filter((q) => q.answer)
    .map((q) => ({
      content: `${q.question}: ${q.answer}`,
      decision: decisionSource,
    }));
}

/**
 * Build a plan expansion prompt for Claude.
 *
 * Asks Claude to propose one-level-deep expansion, respecting
 * existing children as immutable constraints.
 */
export function buildPlanPrompt(directive: PlanDirective): string {
  const parts: string[] = [];

  parts.push('## Plan Directive');
  parts.push(`Instruction: ${directive.instruction}`);
  parts.push('');

  if (directive.existingChildren.length > 0) {
    parts.push('## Immutable Constraints');
    parts.push('The following children already exist and must NOT be changed:');
    for (const child of directive.existingChildren) {
      parts.push(`- <${child}>`);
    }
    parts.push('');
  }

  parts.push('## Task');
  parts.push('Propose a ONE-LEVEL-DEEP expansion for this element.');
  parts.push('- Add new child elements that implement the instruction');
  parts.push('- Do not modify existing children');
  parts.push('- Each new child should be a self-contained component');
  parts.push('- If you need user input, generate <plan:questions> instead');
  parts.push('');
  parts.push('Return CDML elements only (no explanation needed).');

  return parts.join('\n');
}

// ─── Internal ───────────────────────────────────────────────────

function getExistingChildNames($: CheerioAPI, element: Element): string[] {
  const names: string[] = [];
  $(element).children().each((_, child) => {
    if (child.type === 'tag') {
      names.push((child as Element).name);
    }
  });
  return names;
}

function buildScopePath($: CheerioAPI, element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.type === 'tag') {
    parts.unshift(current.name);
    const parentResult: any = $(current).parent();
    current = parentResult.length > 0 && parentResult[0].type === 'tag'
      ? parentResult[0] as Element
      : null;
  }

  return parts.join(' > ');
}

function extractOptions($: CheerioAPI, element: Element): string[] {
  const options: string[] = [];
  $(element).children().each((_, child) => {
    if (child.type === 'tag' && (child as Element).name !== 'answer') {
      options.push($(child as Element).text().trim());
    }
  });
  return options;
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
