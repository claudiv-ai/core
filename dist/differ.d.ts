/**
 * CDML Differ Engine
 *
 * Compares old and new CDML content to produce a structured diff.
 * Used for change detection instead of gen/retry/undo attributes.
 *
 * Algorithm:
 * 1. Parse old + new CDML with htmlparser2 + cheerio
 * 2. Walk trees in parallel, match by (parent path + tag name + sibling index)
 * 3. Compare attributes and text content
 * 4. Produce CdmlDiffResult with CdmlElementChange tree
 */
import type { CdmlDiffResult, CdmlElementChange } from './types.js';
/**
 * Diff two CDML documents and return structured changes.
 */
export declare function diffCdml(oldContent: string, newContent: string): CdmlDiffResult;
/**
 * Extract only changed elements from a diff result (flattened).
 */
export declare function getChangedElements(diff: CdmlDiffResult): CdmlElementChange[];
//# sourceMappingURL=differ.d.ts.map