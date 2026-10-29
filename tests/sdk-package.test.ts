import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('SDK Git distribution', () => {
  it('avoids npm Git preparation that installs development dependencies', () => {
    // npm's GitFetcher installs dev dependencies for these scripts, even with scripts disabled.
    const preparationScripts = [
      'postinstall',
      'build',
      'preinstall',
      'install',
      'prepack',
      'prepare',
    ];
    expect(preparationScripts.filter((name) => manifest.scripts?.[name])).toEqual([]);
    expect(manifest.workspaces).toBeUndefined();
  });
});
