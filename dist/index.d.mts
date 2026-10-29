/**
 * Minimal frontmatter parser. Only supports YAML (the `---` delimiter).
 * Does NOT support `---js` / `---javascript` to avoid eval()-based RCE
 * that exists in gray-matter's built-in JS engine.
 */
declare function parseFrontmatter(raw: string, options?: {
  onWarning?: (message: string) => void;
}): {
  data: Record<string, unknown>;
  content: string;
};
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
interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  /** Global skills directory. Set to undefined if the agent doesn't support global installation. */
  globalSkillsDir: string | undefined;
  detectInstalled: () => Promise<boolean>;
  /** Whether to show this agent in the universal agents list. Defaults to true. */
  showInUniversalList?: boolean;
  /** Whether to display this universal agent in the interactive locked section. Defaults to true. */
  showInUniversalPrompt?: boolean;
  /** Whether automatic project installs may create this agent's missing skills root. */
  createProjectSkillsDirByDefault?: boolean;
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
 * Represents a skill fetched from a remote host provider.
 */
interface RemoteSkill$1 {
  /** Display name of the skill (from frontmatter) */
  name: string;
  /** Description of the skill (from frontmatter) */
  description: string;
  /** Full markdown content including frontmatter */
  content: string;
  /** The identifier used for installation directory name */
  installName: string;
  /** The original source URL */
  sourceUrl: string;
  /** The provider that fetched this skill */
  providerId: string;
  /** Source identifier for telemetry (e.g., "mintlify.com") */
  sourceIdentifier: string;
  /** Any additional metadata from frontmatter */
  metadata?: Record<string, unknown>;
}
/**
 * Extract owner/repo (or group/subgroup/repo for GitLab) from a parsed source
 * for lockfile tracking and telemetry.
 * Returns null for local paths or unparseable sources.
 * Supports any Git host with an owner/repo URL structure, including GitLab subgroups.
 */
declare function getOwnerRepo(parsed: ParsedSource): string | null;
/**
 * Extract owner and repo from an owner/repo string.
 * Returns null if the format is invalid.
 */
declare function parseOwnerRepo(ownerRepo: string): {
  owner: string;
  repo: string;
} | null;
/**
 * Check if a GitHub repository is private.
 * Returns true if private, false if public, null if unable to determine.
 * Only works for GitHub repositories (GitLab not supported).
 */
declare function isRepoPrivate(owner: string, repo: string): Promise<boolean | null>;
/**
 * Sanitizes a subpath to prevent path traversal attacks.
 * Rejects subpaths containing ".." segments that could escape the repository root.
 * Returns the sanitized subpath, or throws if the subpath is unsafe.
 */
declare function sanitizeSubpath(subpath: string): string;
/**
 * `githubHost` pins `owner/repo` shorthand to a host regardless of GH_HOST,
 * for inputs known to come from github.com (e.g. a public lock entry).
 */
declare function parseSource(input: string, options?: {
  githubHost?: string;
}): ParsedSource;
/**
 * Whether a ref is a full 40-character Git commit SHA.
 *
 * Used only to decide whether the commit-SHA fetch fallback is worth attempting
 * after a `--branch` clone fails. The fetch-by-SHA protocol requires the full
 * 40-char SHA; abbreviated SHAs are rejected by the server, so they are not
 * matched here. Branch and tag detection is never inferred from the string:
 * `--branch` is always tried first, so any real branch or tag (including a
 * hex-looking name like "deadbeef" or a 40-char-hex name) resolves correctly
 * before the SHA fallback is ever considered.
 */
declare function isCommitSha(ref: string): boolean;
/**
 * Whether a clone or fetch error means the requested ref does not exist as a
 * branch or tag. `git clone --branch <sha>` fails this way because `--branch`
 * only accepts branch or tag names, never a bare commit SHA.
 *
 * These messages come from the git client and the server `upload-pack`, not from
 * the host, so they are identical across GitHub, GitLab, self-hosted git, and
 * `gh` (which wraps git). Verified on git 2.53. The variants cover the different
 * code paths a missing ref can surface through:
 *   - `clone --branch <ref>`            -> "Remote branch <ref> not found in upstream origin"
 *   - GitHub shorthand fetch path       -> "couldn't find remote ref <ref>"
 *   - server-side fetch by SHA rejected -> "upload-pack: not our ref <ref>"
 */
