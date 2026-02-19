/**
 * Context manifest parser — parses `.claudiv/context.cdml` files.
 *
 * The context manifest maps scopes to code artifacts, interface contracts,
 * architectural facts, and tool directives.
 */
import type { ContextManifest } from './types.js';
/**
 * Parse a `.claudiv/context.cdml` file into a ContextManifest.
 */
export declare function parseContextManifest(content: string): ContextManifest;
/**
 * Load and parse a context manifest from a file path.
 */
export declare function loadContextManifest(filePath: string): Promise<ContextManifest>;
/**
 * Serialize a ContextManifest back to CDML string.
 */
export declare function serializeContextManifest(manifest: ContextManifest): string;
//# sourceMappingURL=context-parser.d.ts.map