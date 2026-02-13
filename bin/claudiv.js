#!/usr/bin/env node

/**
 * CLI entry point for Claudiv - Conversational UI development with Claude
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Load .env if present
dotenv.config();

// Check for spec.html in current directory
const specPath = join(process.cwd(), 'spec.html');
if (!existsSync(specPath)) {
  console.error('❌ Error: spec.html not found in current directory');
  console.log('📝 Create a spec.html file to get started');
  console.log('\nExample:');
  console.log('  <app>');
  console.log('    <chat>');
  console.log('      <create a blue button/>');
  console.log('      <ai/>');
  console.log('    </chat>');
  console.log('  </app>');
  console.log('\n💡 Tags can be freeform - use any names you like!');
  console.log('💡 Hierarchy defines the context for AI');
  process.exit(1);
}

// Determine mode
const mode = process.env.MODE || 'cli';

if (mode === 'cli') {
  // Check if Claude Code is installed
  const checkClaude = spawn('claude-code', ['--version']);

  checkClaude.on('error', () => {
    console.error('❌ Error: Claude Code CLI not found');
    console.log('📦 Install Claude Code: https://code.claude.com');
    console.log('🔄 Or switch to API mode: MODE=api in .env');
    process.exit(1);
  });

  checkClaude.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Error: Claude Code CLI not working properly');
      console.log('🔄 Try switching to API mode: MODE=api in .env');
      process.exit(1);
    }
    startEditor('cli');
  });
} else if (mode === 'api') {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found');
    console.log('🔑 Set ANTHROPIC_API_KEY in .env file');
    console.log('🔄 Or switch to CLI mode: MODE=cli in .env');
    process.exit(1);
  }
  startEditor('api');
} else {
  console.error('❌ Error: Invalid MODE in .env (use "cli" or "api")');
  process.exit(1);
}

function startEditor(mode) {
  console.log('🚀 Starting Claudiv...');
  console.log(`📡 Mode: ${mode.toUpperCase()}`);
  console.log('👀 Watching spec.html for changes...');
  console.log('💡 Tip: Add gen="" attribute to any element to trigger AI generation');
  console.log('💡 Note: Tags can be freeform, hierarchy defines context\n');

  const editor = spawn('node', [join(__dirname, '../dist/index.js')], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, MODE: mode },
  });

  editor.on('exit', (exitCode) => {
    process.exit(exitCode || 0);
  });

  editor.on('error', (err) => {
    console.error('❌ Failed to start editor:', err.message);
    process.exit(1);
  });
}
