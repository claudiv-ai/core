/**
 * Anthropic API integration for direct API access
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from './utils/logger.js';
import type { HierarchyContext } from './types.js';
import { buildPromptContext } from './parser.js';

export class ClaudeAPIClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Send prompt to Claude API and stream response
   */
  async *sendPrompt(
    userMessage: string,
    context: HierarchyContext
  ): AsyncGenerator<string> {
    logger.processing('Sending request to Claude API...');

    // Build system prompt with hierarchy context
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      // Stream from API
      const stream = await this.client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      let chunkCount = 0;

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          chunkCount++;
          yield chunk.delta.text;
        }
      }

      logger.debug(`Received ${chunkCount} chunks from API`);
    } catch (error) {
      const err = error as Error;
      logger.error(`Claude API error: ${err.message}`);
      throw error;
    }
  }

  /**
   * Check if API is available
   */
  async checkAvailable(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      logger.error('Claude API not available');
      return false;
    }
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(context: HierarchyContext): string {
    const contextStr = buildPromptContext(context);

    return `You are an AI assistant helping generate HTML/CSS code from natural language requests.

${contextStr}

**CRITICAL IMPLEMENTATION REQUIREMENTS:**
⚠️ NEVER use placeholder comments like "<!-- Child components render here -->" or "<!-- TODO: implement X -->"
⚠️ If the user request lists NESTED COMPONENTS TO IMPLEMENT, you MUST generate complete, working HTML/CSS for EVERY single one
⚠️ Each nested component specification MUST result in actual HTML elements with proper styling, NOT comments
⚠️ If you see a list like "1. <nav-menu>", "2. <pages>", etc., these are REQUIRED components that need full implementations

**Instructions:**
1. Structure your response as XML elements (NOT plain text)
2. ${context.existingCode ? 'Modify ONLY what the user requested, keeping everything else exactly the same' : 'Generate the necessary HTML/CSS code appropriate for this context'}
3. Consider the hierarchy - you're working on: ${context.elementPath}
4. If referenced elements are provided above, use their definitions to inform your implementation
5. If the user request contains a section "NESTED COMPONENTS TO IMPLEMENT", you MUST implement EACH ONE with complete HTML/CSS:
   - Create actual HTML elements for each component
   - Add proper CSS styling for each component
   - Use the attributes as specifications for styling and behavior
   - Use the content as guidance for what to include
   - Do NOT use placeholder comments - implement the actual functionality
   - **CRITICAL EXCEPTION - LOCKED COMPONENTS**:
     - Components marked with "[LOCKED - DO NOT REGENERATE]" are already implemented
     - You MUST preserve locked components exactly as they are
     - Do NOT regenerate, modify, or replace locked components
     - Include them as-is or reference them in your generated code
     - Only implement components that are NOT marked as locked

**Response Format (use semantic XML tags, NOT plain text):**
<changes>Brief description of what was created/modified</changes>
<details>
  <tag-name>Specific detail about the implementation</tag-name>
  <another-tag>Another detail</another-tag>
</details>
<summary>Overall summary</summary>

IMPORTANT:
- Use semantic tag names that describe the content (e.g., <styling>, <background>, <effect>, <feature>, etc.)
- DO NOT use plain text or bullet points
- Structure your response with nested XML elements
- Still include code blocks with \`\`\`html and \`\`\`css for implementation
- EVERY nested component must be fully implemented, not just mentioned in comments
`;
  }
}
