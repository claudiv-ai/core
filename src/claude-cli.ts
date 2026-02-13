/**
 * Claude Code CLI integration via subprocess
 */

import { spawn } from 'child_process';
import { logger } from './utils/logger.js';
import type { HierarchyContext } from './types.js';
import { buildPromptContext } from './parser.js';

export class ClaudeCLIClient {
  /**
   * Send prompt to Claude Code CLI and stream response
   */
  async *sendPrompt(
    userMessage: string,
    context: HierarchyContext
  ): AsyncGenerator<string> {
    logger.processing('Sending request to Claude CLI...');

    // Build full prompt with context
    const fullPrompt = this.buildPrompt(userMessage, context);

    // Spawn Claude process with --print for non-interactive mode
    // Unset CLAUDECODE to allow nested invocation
    const claude = spawn('claude', ['--print', fullPrompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDECODE: '', // Unset to allow nested sessions
      },
    });

    let hasOutput = false;

    // Stream stdout chunks
    for await (const chunk of claude.stdout) {
      hasOutput = true;
      yield chunk.toString('utf-8');
    }

    // Collect errors
    let errorOutput = '';
    claude.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Wait for process to complete
    const exitCode = await new Promise<number | null>((resolve) => {
      claude.on('close', resolve);
    });

    if (exitCode !== 0) {
      logger.error(`Claude CLI exited with code ${exitCode}`);
      if (errorOutput) {
        logger.error(`Error output: ${errorOutput}`);
      }
      throw new Error(`Claude CLI failed with exit code ${exitCode}`);
    }

    if (!hasOutput) {
      logger.warn('No output received from Claude CLI');
    }

    logger.debug('Claude CLI request completed');
  }

  /**
   * Check if Claude CLI is installed
   */
  async checkAvailable(): Promise<boolean> {
    try {
      const check = spawn('claude', ['--version'], {
        env: {
          ...process.env,
          CLAUDECODE: '', // Unset to allow check
        },
      });

      const exitCode = await new Promise<number | null>((resolve) => {
        check.on('close', resolve);
        check.on('error', () => resolve(null));
      });

      return exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build prompt with hierarchy context
   */
  private buildPrompt(userMessage: string, context: HierarchyContext): string {
    const contextStr = buildPromptContext(context);

    return `You are an AI assistant helping generate HTML/CSS code from natural language requests.

${contextStr}

**User Request:** ${userMessage}

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

Please respond now.`;
  }
}
