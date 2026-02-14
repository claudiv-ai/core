#!/usr/bin/env node

/**
 * Claudiv CLI — Universal Declarative Generation Platform
 *
 * Usage:
 *   npx @claudiv/cli <command> [options]
 *   claudiv <command> [options]
 *
 * Commands:
 *   new <name>        Create a new .cdml file
 *   gen <name>        Generate code from .cdml file
 *   reverse <file>    Reverse-engineer file to .cdml
 *   watch <name>      Watch .cdml file for changes
 *   help              Show this help message
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const VERSION = '0.1.0';

// ─── Parse Arguments ───────────────────────────────────────────

const args = process.argv.slice(2);

// Parse flags
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-s' || arg === '--spec') {
    flags.spec = args[++i];
  } else if (arg === '-g' || arg === '--gen') {
    flags.gen = true;
  } else if (arg === '-t' || arg === '--target') {
    flags.target = args[++i];
  } else if (arg === '-f' || arg === '--framework') {
    flags.framework = args[++i];
  } else if (arg === '-w' || arg === '--watch') {
    flags.watch = true;
  } else if (arg === '-o' || arg === '--output') {
    flags.output = args[++i];
  } else if (arg === '--dry-run') {
    flags.dryRun = true;
  } else if (arg === '-v' || arg === '--version') {
    console.log(`claudiv ${VERSION}`);
    process.exit(0);
  } else if (arg === '-h' || arg === '--help') {
    showHelp();
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    positional.push(arg);
  }
}

// ─── Route Commands ────────────────────────────────────────────

switch (positional[0]) {
  case 'new':
    cmdNew(positional[1], flags);
    break;
  case 'gen':
    cmdGen(positional[1], flags);
    break;
  case 'reverse':
    cmdReverse(positional[1], flags);
    break;
  case 'watch':
    cmdWatch(positional[1], flags);
    break;
  case 'help':
    showHelp();
    break;
  case undefined:
    // No command: look for .cdml in current directory and watch
    cmdDefault(flags);
    break;
  default:
    // Check if it's a .cdml file path
    if (positional[0].endsWith('.cdml')) {
      cmdGen(positional[0], flags);
    } else {
      console.error(`Unknown command: ${positional[0]}`);
      console.log('Run "claudiv help" for usage information.');
      process.exit(1);
    }
}

// ─── Commands ──────────────────────────────────────────────────

/**
 * claudiv new <name> [-s|--spec '<xml>'] [-g|--gen] [-t|--target <lang>]
 */
function cmdNew(name, flags) {
  if (!name) {
    console.error('Usage: claudiv new <name> [options]');
    console.log('');
    console.log('Examples:');
    console.log('  claudiv new myapp');
    console.log('  claudiv new txt2img -s \'<txt2img lang="python" type="cli" gen="">...</txt2img>\'');
    console.log('  claudiv new api -t python -f fastapi');
    console.log('  claudiv new myapp -s \'<spec>\' -g');
    process.exit(1);
  }

  // Strip .cdml extension if provided
  const baseName = name.replace(/\.cdml$/, '');
  const cdmlFile = `${baseName}.cdml`;
  const cdmlPath = join(process.cwd(), cdmlFile);

  if (existsSync(cdmlPath)) {
    console.error(`File already exists: ${cdmlFile}`);
    console.log(`Use "claudiv gen ${cdmlFile}" to generate from it.`);
    process.exit(1);
  }

  let content;

  if (flags.spec) {
    // Use provided spec
    content = flags.spec;
  } else {
    // Generate default template
    const target = flags.target || 'html';
    const framework = flags.framework ? ` framework="${flags.framework}"` : '';
    content = `<${baseName} target="${target}"${framework} gen>
  <!-- Describe what you want here -->
</${baseName}>
`;
  }

  writeFileSync(cdmlPath, content, 'utf-8');
  console.log(`Created ${cdmlFile}`);

  if (flags.gen) {
    console.log(`Generating from ${cdmlFile}...`);
    startEngine(cdmlPath, flags);
  }
}

/**
 * claudiv gen <name> [-t|--target <component>] [-w|--watch] [-o|--output <file>]
 *
 * Examples:
 *   claudiv gen myapp                    # generate all from myapp.cdml
 *   claudiv gen myapp -t config          # generate config component only
 *   claudiv gen txt2img -t config        # generate txt2img.config
 *   claudiv gen myapp.cdml               # explicit .cdml path
 *   claudiv gen myapp -w                 # generate + watch for changes
 *   claudiv gen myapp -o output.py       # generate to specific file
 */