declare function isMissingRefError(message: string): boolean;
interface GitHubRepoInfo {
  owner: string;
  repo: string;
  slug: string;
  sshUrl: string;
}
declare class GitCloneError extends Error {
  readonly url: string;
  readonly isTimeout: boolean;
  readonly isAuthError: boolean;
  constructor(message: string, url: string, isTimeout?: boolean, isAuthError?: boolean);
}
declare function parseGitHubRepoUrl(url: string): GitHubRepoInfo | null;
declare function isGitHubHttpsCloneUrl(url: string): boolean;
declare function isGitHubSsoAuthError(message: string): boolean;
declare function cloneRepo(url: string, ref?: string): Promise<string>;
/**
 * Resolve the Git tree object for a locked skill path in a cloned repository.
 * This matches the folder SHA returned by GitHub's Trees API.
 */
declare function getGitTreeHash(repoDir: string, skillPath: string): Promise<string | null>;
declare function cleanupTempDir(dir: string): Promise<void>;
/**
 * Check if internal skills should be installed.
 * Internal skills are hidden by default unless INSTALL_INTERNAL_SKILLS=1 is set.
 */
declare function shouldInstallInternalSkills(): boolean;
declare function hasSkillMd(dir: string): Promise<boolean>;
declare function parseSkillMd(skillMdPath: string, options?: {
  includeInternal?: boolean;
  onWarning?: (message: string) => void;
}): Promise<Skill | null>;
interface DiscoverSkillsOptions {
  /** Override diagnostic output; messages can include source snippets. */
  onWarning?: (message: string) => void;
  /** Include internal skills (e.g., when user explicitly requests a skill by name) */
  includeInternal?: boolean;
  /** Search all subdirectories even when a root SKILL.md exists */
  fullDepth?: boolean;
  /** Preserve duplicate skill names so callers can detect ambiguous locations */
  includeDuplicateNames?: boolean;
}
/**
 * Validates that a resolved subpath stays within the base directory.
 * Prevents path traversal attacks where subpath contains ".." segments
 * that would escape the cloned repository directory.
 */
declare function isSubpathSafe(basePath: string, subpath: string): boolean;
declare function discoverSkills(basePath: string, subpath?: string, options?: DiscoverSkillsOptions): Promise<Skill[]>;
declare function getSkillDisplayName(skill: Skill): string;
/**
 * Filter skills based on user input (case-insensitive direct matching).
 * Multi-word skill names must be quoted on the command line.
 */
declare function filterSkills(skills: Skill[], inputNames: string[]): Skill[];
/**
 * Represents a parsed skill from a remote host.
 * Different hosts may have different ways of identifying skills.
 */
interface RemoteSkill {
  /** Display name of the skill (from frontmatter) */
  name: string;
  /** Description of the skill (from frontmatter) */
  description: string;
  /** Full markdown content including frontmatter */
  content: string;
  /** The identifier used for installation directory name */
  installName: string;
  /** The original source URL */
  sourceUrl: string;
  /** Any additional metadata from frontmatter */
  metadata?: Record<string, unknown>;
}
/**
 * Result of attempting to match a URL to a provider.
 */
interface ProviderMatch {
  /** Whether the URL matches this provider */
  matches: boolean;
  /** The source identifier for telemetry/storage (e.g., "mintlify/bun.com", "huggingface/hf-skills/hf-jobs") */
  sourceIdentifier?: string;
}
/**
 * Interface for remote SKILL.md host providers.
 * Each provider knows how to:
 * - Detect if a URL belongs to it
 * - Fetch and parse SKILL.md files
 * - Convert URLs to raw content URLs
 * - Provide source identifiers for telemetry
 */
