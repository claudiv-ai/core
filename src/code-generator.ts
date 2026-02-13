/**
 * Code generator - extracts code from AI responses and generates spec.code.html
 */

import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { load as cheerioLoad } from 'cheerio';
import { logger } from './utils/logger.js';
import { parseSpecFile } from './parser.js';
import { stripCodeBlocks } from './updater.js';

interface CodeBlock {
  language: string;
  code: string;
}

interface CodeMap {
  [elementPath: string]: {
    html: string;
    css: string;
  };
}

/**
 * Extract code blocks from AI response
 */
export function extractCodeBlocks(response: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  // Match code blocks with optional language identifier
  // Pattern: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || 'unknown';
    const code = match[2].trim();

    blocks.push({ language, code });
  }

  // Also look for inline HTML/CSS without code blocks
  if (blocks.length === 0) {
    // Try to extract HTML-like content
    const htmlRegex = /<[a-z][\s\S]*?>/i;
    if (htmlRegex.test(response)) {
      blocks.push({ language: 'html', code: response });
    }
  }

  logger.debug(`Extracted ${blocks.length} code block(s) from AI response`);
  return blocks;
}

/**
 * Extract body and style content from full HTML document
 */
function extractFragments(htmlCode: string): { bodyContent: string; styleContent: string } {
  let bodyContent = '';
  let styleContent = '';

  // Check if this is a full HTML document
  if (htmlCode.includes('<!DOCTYPE') || htmlCode.includes('<html')) {
    // Use cheerio to parse and extract
    const $ = cheerioLoad(htmlCode);

    // Extract style content
    $('style').each((_, el) => {
      const styleHtml = $(el).html();
      if (styleHtml) {
        styleContent += styleHtml + '\n';
      }
    });

    // Extract body content
    const bodyHTML = $('body').html();
    if (bodyHTML) {
      bodyContent = bodyHTML.trim();
    } else {
      // Fallback: remove doctype, html, head tags and just get content
      $('html > head').remove();
      bodyContent = $('html').html()?.trim() || htmlCode;
    }
  } else {
    // Already a fragment
    bodyContent = htmlCode;
  }

  return {
    bodyContent: bodyContent.trim(),
    styleContent: styleContent.trim()
  };
}

/**
 * Categorize code blocks by type
 */
export function categorizeCodeBlocks(blocks: CodeBlock[]): { html: string; css: string } {
  let html = '';
  let css = '';

  for (const block of blocks) {
    const lang = block.language.toLowerCase();

    if (lang === 'html' || lang === 'xml') {
      // Extract fragments if full document
      const { bodyContent, styleContent } = extractFragments(block.code);
      html += bodyContent + '\n';
      if (styleContent) {
        css += styleContent + '\n';
      }
    } else if (lang === 'css') {
      css += block.code + '\n';
    } else if (lang === 'unknown' || !lang) {
      // Try to guess
      if (block.code.includes('<') && block.code.includes('>')) {
        const { bodyContent, styleContent } = extractFragments(block.code);
        html += bodyContent + '\n';
        if (styleContent) {
          css += styleContent + '\n';
        }
      } else if (block.code.includes('{') && block.code.includes('}')) {
        css += block.code + '\n';
      }
    }
  }

  return { html: html.trim(), css: css.trim() };
}

/**
 * Load existing code map from spec.code.html
 */
async function loadCodeMap(codeFilePath: string): Promise<CodeMap> {
  if (!existsSync(codeFilePath)) {
    return {};
  }

  try {
    const content = await readFile(codeFilePath, 'utf-8');

    // Parse existing spec.code.html to extract element-specific code
    // For now, return empty map - full implementation would parse comments
    // like <!-- Generated from app > menu -->
    return {};
  } catch (error) {
    logger.debug('Could not load existing code map, starting fresh');
    return {};
  }
}

/**
 * Update code map with new code for a specific element
 */
function updateCodeMap(
  codeMap: CodeMap,
  elementPath: string,
  html: string,
  css: string
): CodeMap {
  return {
    ...codeMap,
    [elementPath]: { html, css },
  };
}

/**
 * Indent HTML content properly
 */
function indentHTML(html: string, baseIndent: number = 2): string {
  const indent = ' '.repeat(baseIndent);
  return html
    .split('\n')
    .map(line => line.trim() ? indent + line : '')
    .join('\n');
}

/**
 * Generate complete HTML document from code map
 */
