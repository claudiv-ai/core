/**
 * File committer — writes parsed file blocks to disk with rollback on failure.
 *
 * Atomicity: if any write fails, all previously written files are restored
 * to their original content (or deleted if newly created).
 */

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { FileBlock } from './response-parser.js';

export interface CommitResult {
  written: string[];   // files successfully written
  error?: string;      // set if rollback occurred
}

interface RollbackEntry {
  path: string;
  previous: string | null; // null = file didn't exist before
}

/**
 * Write file blocks to disk with transactional rollback.
 *
 * For each block, resolves the path relative to projectRoot,
 * creates parent directories as needed, and writes the file.
 * On any failure, all writes are rolled back.
 */
export async function commitFiles(
  blocks: FileBlock[],
  projectRoot: string
): Promise<CommitResult> {
  const rollback: RollbackEntry[] = [];
  const written: string[] = [];

  try {
    for (const block of blocks) {
      const absPath = join(projectRoot, block.file);

      // Capture previous state for rollback
      let previous: string | null = null;
      if (existsSync(absPath)) {
        previous = await readFile(absPath, 'utf-8');
      }
      rollback.push({ path: absPath, previous });

      // Ensure parent directory exists
      const dir = dirname(absPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Write file
      await writeFile(absPath, block.content, 'utf-8');
      written.push(block.file);
    }

    return { written };
  } catch (err) {
    // Rollback all writes
    for (const entry of rollback) {
      try {
        if (entry.previous === null) {
          // File was newly created — remove it
          if (existsSync(entry.path)) {
            await unlink(entry.path);
          }
        } else {
          // Restore original content
          await writeFile(entry.path, entry.previous, 'utf-8');
        }
      } catch {
        // Best-effort rollback
      }
    }

    return {
      written: [],
      error: (err as Error).message,
    };
  }
}
