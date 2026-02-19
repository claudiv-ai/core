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
import type { AspectDefinition, ComponentDefinition } from './types.js';
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
export declare function parseAspect(content: string, filePath: string): ParsedAspect;
/**
 * Discover all aspect files for components in a directory.
 *
 * Auto-discovers by naming convention: <name>.<aspect>.cdml
 */
export declare function discoverAspects(searchDirs: string[]): Promise<Map<string, ParsedAspect[]>>;
/**
 * Get aspect-filtered context for generating from an aspect file.
 *
 * When generating from an aspect file, the context engine includes:
 * - Base component's interface + constraints
 * - Full aspect content
 * - Only aspect-relevant interfaces of dependencies
 */
export declare function getAspectRelevantFacets(aspectType: string): string[];
/**
 * Link discovered aspects to their base components.
 */
export declare function linkAspects(components: Map<string, ComponentDefinition>, aspects: Map<string, ParsedAspect[]>): void;
//# sourceMappingURL=aspects.d.ts.map