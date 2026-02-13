/**
 * File watcher for spec.html with debouncing and circular trigger prevention
 */

import chokidar, { type FSWatcher } from 'chokidar';
import debounce from 'lodash.debounce';
import { EventEmitter } from 'events';
import { logger } from './utils/logger.js';
import type { Config } from './types.js';

export class SpecFileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private isUpdating = false;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  start(): void {
    logger.info(`Starting file watcher for ${this.config.specFile}...`);

    // Debounced change handler
    const handleChange = debounce(
      (path: string) => {
        // Skip if we're in the middle of updating the file ourselves
        if (this.isUpdating) {
          logger.debug('Skipping change event (internal update)');
          return;
        }

        logger.processing(`Detected change in ${path}`);
        this.emit('change', path);
      },
      this.config.debounceMs
    );

    // Watch spec.html with chokidar
    this.watcher = chokidar.watch(this.config.specFile, {
      ignoreInitial: false, // Process on startup
      awaitWriteFinish: {
        stabilityThreshold: 300, // Wait for file to stabilize
        pollInterval: 100,
      },
      persistent: true,
    });

    this.watcher.on('change', handleChange);
    this.watcher.on('add', handleChange);

    this.watcher.on('error', (error: unknown) => {
      const err = error as Error;
      logger.error(`Watcher error: ${err.message}`);
    });

    logger.success('File watcher started successfully');
  }

  stop(): void {
    if (this.watcher) {
      logger.info('Stopping file watcher...');
      this.watcher.close();
      this.watcher = null;
      logger.success('File watcher stopped');
    }
  }

  /**
   * Signal that we're about to update the file internally
   * This prevents circular triggers
   */
  setUpdating(value: boolean): void {
    this.isUpdating = value;
  }

  /**
   * Check if we're currently updating
   */
  isCurrentlyUpdating(): boolean {
    return this.isUpdating;
  }
}
