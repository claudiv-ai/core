/**
 * Configuration loader for GUI-driven spec editor
 */

import dotenv from 'dotenv';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from './utils/logger.js';
import type { Config } from './types.js';

// Load .env file
dotenv.config();

/**
 * Load and validate configuration
 */
export function loadConfig(): Config {
  // Determine mode
  const mode = (process.env.MODE?.toLowerCase() || 'cli') as 'cli' | 'api';

  if (mode !== 'cli' && mode !== 'api') {
    logger.error(`Invalid MODE: ${process.env.MODE}. Must be 'cli' or 'api'`);
    process.exit(1);
  }

  // Get API key if in API mode
  let apiKey: string | undefined;
  if (mode === 'api') {
    apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY is required when MODE=api');
      logger.info('Set ANTHROPIC_API_KEY in .env file or environment');
      process.exit(1);
    }
  }

  // Spec file location - look for .cdml files
  // Check if user specified a file via CLI argument
  const cliFile = process.argv[2];
  let specFile: string;

  if (cliFile) {
    specFile = join(process.cwd(), cliFile);
    if (!existsSync(specFile)) {
      logger.error(`File not found: ${cliFile}`);
      process.exit(1);
    }
  } else {
    // Look for .cdml files in current directory
    const files = readdirSync(process.cwd());
    const cdmlFiles = files.filter(f => f.endsWith('.cdml'));

    if (cdmlFiles.length === 0) {
      logger.error('No .cdml files found in current directory');
      logger.info('Create a .cdml file to get started (e.g., app.cdml)');
      logger.info('Example: <app><button gen>Make a blue button</button></app>');
      process.exit(1);
    }

    if (cdmlFiles.length > 1) {
      logger.warn(`Multiple .cdml files found: ${cdmlFiles.join(', ')}`);
      logger.info(`Using ${cdmlFiles[0]} (specify file as argument to use a different one)`);
    }

    specFile = join(process.cwd(), cdmlFiles[0]);
  }

  // Configuration values
  const config: Config = {
    mode,
    apiKey,
    specFile,
    debounceMs: 300,
    claudeTimeout: 60000, // 60 seconds
  };

  logger.debug(`Configuration loaded: mode=${mode}, specFile=${specFile}`);

  return config;
}
