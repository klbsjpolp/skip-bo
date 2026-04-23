import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {loadLocalEnvFile} from '../src/local/loadLocalEnvFile.js';

describe('loadLocalEnvFile', () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    vi.unstubAllEnvs();

    while (temporaryDirectories.length > 0) {
      const directory = temporaryDirectories.pop();

      if (directory) {
        rmSync(directory, {force: true, recursive: true});
      }
    }
  });

  const createEnvFile = (contents: string): string => {
    const directory = mkdtempSync(resolve(tmpdir(), 'skipbo-env-'));
    const envPath = resolve(directory, '.env.local');

    temporaryDirectories.push(directory);
    writeFileSync(envPath, contents, 'utf8');

    return envPath;
  };

  it('loads local dev environment values without overriding shell values', () => {
    const envPath = createEnvFile([
      'GENAI_PROVIDER=ollama',
      'OLLAMA_MODEL="llama3.2"',
      'SKIPBO_LOCAL_API_PORT=9999',
      'EXISTING_VALUE=from-file',
      'COMMENTED=value # ignored comment',
      '',
    ].join('\n'));

    vi.stubEnv('EXISTING_VALUE', 'from-shell');

    expect(loadLocalEnvFile(envPath)).toBe(true);
    expect(process.env.GENAI_PROVIDER).toBe('ollama');
    expect(process.env.OLLAMA_MODEL).toBe('llama3.2');
    expect(process.env.SKIPBO_LOCAL_API_PORT).toBe('9999');
    expect(process.env.EXISTING_VALUE).toBe('from-shell');
    expect(process.env.COMMENTED).toBe('value');
  });

  it('ignores a missing local env file', () => {
    expect(loadLocalEnvFile(resolve(tmpdir(), 'skipbo-missing-env.local'))).toBe(false);
  });
});
