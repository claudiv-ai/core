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
export declare function executeClaudeHeadless(assembled: AssembledPrompt, config: ExecutorConfig): Promise<ExecutionResult>;
//# sourceMappingURL=executor.d.ts.map