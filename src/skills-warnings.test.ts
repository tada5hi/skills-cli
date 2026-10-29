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
  it.each(['once', 'always'])(
    'propagates a parser warning callback that throws %s',
    async (mode) => {
      const root = await fixture(
        '---\nname: tagged\ndescription: !unknown callback-fixture\n---\n'
      );
      const failure = new Error('warning callback failed');
      let calls = 0;
      const onWarning = vi.fn(() => {
        calls++;
        if (mode === 'always' || calls === 1) throw failure;
      });

      await expect(parseSkillMd(join(root, 'SKILL.md'), { onWarning })).rejects.toBe(failure);
      expect(onWarning).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('callback-fixture')
      );
    }
  );

  describe.each([
    ['root', ''],
    ['container', 'skills/category/example'],
    ['recursive', 'other/nested/example'],
  ])('%s discovery callback failures', (_layout, path) => {
    it.each([
      ['native warning', '---\nname: tagged\ndescription: !unknown callback-fixture\n---\n'],
      ['malformed YAML', malformed('callback-fixture')],
      ['missing field', '---\nname: missing-description\n---\n'],
    ])('propagates a %s callback failure unchanged', async (_diagnostic, content) => {
      const root = await mkdtemp(join(tmpdir(), 'skills-warning-'));
      roots.push(root);
      const dir = join(root, path);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'SKILL.md'), content);
      const failure = new Error('warning callback failed');
      const onWarning = vi.fn(() => {
        throw failure;
      });

      await expect(discoverSkills(root, undefined, { onWarning })).rejects.toBe(failure);
      expect(onWarning).toHaveBeenCalledTimes(1);
    });
  });

  it('propagates an unreadable-file diagnostic callback failure unchanged', async () => {
    const root = await fixture('unused');
    const failure = new Error('warning callback failed');
    const onWarning = vi.fn(() => {
      throw failure;
    });

    await expect(parseSkillMd(join(root, 'missing.md'), { onWarning })).rejects.toBe(failure);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it('preserves native warning order before a parser failure', async () => {
    const root = await fixture(
      '---\nname: tagged\ndescription: !unknown callback-fixture\ninvalid: [\n---\n'
    );
    const onWarning = vi.fn();

    expect(await parseSkillMd(join(root, 'SKILL.md'), { onWarning })).toBeNull();
    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onWarning.mock.calls[0]![0]).toContain('Unresolved tag:');
    expect(onWarning.mock.calls[1]![0]).toContain('YAML parse error:');
  });

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

  it('preserves default nonfatal YAML process warnings', async () => {
    const root = await fixture(
      '---\nname: tagged\ndescription: !unknown default-tag-fixture\n---\n'
    );
    const warning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const consoleWarning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await discoverSkills(root)).toHaveLength(1);
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: expect.stringContaining('default-tag-fixture'),
      })
    );
    expect(consoleWarning).not.toHaveBeenCalled();
  });

  it('preserves CLI discovery of unknown tags without a callback', async () => {
    const root = await fixture('---\nname: tagged\ndescription: !unknown cli-tag-fixture\n---\n');

    const result = runCli(['add', root, '--list']);
    const output = result.stdout + result.stderr;
    expect(result.exitCode).toBe(0);
    expect(output).toContain('Found 1 skill');
    expect(output).toContain('cli-tag-fixture');
  });

  it('routes nonfatal YAML warnings per call and supports a quiet no-op callback', async () => {
    const root = await fixture(
      '---\nname: tagged\ndescription: !unknown private-tag-fixture\n---\n'
    );
    const warning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const consoleWarning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(await discoverSkills(root, undefined, { onWarning })).toHaveLength(1);
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('private-tag-fixture')
    );
    expect(await discoverSkills(root, undefined, { onWarning: () => {} })).toHaveLength(1);
    expect(warning).not.toHaveBeenCalled();
    expect(consoleWarning).not.toHaveBeenCalled();
  });

  it('isolates concurrent callback and default nonfatal YAML warnings', async () => {
    const quietRoot = await fixture(
      '---\nname: quiet\ndescription: !unknown quiet-tag-fixture\n---\n'
    );
    const defaultRoot = await fixture(
      '---\nname: default\ndescription: !unknown loud-tag-fixture\n---\n'
    );
    const warning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const consoleWarning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    const results = await Promise.all([
      discoverSkills(quietRoot, undefined, { onWarning }),
      discoverSkills(defaultRoot),
    ]);
    expect(results.map((skills) => skills.length)).toEqual([1, 1]);
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('quiet-tag-fixture'));
    expect(warning).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: expect.stringContaining('loud-tag-fixture'),
      })
    );
    expect(String(warning.mock.calls[0]![0])).not.toContain('quiet-tag-fixture');
    expect(consoleWarning).not.toHaveBeenCalled();
  });

  it.each([
    ['YAML parse error:', malformed('callback-fixture-token')],
    ['missing required frontmatter field(s):', '---\nname: missing-description\n---\n'],
    ['must be strings', '---\nname: 123\ndescription: invalid-name\n---\n'],
  ])('routes %s through the parser callback', async (diagnostic, content) => {
    const root = await fixture(content);
    const processWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(await parseSkillMd(join(root, 'SKILL.md'), { onWarning })).toBeNull();
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(diagnostic));
    expect(warning).not.toHaveBeenCalled();
    expect(processWarning).not.toHaveBeenCalled();
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