interface HostProvider {
  /** Unique identifier for this provider (e.g., "mintlify", "huggingface", "github") */
  readonly id: string;
  /** Display name for this provider */
  readonly displayName: string;
  /**
   * Check if a URL matches this provider.
   * @param url - The URL to check
   * @returns Match result with optional source identifier
   */
  match(url: string): ProviderMatch;
  /**
   * Fetch and parse a SKILL.md file from the given URL.
   * @param url - The URL to the SKILL.md file
   * @returns The parsed skill or null if invalid/not found
   */
  fetchSkill(url: string): Promise<RemoteSkill | null>;
  /**
   * Convert a user-facing URL to a raw content URL.
   * For example, GitHub blob URLs to raw.githubusercontent.com URLs.
   * @param url - The URL to convert
   * @returns The raw content URL
   */
  toRawUrl(url: string): string;
  /**
   * Get the source identifier for telemetry/storage.
   * This should be a stable identifier that can be used to group
   * skills from the same source.
   * @param url - The original URL
   * @returns Source identifier (e.g., "mintlify/bun.com", "huggingface/hf-skills/hf-jobs")
   */
  getSourceIdentifier(url: string): string;
}
/**
 * Registry for managing host providers.
 */
interface ProviderRegistry {
  /**
   * Register a new provider.
   */
  register(provider: HostProvider): void;
  /**
   * Find a provider that matches the given URL.
   * @param url - The URL to match
   * @returns The matching provider or null
   */
  findProvider(url: string): HostProvider | null;
  /**
   * Get all registered providers.
   */
  getProviders(): HostProvider[];
}
declare const DISCOVERY_SCHEMA_V2 = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
/**
 * Legacy index.json structure for well-known skills.
 * This is the pre-0.2.0 format used by existing publishers.
 */
interface WellKnownIndexV1 {
  skills: WellKnownSkillEntryV1[];
}
/**
 * Represents a legacy skill entry in index.json.
 */
interface WellKnownSkillEntryV1 {
  /** Skill identifier. Must match the directory name. */
  name: string;
  /** Brief description of what the skill does. */
  description: string;
  /** Array of all files in the skill directory. */
  files: string[];
}
/**
 * Current v0.2.0 well-known discovery index.
 */
interface WellKnownIndexV2 {
  $schema: typeof DISCOVERY_SCHEMA_V2;
  skills: WellKnownSkillEntryV2[];
}
/**
 * Represents a v0.2.0 skill artifact entry in index.json.
 */
interface WellKnownSkillEntryV2 {
  name: string;
  type: 'skill-md' | 'archive';
  description: string;
  url: string;
  digest: string;
}
/**
 * Thrown when a path-scoped URL (for example https://host/s/my-list) has no
 * usable skills under that path while the host does publish a root index.
 * Falling back to the root index in that situation used to install the
 * host's entire catalog, so the caller must surface the unresolved scope
 * instead of installing anything.
 */
declare class WellKnownScopeNotFoundError extends Error {
  readonly scopePath: string;
  readonly rootUrl: string;
  constructor(scopePath: string, rootUrl: string);
}
type WellKnownIndex = WellKnownIndexV1 | WellKnownIndexV2;
type WellKnownSkillEntry = WellKnownSkillEntryV1 | WellKnownSkillEntryV2;
type WellKnownFileContent = string | Uint8Array;
type NormalizedWellKnownEntry = {
  version: '0.1.0';
  name: string;
  description: string;
  files: string[];
  baseUrl: string;
  wellKnownPath: string;
  indexEntry: WellKnownSkillEntryV1;
} | {
  version: '0.2.0';
  name: string;
  description: string;
  type: 'skill-md' | 'archive';
  artifactUrl: string;
  digest: string;
  indexEntry: WellKnownSkillEntryV2;
};
/**
 * Represents a skill with all installable files fetched from a well-known endpoint.
 */
interface WellKnownSkill extends RemoteSkill {
  /** All files in the skill, keyed by relative path */
  files: Map<string, WellKnownFileContent>;
  /** The entry from index.json */
  indexEntry: WellKnownSkillEntry;
}
interface FetchAllSkillsOptions {
  /** Include skills marked with metadata.internal: true. */
  includeInternal?: boolean;
}
/**
 * Well-known skills provider using RFC 8615 well-known URIs.
 *
 * Supports both:
 * - v0.2.0: $schema + type/url/digest single-artifact model
 * - legacy/v0.1.0: name/description/files directory model
 *
 * Organizations can publish skills at:
 * https://example.com/.well-known/agent-skills/  (preferred)
 * https://example.com/.well-known/skills/         (legacy fallback)
 *
 * The provider first checks /.well-known/agent-skills/index.json,
 * then falls back to /.well-known/skills/index.json. For compatibility with
 * existing publishers, it also preserves the historical path-relative probing
 * behavior for URLs such as https://example.com/docs.
 */