function cmdGen(name, flags) {
  if (!name) {
    console.error('Usage: claudiv gen <name> [options]');
    console.log('');
    console.log('Examples:');
    console.log('  claudiv gen myapp');
    console.log('  claudiv gen myapp -t config');
    console.log('  claudiv gen myapp -w');
    console.log('  claudiv gen myapp -o output.py');
    process.exit(1);
  }

  // Resolve .cdml file
  const cdmlFile = name.endsWith('.cdml') ? name : `${name}.cdml`;
  const cdmlPath = join(process.cwd(), cdmlFile);

  if (!existsSync(cdmlPath)) {
    console.error(`File not found: ${cdmlFile}`);
    console.log(`Create it with: claudiv new ${name}`);
    process.exit(1);
  }

  // If -t flag, it selects a component/target within the .cdml
  if (flags.target) {
    console.log(`Generating "${flags.target}" from ${cdmlFile}...`);
  } else {
    console.log(`Generating from ${cdmlFile}...`);
  }

  startEngine(cdmlPath, flags);
}

/**
 * claudiv reverse <file> [-o|--output <name.cdml>]
 *
 * Examples:
 *   claudiv reverse api.py               # → api.cdml
 *   claudiv reverse Button.tsx            # → Button.cdml
 *   claudiv reverse backup.sh             # → backup.cdml
 *   claudiv reverse styles.css            # → styles.cdml
 *   claudiv reverse api.py -o spec.cdml   # → spec.cdml
 */
