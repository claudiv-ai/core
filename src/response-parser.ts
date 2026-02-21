/**
 * Response parser — extracts file blocks from Claude's fenced code response.
 *
 * Expects fenced code blocks with `file:` info strings:
 *
 *   ```file:src/components/Canvas.tsx
 *   // complete file contents
 *   ```
 */

export interface FileBlock {
  file: string;    // relative path, e.g. "src/components/Canvas.tsx"
  content: string; // complete file contents
}

/**
 * Parse Claude's response into per-file code blocks.
 *
 * Scans for fenced code blocks with `file:<path>` info strings.
 * Returns empty array if no such blocks are found.
 */
export function parseResponse(response: string): FileBlock[] {
  const blocks: FileBlock[] = [];
  const pattern = /```file:([^\n]+)\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(response)) !== null) {
    const file = match[1].trim();
    const content = match[2];
    if (file) {
      blocks.push({ file, content });
    }
  }

  return blocks;
}
