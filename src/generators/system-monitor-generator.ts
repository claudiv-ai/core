/**
 * System Monitoring Generator - Captures system state and live changes
 */

import type {
  CodeGenerator,
  TargetLanguage,
  TargetFramework,
  ChatPattern,
  HierarchyContext,
  GeneratedCode,
  SystemState,
  FileOperation,
} from '../types.js';
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

export class SystemMonitorGenerator implements CodeGenerator {
  readonly language: TargetLanguage = 'system-state';
  readonly supportedFrameworks: TargetFramework[] = ['none'];

  async generate(
    response: string,
    pattern: ChatPattern,
    context: HierarchyContext
  ): Promise<GeneratedCode> {
    // Capture current system state
    const systemState = await this.captureSystemState();

    // Generate .cdml representation of system state
    const cdml = this.serializeSystemStateToCdml(systemState);

    return {
      code: cdml,
      language: 'system-state',
      fileExtension: '.cdml',
      metadata: {
        captureTime: systemState.timestamp,
        hostname: systemState.hostname,
      },
    };
  }

  async reverse(sourceCode: string, sourceFile: string): Promise<string> {
    // System state is already in .cdml format
    return sourceCode;
  }

  async apply(
    cdmlContent: string,
    targetFile: string,
    existingCode: string
  ): Promise<string> {
    // Apply system configuration from .cdml
    // This would require root privileges
    return existingCode;
  }

  getFileExtension(): string {
    return '.cdml';
  }

  /**
   * Capture current system state
   */
  private async captureSystemState(): Promise<SystemState> {
    const state: SystemState = {
      timestamp: new Date(),
      hostname: await this.getHostname(),
      os: await this.getOSInfo(),
      startupPrograms: await this.getStartupPrograms(),
      services: await this.getServices(),
      environmentVariables: process.env as Record<string, string>,
      systemConfigs: await this.getSystemConfigs(),
      fileMappings: await this.getFileMappings(),
    };

    return state;
  }

  /**
   * Serialize system state to .cdml format
   */
  private serializeSystemStateToCdml(state: SystemState): string {
    const lines: string[] = [];

    lines.push(`<system-state captured="${state.timestamp.toISOString()}">`);
    lines.push(`  <hostname>${state.hostname}</hostname>`);
    lines.push(`  <os>${state.os}</os>`);
    lines.push('');

    // Startup programs
    if (state.startupPrograms.length > 0) {
      lines.push('  <startup-programs>');
      for (const prog of state.startupPrograms) {
        lines.push(`    <program name="${prog.name}" enabled="${prog.enabled}">`);
        lines.push(`      ${prog.path}`);
        lines.push(`    </program>`);
      }
      lines.push('  </startup-programs>');
      lines.push('');
    }

    // Services
    if (state.services.length > 0) {
      lines.push('  <services>');
      for (const svc of state.services) {
        lines.push(`    <service name="${svc.name}" status="${svc.status}" enabled="${svc.enabled}" />`);
      }
      lines.push('  </services>');
      lines.push('');
    }

    // Environment variables
    lines.push('  <environment>');
    for (const [key, value] of Object.entries(state.environmentVariables)) {
      // Skip sensitive vars
      if (this.isSensitiveVar(key)) continue;
      lines.push(`    <var name="${key}">${this.escapeXml(value)}</var>`);
    }
    lines.push('  </environment>');
    lines.push('');

    // System configs
    if (state.systemConfigs.length > 0) {
      lines.push('  <configs>');
      for (const cfg of state.systemConfigs) {
        lines.push(`    <config file="${cfg.file}" modified="${cfg.modified.toISOString()}">`);
        lines.push(`      <![CDATA[${cfg.content}]]>`);
        lines.push(`    </config>`);
      }
      lines.push('  </configs>');
      lines.push('');
    }

    // File mappings
    if (state.fileMappings.length > 0) {
      lines.push('  <file-mappings>');
      for (const mapping of state.fileMappings) {
        lines.push(`    <mapping type="${mapping.type}">`);
        lines.push(`      <source>${mapping.source}</source>`);
        lines.push(`      <target>${mapping.target}</target>`);
        lines.push(`    </mapping>`);
      }
      lines.push('  </file-mappings>');
    }

    lines.push('</system-state>');

    return lines.join('\n');
  }

