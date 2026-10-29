type AgentType = 'aider-desk' | 'amp' | 'antigravity' | 'antigravity-cli' | 'astrbot' | 'autohand-code' | 'augment' | 'bob' | 'claude-code' | 'openclaw' | 'cline' | 'codearts-agent' | 'codebuddy' | 'codemaker' | 'codestudio' | 'codex' | 'command-code' | 'continue' | 'cortex' | 'crush' | 'cursor' | 'deepagents' | 'devin' | 'dexto' | 'droid' | 'eve' | 'firebender' | 'forgecode' | 'fx' | 'gemini-cli' | 'github-copilot' | 'goose' | 'grok' | 'hermes-agent' | 'inference-sh' | 'iflow-cli' | 'jazz' | 'junie' | 'kilo' | 'kimchi' | 'kimi-code-cli' | 'kiro-cli' | 'kode' | 'lingma' | 'loaf' | 'mcpjam' | 'minimax-code' | 'mistral-vibe' | 'moxby' | 'mux' | 'neovate' | 'opencode' | 'openhands' | 'ona' | 'pi' | 'posit-assistant' | 'qoder' | 'qoder-cn' | 'qwen-code' | 'replit' | 'reasonix' | 'roo' | 'rovodev' | 'sarvam-code' | 'tabnine-cli' | 'terramind' | 'tinycloud' | 'trae' | 'trae-cn' | 'warp' | 'windsurf' | 'zed' | 'zcode' | 'zencoder' | 'zenflow' | 'pochi' | 'promptscript' | 'adal' | 'universal';
interface Skill {
  name: string;
  description: string;
  path: string;
  /** Raw SKILL.md content for hashing */
  rawContent?: string;
  /** Name of the plugin this skill belongs to (if any) */
  pluginName?: string;
  metadata?: Record<string, unknown>;
}
interface ParsedSource {
  type: 'github' | 'gitlab' | 'git' | 'local' | 'well-known' | 'download';
  url: string;
  subpath?: string;
  localPath?: string;
  ref?: string;
  /** Skill name extracted from @skill syntax (e.g., owner/repo@skill-name) */
  skillFilter?: string;
}
/**
 * `githubHost` pins `owner/repo` shorthand to a host regardless of GH_HOST,
 * for inputs known to come from github.com (e.g. a public lock entry).
 */
declare function parseSource(input: string, options?: {
  githubHost?: string;
}): ParsedSource;
declare function cloneRepo(url: string, ref?: string): Promise<string>;
declare function cleanupTempDir(dir: string): Promise<void>;
interface DiscoverSkillsOptions {
  /** Override console.warn; diagnostics can include source snippets. */
  onWarning?: (message: string) => void;
  /** Include internal skills (e.g., when user explicitly requests a skill by name) */
  includeInternal?: boolean;
  /** Search all subdirectories even when a root SKILL.md exists */
  fullDepth?: boolean;
  /** Preserve duplicate skill names so callers can detect ambiguous locations */
  includeDuplicateNames?: boolean;
}
declare function discoverSkills(basePath: string, subpath?: string, options?: DiscoverSkillsOptions): Promise<Skill[]>;
/**
 * Filter skills based on user input (case-insensitive direct matching).
 * Multi-word skill names must be quoted on the command line.
 */
declare function filterSkills(skills: Skill[], inputNames: string[]): Skill[];
/**
 * - `symlink`: copy into the canonical dir, symlink agent dirs to it
 * - `copy`: copy into each agent dir
 * - `link`: symlink the canonical dir to the skill's source, symlink agent dirs to it
 */
type InstallMode = 'symlink' | 'copy' | 'link';
interface InstallOptions {
  global?: boolean;
  cwd?: string;
  mode?: InstallMode;
  eveSubagent?: string;
  /** Create a missing agent-specific project root because the user selected this agent. */
  createMissingAgentRoot?: boolean;
}
interface InstallResult {
  success: boolean;
  path: string;
  canonicalPath?: string;
  mode: InstallMode;
  symlinkFailed?: boolean;
  skipped?: boolean;
  skipReason?: 'missing-agent-project-directory';
  error?: string;
}
declare function installSkillForAgent(skill: Skill, agentType: AgentType, options?: InstallOptions): Promise<InstallResult>;
export { type AgentType, type DiscoverSkillsOptions, type InstallMode, type InstallOptions, type InstallResult, type ParsedSource, type Skill, cleanupTempDir, cloneRepo, discoverSkills, filterSkills, installSkillForAgent, parseSource };