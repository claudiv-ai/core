/**
 * App Scanner — scans existing project structure for `claudiv:init`.
 *
 * 1. Use FrameworkDetector to find app source dirs
 * 2. Walk tree excluding framework/tooling files
 * 3. Generate .cdml skeleton with interface/implementation sections
 * 4. Generate .claudiv/context.cdml with scope→file mappings
 * 5. Generate claudiv.project.cdml manifest
 */
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { serializeContextManifest } from './context-parser.js';
/** Default patterns to ignore when scanning */
const DEFAULT_IGNORE = [
    'node_modules',
    '.git',
    '.claudiv',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    '.svelte-kit',
    '__pycache__',
    '.venv',
    'venv',
    '.env',
    '.DS_Store',
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
];
/**
 * Scan an existing project and generate Claudiv scaffolding.
 */
export async function scanProject(projectRoot, detector) {
    const appName = await detector.getAppName(projectRoot);
    const sourcePaths = await detector.getSourcePaths(projectRoot);
    const ignorePatterns = [
        ...DEFAULT_IGNORE,
        ...detector.getIgnorePatterns(),
    ];
    // Discover all source files
    const sourceFiles = [];
    for (const srcPath of sourcePaths) {
        const fullPath = join(projectRoot, srcPath);
        if (existsSync(fullPath)) {
            await walkDir(fullPath, projectRoot, ignorePatterns, sourceFiles);
        }
    }
    // Generate outputs
    const cdmlContent = generateCdmlFromScan(appName, sourceFiles, projectRoot);
    const contextContent = generateContextFromScan(appName, sourceFiles, projectRoot);
    const projectManifestContent = generateProjectManifest(appName);
    return {
        projectName: appName,
        cdmlContent,
        contextContent,
        projectManifestContent,
        sourceFiles,
    };
}
/**
 * Generate a CDML skeleton from discovered source files.
 */
export function generateCdmlFromScan(appName, sourceFiles, projectRoot) {
    const lines = [];
    lines.push(`<component name="${appName}" fqn="${appName}">`);
    lines.push('');
    // Interface section (empty — user fills this in)
    lines.push('  <interface>');
    lines.push('    <!-- Define what this component exposes -->');
    lines.push('  </interface>');
    lines.push('');
    // Constraints section
    lines.push('  <constraints>');
    lines.push('    <!-- Define environment requirements -->');
    lines.push('  </constraints>');
    lines.push('');
    // Requires section
    lines.push('  <requires>');
    lines.push('    <!-- Define dependencies -->');
    lines.push('  </requires>');
    lines.push('');
    // Implementation section — populated from scan
    lines.push('  <implementation>');
    lines.push('    <modules>');
    // Group files by directory
    const groups = groupByDirectory(sourceFiles, projectRoot);
    for (const [dir, files] of Object.entries(groups)) {
        const moduleName = dir.replace(/\//g, '-') || 'root';
        const fileList = files.map((f) => basename(f)).join(', ');
        lines.push(`      <${sanitizeTagName(moduleName)}>${fileList}</${sanitizeTagName(moduleName)}>`);
    }
    lines.push('    </modules>');
    lines.push('  </implementation>');
    lines.push('');
    lines.push('</component>');
    return lines.join('\n');
}
// ─── Internal ───────────────────────────────────────────────────
async function walkDir(dir, projectRoot, ignorePatterns, results) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (ignorePatterns.includes(entry.name))
            continue;
        if (entry.name.startsWith('.'))
            continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            await walkDir(fullPath, projectRoot, ignorePatterns, results);
        }
        else if (entry.isFile()) {
            const ext = extname(entry.name);
            if (isSourceFile(ext)) {
                results.push(relative(projectRoot, fullPath));
            }
        }
    }
}
function isSourceFile(ext) {
    const sourceExts = [
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.py', '.go', '.rs', '.java', '.kt', '.rb',
        '.vue', '.svelte', '.astro',
        '.html', '.css', '.scss', '.less',
        '.json', '.yaml', '.yml', '.toml',
        '.sql', '.graphql', '.gql',
        '.sh', '.bash',
        '.md', '.mdx',
    ];
    return sourceExts.includes(ext);
}
function groupByDirectory(files, projectRoot) {
    const groups = {};
    for (const file of files) {
        const dir = file.includes('/')
            ? file.substring(0, file.lastIndexOf('/'))
            : '';
        if (!groups[dir])
            groups[dir] = [];
        groups[dir].push(file);
    }
    return groups;
}
function sanitizeTagName(name) {
    // Convert to valid XML-ish tag name
    return name
        .replace(/[^a-zA-Z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-')
        || 'module';
}
function generateContextFromScan(appName, sourceFiles, projectRoot) {
    const manifest = {
        forFile: `${appName}.cdml`,
        autoGenerated: true,
        global: {
            refs: [],
            facts: [],
        },
        scopes: [],
    };
    // Add common project files as global refs
    const commonFiles = [
        { file: 'package.json', role: 'project-config' },
        { file: 'tsconfig.json', role: 'ts-config' },
        { file: 'vite.config.ts', role: 'build-config' },
        { file: 'vite.config.js', role: 'build-config' },
    ];
    for (const cf of commonFiles) {
        if (sourceFiles.includes(cf.file) || existsSync(join(projectRoot, cf.file))) {
            manifest.global.refs.push({ file: cf.file, role: cf.role });
        }
    }
    // Create a scope for implementation with all source file refs
    const implRefs = sourceFiles
        .filter((f) => !commonFiles.some((cf) => cf.file === f))
        .map((f) => ({
        file: f,
        role: inferRole(f),
    }));
    if (implRefs.length > 0) {
        manifest.scopes.push({
            path: `${appName} > implementation`,
            interfaces: { fulfills: [], depends: [] },
            refs: implRefs,
            facts: [],
            tools: [],
        });
    }
    return serializeContextManifest(manifest);
}
function inferRole(file) {
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
        return 'tests';
    }
    if (file.includes('/types') || file.endsWith('.d.ts')) {
        return 'type-definitions';
    }
    if (file.endsWith('.css') || file.endsWith('.scss') || file.endsWith('.less')) {
        return 'styles';
    }
    if (file.includes('/config') || file.startsWith('config')) {
        return 'configuration';
    }
    return 'implementation';
}
function generateProjectManifest(appName) {
    return `<project name="${appName}">
  <auto-discover>
    <directory path="." pattern="*.cdml" />
    <directory path="aspects/" pattern="*.*.cdml" />
  </auto-discover>
</project>`;
}
//# sourceMappingURL=scanner.js.map