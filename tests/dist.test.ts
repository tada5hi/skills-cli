import { describe, it, expect } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';

const rootDir = join(import.meta.dirname, '..');

describe('dist build', () => {
  it('builds and runs without errors', { timeout: 30000 }, () => {
    // Build the project
    execSync('pnpm sdk:build', { cwd: rootDir, stdio: 'pipe' });

    // Run the CLI - should exit cleanly with help output
    const result = execSync('node bin/cli.mjs --help', {
      cwd: rootDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    expect(result).toContain('skills');

    for (const entry of ['../src/index.ts', '../dist/index.mjs']) {
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
      import assert from 'node:assert/strict';
      let fetches = 0;
      globalThis.fetch = async () => { fetches++; throw new Error('Unexpected SDK import request'); };
      const sdk = await import(${JSON.stringify(new URL(entry, import.meta.url).href)});
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(fetches, 0);
      assert.equal(typeof sdk.installSkillForAgent, 'function');
      assert.equal(typeof sdk.WellKnownProvider, 'function');
      assert.equal(typeof sdk.getPluginSkillPaths, 'function');
      assert.equal(typeof sdk.getAgentConfig, 'function');
    `,
        ],
        {
          encoding: 'utf8',
          timeout: 10_000,
          env: { ...process.env, DISABLE_TELEMETRY: '', DO_NOT_TRACK: '' },
        }
      );

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    }
  });
});
