/**
 * CDML Parser — interface-first, diff-driven component model.
 *
 * No gen/retry/undo attributes. Changes detected by diffing.
 * Extracts: interface, constraints, dependencies, implementation,
 * plan directives, and plan:questions.
 */
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type { InterfaceDefinition, ConstraintDefinition, DependencyDefinition, ComponentDefinition } from './types.js';
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
export declare function parseSpecFile(content: string): ParsedCdml;
/**
 * Extract the <interface> section from a component.
 */
export declare function extractInterface($: CheerioAPI): InterfaceDefinition | null;
/**
 * Extract the <constraints> section from a component.
 */
export declare function extractConstraints($: CheerioAPI): ConstraintDefinition | null;
/**
 * Extract the <requires> section — dependencies referenced by interface only.
 */
export declare function extractDependencies($: CheerioAPI): DependencyDefinition[];
/**
 * Extract siblings as locked constraints for scoped generation.
 */
export declare function extractScopeConstraints($: CheerioAPI, element: Element): string[];
/**
 * Build a prompt context string from the parsed component.
 * Used as a simpler alternative to full context engine for standalone files.
 */
export declare function buildPromptContext(component: ComponentDefinition): string;
//# sourceMappingURL=parser.d.ts.map