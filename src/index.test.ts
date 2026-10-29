import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type {
  AgentType,
  AgentConfig,
  HostProvider,
  ProviderRemoteSkill,
  RemoteSkill,
  FetchAllSkillsOptions,
  WellKnownFileContent,
  WellKnownIndexV1,
  WellKnownIndexV2,
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
      'EVE_SUBAGENTS_DIR',
      'GitCloneError',
      'WellKnownProvider',
      'WellKnownScopeNotFoundError',
      'agents',
      'cleanupTempDir',
      'cloneRepo',
      'computeWellKnownSkillDigest',
      'detectInstalledAgents',
      'discoverSkills',
      'filterSkills',
      'findProvider',
      'getAgentBaseDir',
      'getAgentConfig',
      'getCanonicalPath',
      'getCanonicalSkillsDir',
      'getEveSubagentSkillsDir',
      'getEveSubagents',
      'getGitTreeHash',
      'getInstallPath',
      'getNonUniversalAgents',
      'getOpenClawGlobalSkillsDir',
      'getOwnerRepo',
      'getPluginGroupings',
      'getPluginSkillPaths',
      'getProviders',
      'getSkillDisplayName',
      'getUniversalAgents',
      'getVisibleUniversalAgents',
      'hasSkillMd',
      'installBlobSkillForAgent',
      'installRemoteSkillForAgent',
      'installSkillForAgent',
      'installWellKnownSkillForAgent',
      'isCommitSha',
      'isGitHubHttpsCloneUrl',
      'isGitHubSsoAuthError',
      'isKimchiInstalled',
      'isMiniMaxCodeInstalled',
      'isMissingRefError',
      'isPositAssistantInstalled',
      'isRepoPrivate',
      'isSkillInstalled',
      'isSubpathSafe',
      'isUniversalAgent',
      'isZCodeInstalled',
      'listInstalledSkills',
      'parseFrontmatter',
      'parseGitHubRepoUrl',
      'parseOwnerRepo',
      'parseSkillMd',
      'parseSource',
      'registerProvider',
      'registry',
      'sanitizeName',
      'sanitizeSubpath',
      'shouldInstallInternalSkills',
      'wellKnownProvider',
    ]);
  });

  it('exposes the distinct installer and provider types with existing provider and agent APIs', async () => {
    const sdk = await import('./index.ts');
    expectTypeOf<
      Parameters<typeof sdk.installRemoteSkillForAgent>[0]
    >().toEqualTypeOf<RemoteSkill>();
    expectTypeOf<
      Awaited<ReturnType<HostProvider['fetchSkill']>>
    >().toEqualTypeOf<ProviderRemoteSkill | null>();
    expectTypeOf(sdk.getAgentConfig('universal')).toEqualTypeOf<AgentConfig>();
    expectTypeOf<Parameters<typeof sdk.wellKnownProvider.fetchAllSkills>[1]>().toEqualTypeOf<
      FetchAllSkillsOptions | undefined
    >();
    expectTypeOf<WellKnownFileContent>().toEqualTypeOf<string | Uint8Array>();
    expectTypeOf<WellKnownIndexV1['skills'][number]['files']>().toEqualTypeOf<string[]>();
    expectTypeOf<WellKnownIndexV2['skills'][number]['type']>().toEqualTypeOf<
      'skill-md' | 'archive'
    >();

    const provider: HostProvider = new sdk.WellKnownProvider();
    expect(provider.match('https://example.com/docs').matches).toBe(true);
    expect(sdk.getAgentConfig('universal').skillsDir).toBe('.agents/skills');
    expect(sdk.isUniversalAgent('universal')).toBe(true);
    expect(sdk.parseFrontmatter('---\nname: example\n---\nBody').data.name).toBe('example');
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
    await mkdir(join(sourceDir, '.claude-plugin'));
    await writeFile(
      join(sourceDir, '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'sdk-plugin',
        skills: ['./skills/sdk-example'],
      })
    );
    expect(await sdk.getPluginSkillPaths(sourceDir)).toContain(join(sourceDir, 'skills'));
    expect((await sdk.getPluginGroupings(sourceDir)).get(skillDir)).toBe('sdk-plugin');
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
