/**
 * Unified Claude client interface (abstracts CLI vs API mode)
 */

import { ClaudeCLIClient } from './claude-cli.js';
import { ClaudeAPIClient } from './claude-api.js';
import { logger } from './utils/logger.js';
import type { Config, HierarchyContext } from './types.js';

export interface ClaudeClient {
  sendPrompt(
    userMessage: string,
    context: HierarchyContext
  ): AsyncGenerator<string>;
  checkAvailable(): Promise<boolean>;
}

/**
 * Create Claude client based on configuration
 */
export function createClaudeClient(config: Config): ClaudeClient {
  if (config.mode === 'cli') {
    logger.info('Using Claude Code CLI (subscription mode)');
    return new ClaudeCLIClient();
  } else {
    logger.info('Using Anthropic API (pay-per-use mode)');
    if (!config.apiKey) {
      logger.error('API key is required for API mode');
      throw new Error('Missing API key');
    }
    return new ClaudeAPIClient(config.apiKey);
  }
}

/**
 * Verify Claude is available before starting
 */
export async function verifyClaudeAvailable(
  client: ClaudeClient,
  mode: 'cli' | 'api'
): Promise<void> {
  logger.processing(`Checking ${mode === 'cli' ? 'Claude Code CLI' : 'Claude API'} availability...`);

  const isAvailable = await client.checkAvailable();

  if (!isAvailable) {
    if (mode === 'cli') {
      logger.error('Claude Code CLI is not installed or not working');
      logger.info('Install Claude Code: https://code.claude.com');
      logger.info('Or switch to API mode by setting MODE=api in .env');
    } else {
      logger.error('Claude API is not available');
      logger.info('Check your ANTHROPIC_API_KEY in .env');
      logger.info('Or switch to CLI mode by setting MODE=cli in .env');
    }
    process.exit(1);
  }

  logger.success(`${mode === 'cli' ? 'Claude Code CLI' : 'Claude API'} is ready`);
}
