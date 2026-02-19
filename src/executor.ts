/**
 * Headless Claude execution.
 *
 * Every Claudiv invocation is headless — no conversation sessions, no system
 * prompt overhead. The assembled prompt IS the complete context.
 *
 * Supports two modes:
 * - CLI: `claude --print` (zero built-in context)
 * - API: Direct Anthropic API call
 */

import { spawn } from 'child_process';
import type { AssembledPrompt } from './types.js';

export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Claude's response text */
  response: string;

  /** Error message if failed */
  error?: string;

  /** Execution duration in ms */
  durationMs: number;
}

export interface ExecutorConfig {
  /** Execution mode */
  mode: 'cli' | 'api';

  /** API key (for API mode) */
  apiKey?: string;

  /** Model to use */
  model?: string;

  /** Timeout in ms */
  timeoutMs?: number;

  /** Max tokens */
  maxTokens?: number;
}

/**
 * Execute a headless Claude invocation with the assembled prompt.
 */
export async function executeClaudeHeadless(
  assembled: AssembledPrompt,
  config: ExecutorConfig
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    let response: string;

    if (config.mode === 'cli') {
      response = await executeCli(assembled.prompt, config);
    } else {
      response = await executeApi(assembled.prompt, config);
    }

    return {
      success: true,
      response,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      response: '',
      error: (error as Error).message,
      durationMs: Date.now() - startTime,
    };
  }
}

// ─── CLI Mode ───────────────────────────────────────────────────

async function executeCli(prompt: string, config: ExecutorConfig): Promise<string> {
  const args = ['--print'];

  if (config.model) {
    args.push('--model', config.model);
  }

  if (config.maxTokens) {
    args.push('--max-tokens', String(config.maxTokens));
  }

  // Pass prompt via stdin
  args.push('-p', prompt);

  return new Promise((resolve, reject) => {
    const timeout = config.timeoutMs || 120_000;

    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Claude CLI timed out after ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn claude CLI: ${err.message}`));
    });
  });
}

// ─── API Mode ───────────────────────────────────────────────────

async function executeApi(prompt: string, config: ExecutorConfig): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API key required for API mode');
  }

  // Dynamic import to avoid requiring @anthropic-ai/sdk as a core dependency
  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const client = new Anthropic({ apiKey: config.apiKey });

  const message = await client.messages.create({
    model: config.model || 'claude-sonnet-4-20250514',
    max_tokens: config.maxTokens || 8192,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const textBlocks = message.content.filter((b: { type: string }) => b.type === 'text');
  return textBlocks.map((b: any) => b.text).join('\n');
}
