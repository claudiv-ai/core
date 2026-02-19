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
import type { EnvironmentFileSet } from './types.js';
/**
 * Detect environment override files for a base CDML file.
 *
 * @param baseCdml - Path to the base .cdml file (e.g., 'my-system.cdml')
 * @param platform - OS platform (e.g., 'linux', 'darwin', 'win32')
 * @param arch - CPU architecture (e.g., 'arm64', 'x64')
 * @param distro - OS distribution (e.g., 'ubuntu', 'alpine')
 */
export declare function detectEnvironmentFiles(baseCdml: string, platform?: string, arch?: string, distro?: string): EnvironmentFileSet;
/**
 * Merge environment cascade files into a single resolved CDML string.
 *
 * Resolution order: base → env → env.platform → env.platform.arch → ...
 * Each level can:
 * - Add new elements
 * - Override attributes on existing elements (by matching tag name + position)
 * - Remove elements with remove="true" attribute
 */
export declare function mergeEnvironmentCascade(fileSet: EnvironmentFileSet): Promise<string>;
//# sourceMappingURL=environment.d.ts.map