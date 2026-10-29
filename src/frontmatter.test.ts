import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseFrontmatter } from './frontmatter.ts';
import { parseSkillMd } from './skills.ts';

describe('parseFrontmatter', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each([
    ['LF', '\n', ''],
    ['CRLF', '\r\n', ''],
    ['BOM and LF', '\n', '\uFEFF'],
    ['BOM and CRLF', '\r\n', '\uFEFF'],
  ])('reads YAML with %s', (_label, newline, prefix) => {
    const raw =
      prefix +
      ['---', 'name: example', 'description: Example skill', '---', '# Body', ''].join(newline);
    expect(parseFrontmatter(raw)).toEqual({
      data: { name: 'example', description: 'Example skill' },
      content: '# Body' + newline,
    });
  });

  it.each(['', '\uFEFF'])('keeps JavaScript frontmatter unsupported (prefix %j)', (prefix) => {
    const raw = prefix + '---js\n({ name: "example", description: "Example skill" })\n---\n# Body';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, content: raw });
  });

  it('routes YAML diagnostics to a callback while preserving its data conversion', () => {
    const raw =
      '---\nname: tagged\ndescription: !unknown direct-tag-fixture\nmetadata: { nested: [1, true, null] }\n---\n# Body';
    const processWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const onWarning = vi.fn();

    expect(parseFrontmatter(raw, { onWarning })).toEqual({
      data: {
        name: 'tagged',
        description: 'direct-tag-fixture',
        metadata: { nested: [1, true, null] },
      },
      content: '# Body',
    });
    expect(onWarning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('direct-tag-fixture')
    );
    expect(processWarning).not.toHaveBeenCalled();
  });

  it('silences collection-key conversion warnings per document without changing converted data', () => {
    const raw =
      '---\nname: complex\ndescription: valid\nmetadata:\n  ? [conversion-fixture]\n  : value\n---\n';
    const processWarning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {});
    const consoleWarning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = parseFrontmatter(raw);
    expect(processWarning).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Keys with collection values')
    );
    processWarning.mockClear();

    expect(parseFrontmatter(raw, { onWarning: () => {} })).toEqual(original);
    expect(processWarning).not.toHaveBeenCalled();
    expect(consoleWarning).not.toHaveBeenCalled();
  });

  it.each([undefined, { onWarning: (_message: string) => {} }])(
    'rejects multiple documents with options %j',
    (options) => {
      const raw =
        '---\nname: first\ndescription: first\n...\nname: second\ndescription: second\n---\n';
      expect(() => parseFrontmatter(raw, options)).toThrow('Source contains multiple documents');
    }
  );

  it.each([undefined, { onWarning: (_message: string) => {} }])(
    'retains the default alias expansion limit with options %j',
    (options) => {
      const raw =
        '---\na: &a [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nb: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a, *a]\nc: [*b, *b, *b, *b, *b, *b, *b, *b, *b, *b]\n---\n';
      expect(() => parseFrontmatter(raw, options)).toThrow('Excessive alias count');
    }
  );

  it('preserves text without frontmatter', () => {
    const raw = '\uFEFF# Body\n';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, content: raw });
  });
});

describe('parseSkillMd', () => {
  it.each(['\n', '\r\n'])('loads a BOM-prefixed skill with newline %j', async (newline) => {
    const dir = await mkdtemp(join(tmpdir(), 'skills-bom-'));
    const path = join(dir, 'SKILL.md');
    const raw =
      '\uFEFF' +
      ['---', 'name: example', 'description: Example skill', '---', '# Body', ''].join(newline);
    try {
      await writeFile(path, raw, 'utf8');
      const skill = await parseSkillMd(path);
      expect(skill).toMatchObject({
        name: 'example',
        description: 'Example skill',
        path: dir,
        rawContent: raw,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