declare class WellKnownProvider implements HostProvider {
  readonly id = "well-known";
  readonly displayName = "Well-Known Skills";
  private readonly WELL_KNOWN_PATHS;
  private readonly INDEX_FILE;
  /**
   * Check if a URL could be a well-known skills endpoint.
   * This is a fallback provider - it matches any HTTP(S) URL that is not
   * a recognized pattern (GitHub, GitLab, owner/repo shorthand, etc.)
   */
  match(url: string): ProviderMatch;
  /**
   * Fetch the skills index from a well-known endpoint.
   * Tries /.well-known/agent-skills/index.json first, then falls back to
   * /.well-known/skills/index.json. For each path, tries path-relative
   * first, then root .well-known.
   */
  fetchIndex(baseUrl: string, options?: {
    updateCheck?: boolean;
  }): Promise<{
    index: WellKnownIndex;
    entries: NormalizedWellKnownEntry[];
    resolvedBaseUrl: string;
    resolvedWellKnownPath: string;
    indexUrl: string;
  } | null>;
  private fetchIndexCandidates;
  private normalizeIndex;
  private getLegacySkillBaseUrl;
  private isValidSkillName;
  private isSafeLegacyFilePath;
  /** Validate a legacy skill entry from the index. */
  private isValidSkillEntryV1;
  /** Validate a v0.2.0 skill entry from the index. */
  private isValidSkillEntryV2;
  /** Fetch a single skill from a well-known endpoint. */
  fetchSkill(url: string): Promise<RemoteSkill | null>;
  /**
   * Fetch a skill by its normalized index entry. Kept public for tests and
   * internal add flow; callers with legacy arguments are also supported.
   */
  fetchSkillByEntry(baseUrlOrEntry: string | NormalizedWellKnownEntry, legacyEntry?: WellKnownSkillEntryV1, legacyWellKnownPath?: string): Promise<WellKnownSkill | null>;
  private fetchLegacySkillByEntry;
  private fetchArtifactSkillByEntry;
  private createSkill;
  /**
   * Get the path scope of a URL, if any. A URL such as https://host/s/my-list
   * is scoped to '/s/my-list'; a bare origin has no scope.
   */
  private getScope;
  /**
   * Fetch all skills from a well-known endpoint.
   *
   * When the URL is scoped to a path, only path-relative indexes are used.
   * If the scope yields no skills but the host publishes a root index, this
   * throws {@link WellKnownScopeNotFoundError} instead of silently widening
   * to the root index and returning the host's entire catalog.
   */
  fetchAllSkills(url: string, options?: FetchAllSkillsOptions): Promise<WellKnownSkill[]>;
  private computeDigest;
  private extractArchive;
  private isZipArchive;
  private isTarGzArchive;
  private normalizeArchivePath;
  private addArchiveFile;
  private extractTarGz;
  private readTarString;
  /**
   * Convert a user-facing URL to a skill URL.
   * For well-known, this extracts the base domain and constructs the proper path.
   * Uses agent-skills as the primary path for new URLs.
   */
  toRawUrl(url: string): string;
  /**
   * Get the source identifier for telemetry/storage.
   * Returns the full hostname with www. stripped.
   */
  getSourceIdentifier(url: string): string;
  /** Check if a URL has a well-known skills index. */
  hasSkillsIndex(url: string): Promise<boolean>;
}
declare function computeWellKnownSkillDigest(skill: WellKnownSkill): string;
declare const wellKnownProvider: WellKnownProvider;
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
/**
 * Sanitizes a filename/directory name to prevent path traversal attacks
 * and ensures it follows kebab-case convention
 * @param name - The name to sanitize
 * @returns Sanitized name safe for use in file paths
 */
declare function sanitizeName(name: string): string;
declare function getCanonicalSkillsDir(global: boolean, cwd?: string): string;
/**
 * Resolve the skills directory for a specific Eve subagent, relative to the
 * project root: `agent/subagents/<name>/skills`. The subagent name is
 * sanitized to prevent directory traversal when it originates from user input.
 */
