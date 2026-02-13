/**
 * Python Code Generator - Generates Python scripts/apps from .cdml specs
 */

import type {
  CodeGenerator,
  TargetLanguage,
  TargetFramework,
  ChatPattern,
  HierarchyContext,
  GeneratedCode,
} from '../types.js';

export class PythonGenerator implements CodeGenerator {
  readonly language: TargetLanguage = 'python';
  readonly supportedFrameworks: TargetFramework[] = [
    'none',
    'fastapi',
    'flask',
    'django',
  ];

  async generate(
    response: string,
    pattern: ChatPattern,
    context: HierarchyContext
  ): Promise<GeneratedCode> {
    // Extract Python code from AI response
    const pythonMatch = response.match(/```python\n([\s\S]*?)\n```/);
    let pythonCode = pythonMatch ? pythonMatch[1] : '';

    // If no explicit code block, assume entire response is Python
    if (!pythonCode && !response.includes('```')) {
      pythonCode = response;
    }

    // Determine framework-specific structure
    const framework = pattern.framework || 'none';

    return {
      code: pythonCode,
      language: 'python',
      framework,
      fileExtension: '.py',
      metadata: {
        framework,
        requiresVenv: framework !== 'none',
      },
    };
  }

  async reverse(sourceCode: string, sourceFile: string): Promise<string> {
    // Python → .cdml reverse engineering
    // Extract classes, functions, API routes

    return `<app target="python">
  <!-- Reverse engineered from ${sourceFile} -->
  <description>
    Analyze this Python code and generate semantic .cdml structure
  </description>
</app>`;
  }

  async apply(
    cdmlContent: string,
    targetFile: string,
    existingCode: string
  ): Promise<string> {
    // Apply .cdml changes to existing Python code
    // For now, regenerate fully
    return existingCode;
  }

  getFileExtension(framework?: TargetFramework): string {
    return '.py';
  }
}
