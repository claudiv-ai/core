# @claudiv/core

> Core engine for the Claudiv declarative AI interaction platform

## Overview

@claudiv/core provides the foundational types, parsers, and engines for the Claudiv platform. Interface-first component model with FQN addressing, diff-based change detection, context-driven prompt assembly, and headless Claude execution.

## Installation

```bash
npm install @claudiv/core
```

## Exports

### Types (`types.ts`)
All type definitions: FQN, ComponentDefinition, InterfaceDefinition, DependencyDefinition, CdmlDiffResult, PlanDirective, ContextManifest, AssembledPrompt, and more.

### SDK Types (`sdk-types.ts`)
ClaudivSDK and FrameworkDetector interfaces for building framework-specific SDKs.

### FQN Parser (`fqn.ts`)
- `parseFQN(raw)` -- Parse FQN string into structured parts
- `resolveFQN(fqn, scope, registry)` -- Resolve to component reference
- `buildFQN(element, ancestors)` -- Build FQN from DOM position
- `stringifyFQN(fqn)` -- Convert back to string

### Differ (`differ.ts`)
- `diffCdml(old, new)` -- Structural diff of two CDML documents
- `getChangedElements(diff)` -- Extract only changed elements

### Context Engine (`context-engine.ts`)
- `assembleContext(change, scope, manifest, registry, root)` -- Full prompt assembly
- `resolveScope(manifest, path)` -- Resolve scope chain from context manifest

### Context Parser (`context-parser.ts`)
- `parseContextManifest(content)` -- Parse `.claudiv/context.cdml`
- `loadContextManifest(path)` -- Load from file
- `serializeContextManifest(manifest)` -- Serialize back to CDML

### Executor (`executor.ts`)
- `executeClaudeHeadless(prompt, config)` -- CLI or API mode execution

### Projector (`projector.ts`)
- `projectFacets(dep, interface)` -- View-filtered interface projection
- `resolveProjectedDependencies(component, scope, registry)`
- `formatProjectedInterfaces(projections)` -- Format for prompt inclusion

### Plan Processor (`plan-processor.ts`)
- `detectPlanDirectives($)` -- Find plan attributes/elements
- `parsePlanQuestions($)` -- Parse plan:questions block
- `generatePlanQuestions(questions)` -- Generate CDML block
- `questionsToFacts(questions, source)` -- Convert answers to facts
- `buildPlanPrompt(directive)` -- Build expansion prompt

### Scanner (`scanner.ts`)
- `scanProject(root, detector)` -- Scan existing project
- `generateCdmlFromScan(name, files, root)` -- Generate CDML skeleton

### Environment (`environment.ts`)
- `detectEnvironmentFiles(base, platform?, arch?, distro?)`
- `mergeEnvironmentCascade(files)` -- Element-level merge with overrides

### Project Registry (`project.ts`)
- `loadProject(manifestPath)` -- Load project manifest and build registry
- `resolveComponent(fqn, registry)` -- Lookup component by FQN
- `resolveInterface(fqn, registry)` -- Get interface only

### Aspects (`aspects.ts`)
- `parseAspect(content, path)` -- Parse aspect file
- `discoverAspects(dirs)` -- Find aspect files by naming convention
- `getAspectRelevantFacets(type)` -- Get relevant facets for aspect type
- `linkAspects(components, aspects)` -- Attach aspects to components

### Parser (`parser.ts`)
- `parseSpecFile(content)` -- Parse CDML into structured form
- `extractInterface($)`, `extractConstraints($)`, `extractDependencies($)`
- `extractScopeConstraints($, element)` -- Siblings as locked constraints
- `buildPromptContext(component)` -- Simple standalone context builder

### Hierarchy Helpers
- `buildElementPath()`, `buildScopeChain()`, `getSiblingElements()`
- `getChildElementNames()`, `buildFQNFromPosition()`, `extractFullContent()`

## Development

```bash
pnpm install
pnpm run build
```

## License

MIT
