/**
 * Vite dev server for hosting spec.code.html
 */

import { createServer, type ViteDevServer } from 'vite';
import { existsSync } from 'fs';
import { logger } from './utils/logger.js';
import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

export class DevServer {
  private server: ViteDevServer | null = null;
  private port = 30004;

  async start(): Promise<void> {
    try {
      // Create Vite server
      this.server = await createServer({
        root: process.cwd(),
        server: {
          port: this.port,
          strictPort: false, // Auto-increment if port is busy
          open: true, // Open browser automatically
        },
        plugins: [
          {
            name: 'spec-code-server',
            configureServer(server: ViteDevServer) {
              server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
            // Serve spec.code.html as the root
            if (req.url === '/' || req.url === '/index.html') {
              if (existsSync('spec.code.html')) {
                // Read and serve the file directly
                const { readFile } = await import('fs/promises');
                const content = await readFile('spec.code.html', 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                res.end(content);
                return;
              } else {
                // Serve a placeholder if spec.code.html doesn't exist yet
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
                res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Waiting for spec.code.html</title>
  <meta http-equiv="refresh" content="2">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .message {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 1rem auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="message">
    <div class="spinner"></div>
    <h2>Waiting for spec.code.html to be generated...</h2>
    <p>Add a user message with an empty &lt;ai/&gt; element in spec.html to trigger code generation.</p>
  </div>
</body>
</html>
                `);
                return;
              }
            }
            next();
          });
            },
          },
        ],
      });

      await this.server.listen();

      const info = this.server.config.logger.info;
      this.port = this.server.config.server.port || this.port;

      logger.success(`🌐 Dev server running at http://localhost:${this.port}`);
      logger.info('💡 Browser will auto-reload when spec.code.html updates');
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to start dev server: ${err.message}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
      logger.info('Dev server stopped');
    }
  }

  getPort(): number {
    return this.port;
  }
}
