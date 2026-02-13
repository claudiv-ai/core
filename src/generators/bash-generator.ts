/**
 * Bash Script Generator - Generates shell scripts from .cdml specs
 */

import type {
  CodeGenerator,
  TargetLanguage,
  TargetFramework,
  ChatPattern,
  HierarchyContext,
  GeneratedCode,
} from '../types.js';

export class BashGenerator implements CodeGenerator {
  readonly language: TargetLanguage = 'bash';
  readonly supportedFrameworks: TargetFramework[] = ['none'];

  async generate(
    response: string,
    pattern: ChatPattern,
    context: HierarchyContext
  ): Promise<GeneratedCode> {
    // Extract bash code from AI response
    const bashMatch = response.match(/```(?:bash|sh)\n([\s\S]*?)\n```/);
    let bashCode = bashMatch ? bashMatch[1] : '';

    // If no explicit code block, assume entire response is bash
    if (!bashCode && !response.includes('```')) {
      bashCode = response;
    }

    // Ensure shebang
    if (!bashCode.startsWith('#!')) {
      bashCode = '#!/bin/bash\n\n' + bashCode;
    }

    return {
      code: bashCode,
      language: 'bash',
      fileExtension: '.sh',
      metadata: {
        executable: true,
      },
    };
  }

  async reverse(sourceCode: string, sourceFile: string): Promise<string> {
    // Bash → .cdml reverse engineering
    // Extract functions, commands, structure

    return `<script target="bash">
  <!-- Reverse engineered from ${sourceFile} -->
  <description>
    Analyze this bash script and generate semantic .cdml structure
  </description>
</script>`;
  }

  async apply(
    cdmlContent: string,
    targetFile: string,
    existingCode: string
  ): Promise<string> {
    // Apply .cdml changes to existing bash script
    // For now, regenerate fully
    return existingCode;
  }

  getFileExtension(): string {
    return '.sh';
  }
}
