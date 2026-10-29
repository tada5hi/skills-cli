import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverSkills } from './index.ts';
import { parseSkillMd } from './skills.ts';
import { runCli } from './test-utils.ts';

const roots: string[] = [];

async function fixture(content: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'skills-warning-'));
  roots.push(root);
  await writeFile(join(root, 'SKILL.md'), content);
  return root;
}

function malformed(token: string): string {
  return `---\nname: [${token}\ndescription: invalid\n---\n`;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

describe('per-call skill warnings', () => {
  it('preserves the default console diagnostic used by CLI discovery', async () => {
    const root = await fixture(malformed('default-fixture-token'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await discoverSkills(root)).toEqual([]);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0]![0]).toContain('YAML parse error:');
    expect(warning.mock.calls[0]![0]).toContain('default-fixture-token');
  });

  it('preserves CLI warnings when no callback is supplied', async () => {
    const root = await fixture(malformed('cli-fixture-token'));

    const result = runCli(['add', root, '--list']);
    const output = result.stdout + result.stderr;
    expect(output).toContain('YAML parse error:');
    expect(output).toContain('cli-fixture-token');
  });

  it.each([
    ['YAML parse error:', malformed('callback-fixture-token')],
    ['missing required frontmatter field(s):', '---\nname: missing-description\n---\n'],
    ['must be strings', '---\nname: 123\ndescription: invalid-name\n---\n'],
  ])('routes %s through the parser callback', async (diagnostic, content) => {
    const root = await fixture(content);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(await parseSkillMd(join(root, 'SKILL.md'), { onWarning })).toBeNull();
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(diagnostic));
    expect(warning).not.toHaveBeenCalled();
  });

  it('routes unreadable-file diagnostics through the parser callback', async () => {
    const root = await fixture('unused');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(await parseSkillMd(join(root, 'missing.md'), { onWarning })).toBeNull();
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('failed to read file:')
    );
    expect(warning).not.toHaveBeenCalled();
  });

  it('routes root, container and recursive discovery warnings through its callback', async () => {
    const root = await fixture(malformed('root-fixture-token'));
    for (const path of ['skills/container', 'other/nested/deep']) {
      const dir = join(root, path);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'SKILL.md'), malformed(path));
    }
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(await discoverSkills(root, undefined, { fullDepth: true, onWarning })).toEqual([]);
    expect(onWarning).toHaveBeenCalledTimes(3);
    for (const call of onWarning.mock.calls) expect(call[0]).toContain('YAML parse error:');
    expect(onWarning.mock.calls.some(([message]) => message.includes('root-fixture-token'))).toBe(
      true
    );
    expect(warning).not.toHaveBeenCalled();
  });

  it('keeps concurrent callback and default discovery diagnostics isolated', async () => {
    const quietRoot = await fixture(malformed('quiet-fixture-token'));
    const defaultRoot = await fixture(malformed('loud-fixture-token'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(
      await Promise.all([
        discoverSkills(quietRoot, undefined, { onWarning }),
        discoverSkills(defaultRoot),
      ])
    ).toEqual([[], []]);
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('quiet-fixture-token')
    );
    expect(warning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('loud-fixture-token'));
    expect(warning.mock.calls[0]![0]).not.toContain('quiet-fixture-token');
    expect(onWarning.mock.calls[0]![0]).not.toContain('loud-fixture-token');
  });
});
