/**
 * XML-ish updater - inserts AI responses into spec.html
 */

import { writeFile } from 'fs/promises';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { logger } from './utils/logger.js';

/**
 * Strip code blocks from response and replace with reference
 */
export function stripCodeBlocks(response: string, hasCode: boolean): string {
  // Remove code blocks (```...```)
  const withoutCodeBlocks = response.replace(/```[\s\S]*?```/g, '').trim();

  // If there was code, add a reference
  if (hasCode) {
    return `${withoutCodeBlocks}\n\n→ Implementation in spec.code.html`;
  }

  return withoutCodeBlocks;
}

/**
 * Update element with AI response: remove action attribute and add/update <ai> child
 */
export function updateElementWithResponse(
  $: CheerioAPI,
  element: Element,
  action: 'gen' | 'retry' | 'undo',
  response: string,
  hasCode = false
): void {
  const $element = $(element);

  // 1. Remove the action attribute (gen/retry/undo)
  $element.removeAttr(action);
  logger.debug(`Removed '${action}' attribute from element`);

  // 2. Strip code blocks and add reference if code was generated
  const cleanResponse = stripCodeBlocks(response, hasCode);

  // 3. Add or append <ai> child element with response
  // Create new <ai> element
  const aiElement = $('<ai></ai>');
  aiElement.html(cleanResponse);

  // Append to element
  $element.append(aiElement);

  logger.debug('Added <ai> element with response as child');
}

/**
 * Serialize cheerio DOM back to HTML string
 */
export async function serializeToHTML($: CheerioAPI): Promise<string> {
  // Use $.html() to serialize the entire document
  const html = $.html();

  // Format with prettier for consistent indentation (disabled for now)
  // TODO: Add prettier as optional dependency for better formatting
  return html;
}

/**
 * Write updated content back to spec.html safely
 */
export async function writeSpecFile(
  filePath: string,
  content: string
): Promise<void> {
  try {
    await writeFile(filePath, content, 'utf-8');
    logger.debug(`Wrote updated content to ${filePath}`);
  } catch (error) {
    const err = error as Error;
    logger.error(`Failed to write ${filePath}: ${err.message}`);
    throw error;
  }
}

/**
 * Grace period to prevent immediate re-trigger of watcher
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Complete update flow: remove action attribute, add AI response, serialize, write file
 */
export async function updateSpecWithResponse(
  $: CheerioAPI,
  element: Element,
  action: 'gen' | 'retry' | 'undo',
  response: string,
  filePath: string,
  hasCode = false
): Promise<void> {
  // Update the element: remove action attribute and add <ai> child
  updateElementWithResponse($, element, action, response, hasCode);

  // Serialize back to HTML
  const updatedHTML = await serializeToHTML($);

  // Write to file
  await writeSpecFile(filePath, updatedHTML);

  // Grace period to prevent circular trigger
  await sleep(500);

  logger.success('Updated spec.html with AI response');
}