declare function getEveSubagentSkillsDir(subagent: string, cwd?: string): string;
/**
 * Gets the base directory for an agent's skills, respecting universal agents.
 * Universal agents always use the canonical directory, which prevents
 * redundant symlinks and double-listing of skills.
 *
 * For Eve, an optional `eveSubagent` targets a subagent's skills directory
 * (`agent/subagents/<name>/skills`) instead of the root agent's `agent/skills`.
 */
declare function getAgentBaseDir(agentType: AgentType, global: boolean, cwd?: string, eveSubagent?: string): string;
declare function installSkillForAgent(skill: Skill, agentType: AgentType, options?: InstallOptions): Promise<InstallResult>;
declare function isSkillInstalled(skillName: string, agentType: AgentType, options?: {
  global?: boolean;
  cwd?: string;
  eveSubagent?: string;
}): Promise<boolean>;
declare function getInstallPath(skillName: string, agentType: AgentType, options?: {
  global?: boolean;
  cwd?: string;
  eveSubagent?: string;
}): string;
/**
 * Gets the canonical .agents/skills/<skill> path
 */
declare function getCanonicalPath(skillName: string, options?: {
  global?: boolean;
  cwd?: string;
  agent?: AgentType;
  eveSubagent?: string;
}): string;
/**
 * Install a remote skill from any host provider.
 * The skill directory name is derived from the installName field.
 * Supports symlink mode (writes to canonical location and symlinks to agent dirs)
 * or copy mode (writes directly to each agent dir).
 */
declare function installRemoteSkillForAgent(skill: RemoteSkill$1, agentType: AgentType, options?: {
  global?: boolean;
  cwd?: string;
  mode?: InstallMode;
  eveSubagent?: string;
}): Promise<InstallResult>;
/**
 * Install a well-known skill with multiple files.
 * The skill directory name is derived from the installName field.
 * All files from the skill's files map are written to the installation directory.
 * Supports symlink mode (writes to canonical location and symlinks to agent dirs)
 * or copy mode (writes directly to each agent dir).
 */
declare function installWellKnownSkillForAgent(skill: WellKnownSkill, agentType: AgentType, options?: {
  global?: boolean;
  cwd?: string;
  mode?: InstallMode;
  eveSubagent?: string;
}): Promise<InstallResult>;
/**
 * Install a blob-downloaded skill (fetched from skills.sh download API).
 * Similar to installWellKnownSkillForAgent but takes the snapshot file format
 * (array of { path, contents }) instead of a Map.
 */
declare function installBlobSkillForAgent(skill: {
  installName: string;
  files: Array<{
    path: string;
    contents: string;
  }>;
}, agentType: AgentType, options?: InstallOptions): Promise<InstallResult>;
interface InstalledSkill {
  name: string;
  description: string;
  path: string;
  canonicalPath: string;
  scope: 'project' | 'global';
  agents: AgentType[];
}
/**
 * Lists all installed skills from canonical locations
 * @param options - Options for listing skills
 * @returns Array of installed skills with metadata
 */
declare function listInstalledSkills(options?: {
  global?: boolean;
  cwd?: string;
  agentFilter?: AgentType[];
}): Promise<InstalledSkill[]>;
declare function getOpenClawGlobalSkillsDir(homeDir?: string, pathExists?: (path: string) => boolean): string;
declare function isZCodeInstalled(homeDir?: string, pathExists?: (path: string) => boolean): boolean;
declare function isKimchiInstalled(homeDir?: string, pathExists?: (path: string) => boolean): boolean;
declare function isMiniMaxCodeInstalled(homeDir?: string, pathExists?: (path: string) => boolean): boolean;
declare function isPositAssistantInstalled(homeDir?: string, pathExists?: (path: string) => boolean): boolean;
declare const agents: Record<AgentType, AgentConfig>;
declare function detectInstalledAgents(): Promise<AgentType[]>;
declare function getAgentConfig(type: AgentType): AgentConfig;
/**
 * Directory (relative to an Eve project root) that holds subagents.
 * Each subagent owns its own skills at `agent/subagents/<name>/skills`,
 * mirroring the root agent's `agent/skills`.
 */
declare const EVE_SUBAGENTS_DIR: string;
/**
 * Discover the names of Eve subagents in a project.
 *
 * Eve supports subagents that each have their own skills directory at
 * `agent/subagents/<name>/skills`. This returns the `<name>` of every
 * subagent directory found under `agent/subagents/`, sorted alphabetically.
 * Returns an empty list when the directory doesn't exist or can't be read.
 */