function generateHTMLDocument(codeMap: CodeMap): string {
  const htmlParts: string[] = [];
  const cssParts: string[] = [];

  // Collect all HTML and CSS
  for (const [elementPath, code] of Object.entries(codeMap)) {
    if (code.html) {
      htmlParts.push(`  <!-- Generated from ${elementPath} -->`);
      htmlParts.push(indentHTML(code.html, 2));
      htmlParts.push('');
    }
    if (code.css) {
      cssParts.push(`    /* Generated from ${elementPath} */`);
      cssParts.push(indentHTML(code.css, 4));
      cssParts.push('');
    }
  }

  // Build complete HTML document with hot reload
  const timestamp = Date.now();

  const document = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="build-timestamp" content="${timestamp}">
  <title>Generated from spec.html</title>
  <style>
${cssParts.join('\n')}  </style>
</head>
<body>
${htmlParts.join('\n')}
  <!-- Hot Reload Script -->
  <script>
    (function() {
      const initialTimestamp = document.querySelector('meta[name="build-timestamp"]').content;

      function checkForUpdates() {
        fetch(window.location.href, { cache: 'no-store' })
          .then(response => response.text())
          .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newTimestamp = doc.querySelector('meta[name="build-timestamp"]').content;

            if (newTimestamp !== initialTimestamp) {
              console.log('🔄 Changes detected, reloading...');
              window.location.reload();
            }
          })
          .catch(err => console.log('Hot reload check failed:', err));
      }

      // Check for updates every second
      setInterval(checkForUpdates, 1000);
      console.log('🔥 Hot reload enabled');
    })();
  </script>
</body>
</html>
`;

  return document;
}

/**
 * Generate or update spec.code.html with new code
 */
export async function generateCodeFile(
  elementPath: string,
  aiResponse: string
): Promise<void> {
  const codeFilePath = join(process.cwd(), 'spec.code.html');

  // Extract code blocks
  const blocks = extractCodeBlocks(aiResponse);

  if (blocks.length === 0) {
    logger.debug('No code blocks found in AI response, skipping code generation');
    return;
  }

  // Categorize blocks
  const { html, css } = categorizeCodeBlocks(blocks);

  if (!html && !css) {
    logger.debug('No HTML or CSS found in code blocks');
    return;
  }

  // Load existing code map
  const codeMap = await loadCodeMap(codeFilePath);

  // Update with new code
  const updatedCodeMap = updateCodeMap(codeMap, elementPath, html, css);

  // Generate complete HTML document
  const htmlDocument = generateHTMLDocument(updatedCodeMap);

  // Write to file
  await writeFile(codeFilePath, htmlDocument, 'utf-8');

  logger.success(`Updated spec.code.html`);
}

/**
 * Regenerate spec.code.html from conversation history in spec.html
 * Also cleans up spec.html by removing code blocks from AI responses
 */
export async function regenerateCodeFromConversation(specFilePath: string): Promise<void> {
  logger.info('Regenerating spec.code.html from conversation history...');

  // Read spec.html
  const content = await readFile(specFilePath, 'utf-8');

  // Parse to find all AI responses
  const $ = (await import('cheerio')).load(content, { xmlMode: false });

  const codeMap: CodeMap = {};
  let specModified = false;

  // Find all filled <ai> elements with content
  $('ai').each((_, element) => {
    const $ai = $(element);
    const aiResponse = $ai.text().trim();

    if (!aiResponse) {
      return; // Skip empty AI elements
    }

    // Get the element path (parent hierarchy)
    const chatParent = $ai.closest('chat').parent();
    const elementPath = getElementPath($, chatParent);

    // Extract code from AI response
    const blocks = extractCodeBlocks(aiResponse);

    if (blocks.length > 0) {
      const { html, css } = categorizeCodeBlocks(blocks);

      if (html || css) {
        codeMap[elementPath] = {
          html: html || '',
          css: css || '',
        };
        logger.debug(`Extracted code from AI response in ${elementPath}`);

        // Clean up the AI response in spec.html (remove code blocks)
        const cleanResponse = stripCodeBlocks(aiResponse, true);

        if (cleanResponse !== aiResponse) {
          $ai.text(cleanResponse);
          specModified = true;
        }
      }
    }
  });

  if (Object.keys(codeMap).length === 0) {
    logger.info('No code found in conversation history');
    return;
  }

  // Generate complete HTML document
  const htmlDocument = generateHTMLDocument(codeMap);

  // Write spec.code.html
  const codeFilePath = join(process.cwd(), 'spec.code.html');
  await writeFile(codeFilePath, htmlDocument, 'utf-8');

  logger.success(`Regenerated spec.code.html from ${Object.keys(codeMap).length} AI response(s)`);

  // Clean up spec.html if it was modified
  if (specModified) {
    const cleanedHTML = $.html();
    await writeFile(specFilePath, cleanedHTML, 'utf-8');
    logger.success('Cleaned up spec.html (removed code blocks from AI responses)');
  }
}

/**
 * Get element path from cheerio element
 */
function getElementPath($: any, element: any): string {
  const parts: string[] = [];
  let current = element;

  while (current.length > 0 && current[0].type === 'tag') {
    const name = current[0].name;
    const attrs = current[0].attribs || {};

    const attrStr = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');

    const part = attrStr ? `${name}[${attrStr}]` : name;
    parts.unshift(part);

    current = current.parent();
  }

  return parts.join(' > ') || 'root';
}
