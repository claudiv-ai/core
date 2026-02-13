/**
 * Generator Registry - Maps target languages to their code generators
 */

import type { CodeGenerator, TargetLanguage } from '../types.js';
import { HtmlGenerator } from './html-generator.js';
import { BashGenerator } from './bash-generator.js';
import { PythonGenerator } from './python-generator.js';
import { SystemMonitorGenerator, LiveMonitorGenerator } from './system-monitor-generator.js';

class GeneratorRegistry {
  private generators: Map<TargetLanguage, CodeGenerator> = new Map();

  constructor() {
    // Register built-in generators
    this.register(new HtmlGenerator());
    this.register(new BashGenerator());
    this.register(new PythonGenerator());
    this.register(new SystemMonitorGenerator());
    this.register(new LiveMonitorGenerator());
  }

  /**
   * Register a code generator
   */
  register(generator: CodeGenerator): void {
    this.generators.set(generator.language, generator);
  }

  /**
   * Get generator for a target language
   */
  get(language: TargetLanguage): CodeGenerator | undefined {
    return this.generators.get(language);
  }

  /**
   * Get generator or throw error if not found
   */
  getOrThrow(language: TargetLanguage): CodeGenerator {
    const generator = this.get(language);
    if (!generator) {
      throw new Error(
        `No generator found for target language: ${language}\n` +
        `Available: ${Array.from(this.generators.keys()).join(', ')}`
      );
    }
    return generator;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): TargetLanguage[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Check if a language is supported
   */
  isSupported(language: string): language is TargetLanguage {
    return this.generators.has(language as TargetLanguage);
  }
}

// Singleton instance
export const generatorRegistry = new GeneratorRegistry();