declare function getEveSubagents(cwd?: string): string[];
/**
 * Returns agents that use the universal .agents/skills directory.
 * These agents share a common skill location and don't need symlinks.
 * Agents with showInUniversalList: false are excluded.
 */
declare function getUniversalAgents(): AgentType[];
/**
 * Returns the subset of universal agents shown in the interactive locked section.
 * All universal agents are still installed; this only keeps the prompt readable.
 */
declare function getVisibleUniversalAgents(): AgentType[];
/**
 * Returns agents that use agent-specific skill directories (not universal).
 * These agents need symlinks from the canonical .agents/skills location.
 */
declare function getNonUniversalAgents(): AgentType[];
/**
 * Check if an agent uses the universal .agents/skills directory.
 */
declare function isUniversalAgent(type: AgentType): boolean;
/**
 * Extract skill search directories from plugin manifests.
 * Handles both marketplace.json (multi-plugin) and plugin.json (single plugin).
 * Only resolves local paths - remote sources are skipped.
 *
 * Returns directories that CONTAIN skills (to be searched for child SKILL.md files).
 * For explicit skill paths in manifests, adds the parent directory so the
 * existing discovery loop finds them.
 */
declare function getPluginSkillPaths(basePath: string): Promise<string[]>;
/**
 * Get a map of skill directory paths to plugin names from plugin manifests.
 * This allows grouping skills by their parent plugin.
 *
 * Returns Map<AbsolutePath, PluginName>
 */
declare function getPluginGroupings(basePath: string): Promise<Map<string, string>>;
declare class ProviderRegistryImpl implements ProviderRegistry {
  private providers;
  register(provider: HostProvider): void;
  findProvider(url: string): HostProvider | null;
  getProviders(): HostProvider[];
}
declare const registry: ProviderRegistryImpl;
/**
 * Register a provider with the global registry.
 */
declare function registerProvider(provider: HostProvider): void;
/**
 * Find a provider that matches the given URL.
 */
declare function findProvider(url: string): HostProvider | null;
/**
 * Get all registered providers.
 */
declare function getProviders(): HostProvider[];
export { AgentConfig, AgentType, DiscoverSkillsOptions, EVE_SUBAGENTS_DIR, FetchAllSkillsOptions, GitCloneError, type HostProvider, InstallMode, InstallOptions, InstallResult, InstalledSkill, NormalizedWellKnownEntry, ParsedSource, type ProviderMatch, type ProviderRegistry, type RemoteSkill as ProviderRemoteSkill, RemoteSkill$1 as RemoteSkill, Skill, WellKnownFileContent, WellKnownIndex, WellKnownIndexV1, WellKnownIndexV2, WellKnownProvider, WellKnownScopeNotFoundError, WellKnownSkill, WellKnownSkillEntry, WellKnownSkillEntryV1, WellKnownSkillEntryV2, agents, cleanupTempDir, cloneRepo, computeWellKnownSkillDigest, detectInstalledAgents, discoverSkills, filterSkills, findProvider, getAgentBaseDir, getAgentConfig, getCanonicalPath, getCanonicalSkillsDir, getEveSubagentSkillsDir, getEveSubagents, getGitTreeHash, getInstallPath, getNonUniversalAgents, getOpenClawGlobalSkillsDir, getOwnerRepo, getPluginGroupings, getPluginSkillPaths, getProviders, getSkillDisplayName, getUniversalAgents, getVisibleUniversalAgents, hasSkillMd, installBlobSkillForAgent, installRemoteSkillForAgent, installSkillForAgent, installWellKnownSkillForAgent, isCommitSha, isGitHubHttpsCloneUrl, isGitHubSsoAuthError, isKimchiInstalled, isMiniMaxCodeInstalled, isMissingRefError, isPositAssistantInstalled, isRepoPrivate, isSkillInstalled, isSubpathSafe, isUniversalAgent, isZCodeInstalled, listInstalledSkills, parseFrontmatter, parseGitHubRepoUrl, parseOwnerRepo, parseSkillMd, parseSource, registerProvider, registry, sanitizeName, sanitizeSubpath, shouldInstallInternalSkills, wellKnownProvider };