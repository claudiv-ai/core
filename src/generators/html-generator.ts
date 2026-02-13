/**
 * HTML Code Generator - Generates static HTML/CSS from .cdml specs
 */

import type {
  CodeGenerator,
  TargetLanguage,
  TargetFramework,
  ChatPattern,
  HierarchyContext,
  GeneratedCode,
} from '../types.js';

export class HtmlGenerator implements CodeGenerator {
  readonly language: TargetLanguage = 'html';
  readonly supportedFrameworks: TargetFramework[] = ['none'];

  async generate(
    response: string,
    pattern: ChatPattern,
    context: HierarchyContext
  ): Promise<GeneratedCode> {
    // Extract HTML/CSS from AI response
    const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/);
    const cssMatch = response.match(/```css\n([\s\S]*?)\n```/);

    let htmlCode = htmlMatch ? htmlMatch[1] : '';
    let cssCode = cssMatch ? cssMatch[1] : '';

    // If no explicit code blocks, try to extract any HTML-like content
    if (!htmlCode && !cssCode) {
      // Check if response contains HTML tags
      if (/<[^>]+>/.test(response)) {
        htmlCode = response;
      }
    }

    // Build complete HTML document
    const fullHtml = this.buildHtmlDocument(htmlCode, cssCode, pattern.elementName);

    return {
      code: fullHtml,
      language: 'html',
      fileExtension: '.html',
      metadata: {
        hasCSS: !!cssCode,
        hasJS: htmlCode.includes('<script'),
      },
    };
  }

  async reverse(sourceCode: string, sourceFile: string): Promise<string> {
    // HTML → .cdml reverse engineering
    // For now, basic structure extraction
    // TODO: Use Claude to intelligently convert HTML to semantic .cdml

    return `<component target="html">
  <!-- Reverse engineered from ${sourceFile} -->
  <!-- TODO: Add semantic structure based on HTML analysis -->
</component>`;
  }

  async apply(
    cdmlContent: string,
    targetFile: string,
    existingCode: string
  ): Promise<string> {
    // Apply .cdml changes to existing HTML
    // For now, regenerate fully
    // TODO: Intelligent merging
    return existingCode;
  }

  getFileExtension(): string {
    return '.html';
  }

  /**
   * Build complete HTML5 document
   */
  private buildHtmlDocument(
    bodyHtml: string,
    css: string,
    title: string
  ): string {
    const styleTag = css ? `<style>\n${css}\n</style>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${styleTag}
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  }
}
