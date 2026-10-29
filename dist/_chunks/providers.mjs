import { esm_default } from "./libs/simple-git.mjs";
import { xdgConfig } from "./libs/xdg-basedir.mjs";
import { existsSync, readFileSync, readdirSync } from "fs";
import { basename, dirname, extname, isAbsolute, join, normalize, posix, relative, resolve, sep } from "path";
import { homedir, platform, tmpdir } from "os";
import { promisify } from "util";
import { execFile } from "child_process";
import { access, chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, stat, symlink, writeFile } from "fs/promises";
import { parse, parseDocument, stringify } from "yaml";
import { createHash } from "crypto";
import { createHash as createHash$1 } from "node:crypto";
import { crc32, gunzipSync, inflateRawSync } from "node:zlib";
const DEFAULT_GITHUB_HOST = "github.com";
function getGitHubHost() {
	const configuredHost = process.env.GH_HOST?.trim();
	if (!configuredHost) return DEFAULT_GITHUB_HOST;
	try {
		const parsed = new URL(`https://${configuredHost}`);
		if (parsed.username || parsed.password || parsed.port || parsed.pathname !== "/" || parsed.search || parsed.hash) return DEFAULT_GITHUB_HOST;
		return parsed.hostname;
	} catch {
		return DEFAULT_GITHUB_HOST;
	}
}
function isGitHubHost(host) {
	const normalizedHost = host.toLowerCase();
	return normalizedHost === DEFAULT_GITHUB_HOST || normalizedHost === getGitHubHost().toLowerCase();
}
function getOwnerRepo(parsed) {
	if (parsed.type === "local" || parsed.type === "download") return null;
	const sshMatch = parsed.url.match(/^git@[^:]+:(.+)$/);
	if (sshMatch) {
		let path = sshMatch[1];
		path = path.replace(/\.git$/, "");
		if (path.includes("/")) return path;
		return null;
	}
	if (parsed.url.startsWith("ssh://")) try {
		let path = new URL(parsed.url).pathname.slice(1);
		path = path.replace(/\.git$/, "");
		if (path.includes("/")) return path;
		return null;
	} catch {
		return null;
	}
	if (!parsed.url.startsWith("http://") && !parsed.url.startsWith("https://")) return null;
	try {
		let path = new URL(parsed.url).pathname.slice(1);
		path = path.replace(/\.git$/, "");
		if (path.includes("/")) return path;
	} catch {}
	return null;
}
function parseOwnerRepo(ownerRepo) {
	const match = ownerRepo.match(/^([^/]+)\/([^/]+)$/);
	if (match) return {
		owner: match[1],
		repo: match[2]
	};
	return null;
}
async function isRepoPrivate(owner, repo) {
	try {
		const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
		if (!res.ok) return null;
		return (await res.json()).private === true;
	} catch {
		return null;
	}
}
function sanitizeSubpath(subpath) {
	const segments = subpath.replace(/\\/g, "/").split("/");
	for (const segment of segments) if (segment === "..") throw new Error(`Unsafe subpath: "${subpath}" contains path traversal segments. Subpaths must not contain ".." components.`);
	return subpath;
}
function azureReposVersionToRef(version) {
	if (!version) return;
	return /^(?:GB|GT)(.+)$/i.exec(version)?.[1] || void 0;
}
function parseAzureReposSource(input, fragmentRef, fragmentSkillFilter) {
	if (!input.startsWith("http://") && !input.startsWith("https://")) return null;
	let parsed;
	try {
		parsed = new URL(input);
	} catch {
		return null;
	}
	const segments = parsed.pathname.split("/").filter(Boolean);
	const gitIndex = segments.indexOf("_git");
	if (gitIndex < 0 || gitIndex === segments.length - 1) return null;
	const repo = segments[gitIndex + 1].replace(/\.git$/, "");
	if (!repo) return null;
	const clonePath = "/" + [
		...segments.slice(0, gitIndex),
		"_git",
		repo
	].map((segment) => {
		try {
			return encodeURIComponent(decodeURIComponent(segment));
		} catch {
			return encodeURIComponent(segment);
		}
	}).join("/");
	const cloneUrl = `${parsed.protocol}//${parsed.host}${clonePath}`;
	const ref = azureReposVersionToRef(parsed.searchParams.get("version")) || fragmentRef;
	const pathParam = parsed.searchParams.get("path");
	const subpath = pathParam ? sanitizeSubpath(pathParam.replace(/^\/+/, "")) : void 0;
	return {
		type: "git",
		url: cloneUrl,
		...ref ? { ref } : {},
		...subpath ? { subpath } : {},
		...fragmentSkillFilter ? { skillFilter: fragmentSkillFilter } : {}
	};
}
function isLocalPath(input) {
	return isAbsolute(input) || input.startsWith("./") || input.startsWith("../") || input === "." || input === ".." || /^[a-zA-Z]:[/\\]/.test(input);
}
const SOURCE_ALIASES = {
	"coinbase/agentWallet": "coinbase/agentic-wallet-skills",
	"vercel-labs/vercel-skills": "vercel-labs/agent-skills"
};
function decodeFragmentValue(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
function looksLikeGitSource(input) {
	if (input.startsWith("github:") || input.startsWith("gitlab:") || input.startsWith("git@")) return true;
	if (/^ssh:\/\/.+\.git(?:$|[/?])/i.test(input)) return true;
	if (input.startsWith("http://") || input.startsWith("https://")) try {
		const parsed = new URL(input);
		const pathname = parsed.pathname;
		if (isGitHubHost(parsed.host)) return /^\/[^/]+\/[^/]+(?:\.git)?(?:\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(pathname);
		if (parsed.hostname === "gitlab.com") return /^\/.+?\/[^/]+(?:\.git)?(?:\/-\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(pathname);
		const azureSegments = pathname.split("/").filter(Boolean);
		const azureGitIndex = azureSegments.indexOf("_git");
		if (azureGitIndex >= 0 && azureGitIndex < azureSegments.length - 1) return true;
	} catch {}
	if (/^https?:\/\/.+\.git(?:$|[/?])/i.test(input)) return true;
	return !input.includes(":") && !input.startsWith(".") && !input.startsWith("/") && /^([^/]+)\/([^/]+)(?:\/(.+)|@(.+))?$/.test(input);
}
function parseFragmentRef(input) {
	const hashIndex = input.indexOf("#");
	if (hashIndex < 0) return { inputWithoutFragment: input };
	const inputWithoutFragment = input.slice(0, hashIndex);
	const fragment = input.slice(hashIndex + 1);
	if (!fragment || !looksLikeGitSource(inputWithoutFragment)) return { inputWithoutFragment: input };
	const atIndex = fragment.indexOf("@");
	if (atIndex === -1) return {
		inputWithoutFragment,
		ref: decodeFragmentValue(fragment)
	};
	const ref = fragment.slice(0, atIndex);
	const skillFilter = fragment.slice(atIndex + 1);
	return {
		inputWithoutFragment,
		ref: ref ? decodeFragmentValue(ref) : void 0,
		skillFilter: skillFilter ? decodeFragmentValue(skillFilter) : void 0
	};
}
function appendFragmentRef(input, ref, skillFilter) {
	if (!ref) return input;
	return `${input}#${ref}${skillFilter ? `@${skillFilter}` : ""}`;
}
function isHostedArtifactUrl(input) {
	try {
		const parsed = new URL(input);
		const host = parsed.hostname.toLowerCase();
		if (host === "raw.githubusercontent.com" || host === "codeload.github.com" || host === "objects.githubusercontent.com") return true;
		if (host === "github.com") return /^\/[^/]+\/[^/]+\/(?:archive\/|raw\/|releases\/(?:download\/|latest\/download\/))/.test(parsed.pathname);
		if (host === "gitlab.com") return /\/-\/(?:archive|raw)\//.test(parsed.pathname);
		return false;
	} catch {
		return false;
	}
}
function parseSource(input, options = {}) {
	if (isLocalPath(input)) {
		const resolvedPath = resolve(input);
		return {
			type: "local",
			url: resolvedPath,
			localPath: resolvedPath
		};
	}
	const { inputWithoutFragment, ref: fragmentRef, skillFilter: fragmentSkillFilter } = parseFragmentRef(input);
	input = inputWithoutFragment;
	const alias = SOURCE_ALIASES[input];
	if (alias) input = alias;
	const githubPrefixMatch = input.match(/^github:(.+)$/);
	if (githubPrefixMatch) return parseSource(appendFragmentRef(githubPrefixMatch[1], fragmentRef, fragmentSkillFilter));
	const gitlabPrefixMatch = input.match(/^gitlab:(.+)$/);
	if (gitlabPrefixMatch) return parseSource(appendFragmentRef(`https://gitlab.com/${gitlabPrefixMatch[1]}`, fragmentRef, fragmentSkillFilter));
	if (isHostedArtifactUrl(input)) return {
		type: "download",
		url: input
	};
	if (getGitHubHost() !== "github.com" && /^https?:\/\//.test(input)) try {
		const parsedUrl = new URL(input);
		if (isGitHubHost(parsedUrl.host) && parsedUrl.host !== "github.com") {
			const [owner, rawRepo, marker, ref, ...subpathSegments] = parsedUrl.pathname.split("/").filter(Boolean);
			if (owner && rawRepo) {
				const repo = rawRepo.replace(/\.git$/, "");
				const isTreeUrl = marker === "tree" && ref;
				return {
					type: "git",
					url: `${parsedUrl.protocol}//${parsedUrl.host}/${owner}/${repo}.git`,
					...isTreeUrl ? { ref } : fragmentRef ? { ref: fragmentRef } : {},
					...isTreeUrl && subpathSegments.length > 0 ? { subpath: sanitizeSubpath(subpathSegments.join("/")) } : {}
				};
			}
		}
	} catch {}
	const githubTreeWithPathMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/);
	if (githubTreeWithPathMatch) {
		const [, owner, repo, ref, subpath] = githubTreeWithPathMatch;
		return {
			type: "github",
			url: `https://github.com/${owner}/${repo}.git`,
			ref: ref || fragmentRef,
			subpath: subpath ? sanitizeSubpath(subpath) : subpath
		};
	}
	const githubTreeMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/);
	if (githubTreeMatch) {
		const [, owner, repo, ref] = githubTreeMatch;
		return {
			type: "github",
			url: `https://github.com/${owner}/${repo}.git`,
			ref: ref || fragmentRef
		};
	}
	const githubRepoMatch = input.match(/github\.com\/([^/]+)\/([^/]+)/);
	if (githubRepoMatch) {
		const [, owner, repo] = githubRepoMatch;
		return {
			type: "github",
			url: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}.git`,
			...fragmentRef ? { ref: fragmentRef } : {}
		};
	}
	const gitlabTreeWithPathMatch = input.match(/^(https?):\/\/([^/]+)\/(.+?)\/-\/tree\/([^/]+)\/(.+)/);
	if (gitlabTreeWithPathMatch) {
		const [, protocol, hostname, repoPath, ref, subpath] = gitlabTreeWithPathMatch;
		if (hostname !== "github.com" && repoPath) return {
			type: "gitlab",
			url: `${protocol}://${hostname}/${repoPath.replace(/\.git$/, "")}.git`,
			ref: ref || fragmentRef,
			subpath: subpath ? sanitizeSubpath(subpath) : subpath
		};
	}
	const gitlabTreeMatch = input.match(/^(https?):\/\/([^/]+)\/(.+?)\/-\/tree\/([^/]+)$/);
	if (gitlabTreeMatch) {
		const [, protocol, hostname, repoPath, ref] = gitlabTreeMatch;
		if (hostname !== "github.com" && repoPath) return {
			type: "gitlab",
			url: `${protocol}://${hostname}/${repoPath.replace(/\.git$/, "")}.git`,
			ref: ref || fragmentRef
		};
	}
	const gitlabRepoMatch = input.match(/gitlab\.com\/(.+?)(?:\.git)?\/?$/);
	if (gitlabRepoMatch) {
		const repoPath = gitlabRepoMatch[1];
		if (repoPath.includes("/")) return {
			type: "gitlab",
			url: `https://gitlab.com/${repoPath}.git`,
			...fragmentRef ? { ref: fragmentRef } : {}
		};
	}
	const azureRepos = parseAzureReposSource(input, fragmentRef, fragmentSkillFilter);
	if (azureRepos) return azureRepos;
	const githubHost = options.githubHost ?? getGitHubHost();
	const shorthandSourceType = githubHost === "github.com" ? "github" : "git";
	const atSkillMatch = input.match(/^([^/]+)\/([^/@]+)@(.+)$/);
	if (atSkillMatch && !input.includes(":") && !input.startsWith(".") && !input.startsWith("/")) {
		const [, owner, repo, skillFilter] = atSkillMatch;
		return {
			type: shorthandSourceType,
			url: `https://${githubHost}/${owner}/${repo}.git`,
			...fragmentRef ? { ref: fragmentRef } : {},
			skillFilter: fragmentSkillFilter || skillFilter
		};
	}
	const shorthandMatch = input.match(/^([^/]+)\/([^/]+)(?:\/(.+?))?\/?$/);
	if (shorthandMatch && !input.includes(":") && !input.startsWith(".") && !input.startsWith("/")) {
		const [, owner, repo, subpath] = shorthandMatch;
		return {
			type: shorthandSourceType,
			url: `https://${githubHost}/${owner}/${repo}.git`,
			...fragmentRef ? { ref: fragmentRef } : {},
			subpath: subpath ? sanitizeSubpath(subpath) : subpath,
			...fragmentSkillFilter ? { skillFilter: fragmentSkillFilter } : {}
		};
	}
	if (isWellKnownUrl(input)) return {
		type: "well-known",
		url: input
	};
	return {
		type: "git",
		url: input,
		...fragmentRef ? { ref: fragmentRef } : {}
	};
}
function isWellKnownUrl(input) {
	if (!input.startsWith("http://") && !input.startsWith("https://")) return false;
	try {
		const parsed = new URL(input);
		if ([
			"github.com",
			"gitlab.com",
			"raw.githubusercontent.com"
		].includes(parsed.hostname)) return false;
		if (input.endsWith(".git")) return false;
		return true;
	} catch {
		return false;
	}
}
const CSI_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;
const OSC_RE = /\x1b\][\s\S]*?(?:\x07|\x1b\\)/g;
const DCS_PM_APC_RE = /\x1b[P^_][\s\S]*?(?:\x1b\\)/g;
const SIMPLE_ESC_RE = /\x1b[\x20-\x7e]/g;
const C1_RE = /[\x80-\x9f]/g;
const CONTROL_RE = /[\x00-\x06\x07\x08\x0b\x0c\x0d-\x1a\x1c-\x1f\x7f]/g;
function stripTerminalEscapes(str) {
	return str.replace(OSC_RE, "").replace(DCS_PM_APC_RE, "").replace(CSI_RE, "").replace(SIMPLE_ESC_RE, "").replace(C1_RE, "").replace(CONTROL_RE, "");
}
function sanitizeMetadata(str) {
	return stripTerminalEscapes(str).replace(/[\r\n]+/g, " ").trim();
}
const DEFAULT_CLONE_TIMEOUT_MS = 3e5;
const ALLOWED_GIT_PROTOCOLS = "https:http:ssh:git:file";
const CLONE_TIMEOUT_MS = (() => {
	const raw = process.env.SKILLS_CLONE_TIMEOUT_MS;
	if (!raw) return DEFAULT_CLONE_TIMEOUT_MS;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLONE_TIMEOUT_MS;
})();
const execFileAsync = promisify(execFile);
function isCommitSha(ref) {
	return /^[0-9a-f]{40}$/i.test(ref);
}
function isMissingRefError(message) {
	return /Remote branch .* not found in upstream origin/i.test(message) || /couldn't find remote ref/i.test(message) || /upload-pack: not our ref/i.test(message);
}
async function cloneAtSha(url, sha, tempDir, extraEnv) {
	const git = createGitClient(extraEnv);
	await git.cwd(tempDir);
	await git.init();
	await git.addRemote("origin", url);
	await git.fetch([
		"--depth",
		"1",
		"origin",
		sha
	]);
	await git.checkout("FETCH_HEAD");
}
var GitCloneError = class extends Error {
	url;
	isTimeout;
	isAuthError;
	constructor(message, url, isTimeout = false, isAuthError = false) {
		super(message);
		this.name = "GitCloneError";
		this.url = url;
		this.isTimeout = isTimeout;
		this.isAuthError = isAuthError;
	}
};
function parseGitHubRepoUrl(url) {
	const sshMatch = url.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/i);
	if (sshMatch && isGitHubHost(sshMatch[1])) {
		const host = sshMatch[1];
		const owner = sshMatch[2];
		const repo = sshMatch[3];
		return {
			owner,
			repo,
			slug: `${owner}/${repo}`,
			sshUrl: `git@${host}:${owner}/${repo}.git`
		};
	}
	try {
		const parsed = new URL(url);
		if (!isGitHubHost(parsed.host)) return null;
		const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
		if (!match) return null;
		const owner = match[1];
		const repo = match[2];
		return {
			owner,
			repo,
			slug: `${owner}/${repo}`,
			sshUrl: `git@${parsed.host}:${owner}/${repo}.git`
		};
	} catch {
		return null;
	}
}
function isGitHubHttpsCloneUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" && isGitHubHost(parsed.host);
	} catch {
		return false;
	}
}
function isGitHubSsoAuthError(message) {
	const lower = message.toLowerCase();
	return lower.includes("saml sso") || lower.includes("enforced sso") || lower.includes("enabled or enforced saml") || lower.includes("re-authorize the oauth application");
}
function isAuthFailure(message) {
	return message.includes("Authentication failed") || message.includes("could not read Username") || message.includes("Permission denied") || message.includes("Repository not found") || message.includes("requested URL returned error: 403") || isGitHubSsoAuthError(message);
}
function createGitClient(extraEnv) {
	const git = esm_default({
		timeout: { block: CLONE_TIMEOUT_MS },
		config: [
			"filter.lfs.required=false",
			"filter.lfs.smudge=",
			"filter.lfs.clean=",
			"filter.lfs.process="
		],
		unsafe: {
			allowUnsafeAlias: true,
			allowUnsafeAskPass: true,
			allowUnsafeConfigEnvCount: true,
			allowUnsafeConfigPaths: true,
			allowUnsafeCredentialHelper: true,
			allowUnsafeDiffExternal: true,
			allowUnsafeDiffTextConv: true,
			allowUnsafeEditor: true,
			allowUnsafeFilter: true,
			allowUnsafeFsMonitor: true,
			allowUnsafeGpgProgram: true,
			allowUnsafeGitProxy: true,
			allowUnsafeHooksPath: true,
			allowUnsafeMergeDriver: true,
			allowUnsafePack: true,
			allowUnsafePager: true,
			allowUnsafeProtocolOverride: true,
			allowUnsafeSshCommand: true,
			allowUnsafeTemplateDir: true
		}
	});
	git.env({
		...process.env,
		GIT_TERMINAL_PROMPT: "0",
		GIT_ALLOW_PROTOCOL: ALLOWED_GIT_PROTOCOLS,
		GIT_LFS_SKIP_SMUDGE: "1",
		...extraEnv
	});
	return git;
}
async function resetTempDir(dir) {
	await rm(dir, {
		recursive: true,
		force: true
	}).catch(() => {});
	await mkdir(dir, { recursive: true });
}
async function tryGhClone(repo, tempDir, ref) {
	let cloneTarget = repo.slug;
	const host = repo.sshUrl.match(/^git@([^:]+):/)?.[1] || "github.com";
	try {
		const { stdout, stderr } = await execFileAsync("gh", [
			"auth",
			"status",
			"-h",
			host
		], {
			timeout: 5e3,
			env: {
				...process.env,
				GIT_TERMINAL_PROMPT: "0"
			}
		});
		const statusOutput = `${stdout}${stderr}`;
		if (/Git operations protocol:\s+ssh/i.test(statusOutput)) cloneTarget = repo.sshUrl;
	} catch {
		return false;
	}
	await execFileAsync("gh", [
		"repo",
		"clone",
		cloneTarget,
		tempDir,
		"--",
		...ref ? [
			"--depth=1",
			"--branch",
			ref
		] : ["--depth=1"]
	], {
		timeout: CLONE_TIMEOUT_MS,
		env: {
			...process.env,
			GIT_TERMINAL_PROMPT: "0",
			GIT_ALLOW_PROTOCOL: ALLOWED_GIT_PROTOCOLS
		}
	});
	return true;
}
function buildGitHubAuthError(url, repo, message) {
	const host = repo?.sshUrl.match(/^git@([^:]+):/)?.[1] || "github.com";
	if (repo && isGitHubSsoAuthError(message)) return `GitHub blocked HTTPS access to ${url} because the organization enforces SAML SSO.\n  skills tried your existing git credentials and available fallbacks, but none succeeded.\n  - Re-authorize your GitHub credentials/app for that org's SSO policy\n  - Or rerun with SSH: npx skills add ${repo.sshUrl}\n  - Verify access with: gh auth status -h ${host} or ssh -T git@${host}`;
	if (repo) return `Authentication failed for ${url}.\n  - For private repos, ensure you have access\n  - Retry with SSH: npx skills add ${repo.sshUrl}\n  - Check access with: gh auth status -h ${host} or ssh -T git@${host}`;
	return `Authentication failed for ${url}.\n  - For private repos, ensure you have access\n  - For SSH: Check your keys with 'ssh -T git@github.com'\n  - For HTTPS: Run 'gh auth login' or configure git credentials`;
}
async function cloneRepo(url, ref) {
	if (/^ext::/i.test(url)) throw new GitCloneError("Unsupported Git transport: ext", url);
	const tempDir = await mkdtemp(join(tmpdir(), "skills-"));
	const cloneOptions = ref ? [
		"--depth",
		"1",
		"--branch",
		ref
	] : ["--depth", "1"];
	const refCanBeSha = !!ref && isCommitSha(ref);
	const repo = parseGitHubRepoUrl(url);
	try {
		await createGitClient().clone(url, tempDir, cloneOptions);
		return tempDir;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (refCanBeSha && isMissingRefError(errorMessage)) try {
			await resetTempDir(tempDir);
			await cloneAtSha(url, ref, tempDir);
			return tempDir;
		} catch {}
		const isTimeout = errorMessage.includes("block timeout") || errorMessage.includes("timed out");
		const isAuthError = isAuthFailure(errorMessage);
		if (isTimeout) {
			await rm(tempDir, {
				recursive: true,
				force: true
			}).catch(() => {});
			throw new GitCloneError(`Clone timed out after ${Math.round(CLONE_TIMEOUT_MS / 1e3)}s. Common causes:\n  - Large repository: raise the timeout with SKILLS_CLONE_TIMEOUT_MS=600000 (10m)\n  - Slow network: retry, or clone manually and pass the local path to 'skills add'\n  - Private repo without credentials: ensure auth is configured\n      - For SSH: ssh-add -l (to check loaded keys)\n      - For HTTPS: gh auth status (if using GitHub CLI)`, url, true, false);
		}
		if (isAuthError && repo && isGitHubHttpsCloneUrl(url)) {
			try {
				await resetTempDir(tempDir);
				if (await tryGhClone(repo, tempDir, ref)) return tempDir;
			} catch {}
			try {
				await resetTempDir(tempDir);
				const sshEnv = { GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes" };
				try {
					await createGitClient(sshEnv).clone(repo.sshUrl, tempDir, cloneOptions);
				} catch (sshError) {
					const sshMessage = sshError instanceof Error ? sshError.message : String(sshError);
					if (refCanBeSha && isMissingRefError(sshMessage)) {
						await resetTempDir(tempDir);
						await cloneAtSha(repo.sshUrl, ref, tempDir, sshEnv);
					} else throw sshError;
				}
				return tempDir;
			} catch {}
		}
		await rm(tempDir, {
			recursive: true,
			force: true
		}).catch(() => {});
		if (isAuthError) throw new GitCloneError(buildGitHubAuthError(url, repo, errorMessage), url, false, true);
		throw new GitCloneError(`Failed to clone ${url}: ${errorMessage}`, url, false, false);
	}
}
async function getGitTreeHash(repoDir, skillPath) {
	const segments = skillPath.replace(/\\/g, "/").split("/");
	segments.pop();
	const folderPath = segments.join("/");
	const revision = folderPath ? `HEAD:${folderPath}` : "HEAD^{tree}";
	try {
		const hash = (await new Promise((resolve, reject) => {
			execFile("git", [
				"-C",
				repoDir,
				"rev-parse",
				"--verify",
				"--end-of-options",
				revision
			], {
				encoding: "utf8",
				timeout: CLONE_TIMEOUT_MS,
				env: {
					...process.env,
					GIT_OPTIONAL_LOCKS: "0",
					GIT_TERMINAL_PROMPT: "0"
				}
			}, (error, output) => {
				if (error) reject(error);
				else resolve(output);
			});
		})).trim();
		return /^[0-9a-f]{40}$/i.test(hash) ? hash.toLowerCase() : null;
	} catch {
		return null;
	}
}
async function cleanupTempDir(dir) {
	const normalizedDir = normalize(resolve(dir));
	const normalizedTmpDir = normalize(resolve(tmpdir()));
	if (!normalizedDir.startsWith(normalizedTmpDir + sep) && normalizedDir !== normalizedTmpDir) throw new Error("Attempted to clean up directory outside of temp directory");
	await rm(dir, {
		recursive: true,
		force: true
	});
}
function parseFrontmatter(raw, options) {
	const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return {
		data: {},
		content: raw
	};
	let parsed;
	if (options?.onWarning) {
		const document = parseDocument(match[1]);
		for (const warning of document.warnings) options.onWarning(warning.message);
		if (document.errors.length > 0) throw document.errors[0];
		document.options.logLevel = "silent";
		parsed = document.toJS();
	} else parsed = parse(match[1]);
	return {
		data: parsed ?? {},
		content: match[2] ?? ""
	};
}
function isContainedIn(targetPath, basePath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
function isValidRelativePath(path) {
	return path.startsWith("./");
}
async function getPluginSkillPaths(basePath) {
	const searchDirs = [];
	const addPluginSkillPaths = (pluginBase, skills) => {
		if (!isContainedIn(pluginBase, basePath)) return;
		if (skills && skills.length > 0) for (const skillPath of skills) {
			if (!isValidRelativePath(skillPath)) continue;
			const skillDir = dirname(join(pluginBase, skillPath));
			if (isContainedIn(skillDir, basePath)) searchDirs.push(skillDir);
		}
		searchDirs.push(join(pluginBase, "skills"));
	};
	try {
		const content = await readFile(join(basePath, ".claude-plugin/marketplace.json"), "utf-8");
		const manifest = JSON.parse(content);
		const pluginRoot = manifest.metadata?.pluginRoot;
		if (pluginRoot === void 0 || isValidRelativePath(pluginRoot)) for (const plugin of manifest.plugins ?? []) {
			if (typeof plugin.source !== "string" && plugin.source !== void 0) continue;
			if (plugin.source !== void 0 && !isValidRelativePath(plugin.source)) continue;
			addPluginSkillPaths(join(basePath, pluginRoot ?? "", plugin.source ?? ""), plugin.skills);
		}
	} catch {}
	try {
		const content = await readFile(join(basePath, ".claude-plugin/plugin.json"), "utf-8");
		addPluginSkillPaths(basePath, JSON.parse(content).skills);
	} catch {}
	return searchDirs;
}
async function getPluginGroupings(basePath) {
	const groupings = /* @__PURE__ */ new Map();
	try {
		const content = await readFile(join(basePath, ".claude-plugin/marketplace.json"), "utf-8");
		const manifest = JSON.parse(content);
		const pluginRoot = manifest.metadata?.pluginRoot;
		if (pluginRoot === void 0 || isValidRelativePath(pluginRoot)) for (const plugin of manifest.plugins ?? []) {
			if (!plugin.name) continue;
			if (typeof plugin.source !== "string" && plugin.source !== void 0) continue;
			if (plugin.source !== void 0 && !isValidRelativePath(plugin.source)) continue;
			const pluginBase = join(basePath, pluginRoot ?? "", plugin.source ?? "");
			if (!isContainedIn(pluginBase, basePath)) continue;
			if (plugin.skills && plugin.skills.length > 0) for (const skillPath of plugin.skills) {
				if (!isValidRelativePath(skillPath)) continue;
				const skillDir = join(pluginBase, skillPath);
				if (isContainedIn(skillDir, basePath)) groupings.set(resolve(skillDir), plugin.name);
			}
		}
	} catch {}
	try {
		const content = await readFile(join(basePath, ".claude-plugin/plugin.json"), "utf-8");
		const manifest = JSON.parse(content);
		if (manifest.name && manifest.skills && manifest.skills.length > 0) for (const skillPath of manifest.skills) {
			if (!isValidRelativePath(skillPath)) continue;
			const skillDir = join(basePath, skillPath);
			if (isContainedIn(skillDir, basePath)) groupings.set(resolve(skillDir), manifest.name);
		}
	} catch {}
	return groupings;
}
const SKILLS_SH_CONFIG_FILE = "skills.sh.json";
function parseSkillsShPaths(content) {
	let config;
	try {
		config = JSON.parse(content);
	} catch {
		return [];
	}
	if (typeof config !== "object" || config === null || Array.isArray(config)) return [];
	const paths = config.paths;
	if (!Array.isArray(paths)) return [];
	const result = [];
	for (const entry of paths) {
		if (typeof entry !== "string" || !entry.startsWith("./")) continue;
		if (entry.includes("\\")) continue;
		const normalized = posix.normalize(entry).replace(/\/+$/, "");
		if (normalized === "." || normalized === "" || normalized === "..") continue;
		if (normalized.startsWith("../") || posix.isAbsolute(normalized)) continue;
		if (!result.includes(normalized)) result.push(normalized);
	}
	return result;
}
async function getSkillsShSearchDirs(basePath) {
	let content;
	try {
		content = await readFile(join(basePath, SKILLS_SH_CONFIG_FILE), "utf-8");
	} catch {
		return [];
	}
	return parseSkillsShPaths(content).map((path) => join(basePath, path));
}
const LOCAL_LOCK_FILE = "skills-lock.json";
const CURRENT_VERSION = 1;
function getLocalLockPath(cwd) {
	return join(cwd || process.cwd(), LOCAL_LOCK_FILE);
}
var InvalidLocalLockError = class extends Error {
	constructor(lockPath, reason) {
		super(`Invalid ${lockPath}: ${reason}. Fix or delete the file, then retry.`);
		this.name = "InvalidLocalLockError";
	}
};
async function readLocalLock(cwd) {
	const lockDir = cwd || process.cwd();
	const lockPath = getLocalLockPath(lockDir);
	let content;
	try {
		content = await readFile(lockPath, "utf-8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") return createEmptyLocalLock();
		throw error;
	}
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new InvalidLocalLockError(lockPath, error instanceof Error ? error.message : "not valid JSON");
	}
	if (!isLocalLockShape(parsed)) throw new InvalidLocalLockError(lockPath, "expected an object with \"version\" and \"skills\"");
	if (parsed.version !== CURRENT_VERSION) throw new InvalidLocalLockError(lockPath, `unsupported lock version ${parsed.version} (expected ${CURRENT_VERSION})`);
	for (const entry of Object.values(parsed.skills)) if (entry.sourceType === "local" && !isAbsolute(entry.source)) entry.source = resolve(lockDir, entry.source);
	return parsed;
}
function isLocalLockShape(value) {
	return typeof value === "object" && value !== null && "version" in value && typeof value.version === "number" && "skills" in value && typeof value.skills === "object" && value.skills !== null;
}
async function writeLocalLock(lock, cwd) {
	const lockDir = cwd || process.cwd();
	const lockPath = getLocalLockPath(lockDir);
	const sortedSkills = Object.fromEntries(Object.keys(lock.skills).sort().map((key) => {
		const entry = lock.skills[key];
		return [key, entry.sourceType === "local" ? {
			...entry,
			source: getPortableLocalSource(entry.source, lockDir)
		} : entry];
	}));
	const sorted = {
		version: lock.version,
		skills: sortedSkills
	};
	await writeFile(lockPath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}
function getPortableLocalSource(source, lockDir) {
	const absoluteSource = isAbsolute(source) ? source : resolve(lockDir, source);
	const relativeSource = relative(lockDir, absoluteSource);
	if (isAbsolute(relativeSource)) return absoluteSource.split(sep).join("/");
	const portableSource = relativeSource.split(sep).join("/");
	if (!portableSource) return ".";
	if (portableSource === ".." || portableSource.startsWith("../")) return portableSource;
	return `./${portableSource}`;
}
async function computeSkillFolderHash(skillDir) {
	const files = [];
	await collectFiles(skillDir, skillDir, files);
	files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
	const hash = createHash("sha256");
	for (const file of files) {
		hash.update(file.relativePath);
		hash.update(file.content);
	}
	return hash.digest("hex");
}
async function collectFiles(baseDir, currentDir, results) {
	const entries = await readdir(currentDir, { withFileTypes: true });
	await Promise.all(entries.map(async (entry) => {
		const fullPath = join(currentDir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === ".git" || entry.name === "node_modules") return;
			await collectFiles(baseDir, fullPath, results);
		} else if (entry.isFile()) {
			const content = await readFile(fullPath);
			const relativePath = relative(baseDir, fullPath).split("\\").join("/");
			results.push({
				relativePath,
				content
			});
		}
	}));
}
async function addSkillToLocalLock(skillName, entry, cwd) {
	const lock = await readLocalLock(cwd);
	lock.skills = {
		...lock.skills,
		[skillName]: entry
	};
	await writeLocalLock(lock, cwd);
}
function lockChangeReason(lock, skillName, entry) {
	const locked = lock.skills[skillName];
	if (!locked) return `${skillName} is not in skills-lock.json`;
	if (locked.computedHash !== entry.computedHash) return `${skillName} has changed since skills-lock.json was written`;
	if (locked.version !== entry.version) return `${skillName} comes from version ${entry.version ?? "unknown"}, skills-lock.json has ${locked.version ?? "unknown"}`;
	return null;
}
function frozenLockfileError(changes) {
	return [
		"Cannot install with --frozen-lockfile because skills-lock.json is not up to date:",
		...changes.map((change) => `  ${change}`),
		"Run again with --no-frozen-lockfile to update it."
	].join("\n");
}
async function removeSkillFromLocalLock(skillName, cwd) {
	const lock = await readLocalLock(cwd);
	if (!Object.hasOwn(lock.skills, skillName)) return false;
	delete lock.skills[skillName];
	await writeLocalLock(lock, cwd);
	return true;
}
function createEmptyLocalLock() {
	return {
		version: CURRENT_VERSION,
		skills: {}
	};
}
const AGENTS_DIR = ".agents";
const SKILLS_SUBDIR = "skills";
const SKIP_DIRS = [
	"node_modules",
	".git",
	"dist",
	"build",
	"__pycache__"
];
const AGENT_PROJECT_SKILL_DIRS = [
	".agents/skills",
	".claude/skills",
	".cline/skills",
	".codebuddy/skills",
	".codex/skills",
	".commandcode/skills",
	".continue/skills",
	".factory/skills",
	".github/skills",
	".goose/skills",
	".grok/skills",
	".iflow/skills",
	".junie/skills",
	".kilo/skills",
	".kilocode/skills",
	".kimchi/skills",
	".kiro/skills",
	".minimax/skills",
	".mux/skills",
	".neovate/skills",
	".opencode/skills",
	".openhands/skills",
	".pi/skills",
	".posit/assistant/skills",
	".qoder/skills",
	".roo/skills",
	".trae/skills",
	".windsurf/skills",
	".zcode/skills",
	".zencoder/skills"
];
function normalizeSkillName(name) {
	return name.toLowerCase().replace(/[\s_]+/g, "-");
}
function normalizeRelativePath(path) {
	return path.split(sep).join("/").replace(/\/+/g, "/");
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function shouldInstallInternalSkills() {
	const envValue = process.env.INSTALL_INTERNAL_SKILLS;
	return envValue === "1" || envValue === "true";
}
async function hasSkillMd(dir) {
	try {
		return (await stat(join(dir, "SKILL.md"))).isFile();
	} catch {
		return false;
	}
}
function warnSkippedSkill(skillMdPath, reason, onWarning = console.warn) {
	onWarning(`⚠ Skipped ${sanitizeMetadata(skillMdPath)} — ${stripTerminalEscapes(reason)}`);
}
async function parseSkillMd(skillMdPath, options) {
	let content;
	try {
		content = await readFile(skillMdPath, "utf-8");
	} catch (err) {
		warnSkippedSkill(skillMdPath, `failed to read file: ${err.message}`, options?.onWarning);
		return null;
	}
	let data;
	const warnings = [];
	const onWarning = options?.onWarning ? (message) => {
		warnings.push(message);
	} : void 0;
	try {
		({data} = parseFrontmatter(content, { onWarning }));
	} catch (err) {
		warnSkippedSkill(skillMdPath, `YAML parse error: ${err.message}`, onWarning);
	}
	for (const warning of warnings) options?.onWarning?.(warning);
	if (data === void 0) return null;
	if (!data.name || !data.description) {
		const missing = [];
		if (!data.name) missing.push("name");
		if (!data.description) missing.push("description");
		warnSkippedSkill(skillMdPath, `missing required frontmatter field(s): ${missing.join(", ")}`, options?.onWarning);
		return null;
	}
	if (typeof data.name !== "string" || typeof data.description !== "string") {
		warnSkippedSkill(skillMdPath, `frontmatter "name" and "description" must be strings (got ${typeof data.name} and ${typeof data.description})`, options?.onWarning);
		return null;
	}
	const metadata = isRecord(data.metadata) ? data.metadata : void 0;
	if (metadata?.internal === true && !shouldInstallInternalSkills() && !options?.includeInternal) return null;
	return {
		name: sanitizeMetadata(data.name),
		description: sanitizeMetadata(data.description),
		path: dirname(skillMdPath),
		rawContent: content,
		metadata
	};
}
async function findSkillDirs(dir, depth = 0, maxDepth = 5) {
	if (depth > maxDepth) return [];
	try {
		const [hasSkill, entries] = await Promise.all([hasSkillMd(dir), readdir(dir, { withFileTypes: true }).catch(() => [])]);
		const currentDir = hasSkill ? [dir] : [];
		const subDirResults = await Promise.all(entries.filter((entry) => entry.isDirectory() && !SKIP_DIRS.includes(entry.name)).map((entry) => findSkillDirs(join(dir, entry.name), depth + 1, maxDepth)));
		return [...currentDir, ...subDirResults.flat()];
	} catch {
		return [];
	}
}
function isSubpathSafe(basePath, subpath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(join(basePath, subpath)));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
async function sourceLockedSkillNames(basePath) {
	try {
		return Object.keys((await readLocalLock(basePath)).skills);
	} catch (error) {
		if (error instanceof InvalidLocalLockError) return [];
		throw error;
	}
}
async function discoverSkills(basePath, subpath, options) {
	const skills = [];
	const seenNames = /* @__PURE__ */ new Set();
	const parsedSkillPaths = /* @__PURE__ */ new Set();
	const lockedSkillNames = new Set((await sourceLockedSkillNames(basePath)).map(normalizeSkillName));
	if (subpath && !isSubpathSafe(basePath, subpath)) throw new Error(`Invalid subpath: "${subpath}" resolves outside the repository directory. Subpath must not contain ".." segments that escape the base path.`);
	const searchPath = subpath ? join(basePath, subpath) : basePath;
	const pluginGroupings = await getPluginGroupings(searchPath);
	const enhanceSkill = (skill) => {
		const resolvedPath = resolve(skill.path);
		if (pluginGroupings.has(resolvedPath)) skill.pluginName = pluginGroupings.get(resolvedPath);
		return skill;
	};
	const isInstalledProjectSkill = (skill) => {
		if (lockedSkillNames.size === 0) return false;
		const relativeDir = normalizeRelativePath(relative(basePath, skill.path));
		if (!AGENT_PROJECT_SKILL_DIRS.some((dir) => relativeDir === dir || relativeDir.startsWith(`${dir}/`))) return false;
		const skillName = normalizeSkillName(skill.name);
		const directoryName = normalizeSkillName(basename(skill.path));
		return lockedSkillNames.has(skillName) || lockedSkillNames.has(directoryName);
	};
	const parseSkillAt = async (skillDir) => {
		const skillMdPath = resolve(skillDir, "SKILL.md");
		if (parsedSkillPaths.has(skillMdPath)) return null;
		parsedSkillPaths.add(skillMdPath);
		return parseSkillMd(skillMdPath, options);
	};
	if (await hasSkillMd(searchPath)) {
		let skill = await parseSkillAt(searchPath);
		if (skill) {
			if (!isInstalledProjectSkill(skill)) {
				skill = enhanceSkill(skill);
				skills.push(skill);
				seenNames.add(skill.name);
				if (!options?.fullDepth) return skills;
			}
		}
	}
	const prioritySearchDirs = [
		searchPath,
		join(searchPath, "skills"),
		join(searchPath, "skills/.curated"),
		join(searchPath, "skills/.experimental"),
		join(searchPath, "skills/.system"),
		...AGENT_PROJECT_SKILL_DIRS.map((dir) => join(searchPath, dir))
	];
	prioritySearchDirs.push(...await getSkillsShSearchDirs(searchPath));
	const deepContainerDirs = new Set(prioritySearchDirs.slice(1));
	prioritySearchDirs.push(...await getPluginSkillPaths(searchPath));
	const tryAddSkillAt = async (skillDir) => {
		if (!await hasSkillMd(skillDir)) return false;
		let skill = await parseSkillAt(skillDir);
		if (!skill || !options?.includeDuplicateNames && seenNames.has(skill.name)) return true;
		if (isInstalledProjectSkill(skill)) return true;
		skill = enhanceSkill(skill);
		skills.push(skill);
		seenNames.add(skill.name);
		return true;
	};
	const walkSkillDirs = async (dir, maxDepth, depth = 1) => {
		const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const childDir = join(dir, entry.name);
			if (await tryAddSkillAt(childDir) || depth >= maxDepth || SKIP_DIRS.includes(entry.name)) continue;
			await walkSkillDirs(childDir, maxDepth, depth + 1);
		}
	};
	for (const dir of prioritySearchDirs) await walkSkillDirs(dir, deepContainerDirs.has(dir) ? 3 : 1);
	if (skills.length === 0 || options?.fullDepth) {
		const allSkillDirs = await findSkillDirs(searchPath);
		for (const skillDir of allSkillDirs) {
			let skill = await parseSkillAt(skillDir);
			if (skill && (options?.includeDuplicateNames || !seenNames.has(skill.name)) && !isInstalledProjectSkill(skill)) {
				skill = enhanceSkill(skill);
				skills.push(skill);
				seenNames.add(skill.name);
			}
		}
	}
	return skills;
}
function getSkillDisplayName(skill) {
	return skill.name || basename(skill.path);
}
function filterSkills(skills, inputNames) {
	const normalizedInputs = inputNames.map((n) => n.toLowerCase());
	return skills.filter((skill) => {
		const name = skill.name.toLowerCase();
		const displayName = getSkillDisplayName(skill).toLowerCase();
		return normalizedInputs.some((input) => input === name || input === displayName);
	});
}
const home = homedir();
const configHome = xdgConfig ?? join(home, ".config");
const codexHome = process.env.CODEX_HOME?.trim() || join(home, ".codex");
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, ".claude");
const vibeHome = process.env.VIBE_HOME?.trim() || join(home, ".vibe");
const hermesHome = process.env.HERMES_HOME?.trim() || join(home, ".hermes");
const autohandHome = process.env.AUTOHAND_HOME?.trim() || join(home, ".autohand");
const grokHome = process.env.GROK_HOME?.trim() || join(home, ".grok");
const sarvamHome = process.env.SARVAM_HOME?.trim() || join(home, ".sarvam");
const zedAppDataHome = process.env.APPDATA?.trim();
const zedFlatpakConfigHome = process.env.FLATPAK_XDG_CONFIG_HOME?.trim();
function packageJsonHasDependency(packageJsonPath, dependencyName) {
	try {
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		return !!(packageJson.dependencies?.[dependencyName] || packageJson.devDependencies?.[dependencyName]);
	} catch {
		return false;
	}
}
function getOpenClawGlobalSkillsDir(homeDir = home, pathExists = existsSync) {
	if (pathExists(join(homeDir, ".openclaw"))) return join(homeDir, ".openclaw/skills");
	if (pathExists(join(homeDir, ".clawdbot"))) return join(homeDir, ".clawdbot/skills");
	if (pathExists(join(homeDir, ".moltbot"))) return join(homeDir, ".moltbot/skills");
	return join(homeDir, ".openclaw/skills");
}
function isZCodeInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".zcode")) || pathExists("/Applications/ZCode.app");
}
function isKimchiInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".config", "kimchi"));
}
function isMiniMaxCodeInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".minimax")) || pathExists("/Applications/MiniMax Code.app");
}
function isPositAssistantInstalled(homeDir = home, pathExists = existsSync) {
	return pathExists(join(homeDir, ".posit/assistant")) || pathExists(join(homeDir, ".positai"));
}
const agents = {
	"aider-desk": {
		name: "aider-desk",
		displayName: "AiderDesk",
		skillsDir: ".aider-desk/skills",
		globalSkillsDir: join(home, ".aider-desk/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".aider-desk"));
		}
	},
	amp: {
		name: "amp",
		displayName: "Amp",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "amp"));
		}
	},
	antigravity: {
		name: "antigravity",
		displayName: "Antigravity",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".gemini/antigravity/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".gemini/antigravity"));
		}
	},
	"antigravity-cli": {
		name: "antigravity-cli",
		displayName: "Antigravity CLI",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".gemini/antigravity-cli/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".gemini/antigravity-cli"));
		}
	},
	astrbot: {
		name: "astrbot",
		displayName: "AstrBot",
		skillsDir: "data/skills",
		globalSkillsDir: join(home, ".astrbot/data/skills"),
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), "data/skills")) || existsSync(join(home, ".astrbot"));
		}
	},
	"autohand-code": {
		name: "autohand-code",
		displayName: "Autohand Code CLI",
		skillsDir: ".autohand/skills",
		globalSkillsDir: join(autohandHome, "skills"),
		detectInstalled: async () => {
			return existsSync(autohandHome);
		}
	},
	augment: {
		name: "augment",
		displayName: "Augment",
		skillsDir: ".augment/skills",
		globalSkillsDir: join(home, ".augment/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".augment"));
		}
	},
	bob: {
		name: "bob",
		displayName: "IBM Bob",
		skillsDir: ".bob/skills",
		globalSkillsDir: join(home, ".bob/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".bob"));
		}
	},
	"claude-code": {
		name: "claude-code",
		displayName: "Claude Code",
		skillsDir: ".claude/skills",
		globalSkillsDir: join(claudeHome, "skills"),
		createProjectSkillsDirByDefault: true,
		detectInstalled: async () => {
			return existsSync(claudeHome);
		}
	},
	openclaw: {
		name: "openclaw",
		displayName: "OpenClaw",
		skillsDir: "skills",
		globalSkillsDir: getOpenClawGlobalSkillsDir(),
		detectInstalled: async () => {
			return existsSync(join(home, ".openclaw")) || existsSync(join(home, ".clawdbot")) || existsSync(join(home, ".moltbot"));
		}
	},
	cline: {
		name: "cline",
		displayName: "Cline",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents", "skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".cline"));
		}
	},
	"codearts-agent": {
		name: "codearts-agent",
		displayName: "CodeArts Agent",
		skillsDir: ".codeartsdoer/skills",
		globalSkillsDir: join(home, ".codeartsdoer/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codeartsdoer"));
		}
	},
	codebuddy: {
		name: "codebuddy",
		displayName: "CodeBuddy",
		skillsDir: ".codebuddy/skills",
		globalSkillsDir: join(home, ".codebuddy/skills"),
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".codebuddy")) || existsSync(join(home, ".codebuddy"));
		}
	},
	codemaker: {
		name: "codemaker",
		displayName: "Codemaker",
		skillsDir: ".codemaker/skills",
		globalSkillsDir: join(home, ".codemaker/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codemaker"));
		}
	},
	codestudio: {
		name: "codestudio",
		displayName: "Code Studio",
		skillsDir: ".codestudio/skills",
		globalSkillsDir: join(home, ".codestudio/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codestudio"));
		}
	},
	codex: {
		name: "codex",
		displayName: "Codex",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents", "skills"),
		detectInstalled: async () => {
			return existsSync(codexHome) || existsSync("/etc/codex");
		}
	},
	"command-code": {
		name: "command-code",
		displayName: "Command Code",
		skillsDir: ".commandcode/skills",
		globalSkillsDir: join(home, ".commandcode/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".commandcode"));
		}
	},
	continue: {
		name: "continue",
		displayName: "Continue",
		skillsDir: ".continue/skills",
		globalSkillsDir: join(home, ".continue/skills"),
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".continue")) || existsSync(join(home, ".continue"));
		}
	},
	cortex: {
		name: "cortex",
		displayName: "Cortex Code",
		skillsDir: ".cortex/skills",
		globalSkillsDir: join(home, ".snowflake/cortex/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".snowflake/cortex"));
		}
	},
	crush: {
		name: "crush",
		displayName: "Crush",
		skillsDir: ".crush/skills",
		globalSkillsDir: join(home, ".config/crush/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".config/crush"));
		}
	},
	cursor: {
		name: "cursor",
		displayName: "Cursor",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".cursor/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".cursor"));
		}
	},
	deepagents: {
		name: "deepagents",
		displayName: "Deep Agents",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".deepagents/agent/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".deepagents"));
		}
	},
	devin: {
		name: "devin",
		displayName: "Devin for Terminal",
		skillsDir: ".devin/skills",
		globalSkillsDir: join(configHome, "devin/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "devin"));
		}
	},
	dexto: {
		name: "dexto",
		displayName: "Dexto",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".dexto"));
		}
	},
	droid: {
		name: "droid",
		displayName: "Droid",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".factory/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".factory"));
		}
	},
	eve: {
		name: "eve",
		displayName: "Eve",
		skillsDir: "agent/skills",
		globalSkillsDir: void 0,
		detectInstalled: async () => {
			const cwd = process.cwd();
			return existsSync(join(cwd, "agent")) && packageJsonHasDependency(join(cwd, "package.json"), "eve");
		}
	},
	firebender: {
		name: "firebender",
		displayName: "Firebender",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".firebender/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".firebender"));
		}
	},
	forgecode: {
		name: "forgecode",
		displayName: "ForgeCode",
		skillsDir: ".forge/skills",
		globalSkillsDir: join(home, ".forge/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".forge"));
		}
	},
	fx: {
		name: "fx",
		displayName: "fx",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".fx"));
		}
	},
	"gemini-cli": {
		name: "gemini-cli",
		displayName: "Gemini CLI",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".gemini/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".gemini"));
		}
	},
	"github-copilot": {
		name: "github-copilot",
		displayName: "GitHub Copilot",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".copilot/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".copilot"));
		}
	},
	goose: {
		name: "goose",
		displayName: "Goose",
		skillsDir: ".goose/skills",
		globalSkillsDir: join(configHome, "goose/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "goose"));
		}
	},
	grok: {
		name: "grok",
		displayName: "Grok Build",
		skillsDir: ".grok/skills",
		globalSkillsDir: join(grokHome, "skills"),
		detectInstalled: async () => {
			return existsSync(grokHome);
		}
	},
	"hermes-agent": {
		name: "hermes-agent",
		displayName: "Hermes Agent",
		skillsDir: ".hermes/skills",
		globalSkillsDir: join(hermesHome, "skills"),
		detectInstalled: async () => {
			return existsSync(hermesHome);
		}
	},
	"inference-sh": {
		name: "inference-sh",
		displayName: "inference.sh",
		skillsDir: ".inferencesh/skills",
		globalSkillsDir: join(home, ".inferencesh/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".inferencesh"));
		}
	},
	jazz: {
		name: "jazz",
		displayName: "Jazz",
		skillsDir: ".jazz/skills",
		globalSkillsDir: join(home, ".jazz/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".jazz")) || existsSync(join(process.cwd(), ".jazz"));
		}
	},
	junie: {
		name: "junie",
		displayName: "Junie",
		skillsDir: ".junie/skills",
		globalSkillsDir: join(home, ".junie/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".junie"));
		}
	},
	"iflow-cli": {
		name: "iflow-cli",
		displayName: "iFlow CLI",
		skillsDir: ".iflow/skills",
		globalSkillsDir: join(home, ".iflow/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".iflow"));
		}
	},
	kilo: {
		name: "kilo",
		displayName: "Kilo Code",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".kilo/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kilo")) || existsSync(join(home, ".kilocode"));
		}
	},
	kimchi: {
		name: "kimchi",
		displayName: "Kimchi",
		skillsDir: ".kimchi/skills",
		globalSkillsDir: join(home, ".config", "kimchi", "harness", "skills"),
		detectInstalled: async () => {
			return isKimchiInstalled();
		}
	},
	"kimi-code-cli": {
		name: "kimi-code-cli",
		displayName: "Kimi Code CLI",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kimi-code")) || existsSync(join(home, ".kimi"));
		}
	},
	"kiro-cli": {
		name: "kiro-cli",
		displayName: "Kiro CLI",
		skillsDir: ".kiro/skills",
		globalSkillsDir: join(home, ".kiro/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kiro"));
		}
	},
	kode: {
		name: "kode",
		displayName: "Kode",
		skillsDir: ".kode/skills",
		globalSkillsDir: join(home, ".kode/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".kode"));
		}
	},
	lingma: {
		name: "lingma",
		displayName: "Lingma",
		skillsDir: ".lingma/skills",
		globalSkillsDir: join(home, ".lingma/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".lingma"));
		}
	},
	loaf: {
		name: "loaf",
		displayName: "Loaf",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(home, ".loaf"));
		}
	},
	mcpjam: {
		name: "mcpjam",
		displayName: "MCPJam",
		skillsDir: ".mcpjam/skills",
		globalSkillsDir: join(home, ".mcpjam/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".mcpjam"));
		}
	},
	"minimax-code": {
		name: "minimax-code",
		displayName: "MiniMax Code",
		skillsDir: ".minimax/skills",
		globalSkillsDir: join(home, ".minimax/skills"),
		detectInstalled: async () => {
			return isMiniMaxCodeInstalled();
		}
	},
	"mistral-vibe": {
		name: "mistral-vibe",
		displayName: "Mistral Vibe",
		skillsDir: ".vibe/skills",
		globalSkillsDir: join(vibeHome, "skills"),
		detectInstalled: async () => {
			return existsSync(vibeHome);
		}
	},
	moxby: {
		name: "moxby",
		displayName: "Moxby",
		skillsDir: ".moxby/skills",
		globalSkillsDir: join(home, ".moxby/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".moxby"));
		}
	},
	mux: {
		name: "mux",
		displayName: "Mux",
		skillsDir: ".mux/skills",
		globalSkillsDir: join(home, ".mux/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".mux"));
		}
	},
	opencode: {
		name: "opencode",
		displayName: "OpenCode",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "opencode/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "opencode"));
		}
	},
	openhands: {
		name: "openhands",
		displayName: "OpenHands",
		skillsDir: ".openhands/skills",
		globalSkillsDir: join(home, ".openhands/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".openhands"));
		}
	},
	ona: {
		name: "ona",
		displayName: "Ona",
		skillsDir: ".ona/skills",
		globalSkillsDir: join(home, ".ona/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".ona"));
		}
	},
	pi: {
		name: "pi",
		displayName: "Pi",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".pi/agent"));
		}
	},
	"posit-assistant": {
		name: "posit-assistant",
		displayName: "Posit Assistant",
		skillsDir: ".posit/assistant/skills",
		globalSkillsDir: join(home, ".posit/assistant/skills"),
		detectInstalled: async () => {
			return isPositAssistantInstalled();
		}
	},
	qoder: {
		name: "qoder",
		displayName: "Qoder",
		skillsDir: ".qoder/skills",
		globalSkillsDir: join(home, ".qoder/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".qoder"));
		}
	},
	"qoder-cn": {
		name: "qoder-cn",
		displayName: "Qoder CN",
		skillsDir: ".qoder/skills",
		globalSkillsDir: join(home, ".qoder-cn/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".qoder-cn"));
		}
	},
	"qwen-code": {
		name: "qwen-code",
		displayName: "Qwen Code",
		skillsDir: ".qwen/skills",
		globalSkillsDir: join(home, ".qwen/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".qwen"));
		}
	},
	replit: {
		name: "replit",
		displayName: "Replit",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "agents/skills"),
		showInUniversalList: false,
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".replit"));
		}
	},
	reasonix: {
		name: "reasonix",
		displayName: "Reasonix",
		skillsDir: ".reasonix/skills",
		globalSkillsDir: join(home, ".reasonix/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".reasonix"));
		}
	},
	rovodev: {
		name: "rovodev",
		displayName: "Rovo Dev",
		skillsDir: ".rovodev/skills",
		globalSkillsDir: join(home, ".rovodev/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".rovodev"));
		}
	},
	roo: {
		name: "roo",
		displayName: "Roo Code",
		skillsDir: ".roo/skills",
		globalSkillsDir: join(home, ".roo/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".roo"));
		}
	},
	"sarvam-code": {
		name: "sarvam-code",
		displayName: "Sarvam Code",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(sarvamHome);
		}
	},
	"tabnine-cli": {
		name: "tabnine-cli",
		displayName: "Tabnine CLI",
		skillsDir: ".tabnine/agent/skills",
		globalSkillsDir: join(home, ".tabnine/agent/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".tabnine"));
		}
	},
	terramind: {
		name: "terramind",
		displayName: "Terramind",
		skillsDir: ".terramind/skills",
		globalSkillsDir: join(home, ".terramind/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".terramind"));
		}
	},
	tinycloud: {
		name: "tinycloud",
		displayName: "Tinycloud",
		skillsDir: ".tinycloud/skills",
		globalSkillsDir: join(home, ".tinycloud/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".tinycloud"));
		}
	},
	trae: {
		name: "trae",
		displayName: "Trae",
		skillsDir: ".trae/skills",
		globalSkillsDir: join(home, ".trae/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".trae"));
		}
	},
	"trae-cn": {
		name: "trae-cn",
		displayName: "Trae CN",
		skillsDir: ".trae/skills",
		globalSkillsDir: join(home, ".trae-cn/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".trae-cn"));
		}
	},
	warp: {
		name: "warp",
		displayName: "Warp",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".warp"));
		}
	},
	windsurf: {
		name: "windsurf",
		displayName: "Windsurf",
		skillsDir: ".windsurf/skills",
		globalSkillsDir: join(home, ".codeium/windsurf/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".codeium/windsurf"));
		}
	},
	zed: {
		name: "zed",
		displayName: "Zed",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(home, ".agents/skills"),
		detectInstalled: async () => {
			return existsSync(join(configHome, "zed")) || !!zedAppDataHome && existsSync(join(zedAppDataHome, "Zed")) || !!zedFlatpakConfigHome && existsSync(join(zedFlatpakConfigHome, "zed"));
		}
	},
	zcode: {
		name: "zcode",
		displayName: "ZCode",
		skillsDir: ".zcode/skills",
		globalSkillsDir: join(home, ".zcode/skills"),
		detectInstalled: async () => {
			return isZCodeInstalled();
		}
	},
	zencoder: {
		name: "zencoder",
		displayName: "Zencoder",
		skillsDir: ".zencoder/skills",
		globalSkillsDir: join(home, ".zencoder/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".zencoder"));
		}
	},
	zenflow: {
		name: "zenflow",
		displayName: "Zenflow",
		skillsDir: ".zencoder/skills",
		globalSkillsDir: join(home, ".zencoder/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".zencoder"));
		}
	},
	neovate: {
		name: "neovate",
		displayName: "Neovate",
		skillsDir: ".neovate/skills",
		globalSkillsDir: join(home, ".neovate/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".neovate"));
		}
	},
	pochi: {
		name: "pochi",
		displayName: "Pochi",
		skillsDir: ".pochi/skills",
		globalSkillsDir: join(home, ".pochi/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".pochi"));
		}
	},
	promptscript: {
		name: "promptscript",
		displayName: "PromptScript",
		skillsDir: ".agents/skills",
		globalSkillsDir: void 0,
		showInUniversalPrompt: false,
		detectInstalled: async () => {
			return existsSync(join(process.cwd(), ".promptscript")) || existsSync(join(process.cwd(), "promptscript.yaml"));
		}
	},
	adal: {
		name: "adal",
		displayName: "AdaL",
		skillsDir: ".adal/skills",
		globalSkillsDir: join(home, ".adal/skills"),
		detectInstalled: async () => {
			return existsSync(join(home, ".adal"));
		}
	},
	universal: {
		name: "universal",
		displayName: "Universal",
		skillsDir: ".agents/skills",
		globalSkillsDir: join(configHome, "agents/skills"),
		showInUniversalList: false,
		detectInstalled: async () => false
	}
};
async function detectInstalledAgents() {
	return (await Promise.all(Object.entries(agents).map(async ([type, config]) => ({
		type,
		installed: await config.detectInstalled()
	})))).filter((r) => r.installed).map((r) => r.type);
}
function getAgentConfig(type) {
	return agents[type];
}
const EVE_SUBAGENTS_DIR = join("agent", "subagents");
function getEveSubagents(cwd = process.cwd()) {
	const dir = join(cwd, EVE_SUBAGENTS_DIR);
	if (!existsSync(dir)) return [];
	try {
		return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
	} catch {
		return [];
	}
}
function getUniversalAgents() {
	return Object.entries(agents).filter(([_, config]) => config.skillsDir === ".agents/skills" && config.showInUniversalList !== false).map(([type]) => type);
}
function getVisibleUniversalAgents() {
	return Object.entries(agents).filter(([_, config]) => config.skillsDir === ".agents/skills" && config.showInUniversalList !== false && config.showInUniversalPrompt !== false).map(([type]) => type);
}
function getNonUniversalAgents() {
	return Object.entries(agents).filter(([_, config]) => config.skillsDir !== ".agents/skills").map(([type]) => type);
}
function isUniversalAgent(type) {
	return agents[type].skillsDir === ".agents/skills";
}
function sanitizeName(name) {
	return name.toLowerCase().replace(/[^a-z0-9._]+/g, "-").replace(/^[.\-]+|[.\-]+$/g, "").substring(0, 255) || "unnamed-skill";
}
function isPathSafe(basePath, targetPath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
function pathsOverlap(pathA, pathB) {
	return isPathSafe(pathA, pathB) || isPathSafe(pathB, pathA);
}
function shouldSkipProjectAgentSymlink(agentType, isGlobal, cwd, createMissingAgentRoot) {
	if (isGlobal || isUniversalAgent(agentType) || createMissingAgentRoot || agents[agentType].createProjectSkillsDirByDefault) return false;
	const agentRoot = agents[agentType].skillsDir.split("/")[0];
	return !existsSync(join(cwd, agentRoot));
}
async function isDirEntryOrSymlinkToDir(entry, entryPath) {
	if (entry.isDirectory()) return true;
	if (!entry.isSymbolicLink()) return false;
	try {
		return (await stat(entryPath)).isDirectory();
	} catch {
		return false;
	}
}
function getCanonicalSkillsDir(global, cwd) {
	return join(global ? homedir() : cwd || process.cwd(), AGENTS_DIR, SKILLS_SUBDIR);
}
function getEveSubagentSkillsDir(subagent, cwd) {
	return join(cwd || process.cwd(), EVE_SUBAGENTS_DIR, sanitizeName(subagent), "skills");
}
function getAgentBaseDir(agentType, global, cwd, eveSubagent) {
	if (isUniversalAgent(agentType)) return getCanonicalSkillsDir(global, cwd);
	if (agentType === "eve" && eveSubagent) return getEveSubagentSkillsDir(eveSubagent, cwd);
	const agent = agents[agentType];
	const baseDir = global ? homedir() : cwd || process.cwd();
	if (global) {
		if (agent.globalSkillsDir === void 0) return join(baseDir, agent.skillsDir);
		return agent.globalSkillsDir;
	}
	return join(baseDir, agent.skillsDir);
}
function resolveSymlinkTarget(linkPath, linkTarget) {
	return resolve(dirname(linkPath), linkTarget);
}
async function cleanAndCreateDirectory(path) {
	try {
		await rm(path, {
			recursive: true,
			force: true
		});
	} catch {}
	await mkdir(path, { recursive: true });
}
async function resolveParentSymlinks(path) {
	const resolved = resolve(path);
	const dir = dirname(resolved);
	const base = basename(resolved);
	try {
		return join(await realpath(dir), base);
	} catch {
		return resolved;
	}
}
async function createSymlink(target, linkPath) {
	try {
		const resolvedTarget = resolve(target);
		const resolvedLinkPath = resolve(linkPath);
		const [realTarget, realLinkPath] = await Promise.all([realpath(resolvedTarget).catch(() => resolvedTarget), realpath(resolvedLinkPath).catch(() => resolvedLinkPath)]);
		if (realTarget === realLinkPath) return true;
		if (await resolveParentSymlinks(target) === await resolveParentSymlinks(linkPath)) return true;
		try {
			if ((await lstat(linkPath)).isSymbolicLink()) {
				if (resolveSymlinkTarget(linkPath, await readlink(linkPath)) === resolvedTarget) return true;
				await rm(linkPath);
			} else await rm(linkPath, { recursive: true });
		} catch (err) {
			if (err && typeof err === "object" && "code" in err && err.code === "ELOOP") try {
				await rm(linkPath, { force: true });
			} catch {}
		}
		const linkDir = dirname(linkPath);
		await mkdir(linkDir, { recursive: true });
		const relativePath = relative(await resolveParentSymlinks(linkDir), target);
		const symlinkType = platform() === "win32" ? "junction" : void 0;
		await symlink(symlinkType === "junction" ? resolvedTarget : relativePath, linkPath, symlinkType);
		return true;
	} catch {
		return false;
	}
}
async function installSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: options.mode ?? "symlink",
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.name || basename(skill.path));
	const installMode = options.mode ?? "symlink";
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	try {
		if (pathsOverlap(skill.path, agentDir)) return {
			success: true,
			path: agentDir,
			mode: installMode,
			skipped: true
		};
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await copyDirectory(skill.path, agentDir, agentType);
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		const sourceIsCanonical = resolve(skill.path) === resolve(canonicalDir);
		if (!sourceIsCanonical && pathsOverlap(skill.path, canonicalDir)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: installMode,
			skipped: true
		};
		if (!sourceIsCanonical) if (installMode === "link") {
			if (!await createSymlink(skill.path, canonicalDir)) {
				await cleanAndCreateDirectory(canonicalDir);
				await copyDirectory(skill.path, canonicalDir, agentType);
			}
		} else {
			await cleanAndCreateDirectory(canonicalDir);
			await copyDirectory(skill.path, canonicalDir, agentType);
		}
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: installMode
		};
		if (shouldSkipProjectAgentSymlink(agentType, isGlobal, cwd, options.createMissingAgentRoot ?? false)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: installMode,
			skipped: true,
			skipReason: "missing-agent-project-directory"
		};
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await copyDirectory(skill.path, agentDir, agentType);
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: installMode,
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: installMode
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
const EXCLUDE_FILES = /* @__PURE__ */ new Set(["metadata.json"]);
const EXCLUDE_DIRS = /* @__PURE__ */ new Set([
	".git",
	"__pycache__",
	"__pypackages__"
]);
const isExcluded = (name, isDirectory = false) => {
	if (EXCLUDE_FILES.has(name)) return true;
	if (isDirectory && EXCLUDE_DIRS.has(name)) return true;
	return false;
};
function stripIgnoredEveFrontmatter(raw) {
	const { data, content } = parseFrontmatter(raw);
	const eveData = {};
	if (typeof data.name === "string") eveData.name = data.name;
	if (typeof data.description === "string") eveData.description = data.description;
	if (typeof data.license === "string") eveData.license = data.license;
	if (data.compatibility !== void 0) eveData.compatibility = data.compatibility;
	if (typeof data.version === "string" || typeof data.version === "number") eveData.version = data.version;
	if (data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)) eveData.metadata = data.metadata;
	if (Object.keys(eveData).length === 0) return content.replace(/^\r?\n/u, "");
	return `---\n${stringify(eveData).trimEnd()}\n---\n${content.replace(/^\r?\n/u, "")}`;
}
function isWithinRoot(root, target) {
	return target === root || target.startsWith(root + sep);
}
async function copyDirectory(src, dest, agentType, skillRoot) {
	await mkdir(dest, { recursive: true });
	const confineRoot = skillRoot ?? await realpath(src);
	const entries = await readdir(src, { withFileTypes: true });
	await Promise.all(entries.filter((entry) => !isExcluded(entry.name, entry.isDirectory())).map(async (entry) => {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);
		if (entry.isDirectory()) await copyDirectory(srcPath, destPath, agentType, confineRoot);
		else try {
			if (entry.isSymbolicLink()) {
				let realTarget;
				try {
					realTarget = await realpath(srcPath);
				} catch {
					console.warn(`Skipping broken symlink: ${srcPath}`);
					return;
				}
				if (!isWithinRoot(confineRoot, realTarget)) {
					console.warn(`Skipping symlink that points outside the skill directory: ${srcPath}`);
					return;
				}
			}
			if (agentType === "eve" && entry.name.toLowerCase() === "skill.md") {
				await writeFile(destPath, stripIgnoredEveFrontmatter(await readFile(srcPath, "utf-8")));
				return;
			}
			await cp(srcPath, destPath, {
				dereference: true,
				recursive: true
			});
			await chmod(destPath, (await stat(srcPath)).mode & 511);
		} catch (err) {
			if (err instanceof Error && "code" in err && err.code === "ENOENT" && entry.isSymbolicLink()) console.warn(`Skipping broken symlink: ${srcPath}`);
			else throw err;
		}
	}));
}
function isEvePackagedSkill(files) {
	return files.some((file) => basename(file.path).toLowerCase() === "skill.md");
}
function toEveFlatSkillFileName(installName) {
	return `${sanitizeName(installName)}.md`;
}
function getEveFlatSkillMarkdown(files) {
	const skillFile = files.find((file) => basename(file.path).toLowerCase() === "skill.md");
	if (skillFile) return stripIgnoredEveFrontmatter(skillFile.contents);
	const markdownFile = files.find((file) => extname(file.path).toLowerCase() === ".md");
	return markdownFile ? stripIgnoredEveFrontmatter(markdownFile.contents) : "";
}
async function isSkillInstalled(skillName, agentType, options = {}) {
	const agent = agents[agentType];
	const sanitized = sanitizeName(skillName);
	if (options.global && agent.globalSkillsDir === void 0) return false;
	const targetBase = options.global ? agent.globalSkillsDir : agentType === "eve" && options.eveSubagent ? getEveSubagentSkillsDir(options.eveSubagent, options.cwd) : join(options.cwd || process.cwd(), agent.skillsDir);
	const skillDir = join(targetBase, sanitized);
	if (!isPathSafe(targetBase, skillDir)) return false;
	try {
		await access(skillDir);
		return true;
	} catch {
		return false;
	}
}
function getInstallPath(skillName, agentType, options = {}) {
	agents[agentType];
	options.cwd || process.cwd();
	const sanitized = sanitizeName(skillName);
	const targetBase = getAgentBaseDir(agentType, options.global ?? false, options.cwd, options.eveSubagent);
	const installPath = join(targetBase, sanitized);
	if (!isPathSafe(targetBase, installPath)) throw new Error("Invalid skill name: potential path traversal detected");
	return installPath;
}
function getCanonicalPath(skillName, options = {}) {
	const sanitized = sanitizeName(skillName);
	const canonicalBase = options.agent === "eve" ? getAgentBaseDir("eve", options.global ?? false, options.cwd, options.eveSubagent) : getCanonicalSkillsDir(options.global ?? false, options.cwd);
	const canonicalPath = join(canonicalBase, sanitized);
	if (!isPathSafe(canonicalBase, canonicalPath)) throw new Error("Invalid skill name: potential path traversal detected");
	return canonicalPath;
}
async function installRemoteSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const installMode = options.mode ?? "symlink";
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: installMode,
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.installName);
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	try {
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await writeFile(join(agentDir, agentType === "eve" ? toEveFlatSkillFileName(skill.installName) : "SKILL.md"), agentType === "eve" ? stripIgnoredEveFrontmatter(skill.content) : skill.content, "utf-8");
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		await cleanAndCreateDirectory(canonicalDir);
		await writeFile(join(canonicalDir, agentType === "eve" ? toEveFlatSkillFileName(skill.installName) : "SKILL.md"), agentType === "eve" ? stripIgnoredEveFrontmatter(skill.content) : skill.content, "utf-8");
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await writeFile(join(agentDir, agentType === "eve" ? toEveFlatSkillFileName(skill.installName) : "SKILL.md"), agentType === "eve" ? stripIgnoredEveFrontmatter(skill.content) : skill.content, "utf-8");
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
async function installWellKnownSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const installMode = options.mode ?? "symlink";
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: installMode,
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.installName);
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	async function writeSkillFiles(targetDir) {
		for (const [filePath, content] of skill.files) {
			const fullPath = join(targetDir, filePath);
			if (!isPathSafe(targetDir, fullPath)) continue;
			const parentDir = dirname(fullPath);
			if (parentDir !== targetDir) await mkdir(parentDir, { recursive: true });
			await writeFile(fullPath, agentType === "eve" && basename(filePath).toLowerCase() === "skill.md" && typeof content === "string" ? stripIgnoredEveFrontmatter(content) : content);
		}
	}
	try {
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		await cleanAndCreateDirectory(canonicalDir);
		await writeSkillFiles(canonicalDir);
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
async function installBlobSkillForAgent(skill, agentType, options = {}) {
	const agent = agents[agentType];
	const isGlobal = options.global ?? false;
	const cwd = options.cwd || process.cwd();
	const installMode = options.mode ?? "symlink";
	const eveSubagent = options.eveSubagent;
	if (isGlobal && agent.globalSkillsDir === void 0) return {
		success: false,
		path: "",
		mode: installMode,
		error: `${agent.displayName} does not support global skill installation`
	};
	const skillName = sanitizeName(skill.installName);
	const agentBase = getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent);
	if (agentType === "eve" && !isEvePackagedSkill(skill.files)) {
		const flatSkillPath = join(agentBase, toEveFlatSkillFileName(skill.installName));
		if (!isPathSafe(agentBase, flatSkillPath)) return {
			success: false,
			path: flatSkillPath,
			mode: installMode,
			error: "Invalid skill name: potential path traversal detected"
		};
		try {
			await mkdir(agentBase, { recursive: true });
			await rm(flatSkillPath, {
				recursive: true,
				force: true
			});
			await writeFile(flatSkillPath, getEveFlatSkillMarkdown(skill.files), "utf-8");
			return {
				success: true,
				path: flatSkillPath,
				mode: "copy"
			};
		} catch (error) {
			return {
				success: false,
				path: flatSkillPath,
				mode: installMode,
				error: error instanceof Error ? error.message : "Unknown error"
			};
		}
	}
	const canonicalBase = agentType === "eve" && installMode === "symlink" ? getAgentBaseDir(agentType, isGlobal, cwd, eveSubagent) : getCanonicalSkillsDir(isGlobal, cwd);
	const canonicalDir = join(canonicalBase, skillName);
	const agentDir = join(agentBase, skillName);
	if (!isPathSafe(canonicalBase, canonicalDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	if (!isPathSafe(agentBase, agentDir)) return {
		success: false,
		path: agentDir,
		mode: installMode,
		error: "Invalid skill name: potential path traversal detected"
	};
	async function writeSkillFiles(targetDir) {
		for (const file of skill.files) {
			const fullPath = join(targetDir, file.path);
			if (!isPathSafe(targetDir, fullPath)) continue;
			const parentDir = dirname(fullPath);
			if (parentDir !== targetDir) await mkdir(parentDir, { recursive: true });
			await writeFile(fullPath, agentType === "eve" && basename(file.path).toLowerCase() === "skill.md" ? stripIgnoredEveFrontmatter(file.contents) : file.contents, "utf-8");
		}
	}
	try {
		if (installMode === "copy") {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				mode: "copy"
			};
		}
		await cleanAndCreateDirectory(canonicalDir);
		await writeSkillFiles(canonicalDir);
		if (isGlobal && isUniversalAgent(agentType)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
		if (shouldSkipProjectAgentSymlink(agentType, isGlobal, cwd, options.createMissingAgentRoot ?? false)) return {
			success: true,
			path: canonicalDir,
			canonicalPath: canonicalDir,
			mode: "symlink",
			skipped: true,
			skipReason: "missing-agent-project-directory"
		};
		if (!await createSymlink(canonicalDir, agentDir)) {
			await cleanAndCreateDirectory(agentDir);
			await writeSkillFiles(agentDir);
			return {
				success: true,
				path: agentDir,
				canonicalPath: canonicalDir,
				mode: "symlink",
				symlinkFailed: true
			};
		}
		return {
			success: true,
			path: agentDir,
			canonicalPath: canonicalDir,
			mode: "symlink"
		};
	} catch (error) {
		return {
			success: false,
			path: agentDir,
			mode: installMode,
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}
async function listInstalledSkills(options = {}) {
	const cwd = options.cwd || process.cwd();
	const skillsMap = /* @__PURE__ */ new Map();
	const scopes = [];
	const detectedAgents = await detectInstalledAgents();
	const agentFilter = options.agentFilter;
	const agentsToCheck = agentFilter ? detectedAgents.filter((a) => agentFilter.includes(a)) : detectedAgents;
	const scopeTypes = [];
	if (options.global === void 0) scopeTypes.push({ global: false }, { global: true });
	else scopeTypes.push({ global: options.global });
	for (const { global: isGlobal } of scopeTypes) {
		scopes.push({
			global: isGlobal,
			path: getCanonicalSkillsDir(isGlobal, cwd)
		});
		for (const agentType of agentsToCheck) {
			const agent = agents[agentType];
			if (isGlobal && agent.globalSkillsDir === void 0) continue;
			const agentDir = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
			if (!scopes.some((s) => s.path === agentDir && s.global === isGlobal)) scopes.push({
				global: isGlobal,
				path: agentDir,
				agentType
			});
			if (agentType === "eve" && !isGlobal) for (const subagent of getEveSubagents(cwd)) {
				const subagentDir = getEveSubagentSkillsDir(subagent, cwd);
				if (!scopes.some((s) => s.path === subagentDir && s.global === isGlobal)) scopes.push({
					global: isGlobal,
					path: subagentDir,
					agentType
				});
			}
		}
		const allAgentTypes = Object.keys(agents);
		for (const agentType of allAgentTypes) {
			if (agentsToCheck.includes(agentType)) continue;
			const agent = agents[agentType];
			if (isGlobal && agent.globalSkillsDir === void 0) continue;
			const agentDir = isGlobal ? agent.globalSkillsDir : join(cwd, agent.skillsDir);
			if (scopes.some((s) => s.path === agentDir && s.global === isGlobal)) continue;
			if (existsSync(agentDir)) scopes.push({
				global: isGlobal,
				path: agentDir,
				agentType
			});
		}
	}
	for (const scope of scopes) try {
		const entries = await readdir(scope.path, { withFileTypes: true });
		for (const entry of entries) {
			const skillDir = join(scope.path, entry.name);
			if (!await isDirEntryOrSymlinkToDir(entry, skillDir)) continue;
			const skillMdPath = join(skillDir, "SKILL.md");
			try {
				await stat(skillMdPath);
			} catch {
				continue;
			}
			const skill = await parseSkillMd(skillMdPath);
			if (!skill) continue;
			const scopeKey = scope.global ? "global" : "project";
			const skillKey = `${scopeKey}:${skill.name}`;
			if (scope.agentType) {
				if (skillsMap.has(skillKey)) {
					const existing = skillsMap.get(skillKey);
					if (!existing.agents.includes(scope.agentType)) existing.agents.push(scope.agentType);
				} else skillsMap.set(skillKey, {
					name: skill.name,
					description: skill.description,
					path: skillDir,
					canonicalPath: skillDir,
					scope: scopeKey,
					agents: [scope.agentType]
				});
				continue;
			}
			const sanitizedSkillName = sanitizeName(skill.name);
			const installedAgents = [];
			for (const agentType of agentsToCheck) {
				const agent = agents[agentType];
				if (scope.global && agent.globalSkillsDir === void 0) continue;
				const agentBase = getAgentBaseDir(agentType, scope.global, cwd);
				let found = false;
				const possibleNames = Array.from(/* @__PURE__ */ new Set([
					entry.name,
					sanitizedSkillName,
					skill.name.toLowerCase().replace(/\s+/g, "-").replace(/[\/\\:\0]/g, "")
				]));
				for (const possibleName of possibleNames) {
					const agentSkillDir = join(agentBase, possibleName);
					if (!isPathSafe(agentBase, agentSkillDir)) continue;
					try {
						await access(agentSkillDir);
						found = true;
						break;
					} catch {}
				}
				if (!found) try {
					const agentEntries = await readdir(agentBase, { withFileTypes: true });
					for (const agentEntry of agentEntries) {
						const candidateDir = join(agentBase, agentEntry.name);
						if (!await isDirEntryOrSymlinkToDir(agentEntry, candidateDir)) continue;
						if (!isPathSafe(agentBase, candidateDir)) continue;
						try {
							const candidateSkillMd = join(candidateDir, "SKILL.md");
							await stat(candidateSkillMd);
							const candidateSkill = await parseSkillMd(candidateSkillMd);
							if (candidateSkill && candidateSkill.name === skill.name) {
								found = true;
								break;
							}
						} catch {}
					}
				} catch {}
				if (found) installedAgents.push(agentType);
			}
			if (skillsMap.has(skillKey)) {
				const existing = skillsMap.get(skillKey);
				for (const agent of installedAgents) if (!existing.agents.includes(agent)) existing.agents.push(agent);
			} else skillsMap.set(skillKey, {
				name: skill.name,
				description: skill.description,
				path: skillDir,
				canonicalPath: skillDir,
				scope: scopeKey,
				agents: installedAgents
			});
		}
	} catch {}
	return Array.from(skillsMap.values());
}
var ProviderRegistryImpl = class {
	providers = [];
	register(provider) {
		if (this.providers.some((p) => p.id === provider.id)) throw new Error(`Provider with id "${provider.id}" already registered`);
		this.providers.push(provider);
	}
	findProvider(url) {
		for (const provider of this.providers) if (provider.match(url).matches) return provider;
		return null;
	}
	getProviders() {
		return [...this.providers];
	}
};
const registry = new ProviderRegistryImpl();
function registerProvider(provider) {
	registry.register(provider);
}
function findProvider(url) {
	return registry.findProvider(url);
}
function getProviders() {
	return registry.getProviders();
}
const ZIP_LOCAL_FILE_HEADER = 67324752;
const ZIP_CENTRAL_DIRECTORY_HEADER = 33639248;
const ZIP_END_OF_CENTRAL_DIRECTORY = 101010256;
const ZIP64_END_OF_CENTRAL_DIRECTORY = 101075792;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR = 117853008;
const ZIP_END_MIN_SIZE = 22;
const ZIP_MAX_COMMENT_SIZE = 65535;
const CP437_HIGH_BYTES = [
	"ÇüéâäàåçêëèïîìÄÅ",
	"ÉæÆôöòûùÿÖÜ¢£¥₧ƒ",
	"áíóúñÑªº¿⌐¬½¼¡«»",
	"░▒▓│┤╡╢╖╕╣║╗╝╜╛┐",
	"└┴┬├─┼╞╟╚╔╩╦╠═╬╧",
	"╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀",
	"αßΓπΣσµτΦΘΩδ∞φε∩",
	"≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\xA0"
].join("");
var ArchiveValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ArchiveValidationError";
	}
};
function ensureRange(buffer, offset, length, label) {
	if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) throw new Error(`Invalid zip archive: ${label} is out of bounds`);
}
function findEndOfCentralDirectory(buffer) {
	const minOffset = Math.max(0, buffer.length - ZIP_MAX_COMMENT_SIZE - ZIP_END_MIN_SIZE);
	for (let offset = buffer.length - ZIP_END_MIN_SIZE; offset >= minOffset; offset--) {
		if (buffer.readUInt32LE(offset) !== ZIP_END_OF_CENTRAL_DIRECTORY) continue;
		const commentLength = buffer.readUInt16LE(offset + 20);
		if (offset + ZIP_END_MIN_SIZE + commentLength === buffer.length) return offset;
	}
	return -1;
}
function readUInt64AsNumber(buffer, offset, label) {
	ensureRange(buffer, offset, 8, label);
	const value = buffer.readBigUInt64LE(offset);
	if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`Invalid zip archive: ${label} exceeds the safe integer range`);
	return Number(value);
}
function readCentralDirectory(buffer, endOffset) {
	const diskNumber = buffer.readUInt16LE(endOffset + 4);
	const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
	const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
	const totalEntries = buffer.readUInt16LE(endOffset + 10);
	const size = buffer.readUInt32LE(endOffset + 12);
	const offset = buffer.readUInt32LE(endOffset + 16);
	if (!(entriesOnDisk === 65535 || totalEntries === 65535 || size === 4294967295 || offset === 4294967295)) {
		if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) throw new Error("Multi-disk zip archives are not supported");
		return {
			entries: totalEntries,
			offset,
			size,
			trailerOffset: endOffset
		};
	}
	if (diskNumber !== 0 || centralDirectoryDisk !== 0) throw new Error("Multi-disk zip archives are not supported");
	const locatorOffset = endOffset - 20;
	ensureRange(buffer, locatorOffset, 20, "zip64 locator");
	if (buffer.readUInt32LE(locatorOffset) !== ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR) throw new Error("Invalid zip64 locator");
	if (buffer.readUInt32LE(locatorOffset + 4) !== 0 || buffer.readUInt32LE(locatorOffset + 16) !== 1) throw new Error("Multi-disk zip archives are not supported");
	const zip64EndOffset = readUInt64AsNumber(buffer, locatorOffset + 8, "zip64 end offset");
	ensureRange(buffer, zip64EndOffset, 56, "zip64 end of central directory");
	if (buffer.readUInt32LE(zip64EndOffset) !== ZIP64_END_OF_CENTRAL_DIRECTORY) throw new Error("Invalid zip64 end of central directory");
	const recordSize = readUInt64AsNumber(buffer, zip64EndOffset + 4, "zip64 end size");
	if (recordSize < 44) throw new Error("Invalid zip64 end of central directory");
	ensureRange(buffer, zip64EndOffset, recordSize + 12, "zip64 end of central directory");
	if (zip64EndOffset + recordSize + 12 !== locatorOffset) throw new Error("Invalid zip64 end of central directory");
	if (buffer.readUInt32LE(zip64EndOffset + 16) !== 0 || buffer.readUInt32LE(zip64EndOffset + 20) !== 0) throw new Error("Multi-disk zip archives are not supported");
	const zip64EntriesOnDisk = readUInt64AsNumber(buffer, zip64EndOffset + 24, "zip64 entries on disk");
	const zip64TotalEntries = readUInt64AsNumber(buffer, zip64EndOffset + 32, "zip64 total entries");
	if (zip64EntriesOnDisk !== zip64TotalEntries) throw new Error("Multi-disk zip archives are not supported");
	return {
		entries: zip64TotalEntries,
		size: readUInt64AsNumber(buffer, zip64EndOffset + 40, "zip64 central directory size"),
		offset: readUInt64AsNumber(buffer, zip64EndOffset + 48, "zip64 central directory offset"),
		trailerOffset: zip64EndOffset
	};
}
function normalizeArchivePath(rawPath) {
	if (!rawPath || rawPath.includes("\0")) return null;
	const path = rawPath.replace(/\\/g, "/");
	if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) return null;
	const parts = path.split("/");
	if (parts.some((part) => part === "..")) return null;
	const normalized = parts.filter((part) => part && part !== ".").join("/");
	if (!normalized && !path.endsWith("/")) return null;
	return path.endsWith("/") && normalized ? `${normalized}/` : normalized;
}
function findExtraField(buffer, extraOffset, extraLength, targetId) {
	const extraEnd = extraOffset + extraLength;
	let offset = extraOffset;
	while (offset < extraEnd) {
		if (offset + 4 > extraEnd) throw new Error("Invalid zip extra field");
		const id = buffer.readUInt16LE(offset);
		const size = buffer.readUInt16LE(offset + 2);
		const dataOffset = offset + 4;
		ensureRange(buffer, dataOffset, size, "zip extra field");
		if (dataOffset + size > extraEnd) throw new Error("Invalid zip extra field");
		if (id === targetId) return buffer.subarray(dataOffset, dataOffset + size);
		offset = dataOffset + size;
	}
	return null;
}
function decodeFileName(bytes, isUtf8, unicodePathExtra) {
	if (isUtf8) return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	if (unicodePathExtra && unicodePathExtra.length >= 5 && unicodePathExtra[0] === 1 && unicodePathExtra.readUInt32LE(1) === crc32(bytes)) return new TextDecoder("utf-8", { fatal: true }).decode(unicodePathExtra.subarray(5));
	let result = "";
	for (const byte of bytes) result += byte < 128 ? String.fromCharCode(byte) : CP437_HIGH_BYTES[byte - 128];
	return result;
}
function readZip64EntryValues(buffer, extraOffset, extraLength, values) {
	if (!(values.uncompressedSize === 4294967295 || values.compressedSize === 4294967295 || values.localHeaderOffset === 4294967295 || values.diskStart === 65535)) {
		if (values.diskStart !== 0) throw new Error("Multi-disk zip archives are not supported");
		return values;
	}
	const zip64Extra = findExtraField(buffer, extraOffset, extraLength, 1);
	if (!zip64Extra) throw new Error("Invalid zip64 extra field");
	let valueOffset = 0;
	const readNextUInt64 = (label) => {
		if (valueOffset + 8 > zip64Extra.length) throw new Error(`Invalid zip64 extra field: missing ${label}`);
		const value = readUInt64AsNumber(zip64Extra, valueOffset, `zip64 ${label}`);
		valueOffset += 8;
		return value;
	};
	const resolved = { ...values };
	if (resolved.uncompressedSize === 4294967295) resolved.uncompressedSize = readNextUInt64("uncompressed size");
	if (resolved.compressedSize === 4294967295) resolved.compressedSize = readNextUInt64("compressed size");
	if (resolved.localHeaderOffset === 4294967295) resolved.localHeaderOffset = readNextUInt64("local header offset");
	if (resolved.diskStart === 65535) {
		if (valueOffset + 4 > zip64Extra.length) throw new Error("Invalid zip64 extra field: missing disk start");
		resolved.diskStart = zip64Extra.readUInt32LE(valueOffset);
	}
	if (resolved.diskStart !== 0) throw new Error("Multi-disk zip archives are not supported");
	return resolved;
}
function readZipArchive(bytes, limits) {
	const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const endOffset = findEndOfCentralDirectory(buffer);
	if (endOffset < 0) throw new Error("Invalid zip archive");
	const centralDirectory = readCentralDirectory(buffer, endOffset);
	const totalEntries = centralDirectory.entries;
	if (totalEntries > limits.maxEntries) throw new ArchiveValidationError(`Archive contains too many files (${totalEntries}). Maximum is ${limits.maxEntries}.`);
	ensureRange(buffer, centralDirectory.offset, centralDirectory.size, "central directory");
	if (centralDirectory.offset + centralDirectory.size > centralDirectory.trailerOffset) throw new Error("Invalid zip archive: central directory overlaps archive trailer");
	const files = /* @__PURE__ */ new Map();
	let extractedBytes = 0;
	let offset = centralDirectory.offset;
	for (let index = 0; index < totalEntries; index++) {
		ensureRange(buffer, offset, 46, "central directory entry");
		if (buffer.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY_HEADER) throw new Error("Invalid zip central directory entry");
		const flags = buffer.readUInt16LE(offset + 8);
		const method = buffer.readUInt16LE(offset + 10);
		const expectedChecksum = buffer.readUInt32LE(offset + 16);
		let compressedSize = buffer.readUInt32LE(offset + 20);
		let uncompressedSize = buffer.readUInt32LE(offset + 24);
		const fileNameLength = buffer.readUInt16LE(offset + 28);
		const extraLength = buffer.readUInt16LE(offset + 30);
		const commentLength = buffer.readUInt16LE(offset + 32);
		let diskStart = buffer.readUInt16LE(offset + 34);
		const externalAttributes = buffer.readUInt32LE(offset + 38);
		let localHeaderOffset = buffer.readUInt32LE(offset + 42);
		const variableSize = fileNameLength + extraLength + commentLength;
		ensureRange(buffer, offset + 46, variableSize, "central directory entry data");
		const nameStart = offset + 46;
		const extraOffset = nameStart + fileNameLength;
		({compressedSize, diskStart, localHeaderOffset, uncompressedSize} = readZip64EntryValues(buffer, extraOffset, extraLength, {
			compressedSize,
			diskStart,
			localHeaderOffset,
			uncompressedSize
		}));
		const centralFileName = buffer.subarray(nameStart, nameStart + fileNameLength);
		const rawFileName = decodeFileName(centralFileName, Boolean(flags & 2048), findExtraField(buffer, extraOffset, extraLength, 28789));
		const fileName = normalizeArchivePath(rawFileName);
		if (fileName === null) throw new ArchiveValidationError(`Archive contains unsafe path: ${rawFileName}`);
		if (flags & 1) throw new ArchiveValidationError("Encrypted zip entries are not supported");
		const fileType = externalAttributes >>> 16 & 61440;
		if (fileType !== 0 && fileType !== 32768 && fileType !== 16384) throw new ArchiveValidationError("Archive links are not supported");
		const isDirectory = rawFileName.replace(/\\/g, "/").endsWith("/") || fileType === 16384;
		offset += 46 + variableSize;
		extractedBytes += uncompressedSize;
		if (extractedBytes > limits.maxExtractedBytes) throw new ArchiveValidationError(`Archive extracts to more than ${limits.maxExtractedBytes} bytes.`);
		if (isDirectory) continue;
		ensureRange(buffer, localHeaderOffset, 30, "local file header");
		if (buffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER) throw new Error("Invalid zip local file header");
		const localFlags = buffer.readUInt16LE(localHeaderOffset + 6);
		const localMethod = buffer.readUInt16LE(localHeaderOffset + 8);
		const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
		const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
		const localNameOffset = localHeaderOffset + 30;
		ensureRange(buffer, localNameOffset, localFileNameLength + localExtraLength, "local file header data");
		const localFileName = buffer.subarray(localNameOffset, localNameOffset + localFileNameLength);
		if (localFlags !== flags || localMethod !== method || !localFileName.equals(centralFileName)) throw new Error("Zip local header does not match central directory");
		const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
		ensureRange(buffer, dataOffset, compressedSize, "file data");
		if (dataOffset + compressedSize > centralDirectory.offset) throw new Error("Invalid zip archive: file data overlaps central directory");
		const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
		let contents;
		if (method === 0) contents = compressed;
		else if (method === 8) contents = inflateRawSync(compressed, { maxOutputLength: uncompressedSize + 1 });
		else throw new Error(`Unsupported zip compression method: ${method}`);
		if (contents.byteLength !== uncompressedSize) throw new Error("Zip entry size mismatch");
		if (crc32(contents) !== expectedChecksum) throw new Error("Zip entry checksum mismatch");
		files.set(fileName, new Uint8Array(contents));
	}
	if (offset !== centralDirectory.offset + centralDirectory.size) throw new Error("Invalid zip central directory size");
	return files;
}
const DISCOVERY_SCHEMA_V2 = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
const MAX_ARCHIVE_UNPACKED_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 1e3;
const DISCOVERY_TIMEOUT_MS = 1e4;
var WellKnownScopeNotFoundError = class extends Error {
	scopePath;
	rootUrl;
	constructor(scopePath, rootUrl) {
		super(`No skills found for the scoped path '${scopePath}' on ${rootUrl}. Not falling back to the root skills index because that would install every skill the host publishes. Check the URL, or run 'skills add ${rootUrl}' to install from the root index.`);
		this.name = "WellKnownScopeNotFoundError";
		this.scopePath = scopePath;
		this.rootUrl = rootUrl;
	}
};
var WellKnownProvider = class {
	id = "well-known";
	displayName = "Well-Known Skills";
	WELL_KNOWN_PATHS = [".well-known/agent-skills", ".well-known/skills"];
	INDEX_FILE = "index.json";
	match(url) {
		if (!url.startsWith("http://") && !url.startsWith("https://")) return { matches: false };
		try {
			const parsed = new URL(url);
			if ([
				"github.com",
				"gitlab.com",
				"huggingface.co"
			].includes(parsed.hostname)) return { matches: false };
			return {
				matches: true,
				sourceIdentifier: `wellknown/${parsed.hostname}`
			};
		} catch {
			return { matches: false };
		}
	}
	async fetchIndex(baseUrl, options) {
		return (await this.fetchIndexCandidates(baseUrl, options))[0] ?? null;
	}
	async fetchIndexCandidates(baseUrl, options) {
		try {
			const parsed = new URL(baseUrl);
			const basePath = parsed.pathname.replace(/\/$/, "");
			const signal = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS);
			const urlsToTry = [];
			for (const wellKnownPath of this.WELL_KNOWN_PATHS) {
				urlsToTry.push({
					indexUrl: `${parsed.protocol}//${parsed.host}${basePath}/${wellKnownPath}/${this.INDEX_FILE}`,
					baseUrl: `${parsed.protocol}//${parsed.host}${basePath}`,
					wellKnownPath
				});
				if (basePath && basePath !== "") urlsToTry.push({
					indexUrl: `${parsed.protocol}//${parsed.host}/${wellKnownPath}/${this.INDEX_FILE}`,
					baseUrl: `${parsed.protocol}//${parsed.host}`,
					wellKnownPath
				});
			}
			const candidates = [];
			for (const { indexUrl, baseUrl: resolvedBase, wellKnownPath } of urlsToTry) try {
				const response = await fetch(indexUrl, {
					signal,
					...options?.updateCheck ? { headers: { "X-Skills-Update-Check": "1" } } : {}
				});
				if (!response.ok) continue;
				const rawIndex = await response.json();
				const normalized = this.normalizeIndex(rawIndex, indexUrl, wellKnownPath);
				if (!normalized) continue;
				candidates.push({
					index: normalized.index,
					entries: normalized.entries,
					resolvedBaseUrl: resolvedBase,
					resolvedWellKnownPath: wellKnownPath,
					indexUrl
				});
			} catch {
				continue;
			}
			return candidates;
		} catch {
			return [];
		}
	}
	normalizeIndex(rawIndex, indexUrl, resolvedWellKnownPath) {
		if (!rawIndex || typeof rawIndex !== "object") return null;
		const record = rawIndex;
		if (!Array.isArray(record.skills)) return null;
		const schema = record.$schema;
		if (schema === DISCOVERY_SCHEMA_V2) {
			const entries = [];
			const v2Entries = [];
			for (const entry of record.skills) {
				if (!this.isValidSkillEntryV2(entry)) continue;
				const artifactUrl = new URL(entry.url, indexUrl).toString();
				entries.push({
					version: "0.2.0",
					name: entry.name,
					description: entry.description,
					type: entry.type,
					artifactUrl,
					digest: entry.digest,
					indexEntry: entry
				});
				v2Entries.push(entry);
			}
			if (entries.length === 0) return null;
			return {
				index: {
					$schema: DISCOVERY_SCHEMA_V2,
					skills: v2Entries
				},
				entries
			};
		}
		if (schema !== void 0) return null;
		const v1Entries = [];
		const entries = [];
		for (const entry of record.skills) {
			if (!this.isValidSkillEntryV1(entry)) return null;
			v1Entries.push(entry);
			entries.push({
				version: "0.1.0",
				name: entry.name,
				description: entry.description,
				files: entry.files,
				baseUrl: this.getLegacySkillBaseUrl(indexUrl, resolvedWellKnownPath),
				wellKnownPath: resolvedWellKnownPath,
				indexEntry: entry
			});
		}
		return {
			index: { skills: v1Entries },
			entries
		};
	}
	getLegacySkillBaseUrl(indexUrl, wellKnownPath) {
		const parsed = new URL(indexUrl);
		const marker = `/${wellKnownPath}/${this.INDEX_FILE}`;
		return `${parsed.protocol}//${parsed.host}${parsed.pathname.slice(0, -marker.length)}`;
	}
	isValidSkillName(name) {
		if (typeof name !== "string") return false;
		if (name.length < 1 || name.length > 64) return false;
		if (!/^[a-z0-9-]+$/.test(name)) return false;
		if (name.startsWith("-") || name.endsWith("-")) return false;
		if (name.includes("--")) return false;
		return true;
	}
	isSafeLegacyFilePath(filePath) {
		if (typeof filePath !== "string" || filePath.length === 0) return false;
		if (filePath.startsWith("/") || filePath.startsWith("\\") || filePath.includes("..")) return false;
		if (filePath.includes("\0")) return false;
		return true;
	}
	isValidSkillEntryV1(entry) {
		if (!entry || typeof entry !== "object") return false;
		const e = entry;
		if (!this.isValidSkillName(e.name)) return false;
		if (typeof e.description !== "string" || !e.description) return false;
		if (!Array.isArray(e.files) || e.files.length === 0) return false;
		for (const file of e.files) if (!this.isSafeLegacyFilePath(file)) return false;
		return e.files.some((f) => typeof f === "string" && f.toLowerCase() === "skill.md");
	}
	isValidSkillEntryV2(entry) {
		if (!entry || typeof entry !== "object") return false;
		const e = entry;
		if (!this.isValidSkillName(e.name)) return false;
		if (typeof e.description !== "string" || !e.description || e.description.length > 1024) return false;
		if (e.type !== "skill-md" && e.type !== "archive") return false;
		if (typeof e.url !== "string" || !e.url) return false;
		if (typeof e.digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(e.digest)) return false;
		try {
			new URL(e.url, "https://example.com/.well-known/agent-skills/index.json");
		} catch {
			return false;
		}
		return true;
	}
	async fetchSkill(url) {
		try {
			const parsed = new URL(url);
			const candidates = await this.fetchIndexCandidates(url);
			for (const result of candidates) {
				const { entries } = result;
				let skillName = null;
				const pathMatch = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
				if (pathMatch && pathMatch[1] && pathMatch[1] !== "index.json") skillName = pathMatch[1];
				else if (entries.length === 1) skillName = entries[0].name;
				if (!skillName) continue;
				const skillEntry = entries.find((s) => s.name === skillName);
				if (!skillEntry) continue;
				const skill = await this.fetchSkillByEntry(skillEntry);
				if (skill) return skill;
			}
			return null;
		} catch {
			return null;
		}
	}
	async fetchSkillByEntry(baseUrlOrEntry, legacyEntry, legacyWellKnownPath) {
		if (typeof baseUrlOrEntry === "string") {
			if (!legacyEntry) return null;
			return this.fetchLegacySkillByEntry({
				version: "0.1.0",
				name: legacyEntry.name,
				description: legacyEntry.description,
				files: legacyEntry.files,
				baseUrl: baseUrlOrEntry,
				wellKnownPath: legacyWellKnownPath ?? this.WELL_KNOWN_PATHS[0],
				indexEntry: legacyEntry
			});
		}
		if (baseUrlOrEntry.version === "0.1.0") return this.fetchLegacySkillByEntry(baseUrlOrEntry);
		return this.fetchArtifactSkillByEntry(baseUrlOrEntry);
	}
	async fetchLegacySkillByEntry(entry) {
		try {
			const skillBaseUrl = `${entry.baseUrl.replace(/\/$/, "")}/${entry.wellKnownPath}/${entry.name}`;
			const skillMdUrl = `${skillBaseUrl}/SKILL.md`;
			const response = await fetch(skillMdUrl);
			if (!response.ok) return null;
			const content = await response.text();
			const { data } = parseFrontmatter(content);
			if (typeof data.name !== "string" || typeof data.description !== "string") return null;
			const files = /* @__PURE__ */ new Map();
			files.set("SKILL.md", content);
			const filePromises = entry.files.filter((f) => f.toLowerCase() !== "skill.md").map(async (filePath) => {
				try {
					const fileUrl = `${skillBaseUrl}/${filePath}`;
					const fileResponse = await fetch(fileUrl);
					if (fileResponse.ok) {
						const fileContent = await fileResponse.arrayBuffer();
						return {
							path: filePath,
							content: new Uint8Array(fileContent)
						};
					}
				} catch {}
				return null;
			});
			const fileResults = await Promise.all(filePromises);
			for (const result of fileResults) if (result) files.set(result.path, result.content);
			return this.createSkill({
				name: data.name,
				description: data.description,
				content,
				installName: entry.name,
				sourceUrl: skillMdUrl,
				metadata: data.metadata,
				files,
				indexEntry: entry.indexEntry
			});
		} catch {
			return null;
		}
	}
	async fetchArtifactSkillByEntry(entry) {
		try {
			const response = await fetch(entry.artifactUrl);
			if (!response.ok) return null;
			const contentType = response.headers.get("content-type") ?? "";
			const bytes = new Uint8Array(await response.arrayBuffer());
			if (this.computeDigest(bytes) !== entry.digest) return null;
			if (entry.type === "skill-md") {
				const content = new TextDecoder().decode(bytes);
				const { data } = parseFrontmatter(content);
				if (typeof data.name !== "string" || typeof data.description !== "string") return null;
				const files = /* @__PURE__ */ new Map();
				files.set("SKILL.md", content);
				return this.createSkill({
					name: data.name,
					description: data.description,
					content,
					installName: entry.name,
					sourceUrl: entry.artifactUrl,
					metadata: data.metadata,
					files,
					indexEntry: entry.indexEntry
				});
			}
			const files = this.extractArchive(bytes, entry.artifactUrl, contentType);
			const skillMdBytes = files.get("SKILL.md");
			if (!skillMdBytes) return null;
			const content = typeof skillMdBytes === "string" ? skillMdBytes : new TextDecoder().decode(skillMdBytes);
			files.set("SKILL.md", content);
			const { data } = parseFrontmatter(content);
			if (typeof data.name !== "string" || typeof data.description !== "string") return null;
			return this.createSkill({
				name: data.name,
				description: data.description,
				content,
				installName: entry.name,
				sourceUrl: entry.artifactUrl,
				metadata: data.metadata,
				files,
				indexEntry: entry.indexEntry
			});
		} catch {
			return null;
		}
	}
	createSkill(input) {
		return {
			name: sanitizeMetadata(input.name),
			description: sanitizeMetadata(input.description),
			content: input.content,
			installName: input.installName,
			sourceUrl: input.sourceUrl,
			metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : void 0,
			files: input.files,
			indexEntry: input.indexEntry
		};
	}
	getScope(url) {
		try {
			const parsed = new URL(url);
			const scopePath = parsed.pathname.replace(/\/$/, "");
			if (!scopePath) return null;
			return {
				scopePath,
				rootBaseUrl: `${parsed.protocol}//${parsed.host}`
			};
		} catch {
			return null;
		}
	}
	async fetchAllSkills(url, options = {}) {
		try {
			const candidates = await this.fetchIndexCandidates(url);
			const scope = this.getScope(url);
			const scopedCandidates = scope ? candidates.filter((c) => c.resolvedBaseUrl !== scope.rootBaseUrl) : candidates;
			const includeInternal = options.includeInternal || shouldInstallInternalSkills();
			for (const result of scopedCandidates) {
				const skillPromises = result.entries.map((entry) => this.fetchSkillByEntry(entry));
				const skills = (await Promise.all(skillPromises)).filter((s) => s !== null).filter((skill) => includeInternal || skill.metadata?.internal !== true);
				if (skills.length > 0) return skills;
			}
			if (scope && scopedCandidates.length < candidates.length) throw new WellKnownScopeNotFoundError(scope.scopePath, scope.rootBaseUrl);
			return [];
		} catch (error) {
			if (error instanceof WellKnownScopeNotFoundError) throw error;
			return [];
		}
	}
	computeDigest(bytes) {
		return `sha256:${createHash$1("sha256").update(bytes).digest("hex")}`;
	}
	extractArchive(bytes, artifactUrl, contentType) {
		if (this.isZipArchive(bytes, artifactUrl, contentType)) return new Map(readZipArchive(bytes, {
			maxExtractedBytes: MAX_ARCHIVE_UNPACKED_BYTES,
			maxEntries: MAX_ARCHIVE_FILES
		}));
		if (this.isTarGzArchive(bytes, artifactUrl, contentType)) return this.extractTarGz(bytes);
		throw new Error("Unsupported archive format");
	}
	isZipArchive(bytes, artifactUrl, contentType) {
		return contentType.includes("application/zip") || artifactUrl.toLowerCase().endsWith(".zip") || bytes[0] === 80 && bytes[1] === 75;
	}
	isTarGzArchive(bytes, artifactUrl, contentType) {
		const lower = artifactUrl.toLowerCase();
		return contentType.includes("application/gzip") || contentType.includes("application/x-gzip") || lower.endsWith(".tar.gz") || lower.endsWith(".tgz") || bytes[0] === 31 && bytes[1] === 139;
	}
	normalizeArchivePath(rawPath) {
		if (!rawPath || rawPath.includes("\0")) return null;
		if (rawPath.startsWith("/") || rawPath.startsWith("\\")) return null;
		if (/^[A-Za-z]:/.test(rawPath)) return null;
		if (rawPath.includes("\\")) return null;
		const parts = rawPath.split("/").filter(Boolean);
		if (parts.length === 0) return null;
		if (parts.some((part) => part === "." || part === "..")) return null;
		return parts.join("/");
	}
	addArchiveFile(files, path, content, runningTotal) {
		const normalizedPath = this.normalizeArchivePath(path);
		if (!normalizedPath) throw new Error(`Unsafe archive path: ${path}`);
		runningTotal.bytes += content.byteLength;
		if (runningTotal.bytes > MAX_ARCHIVE_UNPACKED_BYTES) throw new Error("Archive exceeds maximum unpacked size");
		if (files.size >= MAX_ARCHIVE_FILES) throw new Error("Archive contains too many files");
		files.set(normalizedPath, content);
	}
	extractTarGz(bytes) {
		const tar = gunzipSync(Buffer.from(bytes));
		const files = /* @__PURE__ */ new Map();
		const runningTotal = { bytes: 0 };
		let offset = 0;
		while (offset + 512 <= tar.length) {
			const header = tar.subarray(offset, offset + 512);
			if (header.every((byte) => byte === 0)) break;
			const name = this.readTarString(header, 0, 100);
			const sizeText = this.readTarString(header, 124, 12).trim();
			const typeFlag = header[156];
			const prefix = this.readTarString(header, 345, 155);
			const path = prefix ? `${prefix}/${name}` : name;
			const size = Number.parseInt(sizeText || "0", 8);
			if (!Number.isFinite(size) || size < 0) throw new Error("Invalid tar entry size");
			offset += 512;
			if (typeFlag === 50 || typeFlag === 49) throw new Error("Archive links are not supported");
			if (typeFlag === 0 || typeFlag === 48) {
				const content = tar.subarray(offset, offset + size);
				this.addArchiveFile(files, path, new Uint8Array(content), runningTotal);
			}
			offset += Math.ceil(size / 512) * 512;
		}
		if (!files.has("SKILL.md")) throw new Error("Archive missing root SKILL.md");
		return files;
	}
	readTarString(buffer, offset, length) {
		const slice = buffer.subarray(offset, offset + length);
		const nul = slice.indexOf(0);
		return new TextDecoder().decode(nul >= 0 ? slice.subarray(0, nul) : slice);
	}
	toRawUrl(url) {
		try {
			const parsed = new URL(url);
			if (url.toLowerCase().endsWith("/skill.md")) return url;
			const primaryPath = this.WELL_KNOWN_PATHS[0];
			const pathMatch = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
			if (pathMatch && pathMatch[1]) {
				const basePath = parsed.pathname.replace(/\/.well-known\/(?:agent-skills|skills)\/.*$/, "");
				return `${parsed.protocol}//${parsed.host}${basePath}/${primaryPath}/${pathMatch[1]}/SKILL.md`;
			}
			const basePath = parsed.pathname.replace(/\/$/, "");
			return `${parsed.protocol}//${parsed.host}${basePath}/${primaryPath}/${this.INDEX_FILE}`;
		} catch {
			return url;
		}
	}
	getSourceIdentifier(url) {
		try {
			return new URL(url).hostname.replace(/^www\./, "");
		} catch {
			return "unknown";
		}
	}
	async hasSkillsIndex(url) {
		return await this.fetchIndex(url) !== null;
	}
};
function computeWellKnownSkillDigest(skill) {
	if ("digest" in skill.indexEntry && skill.indexEntry.digest) return skill.indexEntry.digest;
	const hash = createHash$1("sha256");
	for (const path of Array.from(skill.files.keys()).sort()) {
		hash.update(path);
		hash.update("\0");
		hash.update(skill.files.get(path));
		hash.update("\0");
	}
	return `sha256:${hash.digest("hex")}`;
}
const wellKnownProvider = new WellKnownProvider();
export { ArchiveValidationError, EVE_SUBAGENTS_DIR, GitCloneError, InvalidLocalLockError, SKILLS_SH_CONFIG_FILE, WellKnownProvider, WellKnownScopeNotFoundError, addSkillToLocalLock, agents, cleanupTempDir, cloneRepo, computeSkillFolderHash, computeWellKnownSkillDigest, detectInstalledAgents, discoverSkills, filterSkills, findProvider, frozenLockfileError, getAgentBaseDir, getAgentConfig, getCanonicalPath, getCanonicalSkillsDir, getEveSubagentSkillsDir, getEveSubagents, getGitHubHost, getGitTreeHash, getInstallPath, getNonUniversalAgents, getOpenClawGlobalSkillsDir, getOwnerRepo, getPluginGroupings, getPluginSkillPaths, getProviders, getSkillDisplayName, getUniversalAgents, getVisibleUniversalAgents, hasSkillMd, installBlobSkillForAgent, installRemoteSkillForAgent, installSkillForAgent, installWellKnownSkillForAgent, isCommitSha, isGitHubHttpsCloneUrl, isGitHubSsoAuthError, isKimchiInstalled, isMiniMaxCodeInstalled, isMissingRefError, isPositAssistantInstalled, isRepoPrivate, isSkillInstalled, isSubpathSafe, isUniversalAgent, isZCodeInstalled, listInstalledSkills, lockChangeReason, parseFrontmatter, parseGitHubRepoUrl, parseOwnerRepo, parseSkillMd, parseSkillsShPaths, parseSource, readLocalLock, readZipArchive, registerProvider, registry, removeSkillFromLocalLock, sanitizeMetadata, sanitizeName, sanitizeSubpath, shouldInstallInternalSkills, stripTerminalEscapes, wellKnownProvider, writeLocalLock };