  /**
   * Get hostname
   */
  private async getHostname(): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn('hostname');
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.on('close', () => resolve(output.trim()));
    });
  }

  /**
   * Get OS info
   */
  private async getOSInfo(): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn('uname', ['-a']);
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.on('close', () => resolve(output.trim()));
    });
  }

  /**
   * Get startup programs (systemd, cron, etc.)
   */
  private async getStartupPrograms(): Promise<Array<{ name: string; path: string; enabled: boolean }>> {
    // TODO: Implement systemd unit detection
    // For now, return empty array
    return [];
  }

  /**
   * Get running services
   */
  private async getServices(): Promise<Array<{ name: string; status: 'running' | 'stopped' | 'disabled'; enabled: boolean }>> {
    // TODO: Implement systemctl list-units parsing
    return [];
  }

  /**
   * Get system configuration files
   */
  private async getSystemConfigs(): Promise<Array<{ file: string; content: string; modified: Date }>> {
    const configFiles = [
      '/etc/hostname',
      '/etc/hosts',
      // Add more as needed
    ];

    const configs: Array<{ file: string; content: string; modified: Date }> = [];

    for (const file of configFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        configs.push({
          file,
          content,
          modified: new Date(), // TODO: Get actual mtime
        });
      } catch {
        // Skip files we can't read
      }
    }

    return configs;
  }

  /**
   * Get file mappings (symlinks, mounts)
   */
  private async getFileMappings(): Promise<Array<{ source: string; target: string; type: 'symlink' | 'mount' | 'bind' }>> {
    // TODO: Implement mount point and symlink detection
    return [];
  }

  /**
   * Check if environment variable is sensitive
   */
  private isSensitiveVar(name: string): boolean {
    const sensitive = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'API_KEY'];
    return sensitive.some(s => name.toUpperCase().includes(s));
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Live monitoring generator - tracks changes over time
 */
export class LiveMonitorGenerator implements CodeGenerator {
  readonly language: TargetLanguage = 'live-monitoring';
  readonly supportedFrameworks: TargetFramework[] = ['none'];

  private fileOperations: FileOperation[] = [];
  private isMonitoring = false;
  private startTime?: Date;

  async generate(
    response: string,
    pattern: ChatPattern,
    context: HierarchyContext
  ): Promise<GeneratedCode> {
    // Generate monitoring report
    const report = this.generateReport();

    return {
      code: report,
      language: 'live-monitoring',
      fileExtension: '.md',
      metadata: {
        operationCount: this.fileOperations.length,
        duration: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      },
    };
  }

  async reverse(sourceCode: string, sourceFile: string): Promise<string> {
    // Not applicable for live monitoring
    return sourceCode;
  }

  async apply(
    cdmlContent: string,
    targetFile: string,
    existingCode: string
  ): Promise<string> {
    return existingCode;
  }

  getFileExtension(): string {
    return '.md';
  }

  /**
   * Start monitoring file operations
   */
  startMonitoring(paths: string[]): void {
    this.isMonitoring = true;
    this.startTime = new Date();
    this.fileOperations = [];

    // TODO: Set up file system watchers on specified paths
    // Use chokidar or native fs.watch
  }

  /**
   * Stop monitoring and generate report
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Record a file operation
   */
  recordOperation(operation: FileOperation): void {
    if (this.isMonitoring) {
      this.fileOperations.push(operation);
    }
  }

  /**
   * Generate structured report of file operations
   */
  private generateReport(): string {
    const lines: string[] = [];

    lines.push('# System Monitoring Report');
    lines.push('');
    lines.push(`**Monitoring Period**: ${this.startTime?.toISOString()} - ${new Date().toISOString()}`);
    lines.push(`**Total Operations**: ${this.fileOperations.length}`);
    lines.push('');

    // Group by operation type
    const byType = this.groupByType(this.fileOperations);

    lines.push('## Operations by Type');
    lines.push('');
    for (const [type, ops] of Object.entries(byType)) {
      lines.push(`### ${type} (${ops.length})`);
      lines.push('');
      lines.push('| Timestamp | Path | User | Process |');
      lines.push('|-----------|------|------|---------|');
      for (const op of ops.slice(0, 10)) { // Show first 10
        lines.push(`| ${op.timestamp.toISOString()} | ${op.path} | ${op.user || 'N/A'} | ${op.process || 'N/A'} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Group operations by type
   */
  private groupByType(operations: FileOperation[]): Record<string, FileOperation[]> {
    const grouped: Record<string, FileOperation[]> = {};

    for (const op of operations) {
      if (!grouped[op.type]) {
        grouped[op.type] = [];
      }
      grouped[op.type].push(op);
    }

    return grouped;
  }
}
