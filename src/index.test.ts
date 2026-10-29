import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type {
  AgentType,
  DiscoverSkillsOptions,
  InstallMode,
  InstallOptions,
  InstallResult,
  ParsedSource,
  Skill,
} from './index.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

describe('headless SDK', () => {
  it('exports the existing library functions', async () => {
    const sdk = await import('./index.ts');
    expect(Object.keys(sdk).sort()).toEqual([
      'cleanupTempDir',
      'cloneRepo',
      'discoverSkills',
      'filterSkills',
      'installSkillForAgent',
      'parseSource',
    ]);
    for (const value of Object.values(sdk)) expect(value).toBeTypeOf('function');
  });

  it('discovers, filters and copies local skills into an explicit project directory', async () => {
    const sdk = await import('./index.ts');
    const root = await mkdtemp(join(tmpdir(), 'skills-sdk-'));
    roots.push(root);
    const sourceDir = join(root, 'source');
    const skillDir = join(sourceDir, 'skills', 'sdk-example');
    const projectDir = join(root, 'project');
    await mkdir(join(skillDir, 'references'), { recursive: true });
    await mkdir(join(skillDir, 'assets'));
    await mkdir(projectDir);
    const content =
      '---\nname: sdk-example\ndescription: Local SDK fixture\n---\nRead references/guide.md and assets/example.txt.\n';
    await writeFile(join(skillDir, 'SKILL.md'), content);
    await writeFile(join(skillDir, 'references', 'guide.md'), 'Reference content\n');
    await writeFile(join(skillDir, 'assets', 'example.txt'), 'Asset content\n');
    const cwd = process.cwd();
    const source: ParsedSource = sdk.parseSource(sourceDir);
    expect(source.type).toBe('local');
    expect(source.localPath).toBe(sourceDir);
    const discovery: DiscoverSkillsOptions = { fullDepth: true, includeDuplicateNames: true };
    const skills: Skill[] = await sdk.discoverSkills(sourceDir, undefined, discovery);
    const selected = sdk.filterSkills(skills, ['sdk-example']);
    expect(selected).toHaveLength(1);
    const agent: AgentType = 'universal';
    const mode: InstallMode = 'copy';
    const options: InstallOptions = { cwd: projectDir, mode, global: false };
    const result: InstallResult = await sdk.installSkillForAgent(selected[0]!, agent, options);
    const installed = join(projectDir, '.agents', 'skills', 'sdk-example');
    expect(result).toEqual({ success: true, path: installed, mode });
    expect(await readFile(join(installed, 'SKILL.md'), 'utf8')).toBe(content);
    expect(await readFile(join(installed, 'references', 'guide.md'), 'utf8')).toBe(
      'Reference content\n'
    );
    expect(await readFile(join(installed, 'assets', 'example.txt'), 'utf8')).toBe(
      'Asset content\n'
    );
    expect(resolve(process.cwd())).toBe(resolve(cwd));
  });
});
