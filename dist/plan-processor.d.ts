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
import type { PlanDirective, PlanQuestion, ContextFact } from './types.js';
/**
 * Detect plan directives in a parsed CDML document.
 *
 * Finds elements with:
 * - `plan` attribute (e.g., <cloud plan="custom private cloud">)
 * - `<plan>` child elements (e.g., <cloud><plan>custom private cloud</plan></cloud>)
 */
export declare function detectPlanDirectives($: CheerioAPI): PlanDirective[];
/**
 * Parse plan:questions from a CDML document.
 *
 * Question types:
 * - <select question="..."><a>opt1</a><b>opt2</b><answer></answer></select>
 * - <input question="..."><answer></answer></input>
 * - <yesno question="..."><answer></answer></yesno>
 * - <multiselect question="..."><a>opt1</a><b>opt2</b><answer></answer></multiselect>
 */
export declare function parsePlanQuestions($: CheerioAPI): PlanQuestion[];
/**
 * Check if all plan:questions have been answered.
 */
export declare function allQuestionsAnswered(questions: PlanQuestion[]): boolean;
/**
 * Generate plan:questions CDML block from question definitions.
 */
export declare function generatePlanQuestions(questions: PlanQuestion[]): string;
/**
 * Convert answered plan questions into context facts.
 */
export declare function questionsToFacts(questions: PlanQuestion[], decisionSource: string): ContextFact[];
/**
 * Build a plan expansion prompt for Claude.
 *
 * Asks Claude to propose one-level-deep expansion, respecting
 * existing children as immutable constraints.
 */
export declare function buildPlanPrompt(directive: PlanDirective): string;
//# sourceMappingURL=plan-processor.d.ts.map