function cmdReverse(file, flags) {
  if (!file) {
    console.error('Usage: claudiv reverse <file> [options]');
    console.log('');
    console.log('Examples:');
    console.log('  claudiv reverse api.py');
    console.log('  claudiv reverse Button.tsx');
    console.log('  claudiv reverse backup.sh');
    console.log('  claudiv reverse api.py -o spec.cdml');
    process.exit(1);
  }

  const filePath = join(process.cwd(), file);
  if (!existsSync(filePath)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const base = basename(file, extname(file));
  const outputFile = flags.output || `${base}.cdml`;
  console.log(`Reverse engineering: ${file} → ${outputFile}`);

  // TODO: Implement reverse generation via Claude
  console.log('Reverse generation coming soon.');
}

/**
 * claudiv watch <name>
 *
 * Watch .cdml file for changes and regenerate automatically.
 */
function cmdWatch(name, flags) {
  if (!name) {
    console.error('Usage: claudiv watch <name>');
    process.exit(1);
  }

  flags.watch = true;
  cmdGen(name, flags);
}

/**
 * Default: no command given. Look for .cdml files in cwd.
 */
function cmdDefault(flags) {
  // Look for .cdml files in current directory
  const files = readdirSync(process.cwd());
  const cdmlFiles = files.filter(f => f.endsWith('.cdml'));

  if (cdmlFiles.length === 0) {
    console.log('Claudiv — Claude in a Div');
    console.log('');
    console.log('No .cdml files found. Get started:');
    console.log('');
    console.log('  claudiv new myapp                          # Create myapp.cdml');
    console.log('  claudiv new myapp -t python                # Python project');
    console.log('  claudiv new myapp -s \'<app gen>...</app>\'  # With inline spec');
    console.log('  claudiv new myapp -s \'<app gen>...</app>\' -g  # Create + generate');
    console.log('');
    console.log('  claudiv gen myapp                          # Generate from myapp.cdml');
    console.log('  claudiv gen myapp -t config                # Generate specific target');
    console.log('  claudiv gen myapp -w                       # Watch mode');
    console.log('');
    console.log('  claudiv reverse api.py                     # Reverse → api.cdml');
    console.log('');
    console.log('  claudiv help                               # Full help');
    process.exit(0);
  }

  if (cdmlFiles.length === 1) {
    console.log(`Found ${cdmlFiles[0]}, starting...`);
    startEngine(join(process.cwd(), cdmlFiles[0]), flags);
  } else {
    console.log('Multiple .cdml files found:');
    cdmlFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('');
    console.log('Specify which file to use:');
    console.log(`  claudiv gen ${cdmlFiles[0]}`);
    process.exit(0);
  }
}

// ─── Engine ────────────────────────────────────────────────────

function startEngine(cdmlPath, flags) {
  const mode = process.env.MODE || 'cli';
  const envVars = { ...process.env, MODE: mode };

  if (flags.target) envVars.CLAUDIV_TARGET = flags.target;
  if (flags.output) envVars.CLAUDIV_OUTPUT = flags.output;
  if (flags.watch) envVars.CLAUDIV_WATCH = '1';

  const editor = spawn('node', [join(__dirname, '../dist/index.js'), cdmlPath], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: envVars,
  });

  editor.on('exit', (exitCode) => {
    process.exit(exitCode || 0);
  });

  editor.on('error', (err) => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
}

// ─── Help ──────────────────────────────────────────────────────

function showHelp() {
  console.log(`
Claudiv ${VERSION} — Claude in a Div
Universal Declarative Generation Platform

USAGE
  claudiv <command> [name] [options]
  npx @claudiv/cli <command> [name] [options]

COMMANDS
  new <name>       Create a new .cdml file
  gen <name>       Generate code from .cdml file
  reverse <file>   Reverse-engineer existing file to .cdml
  watch <name>     Watch .cdml file and regenerate on changes
  help             Show this help message

OPTIONS
  -s, --spec <xml>      Inline .cdml content for 'new' command
  -g, --gen             Immediately generate after 'new'
  -t, --target <name>   Target component or language
  -f, --framework <fw>  Framework (fastapi, express, nextjs, etc.)
  -o, --output <file>   Output file path
  -w, --watch           Watch mode (regenerate on save)
  --dry-run             Preview without writing files
  -v, --version         Show version
  -h, --help            Show help

EXAMPLES

  Getting Started:
    claudiv new myapp                              Create myapp.cdml
    claudiv new myapp -t python                    Create Python project spec
    claudiv new myapp -g                           Create and generate immediately

  Inline Spec:
    claudiv new txt2img -s '<txt2img lang="python" type="cli" gen="">
      <ai provider="openai" />
      <config apikey organizationid />
      <args input="text|file, size" output="filename, format" />
    </txt2img>'

    claudiv new txt2img -s '<txt2img lang="python" type="cli" gen="">
      <ai provider="openai" />
      <config apikey organizationid />
      <args input="text|file, size" output="filename, format" />
    </txt2img>' -g                                 Create + generate immediately

  Generate:
    claudiv gen myapp                              Generate all from myapp.cdml
    claudiv gen myapp.cdml                         Explicit .cdml path
    claudiv gen txt2img -t config                  Generate only config component
    claudiv gen myapp -w                           Watch mode
    claudiv gen myapp -o output.py                 Custom output file

  Component Target (-t):
    claudiv gen txt2img -t config                  Generates txt2img.config
    claudiv gen myapp -t api                       Generates myapp.api
    claudiv gen myapp -t database                  Generates myapp.database

  Reverse Engineering:
    claudiv reverse api.py                         → api.cdml
    claudiv reverse Button.tsx                     → Button.cdml
    claudiv reverse backup.sh                      → backup.cdml
    claudiv reverse styles.css                     → styles.cdml
    claudiv reverse api.py -o spec.cdml            Custom output name

  Watch Mode:
    claudiv watch myapp                            Watch myapp.cdml for changes
    claudiv gen myapp -w                           Same as above

  Run in Empty Folder:
    npx @claudiv/cli new myapp -t python -g

FILE FORMAT
  Input:   <name>.cdml
  Output:  <name>.<ext>  (based on target language)

  Examples:
    app.cdml      → app.html       (target=html)
    api.cdml      → api.py         (target=python)
    backup.cdml   → backup.sh      (target=bash)
    deploy.cdml   → deploy.yaml    (target=kubernetes)

SPEC SYNTAX
  <element-name [attributes] gen[="instructions"]>
    Natural language description
  </element-name>

  Action attributes:
    gen           Generate new code
    gen="..."     Generate with specific instructions
    retry         Regenerate (not satisfied)
    undo          Revert to previous version
    lock          Protect from regeneration
    unlock        Allow regeneration of locked element

MORE INFO
  https://github.com/claudiv-ai/claudiv
`);
}
