/**
 * App Scanner — scans existing project structure for `claudiv:init`.
 *
 * 1. Use FrameworkDetector to find app source dirs
 * 2. Walk tree excluding framework/tooling files
 * 3. Generate .cdml skeleton with interface/implementation sections
 * 4. Generate .claudiv/context.cdml with scope→file mappings
 * 5. Generate claudiv.project.cdml manifest
 */
import type { FrameworkDetector } from './sdk-types.js';
export interface ScanResult {
    /** Project name */
    projectName: string;
    /** Generated CDML skeleton */
    cdmlContent: string;
    /** Generated context manifest content */
    contextContent: string;
    /** Generated project manifest content */
    projectManifestContent: string;
    /** All discovered source files */
    sourceFiles: string[];
}
/**
 * Scan an existing project and generate Claudiv scaffolding.
 */
export declare function scanProject(projectRoot: string, detector: FrameworkDetector): Promise<ScanResult>;
/**
 * Generate a CDML skeleton from discovered source files.
 */
export declare function generateCdmlFromScan(appName: string, sourceFiles: string[], projectRoot: string): string;
//# sourceMappingURL=scanner.d.ts.map