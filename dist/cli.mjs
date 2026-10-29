#!/usr/bin/env node
import { __toESM } from "./_chunks/rolldown-runtime.mjs";
import { isCancel } from "./_chunks/libs/@clack/core.mjs";
import { cancel, confirm, intro, log, multiselect, note, outro, select, spinner } from "./_chunks/libs/@clack/prompts.mjs";
import { require_picocolors } from "./_chunks/libs/picocolors.mjs";
import { ArchiveValidationError, GitCloneError, InvalidLocalLockError, SKILLS_SH_CONFIG_FILE, WellKnownScopeNotFoundError, addSkillToLocalLock, agents, cleanupTempDir, cloneRepo, computeSkillFolderHash, computeWellKnownSkillDigest, detectInstalledAgents, discoverSkills, filterSkills, frozenLockfileError, getCanonicalPath, getCanonicalSkillsDir, getEveSubagentSkillsDir, getEveSubagents, getGitHubHost, getGitTreeHash, getInstallPath, getNonUniversalAgents, getOwnerRepo, getSkillDisplayName, getUniversalAgents, getVisibleUniversalAgents, hasSkillMd, installBlobSkillForAgent, installSkillForAgent, installWellKnownSkillForAgent, isRepoPrivate, isSkillInstalled, isUniversalAgent, listInstalledSkills, lockChangeReason, parseFrontmatter, parseOwnerRepo, parseSkillMd, parseSkillsShPaths, parseSource, readLocalLock, readZipArchive, removeSkillFromLocalLock, sanitizeMetadata, sanitizeName, stripTerminalEscapes, wellKnownProvider, writeLocalLock } from "./_chunks/providers.mjs";
import { require_dist } from "./_chunks/libs/@vercel/detect-agent.mjs";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, dirname, join, normalize, posix, relative, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { stripVTControlCharacters } from "node:util";
import { createWriteStream } from "node:fs";
import { dirname as dirname$1, join as join$1, normalize as normalize$1, relative as relative$1, resolve as resolve$1, sep as sep$1 } from "node:path";
import { homedir, tmpdir } from "os";
import * as readline from "readline";
import { Writable } from "stream";
import { spawn } from "child_process";
import { cp, glob, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, writeFile } from "fs/promises";
import { parse } from "yaml";
import "crypto";
import { cp as cp$1, mkdir as mkdir$1, mkdtemp as mkdtemp$1, readFile as readFile$1, rm as rm$1, stat as stat$1, writeFile as writeFile$1 } from "node:fs/promises";
import { createHash as createHash$1 } from "node:crypto";
import { tmpdir as tmpdir$1 } from "node:os";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";
import { execFile as execFile$1, spawn as spawn$1 } from "node:child_process";
var import_picocolors = /* @__PURE__ */ __toESM(require_picocolors(), 1);
const silentOutput = new Writable({ write(_chunk, _encoding, callback) {
	callback();
} });
const S_STEP_ACTIVE = import_picocolors.default.green("◆");
const S_STEP_CANCEL = import_picocolors.default.red("■");
const S_STEP_SUBMIT = import_picocolors.default.green("◇");
const S_RADIO_ACTIVE = import_picocolors.default.green("●");
const S_RADIO_INACTIVE = import_picocolors.default.dim("○");
import_picocolors.default.green("✓");
const S_BULLET = import_picocolors.default.green("•");
const S_BAR = import_picocolors.default.dim("│");
const S_BAR_H = import_picocolors.default.dim("─");
const cancelSymbol = Symbol("cancel");
function approxStringWidth(plain) {
	let width = 0;
	for (const ch of plain) {
		const code = ch.codePointAt(0);
		if (code === 0) continue;
		width += code >= 4352 && code <= 4447 || code >= 8986 && code <= 8987 || code >= 9001 && code <= 9002 || code >= 9193 && code <= 9196 || code === 9200 || code === 9203 || code >= 9725 && code <= 9726 || code >= 9748 && code <= 9749 || code >= 9800 && code <= 9811 || code >= 9855 && code <= 9855 || code >= 9875 && code <= 9875 || code >= 9889 && code <= 9889 || code >= 9898 && code <= 9899 || code >= 9917 && code <= 9918 || code >= 9924 && code <= 9925 || code >= 9934 && code <= 9934 || code >= 9940 && code <= 9940 || code >= 9962 && code <= 9962 || code >= 9970 && code <= 9971 || code >= 9973 && code <= 9973 || code >= 9978 && code <= 9978 || code >= 9981 && code <= 9981 || code >= 9989 && code <= 9989 || code >= 9994 && code <= 9995 || code >= 10024 && code <= 10024 || code >= 10060 && code <= 10060 || code >= 10062 && code <= 10062 || code >= 10067 && code <= 10069 || code >= 10071 && code <= 10071 || code >= 10133 && code <= 10135 || code >= 10160 && code <= 10160 || code >= 10175 && code <= 10175 || code >= 11035 && code <= 11036 || code >= 11088 && code <= 11088 || code >= 11093 && code <= 11093 || code >= 11904 && code <= 42191 && code !== 12351 || code >= 43360 && code <= 43388 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65040 && code <= 65049 || code >= 65072 && code <= 65135 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 126976 && code <= 129535 ? 2 : 1;
	}
	return width;
}
function visualRowsForLine(line, columns) {
	const plain = stripVTControlCharacters(line);
	const cols = Math.max(1, columns);
	const w = approxStringWidth(plain);
	return Math.max(1, Math.ceil(w / cols));
}
function countVisualRowsForLines(lines, columns) {
	const cols = columns !== void 0 && columns > 0 ? columns : process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
	return lines.reduce((sum, line) => sum + visualRowsForLine(line, cols), 0);
}
function truncateToWidth(text, width) {
	let truncated = "";
	for (const char of text) {
		if (approxStringWidth(truncated + char) > width) break;
		truncated += char;
	}
	return truncated;
}
function formatDetailLines(detail, width, maxLines) {
	const safeWidth = Math.max(1, width);
	const normalized = detail?.replace(/\s+/g, " ").trim() ?? "";
	const lines = [];
	let remaining = normalized;
	while (remaining && lines.length < maxLines) {
		if (approxStringWidth(remaining) <= safeWidth) {
			lines.push(remaining);
			remaining = "";
			break;
		}
		const candidate = truncateToWidth(remaining, safeWidth);
		const breakAt = candidate.lastIndexOf(" ");
		if (breakAt > 0) {
			lines.push(candidate.slice(0, breakAt).trimEnd());
			remaining = remaining.slice(breakAt).trimStart();
		} else {
			lines.push(candidate);
			remaining = remaining.slice(candidate.length).trimStart();
		}
	}
	if (remaining && lines.length > 0) {
		const last = lines.length - 1;
		lines[last] = `${truncateToWidth(lines[last], Math.max(0, safeWidth - 1)).trimEnd()}…`;
	}
	while (lines.length < maxLines) lines.push("");
	return lines;
}
function buildSearchEntries(items, selectGroups, collapsedGroups = /* @__PURE__ */ new Set()) {
	if (!selectGroups) return items.map((item) => ({
		type: "item",
		item
	}));
	const entries = [];
	let index = 0;
	while (index < items.length) {
		const item = items[index];
		if (!item.group) {
			entries.push({
				type: "item",
				item
			});
			index += 1;
			continue;
		}
		const groupItems = [];
		while (index < items.length && items[index].group === item.group) {
			groupItems.push(items[index]);
			index += 1;
		}
		const collapsed = collapsedGroups.has(item.group);
		entries.push({
			type: "group",
			group: item.group,
			items: groupItems,
			collapsed
		});
		if (!collapsed) entries.push(...groupItems.map((groupItem) => ({
			type: "item",
			item: groupItem
		})));
	}
	return entries;
}
function toggleSearchEntry(selected, entry) {
	if (entry?.type === "group") {
		const allSelected = entry.items.every((item) => selected.has(item.value));
		for (const item of entry.items) if (allSelected) selected.delete(item.value);
		else selected.add(item.value);
	} else if (entry?.type === "item") if (selected.has(entry.item.value)) selected.delete(entry.item.value);
	else selected.add(entry.item.value);
}
function getSelectAllState(selected, items) {
	const selectedCount = items.filter((item) => selected.has(item.value)).length;
	if (selectedCount === 0) return "none";
	if (selectedCount === items.length) return "all";
	return "partial";
}
function toggleAllItems(selected, items) {
	const shouldClear = getSelectAllState(selected, items) === "all";
	for (const item of items) if (shouldClear) selected.delete(item.value);
	else selected.add(item.value);
}
async function searchMultiselect(options) {
	const { message, items, maxVisible = 8, initialSelected = [], required = false, lockedSection, searchable = true, showDetail = false, detailLines = 2, showSelectedSummary = true, selectGroups = false, selectAll = false } = options;
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: silentOutput,
			terminal: false
		});
		if (process.stdin.isTTY) process.stdin.setRawMode(true);
		readline.emitKeypressEvents(process.stdin, rl);
		let query = "";
		let cursor = 0;
		const selected = new Set(initialSelected);
		const collapsedGroups = /* @__PURE__ */ new Set();
		let lastRenderHeight = 0;
		const lockedValues = lockedSection ? lockedSection.items.map((i) => i.value) : [];
		const filter = (item, q) => {
			if (!q) return true;
			const lowerQ = q.toLowerCase();
			return item.label.toLowerCase().includes(lowerQ) || String(item.value).toLowerCase().includes(lowerQ);
		};
		const getFiltered = () => {
			return items.filter((item) => filter(item, query));
		};
		const render = (state = "active") => {
			const lines = [];
			const filtered = getFiltered();
			const entries = buildSearchEntries(filtered, selectGroups, collapsedGroups);
			const hasSelectAll = selectAll && items.length > 0;
			const entryCursor = cursor - (hasSelectAll ? 1 : 0);
			const icon = state === "active" ? S_STEP_ACTIVE : state === "cancel" ? S_STEP_CANCEL : S_STEP_SUBMIT;
			lines.push(`${icon}  ${import_picocolors.default.bold(message)}`);
			if (state === "active") {
				if (lockedSection && lockedSection.items.length > 0) {
					lines.push(`${S_BAR}`);
					const lockedTitle = `${import_picocolors.default.bold(lockedSection.title)} ${import_picocolors.default.dim("── always included")}`;
					lines.push(`${S_BAR}  ${S_BAR_H}${S_BAR_H} ${lockedTitle} ${S_BAR_H.repeat(12)}`);
					for (const item of lockedSection.items) lines.push(`${S_BAR}    ${S_BULLET} ${import_picocolors.default.bold(item.label)}`);
					if (lockedSection.hiddenCount && lockedSection.hiddenCount > 0) lines.push(`${S_BAR}    ${import_picocolors.default.dim(`…and ${lockedSection.hiddenCount} more`)}`);
					lines.push(`${S_BAR}`);
					lines.push(`${S_BAR}  ${S_BAR_H}${S_BAR_H} ${import_picocolors.default.bold("Additional agents")} ${S_BAR_H.repeat(29)}`);
				}
				if (searchable) {
					const searchLine = `${S_BAR}  ${import_picocolors.default.dim("Search:")} ${query}${import_picocolors.default.inverse(" ")}`;
					lines.push(searchLine);
					lines.push(`${S_BAR}  ${import_picocolors.default.dim("↑↓ move, space select, enter confirm")}`);
					lines.push(`${S_BAR}`);
				}
				if (hasSelectAll) {
					const selectedCount = items.filter((item) => selected.has(item.value)).length;
					const selectAllState = getSelectAllState(selected, items);
					const radio = selectAllState === "all" ? S_RADIO_ACTIVE : selectAllState === "partial" ? import_picocolors.default.yellow("◐") : S_RADIO_INACTIVE;
					const isCursor = cursor === 0;
					const prefix = isCursor ? import_picocolors.default.cyan("❯") : " ";
					const label = isCursor ? import_picocolors.default.underline(import_picocolors.default.bold("Select All")) : import_picocolors.default.bold("Select All");
					lines.push(`${S_BAR} ${prefix} ${radio} ${label} ${import_picocolors.default.dim(`(${selectedCount}/${items.length})`)}`);
					lines.push(`${S_BAR}   ${S_BAR_H.repeat(36)}`);
				}
				const columns = process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
				const buildFooterLines = (includeDetail, includeSelectedSummary) => {
					const footerLines = [];
					if (includeDetail) {
						const entry = entries[entryCursor];
						const detail = hasSelectAll && cursor === 0 ? `Select or clear all ${items.length} skills.` : entry?.type === "group" ? `Select all ${entry.items.length} skills in ${entry.group}.` : entry?.item.detail;
						const detailWidth = Math.max(1, columns - 5);
						footerLines.push(`${S_BAR}`);
						footerLines.push(`${S_BAR}  ${import_picocolors.default.dim("Description")}`);
						for (const line of formatDetailLines(detail, detailWidth, detailLines)) footerLines.push(`${S_BAR}  ${import_picocolors.default.dim(line)}`);
					}
					if (includeSelectedSummary) {
						footerLines.push(`${S_BAR}`);
						const allSelectedLabels = [...lockedSection ? lockedSection.items.map((i) => i.label) : [], ...items.filter((item) => selected.has(item.value)).map((item) => item.label)];
						if (allSelectedLabels.length === 0) footerLines.push(`${S_BAR}  ${import_picocolors.default.dim("Selected: (none)")}`);
						else {
							const summary = allSelectedLabels.length <= 3 ? allSelectedLabels.join(", ") : `${allSelectedLabels.slice(0, 3).join(", ")} +${allSelectedLabels.length - 3} more`;
							footerLines.push(`${S_BAR}  ${import_picocolors.default.green("Selected:")} ${summary}`);
						}
					}
					if (!searchable) {
						footerLines.push(`${S_BAR}`);
						footerLines.push(`${S_BAR}  ${import_picocolors.default.dim("↑↓ move, ←→ collapse/expand, space select, enter confirm")}`);
					}
					footerLines.push(`${import_picocolors.default.dim("└")}`);
					return footerLines;
				};
				const buildItemLines = (visibleLimit) => {
					if (filtered.length === 0) return [`${S_BAR}  ${import_picocolors.default.dim("No matches found")}`];
					const itemLines = [];
					const visibleStart = Math.max(0, Math.min(entryCursor - Math.floor(visibleLimit / 2), entries.length - visibleLimit));
					const visibleEnd = Math.min(entries.length, visibleStart + visibleLimit);
					const visibleEntries = entries.slice(visibleStart, visibleEnd);
					for (let i = 0; i < visibleEntries.length; i++) {
						const entry = visibleEntries[i];
						const isCursor = visibleStart + i === entryCursor;
						if (entry.type === "group") {
							const selectedCount = entry.items.filter((item) => selected.has(item.value)).length;
							const radio = selectedCount === entry.items.length ? S_RADIO_ACTIVE : selectedCount > 0 ? import_picocolors.default.yellow("◐") : S_RADIO_INACTIVE;
							const label = isCursor ? import_picocolors.default.underline(import_picocolors.default.bold(entry.group)) : import_picocolors.default.bold(entry.group);
							const prefix = isCursor ? import_picocolors.default.cyan("❯") : " ";
							const disclosure = import_picocolors.default.dim(entry.collapsed ? "▸" : "▾");
							itemLines.push(`${S_BAR} ${prefix} ${disclosure} ${radio} ${label}`);
							continue;
						}
						const item = entry.item;
						const radio = selected.has(item.value) ? S_RADIO_ACTIVE : S_RADIO_INACTIVE;
						const label = isCursor ? import_picocolors.default.underline(item.label) : item.label;
						const hint = item.hint ? import_picocolors.default.dim(` (${item.hint})`) : "";
						const prefix = isCursor ? import_picocolors.default.cyan("❯") : " ";
						const groupItems = selectGroups && item.group ? filtered.filter((i) => i.group === item.group) : [];
						const isLastInGroup = groupItems.at(-1) === item;
						const tree = groupItems.length > 0 ? `${import_picocolors.default.dim(isLastInGroup ? "└─" : "├─")} ` : "";
						itemLines.push(`${S_BAR} ${prefix} ${tree}${radio} ${label}${hint}`);
					}
					const hiddenBefore = visibleStart;
					const hiddenAfter = entries.length - visibleEnd;
					if (hiddenBefore > 0 || hiddenAfter > 0) {
						const parts = [];
						if (hiddenBefore > 0) parts.push(`↑ ${hiddenBefore} more`);
						if (hiddenAfter > 0) parts.push(`↓ ${hiddenAfter} more`);
						itemLines.push(`${S_BAR}  ${import_picocolors.default.dim(parts.join("  "))}`);
					}
					return itemLines;
				};
				const terminalRows = process.stdout.rows && process.stdout.rows > 0 ? process.stdout.rows : void 0;
				const maxFrameRows = terminalRows ? Math.max(1, terminalRows - 1) : void 0;
				const fitFrame = (includeDetail, includeSelectedSummary) => {
					const footerLines = buildFooterLines(includeDetail, includeSelectedSummary);
					let visibleLimit = Math.max(1, maxVisible);
					let itemLines = buildItemLines(visibleLimit);
					let frameRows = countVisualRowsForLines([
						...lines,
						...itemLines,
						...footerLines
					], columns);
					while (maxFrameRows && frameRows > maxFrameRows && visibleLimit > 1) {
						visibleLimit -= 1;
						itemLines = buildItemLines(visibleLimit);
						frameRows = countVisualRowsForLines([
							...lines,
							...itemLines,
							...footerLines
						], columns);
					}
					return {
						itemLines,
						footerLines,
						frameRows
					};
				};
				let includeDetail = showDetail;
				let includeSelectedSummary = showSelectedSummary;
				let fitted = fitFrame(includeDetail, includeSelectedSummary);
				if (maxFrameRows && fitted.frameRows > maxFrameRows && includeDetail) {
					includeDetail = false;
					fitted = fitFrame(includeDetail, includeSelectedSummary);
				}
				if (maxFrameRows && fitted.frameRows > maxFrameRows && includeSelectedSummary) {
					includeSelectedSummary = false;
					fitted = fitFrame(includeDetail, includeSelectedSummary);
				}
				lines.push(...fitted.itemLines, ...fitted.footerLines);
			} else if (state === "submit") {
				const allSelectedLabels = [...lockedSection ? lockedSection.items.map((i) => i.label) : [], ...items.filter((item) => selected.has(item.value)).map((item) => item.label)];
				lines.push(`${S_BAR}  ${import_picocolors.default.dim(allSelectedLabels.join(", "))}`);
			} else if (state === "cancel") lines.push(`${S_BAR}  ${import_picocolors.default.strikethrough(import_picocolors.default.dim("Cancelled"))}`);
			const clearPreviousFrame = lastRenderHeight > 0 ? `\x1b[${lastRenderHeight}A\x1b[J` : "";
			process.stdout.write(clearPreviousFrame + lines.join("\n") + "\n");
			lastRenderHeight = countVisualRowsForLines(lines, process.stdout.columns);
		};
		const cleanup = () => {
			rl.removeListener("close", closeHandler);
			process.stdin.removeListener("keypress", keypressHandler);
			if (process.stdin.isTTY) process.stdin.setRawMode(false);
			rl.close();
		};
		let settled = false;
		const submit = () => {
			if (settled) return;
			if (required && selected.size === 0 && lockedValues.length === 0) return;
			settled = true;
			render("submit");
			cleanup();
			resolve([...lockedValues, ...Array.from(selected)]);
		};
		const cancel = () => {
			if (settled) return;
			settled = true;
			render("cancel");
			cleanup();
			resolve(cancelSymbol);
		};
		const closeHandler = () => {
			cancel();
		};
		const keypressHandler = (_str, key) => {
			if (!key) return;
			const entries = buildSearchEntries(getFiltered(), selectGroups, collapsedGroups);
			const hasSelectAll = selectAll && items.length > 0;
			const cursorOffset = hasSelectAll ? 1 : 0;
			const entry = entries[cursor - cursorOffset];
			if (key.name === "return") {
				submit();
				return;
			}
			if (key.name === "escape" || key.ctrl && key.name === "c") {
				cancel();
				return;
			}
			if (key.name === "up") {
				cursor = Math.max(0, cursor - 1);
				render();
				return;
			}
			if (key.name === "down") {
				cursor = Math.min(entries.length + cursorOffset - 1, cursor + 1);
				render();
				return;
			}
			if (selectGroups && key.name === "right") {
				if (entry?.type === "group" && entry.collapsed) {
					collapsedGroups.delete(entry.group);
					render();
				}
				return;
			}
			if (selectGroups && key.name === "left") {
				const group = entry?.type === "group" ? entry.group : entry?.item.group;
				if (group) {
					collapsedGroups.add(group);
					cursor = buildSearchEntries(getFiltered(), selectGroups, collapsedGroups).findIndex((collapsedEntry) => collapsedEntry.type === "group" && collapsedEntry.group === group) + cursorOffset;
					render();
				}
				return;
			}
			if (key.name === "space") {
				if (hasSelectAll && cursor === 0) toggleAllItems(selected, items);
				else toggleSearchEntry(selected, entry);
				render();
				return;
			}
			if (key.name === "backspace") {
				query = query.slice(0, -1);
				cursor = 0;
				render();
				return;
			}
			if (searchable && key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
				query += key.sequence;
				cursor = 0;
				render();
				return;
			}
		};
		process.stdin.on("keypress", keypressHandler);
		rl.on("close", closeHandler);
		if (process.stdin.readableEnded || process.stdin.destroyed) {
			cancel();
			return;
		}
		render();
	});
}
function isCI() {
	return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI || process.env.CIRCLECI || process.env.TRAVIS || process.env.BUILDKITE || process.env.JENKINS_URL || process.env.TEAMCITY_VERSION);
}
const TELEMETRY_URL = "https://www.skills.sh/tele/t";
const AUDIT_URL = "https://www.skills.sh/tele/audit";
let cliVersion = null;
let detectedAgentName = null;
function setDetectedAgent(agentName) {
	detectedAgentName = agentName;
}
function isEnabled() {
	return !process.env.DISABLE_TELEMETRY && !process.env.DO_NOT_TRACK;
}
function setVersion(version) {
	cliVersion = version;
}
async function fetchAuditData(source, skillSlugs, timeoutMs = 3e3) {
	if (!isEnabled()) return null;
	if (skillSlugs.length === 0) return null;
	try {
		const params = new URLSearchParams({
			source,
			skills: skillSlugs.join(",")
		});
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		const response = await fetch(`${AUDIT_URL}?${params.toString()}`, { signal: controller.signal });
		clearTimeout(timeout);
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}
const pendingTelemetry = [];
function track(data) {
	if (!isEnabled()) return;
	try {
		const params = new URLSearchParams();
		if (cliVersion) params.set("v", cliVersion);
		if (isCI()) params.set("ci", "1");
		if (detectedAgentName) params.set("agent", detectedAgentName);
		for (const [key, value] of Object.entries(data)) if (value !== void 0 && value !== null) params.set(key, String(value));
		const p = fetch(`${TELEMETRY_URL}?${params.toString()}`).catch(() => {}).then(() => {});
		pendingTelemetry.push(p);
	} catch {}
}
async function flushTelemetry(timeoutMs = 5e3) {
	if (pendingTelemetry.length === 0) return;
	const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
	await Promise.race([Promise.all(pendingTelemetry), timeout]);
}
var import_dist = require_dist();
let cachedResult = null;
function hasStrongCursorAgentSignal() {
	return Boolean(process.env.CURSOR_AGENT?.trim()) || process.env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec";
}
function refineAgentResult(result) {
	if (!result.isAgent || !result.agent) return result;
	if (result.agent.name === "cursor" || result.agent.name === "cursor-cli") {
		if (!hasStrongCursorAgentSignal()) return {
			isAgent: false,
			agent: void 0
		};
		if (result.agent.name === "cursor") return {
			isAgent: true,
			agent: { name: "cursor-cli" }
		};
	}
	return result;
}
const agentNameToType = {
	cursor: "cursor",
	"cursor-cli": "cursor",
	claude: "claude-code",
	cowork: "claude-code",
	devin: "universal",
	replit: "replit",
	gemini: "gemini-cli",
	codex: "codex",
	antigravity: "antigravity",
	"augment-cli": "augment",
	opencode: "opencode",
	"github-copilot": "github-copilot"
};
async function detectAgent() {
	if (cachedResult) return cachedResult;
	cachedResult = refineAgentResult(await (0, import_dist.determineAgent)());
	if (cachedResult.isAgent) setDetectedAgent(cachedResult.agent.name);
	return cachedResult;
}
async function isRunningInAgent() {
	return (await detectAgent()).isAgent;
}
function getAgentType(agentName) {
	return agentNameToType[agentName] ?? null;
}
const DEFAULT_DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_EXTRACT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_EXTRACT_MAX_FILES = 1e3;
const FETCH_TIMEOUT_MS = 3e4;
function positiveIntegerOr(value, fallback) {
	return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}
function getPositiveIntegerEnv(name, fallback) {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function getDownloadLimits(options) {
	return {
		downloadMaxBytes: getPositiveIntegerEnv("SKILLS_DOWNLOAD_MAX_BYTES", positiveIntegerOr(options.downloadMaxBytes, DEFAULT_DOWNLOAD_MAX_BYTES)),
		extractMaxBytes: getPositiveIntegerEnv("SKILLS_EXTRACT_MAX_BYTES", positiveIntegerOr(options.extractMaxBytes, DEFAULT_EXTRACT_MAX_BYTES)),
		extractMaxFiles: getPositiveIntegerEnv("SKILLS_EXTRACT_MAX_FILES", positiveIntegerOr(options.extractMaxFiles, DEFAULT_EXTRACT_MAX_FILES))
	};
}
function isPathSafe$1(basePath, targetPath) {
	const normalizedBase = normalize$1(resolve$1(basePath));
	const normalizedTarget = normalize$1(resolve$1(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep$1) || normalizedTarget === normalizedBase;
}
function validateArchivePath(path) {
	const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
	if (!normalized || normalized.endsWith("/")) return normalized;
	if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return null;
	if (normalized.split("/").includes("..")) return null;
	return normalized;
}
function incrementEntry(state, size, limits) {
	state.entries += 1;
	if (state.entries > limits.extractMaxFiles) throw new ArchiveValidationError(`Archive contains too many files (${state.entries}). Maximum is ${limits.extractMaxFiles}. Set SKILLS_EXTRACT_MAX_FILES to override.`);
	state.bytes += size;
	if (state.bytes > limits.extractMaxBytes) throw new ArchiveValidationError(`Archive extracts to more than ${limits.extractMaxBytes} bytes. Set SKILLS_EXTRACT_MAX_BYTES to override.`);
}
async function downloadToFile(url, targetFile, limits) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		redirect: "follow"
	});
	if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);
	const contentLength = response.headers.get("content-length");
	if (contentLength) {
		const parsed = Number.parseInt(contentLength, 10);
		if (Number.isFinite(parsed) && parsed > limits.downloadMaxBytes) throw new Error(`Download is larger than ${limits.downloadMaxBytes} bytes. Set SKILLS_DOWNLOAD_MAX_BYTES to override.`);
	}
	if (!response.body) throw new Error("Download response has no body");
	let downloaded = 0;
	const limitStream = new TransformStream({ transform(chunk, controller) {
		downloaded += chunk.byteLength;
		if (downloaded > limits.downloadMaxBytes) throw new Error(`Download is larger than ${limits.downloadMaxBytes} bytes. Set SKILLS_DOWNLOAD_MAX_BYTES to override.`);
		controller.enqueue(chunk);
	} });
	await pipeline(response.body.pipeThrough(limitStream), createWriteStream(targetFile));
}
async function isValidSkillMarkdown(filePath) {
	try {
		const { data } = parseFrontmatter(await readFile$1(filePath, "utf-8"));
		return typeof data.name === "string" && typeof data.description === "string";
	} catch {
		return false;
	}
}
async function extractZip(filePath, extractDir, limits) {
	const files = readZipArchive(await readFile$1(filePath), {
		maxExtractedBytes: limits.extractMaxBytes,
		maxEntries: limits.extractMaxFiles
	});
	for (const [path, contents] of files) {
		const targetPath = join$1(extractDir, path);
		if (!isPathSafe$1(extractDir, targetPath)) throw new ArchiveValidationError(`Archive contains unsafe path: ${path}`);
		await mkdir$1(dirname$1(targetPath), { recursive: true });
		await writeFile$1(targetPath, contents);
	}
}
function getTarEntryType(entry) {
	if (entry instanceof tar.ReadEntry) return entry.type;
	if (entry.isFile()) return "File";
	if (entry.isDirectory()) return "Directory";
	return "";
}
function isTarEntryFile(entry) {
	const type = getTarEntryType(entry);
	return type === "File" || type === "OldFile" || type === "ContiguousFile";
}
async function extractTar(filePath, extractDir, limits) {
	const state = {
		bytes: 0,
		entries: 0
	};
	let validationError;
	await tar.x({
		strict: true,
		filter(entryPath, entry) {
			if (validationError) return false;
			try {
				const safePath = validateArchivePath(entryPath);
				if (safePath === null) throw new ArchiveValidationError(`Archive contains unsafe path: ${entryPath}`);
				if (!isPathSafe$1(extractDir, join$1(extractDir, safePath))) throw new ArchiveValidationError(`Archive contains unsafe path: ${entryPath}`);
				incrementEntry(state, entry.size, limits);
				if (isTarEntryFile(entry)) return true;
				return getTarEntryType(entry) === "Directory";
			} catch (error) {
				if (error instanceof ArchiveValidationError) {
					validationError = error;
					return false;
				}
				throw error;
			}
		},
		cwd: extractDir,
		preservePaths: false,
		noChmod: true,
		file: filePath
	});
	if (validationError) throw validationError;
}
async function tryExtractArchive(filePath, extractDir, limits) {
	const header = await readFile$1(filePath).then((buffer) => buffer.subarray(0, 512));
	const isZip = header[0] === 80 && header[1] === 75;
	const isGzip = header[0] === 31 && header[1] === 139;
	try {
		if (isZip) {
			await extractZip(filePath, extractDir, limits);
			return true;
		}
		if (isGzip) {
			await extractTar(filePath, extractDir, limits);
			return true;
		}
		await extractTar(filePath, extractDir, limits);
		return true;
	} catch (error) {
		await rm$1(extractDir, {
			recursive: true,
			force: true
		}).catch(() => {});
		await mkdir$1(extractDir, { recursive: true });
		if (error instanceof ArchiveValidationError) throw error;
		return false;
	}
}
async function getSingleTopLevelDirectory(dir) {
	const { readdir } = await import("node:fs/promises");
	const visibleEntries = (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.name !== "__MACOSX");
	if (visibleEntries.length !== 1 || !visibleEntries[0].isDirectory()) return null;
	return join$1(dir, visibleEntries[0].name);
}
async function downloadSource(url, options = {}) {
	const limits = getDownloadLimits(options);
	const tempDir = await mkdtemp$1(join$1(tmpdir$1(), "skills-download-"));
	const downloadedFile = join$1(tempDir, "source.download");
	const extractDir = join$1(tempDir, "extract");
	try {
		await downloadToFile(url, downloadedFile, limits);
		if ((await stat$1(downloadedFile)).size === 0) throw new Error("Downloaded URL is empty");
		if (await isValidSkillMarkdown(downloadedFile)) {
			const skillDir = join$1(tempDir, "skill");
			await mkdir$1(skillDir, { recursive: true });
			await writeFile$1(join$1(skillDir, "SKILL.md"), await readFile$1(downloadedFile));
			return {
				rootDir: skillDir,
				tempDir,
				kind: "skill-md"
			};
		}
		await mkdir$1(extractDir, { recursive: true });
		if (await tryExtractArchive(downloadedFile, extractDir, limits)) return {
			rootDir: await getSingleTopLevelDirectory(extractDir) ?? extractDir,
			tempDir,
			kind: "archive"
		};
		throw new Error("Downloaded URL is not a valid SKILL.md file or supported archive");
	} catch (error) {
		await rm$1(tempDir, {
			recursive: true,
			force: true
		}).catch(() => {});
		throw error;
	}
}
const DEFAULT_FETCH_CONCURRENCY = 4;
function fetchConcurrency() {
	const parsed = Number.parseInt(process.env.SKILLS_CLONE_CONCURRENCY ?? "", 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_FETCH_CONCURRENCY;
}
async function mapConcurrent(items, fn, limit = fetchConcurrency()) {
	const results = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await fn(items[index]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}
const AGENTS_DIR = ".agents";
const LOCK_FILE = ".skill-lock.json";
const CURRENT_VERSION = 3;
function getSkillLockPath() {
	const xdgStateHome = process.env.XDG_STATE_HOME;
	if (xdgStateHome) return join(xdgStateHome, "skills", LOCK_FILE);
	return join(homedir(), AGENTS_DIR, LOCK_FILE);
}
async function readSkillLock() {
	const lockPath = getSkillLockPath();
	try {
		const content = await readFile(lockPath, "utf-8");
		const parsed = JSON.parse(content);
		if (typeof parsed.version !== "number" || !parsed.skills) return createEmptyLockFile();
		if (parsed.version < CURRENT_VERSION) return createEmptyLockFile();
		return parsed;
	} catch (error) {
		return createEmptyLockFile();
	}
}
async function writeSkillLock(lock) {
	const lockPath = getSkillLockPath();
	await mkdir(dirname(lockPath), { recursive: true });
	await writeFile(lockPath, JSON.stringify(lock, null, 2), "utf-8");
}
function getGitHubToken() {
	if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
	if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
	return null;
}
async function addSkillToLock(skillName, entry) {
	const lock = await readSkillLock();
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const existingEntry = lock.skills[skillName];
	lock.skills[skillName] = {
		...entry,
		installedAt: existingEntry?.installedAt ?? now,
		updatedAt: now
	};
	await writeSkillLock(lock);
}
async function removeSkillFromLock(skillName) {
	const lock = await readSkillLock();
	if (!(skillName in lock.skills)) return false;
	delete lock.skills[skillName];
	await writeSkillLock(lock);
	return true;
}
async function getSkillFromLock(skillName) {
	return (await readSkillLock()).skills[skillName] ?? null;
}
async function getAllLockedSkills() {
	return (await readSkillLock()).skills;
}
function createEmptyLockFile() {
	return {
		version: CURRENT_VERSION,
		skills: {},
		dismissed: {}
	};
}
async function isPromptDismissed(promptKey) {
	return (await readSkillLock()).dismissed?.[promptKey] === true;
}
async function dismissPrompt(promptKey) {
	const lock = await readSkillLock();
	if (!lock.dismissed) lock.dismissed = {};
	lock.dismissed[promptKey] = true;
	await writeSkillLock(lock);
}
async function getLastSelectedAgents() {
	return (await readSkillLock()).lastSelectedAgents;
}
async function saveSelectedAgents(agents) {
	const lock = await readSkillLock();
	lock.lastSelectedAgents = agents;
	await writeSkillLock(lock);
}
const DOWNLOAD_BASE_URL = process.env.SKILLS_DOWNLOAD_URL || "https://skills.sh";
const BLOB_ALLOWED_REPOS = { "zapier/connectors": { downloadUrl: (slug) => `https://connectors-skills.zapier.com/download/${encodeURIComponent(slug)}/snapshot.json` } };
const FETCH_TIMEOUT = 1e4;
const GH_API_MAX_BUFFER = 16 * 1024 * 1024;
function toSkillSlug(name) {
	return name.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
let _rateLimitedThisSession = false;
async function fetchTreeBranch(ownerRepo, branch, token) {
	try {
		const githubHost = getGitHubHost();
		const url = `${githubHost === "github.com" ? "https://api.github.com" : `https://${githubHost}/api/v3`}/repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
		const headers = {
			Accept: "application/vnd.github.v3+json",
			"User-Agent": "skills-cli"
		};
		if (token) headers["Authorization"] = `Bearer ${token}`;
		const response = await fetch(url, {
			headers,
			signal: AbortSignal.timeout(FETCH_TIMEOUT)
		});
		if (response.ok) {
			const data = await response.json();
			return {
				tree: {
					sha: data.sha,
					branch,
					tree: data.tree
				},
				rateLimited: false,
				authRetryable: false
			};
		}
		return {
			tree: null,
			rateLimited: response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0",
			authRetryable: response.status === 401 || response.status === 404
		};
	} catch {
		return {
			tree: null,
			rateLimited: false,
			authRetryable: false
		};
	}
}
async function fetchTreeWithToken(ownerRepo, branches, getToken) {
	const token = getToken();
	if (!token) return null;
	for (const branch of branches) {
		const result = await fetchTreeBranch(ownerRepo, branch, token);
		if (result.tree) return result.tree;
	}
	return null;
}
async function fetchTreeWithGitHubCli(ownerRepo, branches) {
	for (const branch of branches) try {
		const endpoint = `repos/${ownerRepo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
		const stdout = await new Promise((resolve, reject) => {
			execFile$1("gh", [
				"api",
				endpoint,
				"--method",
				"GET",
				"--hostname",
				getGitHubHost()
			], {
				encoding: "utf8",
				timeout: FETCH_TIMEOUT,
				maxBuffer: GH_API_MAX_BUFFER,
				windowsHide: true,
				env: {
					...process.env,
					GH_PROMPT_DISABLED: "1"
				}
			}, (error, output) => {
				if (error) reject(error);
				else resolve(output);
			});
		});
		const data = JSON.parse(stdout);
		if (typeof data.sha !== "string" || !Array.isArray(data.tree)) continue;
		return {
			sha: data.sha,
			branch,
			tree: data.tree
		};
	} catch {}
	return null;
}
async function fetchTreeWithAvailableAuth(ownerRepo, branches, getToken) {
	if (getToken) {
		const tree = await fetchTreeWithToken(ownerRepo, branches, getToken);
		if (tree) return tree;
	}
	return fetchTreeWithGitHubCli(ownerRepo, branches);
}
async function fetchRepoTree(ownerRepo, ref, getToken) {
	const branches = ref ? [ref] : [
		"HEAD",
		"main",
		"master"
	];
	if (_rateLimitedThisSession) return fetchTreeWithAvailableAuth(ownerRepo, branches, getToken);
	let rateLimited = false;
	let authRetryable = false;
	for (const branch of branches) {
		const result = await fetchTreeBranch(ownerRepo, branch, null);
		if (result.tree) return result.tree;
		if (result.rateLimited) {
			rateLimited = true;
			break;
		}
		if (result.authRetryable) {
			authRetryable = true;
			break;
		}
	}
	if (!(rateLimited || authRetryable)) return null;
	if (rateLimited) _rateLimitedThisSession = true;
	return fetchTreeWithAvailableAuth(ownerRepo, branches, getToken);
}
function getSkillFolderHashFromTree(tree, skillPath) {
	let folderPath = skillPath.replace(/\\/g, "/");
	if (folderPath.toLowerCase().endsWith("/skill.md")) folderPath = folderPath.slice(0, -9);
	else if (folderPath.toLowerCase().endsWith("skill.md")) folderPath = folderPath.slice(0, -8);
	if (folderPath.endsWith("/")) folderPath = folderPath.slice(0, -1);
	if (!folderPath) return tree.sha;
	return tree.tree.find((e) => e.type === "tree" && e.path === folderPath)?.sha ?? null;
}
const PRIORITY_PREFIXES = [
	"",
	"skills/",
	"skills/.curated/",
	"skills/.experimental/",
	"skills/.system/",
	".agents/skills/",
	".claude/skills/",
	".cline/skills/",
	".codebuddy/skills/",
	".codex/skills/",
	".commandcode/skills/",
	".continue/skills/",
	".factory/skills/",
	".github/skills/",
	".goose/skills/",
	".grok/skills/",
	".iflow/skills/",
	".junie/skills/",
	".kilo/skills/",
	".kilocode/skills/",
	".kimchi/skills/",
	".kiro/skills/",
	".minimax/skills/",
	".mux/skills/",
	".neovate/skills/",
	".opencode/skills/",
	".openhands/skills/",
	".pi/skills/",
	".posit/assistant/skills/",
	".qoder/skills/",
	".roo/skills/",
	".trae/skills/",
	".windsurf/skills/",
	".zcode/skills/",
	".zencoder/skills/"
];
function findSkillMdPaths(tree, subpath, extraContainers = []) {
	const allSkillMds = tree.tree.filter((e) => e.type === "blob" && e.path.toLowerCase().endsWith("skill.md")).map((e) => e.path);
	const prefix = subpath ? subpath.endsWith("/") ? subpath : subpath + "/" : "";
	const filtered = prefix ? allSkillMds.filter((p) => p.startsWith(prefix) || p === prefix + "SKILL.md") : allSkillMds;
	if (filtered.length === 0) return [];
	const priorityResults = [];
	const seen = /* @__PURE__ */ new Set();
	const SKIP_DIRS = /* @__PURE__ */ new Set([
		"node_modules",
		".git",
		"dist",
		"build",
		"__pycache__"
	]);
	const lowerSkillMdSet = new Set(filtered.map((p) => p.toLowerCase()));
	const extraPrefixes = extraContainers.reduce((prefixes, dir) => {
		const prefix = `${dir}/`;
		if (!PRIORITY_PREFIXES.includes(prefix)) prefixes.add(prefix);
		return prefixes;
	}, /* @__PURE__ */ new Set());
	const priorityPrefixes = [...PRIORITY_PREFIXES, ...extraPrefixes];
	for (const priorityPrefix of priorityPrefixes) {
		const fullPrefix = prefix + priorityPrefix;
		const isContainer = priorityPrefix !== "";
		const isExtraContainer = extraPrefixes.has(priorityPrefix);
		for (const skillMd of filtered) {
			if (!skillMd.startsWith(fullPrefix)) continue;
			const rest = skillMd.slice(fullPrefix.length);
			if (rest.toLowerCase() === "skill.md") {
				if (isExtraContainer) continue;
				if (!seen.has(skillMd)) {
					priorityResults.push(skillMd);
					seen.add(skillMd);
				}
				continue;
			}
			const parts = rest.split("/");
			if (parts.length === 2 && parts[1].toLowerCase() === "skill.md") {
				if (!seen.has(skillMd)) {
					priorityResults.push(skillMd);
					seen.add(skillMd);
				}
				continue;
			}
			const skillDirs = parts.slice(0, -1);
			const hasAncestorSkill = skillDirs.slice(0, -1).some((_, index) => {
				const ancestorPath = skillDirs.slice(0, index + 1).join("/");
				return lowerSkillMdSet.has(`${fullPrefix}${ancestorPath}/SKILL.md`.toLowerCase());
			});
			if (isContainer && parts.length >= 3 && parts.length <= 4 && parts.at(-1).toLowerCase() === "skill.md" && skillDirs.every((part) => !SKIP_DIRS.has(part)) && !hasAncestorSkill) {
				if (!seen.has(skillMd)) {
					priorityResults.push(skillMd);
					seen.add(skillMd);
				}
			}
		}
	}
	if (priorityResults.length > 0) return priorityResults;
	return filtered.filter((p) => {
		return p.split("/").length <= 6;
	});
}
async function fetchRawContent(ownerRepo, branch, filePath) {
	try {
		const url = `https://raw.githubusercontent.com/${ownerRepo}/${branch}/${filePath}`;
		const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
		if (!response.ok) return null;
		return await response.text();
	} catch {
		return null;
	}
}
async function fetchSkillsShPaths(ownerRepo, tree, subpath) {
	const configPath = (subpath ? subpath.replace(/\/+$/, "") + "/" : "") + SKILLS_SH_CONFIG_FILE;
	if (!tree.tree.some((e) => e.type === "blob" && e.path === configPath)) return [];
	const content = await fetchRawContent(ownerRepo, tree.branch, configPath);
	return content ? parseSkillsShPaths(content) : [];
}
async function fetchSkillDownload(source, slug) {
	try {
		const [owner, repo] = source.split("/");
		const defaultUrl = `${DOWNLOAD_BASE_URL}/api/download/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`;
		const url = BLOB_ALLOWED_REPOS[source.toLowerCase()]?.downloadUrl(slug) ?? defaultUrl;
		const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}
function computeSnapshotHash(files) {
	const hash = createHash$1("sha256");
	for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
		hash.update(file.path);
		hash.update(file.contents);
	}
	return hash.digest("hex");
}
function getSkillFolderPath(skillMdPath) {
	const pathLower = skillMdPath.toLowerCase();
	if (pathLower.endsWith("/skill.md")) return skillMdPath.slice(0, -9);
	if (pathLower === "skill.md") return "";
	return skillMdPath.slice(0, -9);
}
const SNAPSHOT_EXCLUDED_FILES = /* @__PURE__ */ new Set(["metadata.json"]);
const SNAPSHOT_EXCLUDED_DIRS = /* @__PURE__ */ new Set([
	".git",
	"__pycache__",
	"__pypackages__"
]);
function isInstallableSnapshotPath(path) {
	const parts = path.split("/");
	const fileName = parts.at(-1);
	if (!fileName || SNAPSHOT_EXCLUDED_FILES.has(fileName)) return false;
	return parts.slice(0, -1).every((part) => !SNAPSHOT_EXCLUDED_DIRS.has(part));
}
function hasCompleteNestedSnapshot(tree, skillMdPath, files) {
	const folderPath = getSkillFolderPath(skillMdPath);
	if (!folderPath) return true;
	const folderPrefix = `${folderPath}/`;
	const snapshotPaths = new Set(files.map((file) => file.path));
	return tree.tree.every((entry) => {
		if (entry.type !== "blob" || !entry.path.startsWith(folderPrefix)) return true;
		const relativePath = entry.path.slice(folderPrefix.length);
		return !isInstallableSnapshotPath(relativePath) || snapshotPaths.has(relativePath);
	});
}
async function tryBlobInstall(ownerRepo, options = {}) {
	if (options.ref !== void 0) return null;
	const tree = await fetchRepoTree(ownerRepo, options.ref, options.getToken);
	if (!tree) return null;
	const extraContainers = await fetchSkillsShPaths(ownerRepo, tree, options.subpath);
	let skillMdPaths = findSkillMdPaths(tree, options.subpath, extraContainers);
	if (skillMdPaths.length === 0) return null;
	if (options.skillFilter) {
		const filterSlug = toSkillSlug(options.skillFilter);
		const filtered = skillMdPaths.filter((p) => {
			const parts = p.split("/");
			if (parts.length < 2) return false;
			const folderName = parts[parts.length - 2];
			return toSkillSlug(folderName) === filterSlug;
		});
		if (filtered.length > 0) skillMdPaths = filtered;
	}
	const mdFetches = await Promise.all(skillMdPaths.map(async (mdPath) => {
		return {
			mdPath,
			content: await fetchRawContent(ownerRepo, tree.branch, mdPath)
		};
	}));
	const parsedSkills = [];
	for (const { mdPath, content } of mdFetches) {
		if (!content) continue;
		const { data } = parseFrontmatter(content);
		if (!data.name || !data.description) continue;
		if (typeof data.name !== "string" || typeof data.description !== "string") continue;
		if (data.metadata?.internal === true && !options.includeInternal) continue;
		const safeName = sanitizeMetadata(data.name);
		const safeDescription = sanitizeMetadata(data.description);
		parsedSkills.push({
			mdPath,
			name: safeName,
			description: safeDescription,
			content,
			slug: toSkillSlug(safeName),
			metadata: data.metadata
		});
	}
	if (parsedSkills.length === 0) return null;
	let filteredSkills = parsedSkills;
	if (options.skillFilter) {
		const filterSlug = toSkillSlug(options.skillFilter);
		const nameFiltered = parsedSkills.filter((s) => s.slug === filterSlug);
		if (nameFiltered.length > 0) filteredSkills = nameFiltered;
		if (filteredSkills.length === 0) return null;
	}
	const source = ownerRepo.toLowerCase();
	const downloads = await Promise.all(filteredSkills.map(async (skill) => {
		return {
			skill,
			download: await fetchSkillDownload(source, skill.slug)
		};
	}));
	if (!downloads.every((d) => d.download !== null)) return null;
	if (!downloads.every(({ skill, download }) => hasCompleteNestedSnapshot(tree, skill.mdPath, download.files))) return null;
	return {
		skills: downloads.map(({ skill, download }) => {
			const files = getSkillFolderPath(skill.mdPath) ? download.files : download.files.filter((file) => file.path.toLowerCase() === "skill.md");
			return {
				name: skill.name,
				description: skill.description,
				path: "",
				rawContent: skill.content,
				metadata: skill.metadata,
				files,
				snapshotHash: files.length === download.files.length ? download.hash : computeSnapshotHash(files),
				repoPath: skill.mdPath
			};
		}),
		tree
	};
}
var version$1 = "1.7.4";
const NOTION_API_VERSION = "2026-03-11";
const NTN_TIMEOUT_MS = 3e4;
const NTN_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const NOTION_DOWNLOAD_MAX_BYTES = 50 * 1024 * 1024;
const NOTION_EXTRACT_MAX_BYTES = 100 * 1024 * 1024;
const NOTION_EXTRACT_MAX_FILES = 5e3;
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertString(value, field) {
	if (typeof value !== "string" || value.length === 0) throw new Error(`Notion Agent Plugins response is missing ${field}`);
	return value;
}
function optionalMetadata(value, field) {
	if (value === void 0 || value === null) return "";
	if (typeof value !== "string") throw new Error(`Notion Agent Plugins response has an invalid ${field}`);
	return sanitizeMetadata(value);
}
function parsePack(value) {
	if (!isRecord(value)) throw new Error("Notion Agent Plugins response contains an invalid pack");
	if (typeof value.name !== "string") throw new Error("Notion Agent Plugins response is missing pack.name");
	const name = sanitizeMetadata(value.name);
	if (!name) return null;
	return {
		id: assertString(value.id, "pack.id"),
		name,
		description: optionalMetadata(value.description, "pack.description"),
		version_id: assertString(value.version_id, "pack.version_id")
	};
}
function parsePackList(value) {
	if (!isRecord(value) || !Array.isArray(value.results)) throw new Error("Notion Agent Plugins list response is invalid");
	if (typeof value.has_more !== "boolean") throw new Error("Notion Agent Plugins list response is missing has_more");
	const nextCursor = value.next_cursor;
	if (nextCursor !== null && typeof nextCursor !== "string") throw new Error("Notion Agent Plugins list response has an invalid next_cursor");
	return {
		results: value.results.map(parsePack).filter((pack) => pack !== null),
		next_cursor: nextCursor,
		has_more: value.has_more
	};
}
function parseDirectory(value, label) {
	if (!isRecord(value)) throw new Error(`Notion ${label} directory response is invalid`);
	return {
		id: assertString(value.id, `${label} directory id`),
		version_id: assertString(value.version_id, `${label} directory version_id`),
		url: assertString(value.url, `${label} directory url`)
	};
}
function downloadNotionDirectory(url) {
	return downloadSource(url, {
		downloadMaxBytes: NOTION_DOWNLOAD_MAX_BYTES,
		extractMaxBytes: NOTION_EXTRACT_MAX_BYTES,
		extractMaxFiles: NOTION_EXTRACT_MAX_FILES
	});
}
function debugNtn(args) {
	if (process.env.SKILLS_DEBUG === "1") console.error(`[notion] ntn ${args.join(" ")}`);
}
async function runNtnApi(args) {
	debugNtn(args);
	return new Promise((resolve, reject) => {
		const child = spawn$1("ntn", args, {
			env: process.env,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		const stdoutChunks = [];
		const stderrChunks = [];
		let outputBytes = 0;
		let settled = false;
		const finish = (callback) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			callback();
		};
		const fail = (message) => finish(() => reject(new Error(message)));
		const append = (chunks, chunk) => {
			outputBytes += chunk.length;
			if (outputBytes > NTN_MAX_BUFFER_BYTES) {
				child.kill("SIGTERM");
				fail("ntn api output exceeded 10 MiB");
				return;
			}
			chunks.push(chunk);
		};
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			fail(`ntn api timed out after ${NTN_TIMEOUT_MS / 1e3} seconds`);
		}, NTN_TIMEOUT_MS);
		child.stdout.on("data", (chunk) => append(stdoutChunks, chunk));
		child.stderr.on("data", (chunk) => append(stderrChunks, chunk));
		child.on("error", (error) => {
			if (error.code === "ENOENT") {
				fail("Notion CLI (ntn) is required. Install it from:\nhttps://developers.notion.com/cli/get-started/overview\nThen run `ntn login`.");
				return;
			}
			fail(`Unable to start ntn: ${stripTerminalEscapes(error.message)}`);
		});
		child.on("close", (code) => {
			const stdout = Buffer.concat(stdoutChunks).toString("utf8");
			const stderr = stripTerminalEscapes(Buffer.concat(stderrChunks).toString("utf8")).trim();
			if (code === 0) {
				finish(() => resolve(stdout));
				return;
			}
			fail(`ntn api failed${stderr ? `: ${stderr}` : ` with exit code ${code ?? "unknown"}`}`);
		});
	});
}
async function fetchNotionJson(args, label, runNtn = runNtnApi) {
	const output = await runNtn([
		"api",
		...args,
		"--notion-version",
		NOTION_API_VERSION
	]);
	try {
		return JSON.parse(output);
	} catch (error) {
		if (error instanceof SyntaxError) throw new Error(`ntn returned invalid JSON for ${label}`);
		throw error;
	}
}
async function fetchNotionPacks(options = {}) {
	const runNtn = options.runNtn ?? runNtnApi;
	const packs = [];
	const seenCursors = /* @__PURE__ */ new Set();
	let cursor = null;
	do {
		const args = ["/v1/ai/plugins", "page_size==100"];
		if (cursor) args.push(`start_cursor==${cursor}`);
		const page = parsePackList(await fetchNotionJson(args, "the Notion packs list", runNtn));
		packs.push(...page.results);
		if (!page.has_more) break;
		if (!page.next_cursor || seenCursors.has(page.next_cursor)) throw new Error("Notion Agent Plugins pagination returned an invalid cursor");
		cursor = page.next_cursor;
		seenCursors.add(cursor);
	} while (cursor);
	return packs;
}
async function fetchNotionPackDirectory(pack, options = {}) {
	const directory = parseDirectory(await fetchNotionJson([`/v1/ai/plugins/${encodeURIComponent(pack.id)}`], `Notion pack ${JSON.stringify(pack.name)}`, options.runNtn), "pack");
	if (directory.id !== pack.id || directory.version_id !== pack.version_id) throw new Error(`Notion pack ${JSON.stringify(pack.name)} changed while preparing installation`);
	return directory;
}
async function fetchNotionWorkspaceName(options = {}) {
	const runNtn = options.runNtn ?? runNtnApi;
	try {
		const value = JSON.parse(await runNtn([
			"api",
			"/v1/users/me",
			"--notion-version",
			NOTION_API_VERSION
		]));
		if (!isRecord(value) || !isRecord(value.bot)) return null;
		const name = value.bot.workspace_name;
		return typeof name === "string" && name.length > 0 ? sanitizeMetadata(name) : null;
	} catch {
		return null;
	}
}
function inWorkspace(workspace) {
	return workspace ? ` in workspace ${import_picocolors.default.cyan(workspace)}` : "";
}
function isNotionSource(source) {
	return source.toLowerCase() === "notion";
}
const NOTION_HOSTNAME = /(^|\.)notion\.(so|com)$/;
const NOTION_PAGE_ID = /(?:^|-)([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
function formatPageId(rawId) {
	const hex = rawId.replace(/-/g, "");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function parseNotionSkillUrl(source) {
	let url;
	try {
		url = new URL(source);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	if (!NOTION_HOSTNAME.test(url.hostname.toLowerCase())) return null;
	const lastSegment = url.pathname.split("/").filter(Boolean).pop();
	if (!lastSegment) return null;
	let decoded;
	try {
		decoded = decodeURIComponent(lastSegment);
	} catch {
		decoded = lastSegment;
	}
	const match = decoded.toLowerCase().match(NOTION_PAGE_ID);
	return match ? formatPageId(match[1]) : null;
}
async function fetchNotionSkillDirectory(pageId, options = {}) {
	return parseDirectory(await fetchNotionJson([`/v1/ai/skills/${encodeURIComponent(pageId)}`], `Notion skill ${pageId}`, options.runNtn), "skill");
}
async function prepareNotionSkillSource(pageId, options = {}) {
	const download = options.download ?? downloadNotionDirectory;
	const spinner$5 = spinner();
	spinner$5.start("Fetching Notion skill with ntn…");
	try {
		const [directory, workspace] = await Promise.all([fetchNotionSkillDirectory(pageId, { runNtn: options.runNtn }), fetchNotionWorkspaceName({ runNtn: options.runNtn })]);
		const downloaded = await download(directory.url);
		spinner$5.stop(`Downloaded skill from Notion${inWorkspace(workspace)}`);
		return {
			rootDir: downloaded.rootDir,
			tempDir: downloaded.tempDir
		};
	} catch (error) {
		spinner$5.stop(import_picocolors.default.red("Failed to prepare Notion skill"));
		throw error;
	}
}
function normalizeSelector(value) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function filterPacks(packs, selectors) {
	if (selectors.includes("*")) return packs;
	const normalized = new Set(selectors.map(normalizeSelector));
	return packs.filter((pack) => normalized.has(normalizeSelector(pack.name)) || normalized.has(pack.id.toLowerCase()));
}
function sortedPacks(packs) {
	return [...packs].sort((a, b) => a.name.localeCompare(b.name));
}
function printAvailablePacks(packs) {
	console.log();
	log.step(import_picocolors.default.bold("Available Notion packs"));
	for (const pack of sortedPacks(packs)) {
		log.message(import_picocolors.default.cyan(pack.name));
		if (pack.description) log.message(`  ${import_picocolors.default.dim(pack.description)}`);
	}
}
async function prepareNotionPackSource(options = {}) {
	const spinner$6 = spinner();
	spinner$6.start("Fetching Notion packs with ntn…");
	let packs;
	let workspace = null;
	try {
		[packs, workspace] = await Promise.all([fetchNotionPacks({ runNtn: options.runNtn }), fetchNotionWorkspaceName({ runNtn: options.runNtn })]);
	} catch (error) {
		spinner$6.stop(import_picocolors.default.red("Failed to load Notion packs"));
		throw error;
	}
	spinner$6.stop(`Found ${import_picocolors.default.green(packs.length)} Notion pack${packs.length === 1 ? "" : "s"}${inWorkspace(workspace)}`);
	if (packs.length === 0) throw new Error("Notion returned no packs for the authenticated workspace");
	if (options.list) {
		printAvailablePacks(packs);
		outro(import_picocolors.default.dim("Select a pack by running the command without --list."));
		return null;
	}
	let selectedPacks;
	if (options.skill && options.skill.length > 0) {
		selectedPacks = filterPacks(packs, options.skill);
		if (selectedPacks.length === 0) throw new Error(`No matching Notion packs found for: ${options.skill.join(", ")}`);
	} else if (options.yes || !process.stdin.isTTY) selectedPacks = packs;
	else {
		const selected = await searchMultiselect({
			message: `Select Notion packs to install ${import_picocolors.default.dim("(space to toggle)")}`,
			items: sortedPacks(packs).map((pack) => ({
				value: pack,
				label: pack.name,
				detail: pack.description || "Notion plugin pack"
			})),
			required: true,
			maxVisible: 20,
			searchable: false,
			showDetail: true,
			showSelectedSummary: false
		});
		if (typeof selected === "symbol") {
			cancel("Selection cancelled");
			return null;
		}
		selectedPacks = selected;
	}
	note(selectedPacks.map((pack) => import_picocolors.default.cyan(pack.name)).join("\n"), `Selected ${selectedPacks.length} Notion pack${selectedPacks.length === 1 ? "" : "s"}`);
	const stagingDir = await mkdtemp$1(join$1(tmpdir$1(), "skills-notion-"));
	const packsDir = join$1(stagingDir, "packs");
	const manifestPlugins = [];
	const download = options.download ?? downloadNotionDirectory;
	const discover = options.discover ?? discoverSkills;
	let skillCount = 0;
	spinner$6.start("Preparing selected Notion packs…");
	try {
		await mkdir$1(packsDir, { recursive: true });
		for (const [index, pack] of selectedPacks.entries()) {
			let downloaded = null;
			try {
				downloaded = await download((await fetchNotionPackDirectory(pack, { runNtn: options.runNtn })).url);
				const skills = await discover(downloaded.rootDir, void 0, {
					includeInternal: true,
					fullDepth: true
				});
				if (skills.length === 0) throw new Error("pack contains no valid skills");
				const directoryName = `pack-${index + 1}-${sanitizeName(pack.name).slice(0, 100)}`;
				const targetDir = join$1(packsDir, directoryName);
				await cp$1(downloaded.rootDir, targetDir, {
					recursive: true,
					force: false,
					errorOnExist: true
				});
				manifestPlugins.push({
					name: pack.name,
					source: `./${directoryName}`,
					skills: skills.map((skill) => {
						const skillPath = relative$1(downloaded.rootDir, skill.path).split(sep$1).join("/");
						return skillPath ? `./${skillPath}` : "./.";
					})
				});
				skillCount += skills.length;
			} catch (error) {
				const detail = error instanceof Error ? error.message : "Unknown error";
				throw new Error(`Failed to prepare Notion pack ${JSON.stringify(pack.name)}: ${detail}`);
			} finally {
				if (downloaded) await cleanupTempDir(downloaded.tempDir).catch(() => {});
			}
		}
		const manifestDir = join$1(stagingDir, ".claude-plugin");
		await mkdir$1(manifestDir, { recursive: true });
		await writeFile$1(join$1(manifestDir, "marketplace.json"), `${JSON.stringify({
			metadata: { pluginRoot: "./packs" },
			plugins: manifestPlugins
		}, null, 2)}\n`, "utf8");
		spinner$6.stop(`Prepared ${import_picocolors.default.green(selectedPacks.length)} Notion pack${selectedPacks.length === 1 ? "" : "s"} with ${import_picocolors.default.green(skillCount)} skill${skillCount === 1 ? "" : "s"}`);
		return {
			rootDir: stagingDir,
			tempDir: stagingDir,
			packCount: selectedPacks.length,
			skillCount
		};
	} catch (error) {
		spinner$6.stop(import_picocolors.default.red("Failed to prepare Notion packs"));
		await cleanupTempDir(stagingDir).catch(() => {});
		throw error;
	}
}
const isCancelled$1 = (value) => typeof value === "symbol";
const EVE_AGENT_LABEL = "eve agent";
async function isSourcePrivate(source) {
	const ownerRepo = parseOwnerRepo(source);
	if (!ownerRepo) return false;
	return isRepoPrivate(ownerRepo.owner, ownerRepo.repo);
}
function getLockSource(parsedUrl, normalizedSource) {
	if (parsedUrl.startsWith("git@") || parsedUrl.startsWith("ssh://")) return parsedUrl;
	if (parsedUrl.startsWith("http://") || parsedUrl.startsWith("https://")) try {
		if (new URL(parsedUrl).hostname !== "github.com") return parsedUrl;
	} catch {
		return normalizedSource;
	}
	return normalizedSource;
}
function getProjectLockSourceUrl(sourceType, sourceUrl) {
	return sourceType === "git" || sourceType === "gitlab" ? sourceUrl : void 0;
}
function initTelemetry(version) {
	setVersion(version);
}
function riskLabel(risk) {
	switch (risk) {
		case "critical": return import_picocolors.default.red(import_picocolors.default.bold("Critical Risk"));
		case "high": return import_picocolors.default.red("High Risk");
		case "medium": return import_picocolors.default.yellow("Med Risk");
		case "low": return import_picocolors.default.green("Low Risk");
		case "safe": return import_picocolors.default.green("Safe");
		default: return import_picocolors.default.dim("--");
	}
}
function socketLabel(audit) {
	if (!audit) return import_picocolors.default.dim("--");
	const count = audit.alerts ?? 0;
	return count > 0 ? import_picocolors.default.red(`${count} alert${count !== 1 ? "s" : ""}`) : import_picocolors.default.green("0 alerts");
}
function padEnd(str, width) {
	const visible = stripTerminalEscapes(str);
	const pad = Math.max(0, width - visible.length);
	return str + " ".repeat(pad);
}
function buildSecurityLines(auditData, skills, source) {
	if (!auditData) return [];
	if (!skills.some((s) => {
		const data = auditData[s.slug];
		return data && Object.keys(data).length > 0;
	})) return [];
	const nameWidth = Math.min(Math.max(...skills.map((s) => s.displayName.length)), 36);
	const lines = [];
	const header = padEnd("", nameWidth + 2) + padEnd(import_picocolors.default.dim("Gen"), 18) + padEnd(import_picocolors.default.dim("Socket"), 18) + import_picocolors.default.dim("Snyk");
	lines.push(header);
	for (const skill of skills) {
		const data = auditData[skill.slug];
		const name = skill.displayName.length > nameWidth ? skill.displayName.slice(0, nameWidth - 1) + "…" : skill.displayName;
		const ath = data?.ath ? riskLabel(data.ath.risk) : import_picocolors.default.dim("--");
		const socket = data?.socket ? socketLabel(data.socket) : import_picocolors.default.dim("--");
		const snyk = data?.snyk ? riskLabel(data.snyk.risk) : import_picocolors.default.dim("--");
		lines.push(padEnd(import_picocolors.default.cyan(name), nameWidth + 2) + padEnd(ath, 18) + padEnd(socket, 18) + snyk);
	}
	lines.push("");
	lines.push(`${import_picocolors.default.dim("Details:")} ${import_picocolors.default.dim(`https://skills.sh/${source}`)}`);
	return lines;
}
function shortenPath$2(fullPath, cwd) {
	const home = homedir();
	if (fullPath === home || fullPath.startsWith(home + sep)) return "~" + fullPath.slice(home.length);
	if (fullPath === cwd || fullPath.startsWith(cwd + sep)) return "." + fullPath.slice(cwd.length);
	return fullPath;
}
function formatList$1(items, maxShow = 5) {
	if (items.length <= maxShow) return items.join(", ");
	const shown = items.slice(0, maxShow);
	const remaining = items.length - maxShow;
	return `${shown.join(", ")} +${remaining} more`;
}
function formatSkillPromptSubject(skills) {
	const namedSubject = formatList$1(skills.map((skill) => import_picocolors.default.cyan(getSkillDisplayName(skill))), 3);
	return stripTerminalEscapes(namedSubject).length <= 80 ? namedSubject : `${skills.length} selected skills`;
}
function formatEveInstallPromptMessage(skills) {
	return `Detected an eve project. Install ${formatSkillPromptSubject(skills)} for your ${EVE_AGENT_LABEL} to use?`;
}
function splitAgentsByType(agentTypes) {
	const universal = [];
	const symlinked = [];
	for (const a of agentTypes) if (isUniversalAgent(a)) universal.push(agents[a].displayName);
	else symlinked.push(agents[a].displayName);
	return {
		universal,
		symlinked
	};
}
function buildAgentSummaryLines(targetAgents, installMode) {
	const lines = [];
	const { universal, symlinked } = splitAgentsByType(targetAgents);
	if (installMode === "symlink") {
		if (universal.length > 0) lines.push(`  ${import_picocolors.default.green("universal:")} ${formatList$1(universal)}`);
		if (symlinked.length > 0) lines.push(`  ${import_picocolors.default.dim("symlink →")} ${formatList$1(symlinked)}`);
	} else {
		const allNames = targetAgents.map((a) => agents[a].displayName);
		lines.push(`  ${import_picocolors.default.dim("copy →")} ${formatList$1(allNames)}`);
	}
	return lines;
}
function targetDisplayName(target) {
	const base = agents[target.agent].displayName;
	return target.subagent ? `${base} (${target.subagent})` : base;
}
function targetKey(target) {
	return target.subagent ? `${target.agent}:${target.subagent}` : target.agent;
}
function buildInstallTargets(targetAgents, eveSubagentTargets) {
	const targets = [];
	for (const agent of targetAgents) if (agent === "eve") for (const subagent of eveSubagentTargets) targets.push({
		agent,
		subagent
	});
	else targets.push({ agent });
	return targets;
}
function buildTargetSummaryLines(targets, installMode) {
	const lines = [];
	const rootAgents = targets.filter((t) => !t.subagent).map((t) => t.agent);
	const subagentNames = targets.filter((t) => t.subagent).map(targetDisplayName);
	const { universal, symlinked } = splitAgentsByType(rootAgents);
	if (installMode === "symlink") {
		if (universal.length > 0) lines.push(`  ${import_picocolors.default.green("universal:")} ${formatList$1(universal)}`);
		if (symlinked.length > 0) lines.push(`  ${import_picocolors.default.dim("symlink →")} ${formatList$1(symlinked)}`);
		if (subagentNames.length > 0) lines.push(`  ${import_picocolors.default.dim("copy →")} ${formatList$1(subagentNames)}`);
	} else {
		const allNames = targets.map(targetDisplayName);
		lines.push(`  ${import_picocolors.default.dim("copy →")} ${formatList$1(allNames)}`);
	}
	return lines;
}
function ensureUniversalAgents(targetAgents) {
	const universalAgents = getUniversalAgents();
	const result = [...targetAgents];
	for (const ua of universalAgents) if (!result.includes(ua)) result.push(ua);
	return result;
}
async function nonInteractiveTargetAgents() {
	const detected = await detectAgent();
	const hostAgent = detected.isAgent ? getAgentType(detected.agent.name) : null;
	if (hostAgent) return ensureUniversalAgents([hostAgent]);
	const installed = await detectInstalledAgents();
	if (installed.includes("eve")) return ["eve"];
	if (installed.length === 0) return Object.keys(agents);
	return ensureUniversalAgents(installed);
}
function defaultInstallMode(targets) {
	const allEve = targets.every((t) => t.agent === "eve");
	return new Set(targets.map((t) => t.subagent ? `eve:subagent:${t.subagent}` : agents[t.agent].skillsDir)).size <= 1 || allEve ? "copy" : "symlink";
}
function buildResultLines(results, targetAgents) {
	const lines = [];
	const { universal, symlinked: symlinkAgents } = splitAgentsByType(targetAgents);
	const successfulSymlinks = results.filter((r) => !r.symlinkFailed && !r.skipped && !universal.includes(r.agent)).map((r) => r.agent);
	const failedSymlinks = results.filter((r) => r.symlinkFailed && !r.skipped).map((r) => r.agent);
	const skippedSymlinks = results.filter((r) => r.skipped && r.skipReason === "missing-agent-project-directory" && symlinkAgents.includes(r.agent)).map((r) => r.agent);
	if (universal.length > 0) lines.push(`  ${import_picocolors.default.green("universal:")} ${formatList$1(universal)}`);
	if (successfulSymlinks.length > 0) lines.push(`  ${import_picocolors.default.dim("symlinked:")} ${formatList$1(successfulSymlinks)}`);
	if (failedSymlinks.length > 0) lines.push(`  ${import_picocolors.default.yellow("copied:")} ${formatList$1(failedSymlinks)}`);
	if (skippedSymlinks.length > 0) lines.push(`  ${import_picocolors.default.yellow("skipped:")} ${formatList$1(skippedSymlinks)} ${import_picocolors.default.dim("(project directory not found)")}`);
	return lines;
}
function exitInstallationCancelled() {
	cancel("Installation cancelled");
	if (!process.stdin.isTTY) {
		console.error("Interactive prompt required but stdin is not a TTY. Nothing was installed. Use --agent <name> (or --agent '*') and -y to run non-interactively.");
		process.exit(1);
	}
	process.exit(0);
}
async function promptForAgents(message, choices) {
	let lastSelected;
	try {
		lastSelected = await getLastSelectedAgents();
	} catch {}
	const validAgents = choices.map((c) => c.value);
	const defaultValues = [
		"claude-code",
		"opencode",
		"codex",
		"grok"
	].filter((a) => validAgents.includes(a));
	let initialValues = [];
	if (lastSelected && lastSelected.length > 0) initialValues = lastSelected.filter((a) => validAgents.includes(a));
	if (initialValues.length === 0) initialValues = defaultValues;
	const selected = await searchMultiselect({
		message,
		items: choices,
		initialSelected: initialValues,
		required: true
	});
	if (!isCancelled$1(selected)) try {
		await saveSelectedAgents(selected);
	} catch {}
	return selected;
}
function skipAgentsWithoutGlobalDir(targetAgents, options) {
	if (!options.global || options.explicit) return targetAgents;
	const skipped = targetAgents.filter((a) => agents[a].globalSkillsDir === void 0);
	if (skipped.length === 0 || skipped.length === targetAgents.length) return targetAgents;
	log.info(`Skipping ${skipped.map((a) => agents[a].displayName).join(", ")}: no global skills directory`);
	return targetAgents.filter((a) => agents[a].globalSkillsDir !== void 0);
}
async function selectAgentsInteractive(options) {
	const supportsGlobalFilter = (a) => !options.global || agents[a].globalSkillsDir;
	const universalAgents = getUniversalAgents().filter(supportsGlobalFilter);
	const visibleUniversalAgents = getVisibleUniversalAgents().filter(supportsGlobalFilter);
	const otherAgents = getNonUniversalAgents().filter((agent) => agent !== "eve" && supportsGlobalFilter(agent));
	const universalSection = {
		title: "Universal (.agents/skills)",
		items: visibleUniversalAgents.map((a) => ({
			value: a,
			label: agents[a].displayName
		})),
		hiddenCount: universalAgents.length - visibleUniversalAgents.length
	};
	const otherChoices = otherAgents.map((a) => ({
		value: a,
		label: agents[a].displayName,
		hint: options.global ? agents[a].globalSkillsDir : agents[a].skillsDir
	}));
	let lastSelected;
	try {
		lastSelected = await getLastSelectedAgents();
	} catch {}
	const selected = await searchMultiselect({
		message: "Which agents do you want to install to?",
		items: otherChoices,
		initialSelected: lastSelected ? lastSelected.filter((a) => otherAgents.includes(a) && !universalAgents.includes(a)) : [],
		lockedSection: universalSection
	});
	if (!isCancelled$1(selected)) try {
		await saveSelectedAgents(selected);
	} catch {}
	return selected;
}
setVersion(version$1);
function buildJsonSecurity(auditData, skillName, source) {
	const data = auditData?.[skillName];
	if (!data || Object.keys(data).length === 0) return null;
	const socketAlerts = data.socket?.alerts ?? 0;
	return {
		...data.ath && { gen: data.ath.risk },
		...data.socket && { socket: `${socketAlerts} alert${socketAlerts !== 1 ? "s" : ""}` },
		...data.snyk && { snyk: data.snyk.risk },
		...source && { details: `https://skills.sh/${source}` }
	};
}
function isSkillsShPackUrl(url) {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/^www\./, "") === "skills.sh" && /^\/p\/[^/]+/.test(parsed.pathname);
	} catch {
		return false;
	}
}
function logAutoSelectedSkills(entries) {
	const only = entries.length === 1 ? entries[0] : null;
	if (!only) {
		log.info(`Installing all ${entries.length} skills`);
		return;
	}
	log.info(`Skill: ${import_picocolors.default.cyan(only.label)}`);
	if (only.description) log.message(import_picocolors.default.dim(only.description));
}
async function handleWellKnownSkills(source, url, options, spinner) {
	spinner.start("Discovering skills from well-known endpoint...");
	let skills = [];
	try {
		skills = await wellKnownProvider.fetchAllSkills(url, { includeInternal: Boolean(options.skill && options.skill.length > 0 && !options.skill.includes("*")) });
	} catch (error) {
		if (error instanceof WellKnownScopeNotFoundError) {
			spinner.stop(import_picocolors.default.red("No matching skills"));
			log.error(error.message);
			process.exit(1);
		}
	}
	if (skills.length === 0) {
		spinner.stop(import_picocolors.default.dim("No well-known skills found; trying direct download..."));
		return false;
	}
	spinner.stop(`Found ${import_picocolors.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
	for (const skill of skills) {
		log.info(`Skill: ${import_picocolors.default.cyan(skill.installName)}`);
		log.message(import_picocolors.default.dim(skill.description));
		if (skill.files.size > 1) log.message(import_picocolors.default.dim(`  Files: ${Array.from(skill.files.keys()).join(", ")}`));
	}
	if (options.list) {
		console.log();
		log.step(import_picocolors.default.bold("Available Skills"));
		for (const skill of skills) {
			log.message(`  ${import_picocolors.default.cyan(skill.installName)}`);
			log.message(`    ${import_picocolors.default.dim(skill.description)}`);
			if (skill.files.size > 1) log.message(`    ${import_picocolors.default.dim(`Files: ${skill.files.size}`)}`);
		}
		console.log();
		outro("Run without --list to install");
		process.exit(0);
	}
	let selectedSkills;
	const logWellKnown = (chosen) => logAutoSelectedSkills(chosen.map((s) => ({
		label: s.installName,
		description: s.description
	})));
	if (options.skill?.includes("*")) {
		selectedSkills = skills;
		logWellKnown(selectedSkills);
	} else if (options.skill && options.skill.length > 0) {
		selectedSkills = skills.filter((s) => options.skill.some((name) => s.installName.toLowerCase() === name.toLowerCase() || s.name.toLowerCase() === name.toLowerCase()));
		if (selectedSkills.length === 0) {
			log.error(`No matching skills found for: ${options.skill.join(", ")}`);
			log.info("Available skills:");
			for (const s of skills) log.message(`  - ${s.installName}`);
			process.exit(1);
		}
	} else if (skills.length === 1 || options.yes) {
		selectedSkills = skills;
		logWellKnown(selectedSkills);
	} else {
		const selected = await searchMultiselect({
			message: "Select skills to install",
			items: skills.map((s) => ({
				value: s,
				label: s.installName,
				hint: s.description.length > 60 ? s.description.slice(0, 57) + "…" : s.description
			})),
			initialSelected: isSkillsShPackUrl(url) ? skills : void 0,
			required: true,
			maxVisible: 20,
			selectAll: true
		});
		if (isCancelled$1(selected)) exitInstallationCancelled();
		selectedSkills = selected;
	}
	let targetAgents;
	const validAgents = Object.keys(agents);
	if (options.agent?.includes("*")) {
		targetAgents = validAgents;
		log.info(`Installing to all ${targetAgents.length} agents`);
	} else if (options.agent && options.agent.length > 0) {
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
			log.info(`Valid agents: ${validAgents.join(", ")}`);
			process.exit(1);
		}
		targetAgents = options.agent;
	} else {
		spinner.start("Loading agents…");
		const installedAgents = await detectInstalledAgents();
		const totalAgents = Object.keys(agents).length;
		spinner.stop(`${totalAgents} agents`);
		if (installedAgents.length === 0) if (options.yes) {
			targetAgents = validAgents;
			log.info("Installing to all agents");
		} else {
			log.info("Select agents to install skills to");
			const selected = await promptForAgents("Which agents do you want to install to?", Object.entries(agents).map(([key, config]) => ({
				value: key,
				label: config.displayName
			})));
			if (isCancelled$1(selected)) exitInstallationCancelled();
			targetAgents = selected;
		}
		else if (installedAgents.length === 1 || options.yes) {
			targetAgents = ensureUniversalAgents(installedAgents);
			if (installedAgents.length === 1) {
				const firstAgent = installedAgents[0];
				log.info(`Installing to: ${import_picocolors.default.cyan(agents[firstAgent].displayName)}`);
			} else log.info(`Installing to: ${installedAgents.map((a) => import_picocolors.default.cyan(agents[a].displayName)).join(", ")}`);
		} else {
			const selected = await selectAgentsInteractive({ global: options.global });
			if (isCancelled$1(selected)) exitInstallationCancelled();
			targetAgents = selected;
		}
	}
	let installGlobally = options.global ?? false;
	const supportsGlobal = targetAgents.some((a) => agents[a].globalSkillsDir !== void 0);
	if (options.global === void 0 && !options.yes && supportsGlobal) {
		const scope = await select({
			message: "Installation scope",
			options: [{
				value: false,
				label: "Project",
				hint: "Install in current directory (committed with your project)"
			}, {
				value: true,
				label: "Global",
				hint: "Install in home directory (available across all projects)"
			}]
		});
		if (isCancel(scope)) exitInstallationCancelled();
		installGlobally = scope;
	}
	targetAgents = skipAgentsWithoutGlobalDir(targetAgents, {
		global: installGlobally,
		explicit: options.agent !== void 0
	});
	if (!installGlobally) await readLocalLock();
	let installMode = options.copy ? "copy" : "symlink";
	const uniqueDirs = new Set(targetAgents.map((a) => agents[a].skillsDir));
	if (!options.copy && !options.yes && uniqueDirs.size > 1) {
		const modeChoice = await select({
			message: "Installation method",
			options: [{
				value: "symlink",
				label: "Symlink (Recommended)",
				hint: "Single source of truth, easy updates"
			}, {
				value: "copy",
				label: "Copy to all agents",
				hint: "Independent copies for each agent"
			}]
		});
		if (isCancel(modeChoice)) exitInstallationCancelled();
		installMode = modeChoice;
	} else if (uniqueDirs.size <= 1) installMode = "copy";
	const cwd = process.cwd();
	const summaryLines = [];
	targetAgents.map((a) => agents[a].displayName);
	const overwriteChecks = await Promise.all(selectedSkills.flatMap((skill) => targetAgents.map(async (agent) => ({
		skillName: skill.installName,
		agent,
		installed: await isSkillInstalled(skill.installName, agent, { global: installGlobally })
	}))));
	const overwriteStatus = /* @__PURE__ */ new Map();
	for (const { skillName, agent, installed } of overwriteChecks) {
		if (!overwriteStatus.has(skillName)) overwriteStatus.set(skillName, /* @__PURE__ */ new Map());
		overwriteStatus.get(skillName).set(agent, installed);
	}
	for (const skill of selectedSkills) {
		if (summaryLines.length > 0) summaryLines.push("");
		const shortCanonical = shortenPath$2(getCanonicalPath(skill.installName, { global: installGlobally }), cwd);
		summaryLines.push(`${import_picocolors.default.cyan(shortCanonical)}`);
		summaryLines.push(...buildAgentSummaryLines(targetAgents, installMode));
		if (skill.files.size > 1) summaryLines.push(`  ${import_picocolors.default.dim("files:")} ${skill.files.size}`);
		const skillOverwrites = overwriteStatus.get(skill.installName);
		const overwriteAgents = targetAgents.filter((a) => skillOverwrites?.get(a)).map((a) => agents[a].displayName);
		if (overwriteAgents.length > 0) summaryLines.push(`  ${import_picocolors.default.yellow("overwrites:")} ${formatList$1(overwriteAgents)}`);
	}
	console.log();
	note(summaryLines.join("\n"), "Installation Summary");
	if (!options.yes) {
		const confirmed = await confirm({ message: "Proceed with installation?" });
		if (isCancel(confirmed) || !confirmed) exitInstallationCancelled();
	}
	const sourceIdentifier = wellKnownProvider.getSourceIdentifier(url);
	const wellKnownPrivacyPromise = isSourcePrivate(sourceIdentifier).catch(() => null);
	spinner.start("Installing skills…");
	const results = [];
	for (const skill of selectedSkills) for (const agent of targetAgents) {
		const result = await installWellKnownSkillForAgent(skill, agent, {
			global: installGlobally,
			mode: installMode
		});
		results.push({
			skill: skill.installName,
			agent: agents[agent].displayName,
			...result
		});
	}
	spinner.stop("Installation complete");
	console.log();
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	const successfulSkillNames = new Set(successful.map((r) => r.skill));
	const skillFiles = {};
	for (const skill of selectedSkills) skillFiles[skill.installName] = skill.sourceUrl;
	if (await wellKnownPrivacyPromise !== true) track({
		event: "install",
		source: sourceIdentifier,
		skills: selectedSkills.map((s) => s.installName).join(","),
		agents: targetAgents.join(","),
		...installGlobally && { global: "1" },
		skillFiles: JSON.stringify(skillFiles),
		installUrl: url,
		metadata: options.metadata,
		sourceType: "well-known"
	});
	if (successful.length > 0 && installGlobally) {
		for (const skill of selectedSkills) if (successfulSkillNames.has(skill.installName)) try {
			await addSkillToLock(skill.installName, globalWellKnownLockEntry(url, skill));
		} catch {}
	}
	if (successful.length > 0 && !installGlobally) {
		for (const skill of selectedSkills) if (successfulSkillNames.has(skill.installName)) try {
			const matchingResult = successful.find((r) => r.skill === skill.installName);
			const installDir = matchingResult?.canonicalPath || matchingResult?.path;
			if (installDir) {
				const computedHash = await computeSkillFolderHash(installDir);
				await addSkillToLocalLock(skill.installName, {
					source: sourceIdentifier,
					sourceUrl: url,
					sourceType: "well-known",
					computedHash,
					wellKnownDigest: computeWellKnownSkillDigest(skill)
				}, cwd);
			}
		} catch {}
	}
	if (successful.length > 0) {
		const bySkill = /* @__PURE__ */ new Map();
		for (const r of successful) {
			const skillResults = bySkill.get(r.skill) || [];
			skillResults.push(r);
			bySkill.set(r.skill, skillResults);
		}
		const skillCount = bySkill.size;
		const symlinkFailures = successful.filter((r) => r.mode === "symlink" && r.symlinkFailed);
		const copiedAgents = symlinkFailures.map((r) => r.agent);
		const resultLines = [];
		for (const [skillName, skillResults] of bySkill) {
			const firstResult = skillResults[0];
			if (firstResult.mode === "copy") {
				resultLines.push(`${import_picocolors.default.green("✓")} ${skillName} ${import_picocolors.default.dim("(copied)")}`);
				const shortPathsSet = /* @__PURE__ */ new Set();
				for (const r of skillResults) {
					const shortPath = shortenPath$2(r.path, cwd);
					if (!shortPathsSet.has(shortPath)) {
						shortPathsSet.add(shortPath);
						resultLines.push(`  ${import_picocolors.default.dim("→")} ${shortPath}`);
					}
				}
			} else {
				if (firstResult.canonicalPath) {
					const shortPath = shortenPath$2(firstResult.canonicalPath, cwd);
					resultLines.push(`${import_picocolors.default.green("✓")} ${shortPath}`);
				} else resultLines.push(`${import_picocolors.default.green("✓")} ${skillName}`);
				resultLines.push(...buildResultLines(skillResults, targetAgents));
			}
		}
		const title = import_picocolors.default.green(`Installed ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
		note(resultLines.join("\n"), title);
		if (symlinkFailures.length > 0) {
			log.warn(import_picocolors.default.yellow(`Symlinks failed for: ${formatList$1(copiedAgents)}`));
			log.message(import_picocolors.default.dim("  Files were copied instead. On Windows, enable Developer Mode for symlink support."));
		}
	}
	if (failed.length > 0) {
		console.log();
		log.error(import_picocolors.default.red(`Failed to install ${failed.length}`));
		for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill} → ${r.agent}: ${import_picocolors.default.dim(r.error)}`);
	}
	console.log();
	outro(import_picocolors.default.green("Done!") + import_picocolors.default.dim("  Review skills before use; they run with full agent permissions."));
	await promptForFindSkills(options, targetAgents);
	return true;
}
const silentSpinner = {
	start: () => {},
	stop: () => {},
	message: () => {}
};
async function resolveSkills(parsed, options, spinner) {
	const { includeInternal } = options;
	let skills;
	let blobResult = null;
	let tempDir = null;
	try {
		if (parsed.type === "local") {
			spinner.start("Discovering skills…");
			skills = await discoverSkills(parsed.localPath, parsed.subpath, {
				includeInternal,
				fullDepth: options.fullDepth
			});
		} else if (parsed.type === "well-known" || parsed.type === "download") {
			spinner.start("Downloading source...");
			const downloaded = await downloadSource(parsed.url);
			tempDir = downloaded.tempDir;
			spinner.stop(`Downloaded ${downloaded.kind === "skill-md" ? "SKILL.md file" : "archive"}`);
			spinner.start("Discovering skills...");
			skills = await discoverSkills(downloaded.rootDir, parsed.subpath, {
				includeInternal,
				fullDepth: options.fullDepth
			});
		} else if (parsed.type === "github" && !options.fullDepth) {
			let attemptedBlobInstall = false;
			const BLOB_ALLOWED_OWNERS = [
				"vercel",
				"vercel-labs",
				"heygen-com",
				"remotion-dev"
			];
			const ownerRepo = getOwnerRepo(parsed);
			const owner = ownerRepo?.split("/")[0]?.toLowerCase();
			const isSelfHostedRepo = !!ownerRepo && Object.hasOwn(BLOB_ALLOWED_REPOS, ownerRepo.toLowerCase());
			if (ownerRepo && owner && (isSelfHostedRepo || BLOB_ALLOWED_OWNERS.includes(owner))) {
				attemptedBlobInstall = true;
				spinner.start("Fetching skills…");
				blobResult = await tryBlobInstall(ownerRepo, {
					subpath: parsed.subpath,
					skillFilter: parsed.skillFilter,
					ref: parsed.ref,
					getToken: getGitHubToken,
					includeInternal
				});
			}
			if (blobResult) {
				skills = blobResult.skills;
				spinner.stop(`Found ${import_picocolors.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
			} else {
				if (attemptedBlobInstall) spinner.message("Cloning repository…");
				else spinner.start("Cloning repository…");
				tempDir = await cloneRepo(parsed.url, parsed.ref);
				spinner.stop("Repository cloned");
				spinner.start("Discovering skills…");
				skills = await discoverSkills(tempDir, parsed.subpath, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			}
		} else {
			spinner.start("Cloning repository…");
			tempDir = await cloneRepo(parsed.url, parsed.ref);
			spinner.stop("Repository cloned");
			spinner.start("Discovering skills…");
			skills = await discoverSkills(tempDir, parsed.subpath, {
				includeInternal,
				fullDepth: options.fullDepth
			});
		}
	} catch (error) {
		await cleanup(tempDir);
		throw error;
	}
	return {
		skills,
		tempDir,
		blobResult
	};
}
function isWellKnownSourceSkill(skill) {
	return "wellKnown" in skill;
}
async function resolveWellKnownSkills(url, includeInternal) {
	const skills = await wellKnownProvider.fetchAllSkills(url, { includeInternal });
	if (skills.length === 0) return null;
	return {
		skills: skills.map((wellKnown) => ({
			name: wellKnown.installName,
			description: wellKnown.description,
			path: "",
			rawContent: wellKnown.content,
			wellKnown
		})),
		tempDir: null,
		blobResult: null
	};
}
async function installToTargets(resolved, skills, placement) {
	const results = [];
	for (const skill of skills) for (const target of placement.targets) {
		const { agent, subagent } = target;
		const installOptions = {
			global: placement.global,
			mode: placement.mode,
			eveSubagent: subagent,
			createMissingAgentRoot: placement.createMissingAgentRoot?.(agent) ?? false
		};
		let result;
		if (isWellKnownSourceSkill(skill)) result = await installWellKnownSkillForAgent(skill.wellKnown, agent, installOptions);
		else if (resolved.blobResult && "files" in skill) {
			const blobSkill = skill;
			result = await installBlobSkillForAgent({
				installName: blobSkill.name,
				files: blobSkill.files
			}, agent, installOptions);
		} else result = await installSkillForAgent(skill, agent, installOptions);
		results.push({
			skill: getSkillDisplayName(skill),
			agent: targetDisplayName(target),
			pluginName: skill.pluginName,
			...result
		});
	}
	return results;
}
function getSkillRepoPaths(resolved, skills) {
	const { tempDir, blobResult } = resolved;
	const skillFiles = {};
	for (const skill of skills) if (blobResult && "repoPath" in skill) skillFiles[skill.name] = skill.repoPath;
	else if (tempDir && skill.path === tempDir) skillFiles[skill.name] = "SKILL.md";
	else if (tempDir && skill.path.startsWith(tempDir + sep)) skillFiles[skill.name] = skill.path.slice(tempDir.length + 1).split(sep).join("/") + "/SKILL.md";
	return skillFiles;
}
function getProjectLockSource(parsed) {
	return getLockSource(parsed.url, getOwnerRepo(parsed)) || parsed.url;
}
function projectLockEntry(parsed, skillPath, computedHash) {
	const sourceUrl = getProjectLockSourceUrl(parsed.type, parsed.url);
	return {
		source: getProjectLockSource(parsed),
		...sourceUrl && { sourceUrl },
		ref: parsed.ref,
		sourceType: parsed.type,
		...skillPath && { skillPath },
		computedHash
	};
}
function globalWellKnownLockEntry(baseUrl, skill) {
	return {
		source: wellKnownProvider.getSourceIdentifier(baseUrl),
		sourceType: "well-known",
		sourceUrl: skill.sourceUrl,
		skillFolderHash: "",
		sourceBaseUrl: baseUrl,
		wellKnownDigest: computeWellKnownSkillDigest(skill)
	};
}
function wellKnownLockEntry(url, skill, computedHash) {
	return {
		source: wellKnownProvider.getSourceIdentifier(url),
		sourceUrl: url,
		sourceType: "well-known",
		computedHash,
		wellKnownDigest: computeWellKnownSkillDigest(skill)
	};
}
async function fetchSource({ parsed, skills, fullDepth }) {
	const includeInternal = skills.length > 0;
	try {
		return {
			parsed,
			resolved: parsed.type === "well-known" && await resolveWellKnownSkills(parsed.url, includeInternal) || await resolveSkills(parsed, {
				includeInternal,
				fullDepth
			}, silentSpinner)
		};
	} catch (error) {
		return {
			parsed,
			resolved: null,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
async function fetchSources(requests) {
	if (requests.length === 0) return [];
	const label = `source${requests.length === 1 ? "" : "s"}`;
	const spinner$3 = spinner();
	let done = 0;
	spinner$3.start(`Downloading ${requests.length} ${label}…`);
	const fetched = await mapConcurrent(requests, async (request) => {
		const result = await fetchSource(request);
		spinner$3.message(`Downloaded ${++done} of ${requests.length} ${label}…`);
		return result;
	});
	spinner$3.stop(`Downloaded ${requests.length} ${label}`);
	return fetched;
}
function releaseSource({ resolved }) {
	return cleanup(resolved?.tempDir ?? null);
}
async function installFetched({ resolved, error }, options) {
	if (!resolved) return {
		installed: [],
		failed: [],
		error
	};
	try {
		let selected = options.skills.length > 0 ? filterSkills(resolved.skills, options.skills) : resolved.skills;
		if (selected.length === 0) return {
			installed: [],
			failed: [],
			error: "No matching skills found"
		};
		if (options.select) selected = await options.select(selected);
		const results = await installToTargets(resolved, selected, options.placement);
		const installed = [];
		for (const skill of selected) {
			const target = results.find((r) => r.success && r.skill === getSkillDisplayName(skill));
			if (!target) continue;
			installed.push({
				skill,
				hash: await installedSkillHash(skill, target)
			});
		}
		return {
			installed,
			failed: results.filter((r) => !r.success).map((r) => `${r.skill} → ${r.agent}: ${r.error}`)
		};
	} catch (error) {
		return {
			installed: [],
			failed: [],
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
function projectPlacement(agents) {
	return {
		global: false,
		targets: agents.map((agent) => ({ agent })),
		mode: "symlink",
		createMissingAgentRoot: () => true
	};
}
async function installFromSource(fetched, options) {
	const { frozenLock } = options;
	const outcome = await installFetched(fetched, {
		skills: options.skills,
		placement: projectPlacement(options.agents),
		select: async (skills) => {
			const selected = options.select ? await options.select(skills) : skills;
			if (!frozenLock) return selected;
			const changes = [];
			for (const skill of selected) {
				if (isWellKnownSourceSkill(skill)) continue;
				const hash = await sourceSkillHash(skill);
				const reason = lockChangeReason(frozenLock, skill.name, { computedHash: hash });
				if (reason) changes.push(reason);
			}
			if (changes.length > 0) throw new Error(frozenLockfileError(changes));
			return selected;
		}
	});
	const result = {
		installed: outcome.installed.map(({ skill }) => getSkillDisplayName(skill)),
		failed: outcome.failed,
		...outcome.error && { error: outcome.error }
	};
	try {
		if (frozenLock) {
			const changes = outcome.installed.flatMap(({ skill, hash }) => lockChangeReason(frozenLock, skill.name, { computedHash: hash }) ?? []);
			if (changes.length > 0) result.error = frozenLockfileError(changes);
		} else await recordProjectLock(fetched, outcome.installed, options.via);
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	} finally {
		await releaseSource(fetched);
	}
	return result;
}
async function recordProjectLock({ parsed, resolved }, installed, via) {
	if (!resolved) return;
	const repoPaths = getSkillRepoPaths(resolved, installed.map(({ skill }) => skill));
	for (const { skill, hash } of installed) {
		const entry = isWellKnownSourceSkill(skill) ? wellKnownLockEntry(parsed.url, skill.wellKnown, hash) : projectLockEntry(parsed, repoPaths[skill.name], hash);
		await addSkillToLocalLock(skill.name, {
			...entry,
			...via && { via }
		});
	}
}
async function recordGlobalWellKnownLock(baseUrl, installed) {
	for (const { skill } of installed) {
		if (!isWellKnownSourceSkill(skill)) continue;
		await addSkillToLock(skill.name, globalWellKnownLockEntry(baseUrl, skill.wellKnown));
	}
}
function sourceSkillHash(skill) {
	return "snapshotHash" in skill ? Promise.resolve(skill.snapshotHash) : computeSkillFolderHash(skill.path);
}
function installedSkillHash(skill, target) {
	return isWellKnownSourceSkill(skill) ? computeSkillFolderHash(target.canonicalPath || target.path) : sourceSkillHash(skill);
}
async function runAdd(args, options = {}) {
	const source = args[0];
	let installTipShown = false;
	const jsonMode = options.json === true;
	const jsonResults = [];
	const originalStdoutWrite = process.stdout.write;
	let stdoutSuppressed = false;
	if (jsonMode) {
		process.stdout.write = process.stderr.write.bind(process.stderr);
		stdoutSuppressed = true;
	}
	const restoreStdout = () => {
		if (stdoutSuppressed) {
			process.stdout.write = originalStdoutWrite;
			stdoutSuppressed = false;
		}
	};
	let jsonEmitted = false;
	const emitJson = () => {
		if (!jsonMode || jsonEmitted) return;
		jsonEmitted = true;
		restoreStdout();
		console.log(JSON.stringify(jsonResults, null, 2));
	};
	const emitJsonAndExit = (code, errorMessage) => {
		if (jsonMode) {
			if (errorMessage !== void 0) console.error(errorMessage);
			if (code !== 0 && jsonResults.length === 0) jsonResults.push({
				status: "failed",
				error: errorMessage ?? "Installation failed"
			});
			emitJson();
		}
		process.exit(code);
	};
	const emitJsonOnExit = () => emitJson();
	if (jsonMode) process.once("exit", emitJsonOnExit);
	const showInstallTip = () => {
		if (installTipShown) return;
		log.message(import_picocolors.default.dim("Tip: use the --yes (-y) and --global (-g) flags to install without prompts."));
		installTipShown = true;
	};
	if (!source) {
		console.log();
		console.log(import_picocolors.default.bgRed(import_picocolors.default.white(import_picocolors.default.bold(" ERROR "))) + " " + import_picocolors.default.red("Missing required argument: source"));
		console.log();
		console.log(import_picocolors.default.dim("  Usage:"));
		console.log(`    ${import_picocolors.default.cyan("npx skills add")} ${import_picocolors.default.yellow("<source>")} ${import_picocolors.default.dim("[options]")}`);
		console.log();
		console.log(import_picocolors.default.dim("  Example:"));
		console.log(`    ${import_picocolors.default.cyan("npx skills add")} ${import_picocolors.default.yellow("vercel-labs/agent-skills")}`);
		console.log();
		emitJsonAndExit(1, "Missing required argument: source");
	}
	const explicitlySelectedAgents = new Set(options.agent?.includes("*") ? [] : options.agent ?? []);
	if (options.all) {
		options.skill = ["*"];
		options.agent = ["*"];
		options.yes = true;
	}
	const agentResult = await detectAgent();
	if (agentResult.isAgent) {
		options.yes = true;
		if (!options.agent || options.agent.length === 0) {
			const mappedAgent = getAgentType(agentResult.agent.name);
			if (mappedAgent) options.agent = ensureUniversalAgents([mappedAgent]);
		}
	}
	if (jsonMode && !options.yes) emitJsonAndExit(1, "The --json flag requires --yes (or --all) to run non-interactively.");
	if (jsonMode && options.list) emitJsonAndExit(1, "The --json flag cannot be combined with --list.");
	console.log();
	if (!agentResult.isAgent) intro(import_picocolors.default.bgCyan(import_picocolors.default.black(" skills ")));
	if (agentResult.isAgent) log.info(import_picocolors.default.bgCyan(import_picocolors.default.black(import_picocolors.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — installing non-interactively");
	else if (!process.stdin.isTTY) showInstallTip();
	let tempDir = null;
	try {
		let effectiveSource = source;
		let notionSourceLabel = null;
		const notionSkillPageId = parseNotionSkillUrl(source);
		if (isNotionSource(source) || notionSkillPageId) {
			const prepared = notionSkillPageId ? await prepareNotionSkillSource(notionSkillPageId) : await prepareNotionPackSource(options);
			if (!prepared) return;
			effectiveSource = prepared.rootDir;
			tempDir = prepared.tempDir;
			notionSourceLabel = "packCount" in prepared ? `${prepared.packCount} selected Notion pack${prepared.packCount === 1 ? "" : "s"}` : "Notion page";
			options.skill = ["*"];
		}
		const spinner$4 = jsonMode ? silentSpinner : spinner();
		spinner$4.start("Parsing source…");
		const parsed = parseSource(effectiveSource);
		let directDownload = parsed.type === "download" || notionSourceLabel !== null;
		spinner$4.stop(notionSourceLabel !== null ? `Source: ${notionSourceLabel}` : `Source: ${parsed.type === "local" ? parsed.localPath : parsed.url}${parsed.ref ? ` @ ${import_picocolors.default.yellow(parsed.ref)}` : ""}${parsed.subpath ? ` (${parsed.subpath})` : ""}${parsed.skillFilter ? ` ${import_picocolors.default.dim("@")}${import_picocolors.default.cyan(parsed.skillFilter)}` : ""}`);
		const ownerRepoRaw = parsed.type === "well-known" || parsed.type === "download" ? null : getOwnerRepo(parsed);
		const repoPrivacyPromise = (() => {
			if (parsed.type !== "github") return Promise.resolve(null);
			if (!ownerRepoRaw) return Promise.resolve(null);
			const ownerRepo = parseOwnerRepo(ownerRepoRaw);
			if (!ownerRepo) return Promise.resolve(null);
			return isRepoPrivate(ownerRepo.owner, ownerRepo.repo).catch(() => null);
		})();
		if (parsed.type === "well-known") {
			if (jsonMode) emitJsonAndExit(1, "--json is not yet supported for well-known skill sources.");
			if (await handleWellKnownSkills(source, parsed.url, options, spinner$4)) return;
			directDownload = true;
		}
		if (parsed.skillFilter) {
			options.skill = options.skill || [];
			if (!options.skill.includes(parsed.skillFilter)) options.skill.push(parsed.skillFilter);
		}
		const includeInternal = !!(options.skill && options.skill.length > 0 && !options.skill.includes("*"));
		if (parsed.type === "local") {
			spinner$4.start("Validating local path…");
			if (!existsSync(parsed.localPath)) {
				spinner$4.stop(import_picocolors.default.red("Path not found"));
				outro(import_picocolors.default.red(`Local path does not exist: ${parsed.localPath}`));
				emitJsonAndExit(1, `Local path does not exist: ${parsed.localPath}`);
			}
			spinner$4.stop("Local path validated");
		}
		const resolved = await resolveSkills(parsed, {
			includeInternal,
			fullDepth: options.fullDepth
		}, spinner$4);
		const { skills, blobResult } = resolved;
		tempDir = resolved.tempDir ?? tempDir;
		if (skills.length === 0) {
			spinner$4.stop(import_picocolors.default.red("No skills found"));
			outro(import_picocolors.default.red("No valid skills found. Skills require a SKILL.md with name and description."));
			await cleanup(tempDir);
			emitJsonAndExit(1, "No valid skills found. Skills require a SKILL.md with name and description.");
		}
		if (!blobResult) spinner$4.stop(`Found ${import_picocolors.default.green(skills.length)} skill${skills.length > 1 ? "s" : ""}`);
		if (options.list) {
			console.log();
			log.step(import_picocolors.default.bold("Available Skills"));
			const groupedSkills = {};
			const ungroupedSkills = [];
			for (const skill of skills) if (skill.pluginName) {
				const group = skill.pluginName;
				if (!groupedSkills[group]) groupedSkills[group] = [];
				groupedSkills[group].push(skill);
			} else ungroupedSkills.push(skill);
			const sortedGroups = Object.keys(groupedSkills).sort();
			for (const group of sortedGroups) {
				const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
				console.log(import_picocolors.default.bold(title));
				for (const skill of groupedSkills[group]) {
					log.message(`  ${import_picocolors.default.cyan(getSkillDisplayName(skill))}`);
					log.message(`    ${import_picocolors.default.dim(skill.description)}`);
				}
				console.log();
			}
			if (ungroupedSkills.length > 0) {
				if (sortedGroups.length > 0) console.log(import_picocolors.default.bold("General"));
				for (const skill of ungroupedSkills) {
					log.message(`  ${import_picocolors.default.cyan(getSkillDisplayName(skill))}`);
					log.message(`    ${import_picocolors.default.dim(skill.description)}`);
				}
			}
			console.log();
			outro("Use --skill <name> to install specific skills");
			await cleanup(tempDir);
			emitJsonAndExit(0);
		}
		let selectedSkills;
		const logChosen = (chosen) => logAutoSelectedSkills(chosen.map((s) => ({
			label: getSkillDisplayName(s),
			description: s.description
		})));
		if (options.skill?.includes("*")) {
			selectedSkills = skills;
			logChosen(selectedSkills);
		} else if (options.skill && options.skill.length > 0) {
			selectedSkills = filterSkills(skills, options.skill);
			if (jsonMode) {
				for (const requested of options.skill) if (filterSkills(skills, [requested]).length === 0) jsonResults.push({
					name: requested,
					status: "skipped",
					reason: "No matching skill found in source"
				});
			}
			if (selectedSkills.length === 0) {
				log.error(`No matching skills found for: ${options.skill.join(", ")}`);
				log.info("Available skills:");
				for (const s of skills) log.message(`  - ${getSkillDisplayName(s)}`);
				await cleanup(tempDir);
				emitJsonAndExit(1, `No matching skills found for: ${options.skill.join(", ")}`);
			}
			log.info(`Selected ${selectedSkills.length} skill${selectedSkills.length !== 1 ? "s" : ""}: ${selectedSkills.map((s) => import_picocolors.default.cyan(getSkillDisplayName(s))).join(", ")}`);
		} else if (skills.length === 1 || options.yes) {
			selectedSkills = skills;
			logChosen(selectedSkills);
		} else {
			const sortedSkills = [...skills].sort((a, b) => {
				if (a.pluginName && !b.pluginName) return -1;
				if (!a.pluginName && b.pluginName) return 1;
				if (a.pluginName && b.pluginName && a.pluginName !== b.pluginName) return a.pluginName.localeCompare(b.pluginName);
				return getSkillDisplayName(a).localeCompare(getSkillDisplayName(b));
			});
			const hasGroups = sortedSkills.some((s) => s.pluginName);
			const kebabToTitle = (s) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
			const skillChoices = sortedSkills.map((s) => ({
				value: s,
				label: getSkillDisplayName(s),
				group: hasGroups ? s.pluginName ? kebabToTitle(s.pluginName) : "Other" : void 0,
				detail: s.description
			}));
			const selected = await searchMultiselect({
				message: hasGroups ? `Select skills to install ${import_picocolors.default.dim("(space to toggle)")}` : "Select skills to install",
				items: skillChoices,
				required: true,
				maxVisible: 20,
				searchable: !hasGroups,
				showDetail: true,
				showSelectedSummary: false,
				selectGroups: hasGroups,
				selectAll: true
			});
			if (isCancelled$1(selected)) {
				await cleanup(tempDir);
				exitInstallationCancelled();
			}
			selectedSkills = selected;
		}
		const ownerRepoForAudit = getOwnerRepo(parsed);
		const auditPromise = ownerRepoForAudit ? repoPrivacyPromise.then((isPrivate) => isPrivate === false ? fetchAuditData(ownerRepoForAudit, selectedSkills.map((s) => getSkillDisplayName(s))) : null) : Promise.resolve(null);
		let targetAgents;
		const validAgents = Object.keys(agents);
		if (options.agent?.includes("*")) {
			targetAgents = validAgents;
			log.info(`Installing to all ${targetAgents.length} agents`);
		} else if (options.agent && options.agent.length > 0) {
			const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
			if (invalidAgents.length > 0) {
				log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
				log.info(`Valid agents: ${validAgents.join(", ")}`);
				await cleanup(tempDir);
				emitJsonAndExit(1, `Invalid agents: ${invalidAgents.join(", ")}`);
			}
			targetAgents = options.agent;
		} else {
			spinner$4.start("Loading agents…");
			const installedAgents = await detectInstalledAgents();
			const totalAgents = Object.keys(agents).length;
			spinner$4.stop(`${totalAgents} agents`);
			if (installedAgents.includes("eve") && (options.yes || !agentResult.isAgent)) {
				const useEve = options.yes ? true : await confirm({
					message: formatEveInstallPromptMessage(selectedSkills),
					initialValue: true
				});
				if (isCancel(useEve)) {
					await cleanup(tempDir);
					exitInstallationCancelled();
				}
				if (useEve) {
					targetAgents = ["eve"];
					if (!options.yes) explicitlySelectedAgents.add("eve");
					log.info(`Installing to: ${import_picocolors.default.cyan(EVE_AGENT_LABEL)}`);
				} else {
					const selected = await selectAgentsInteractive({ global: options.global });
					if (isCancelled$1(selected)) {
						await cleanup(tempDir);
						exitInstallationCancelled();
					}
					targetAgents = selected;
					for (const agent of targetAgents) explicitlySelectedAgents.add(agent);
				}
			} else if (installedAgents.length === 0) if (options.yes) {
				targetAgents = validAgents;
				log.info("Installing to all agents");
			} else {
				log.info("Select agents to install skills to");
				const selected = await promptForAgents("Which agents do you want to install to?", Object.entries(agents).filter(([key]) => key !== "eve").map(([key, config]) => ({
					value: key,
					label: config.displayName
				})));
				if (isCancelled$1(selected)) {
					await cleanup(tempDir);
					exitInstallationCancelled();
				}
				targetAgents = selected;
				for (const agent of targetAgents) explicitlySelectedAgents.add(agent);
			}
			else if (installedAgents.length === 1 || options.yes) {
				targetAgents = ensureUniversalAgents(installedAgents);
				if (installedAgents.length === 1) {
					const firstAgent = installedAgents[0];
					log.info(`Installing to: ${import_picocolors.default.cyan(agents[firstAgent].displayName)}`);
				} else log.info(`Installing to: ${installedAgents.map((a) => import_picocolors.default.cyan(agents[a].displayName)).join(", ")}`);
			} else {
				const selected = await selectAgentsInteractive({ global: options.global });
				if (isCancelled$1(selected)) {
					await cleanup(tempDir);
					exitInstallationCancelled();
				}
				targetAgents = selected;
				for (const agent of targetAgents) explicitlySelectedAgents.add(agent);
			}
		}
		if (options.subagent && options.subagent.length > 0) {
			explicitlySelectedAgents.add("eve");
			if (!targetAgents.includes("eve")) targetAgents = [...targetAgents, "eve"];
		}
		let eveSubagentTargets = [void 0];
		if (targetAgents.includes("eve")) {
			const availableSubagents = getEveSubagents(process.cwd());
			if (options.subagent && options.subagent.length > 0) eveSubagentTargets = options.subagent.map((s) => s === "root" || s === "." ? void 0 : s);
			else if (availableSubagents.length > 0 && !options.yes) {
				const selectedSubagents = await multiselect({
					message: "Where should Eve skills be installed?",
					options: [{
						value: "",
						label: "Root agent",
						hint: "agent/skills"
					}, ...availableSubagents.map((name) => ({
						value: name,
						label: name,
						hint: `agent/subagents/${name}/skills`
					}))],
					initialValues: [""],
					required: true
				});
				if (isCancel(selectedSubagents)) {
					await cleanup(tempDir);
					exitInstallationCancelled();
				}
				eveSubagentTargets = selectedSubagents.map((s) => s === "" ? void 0 : s);
			}
		}
		let installGlobally = options.global ?? false;
		const supportsGlobal = targetAgents.some((a) => agents[a].globalSkillsDir !== void 0);
		if (options.global === void 0 && !options.yes && supportsGlobal) {
			const scope = await select({
				message: "Installation scope",
				options: [{
					value: false,
					label: "Project",
					hint: "Install in current directory (committed with your project)"
				}, {
					value: true,
					label: "Global",
					hint: "Install in home directory (available across all projects)"
				}]
			});
			if (isCancel(scope)) {
				await cleanup(tempDir);
				exitInstallationCancelled();
			}
			installGlobally = scope;
		}
		targetAgents = skipAgentsWithoutGlobalDir(targetAgents, {
			global: installGlobally,
			explicit: options.agent !== void 0
		});
		const installTargets = buildInstallTargets(targetAgents, eveSubagentTargets);
		if (!installGlobally) await readLocalLock();
		let installMode = options.copy ? "copy" : defaultInstallMode(installTargets);
		if (!options.copy && !options.yes && installMode === "symlink") {
			const modeChoice = await select({
				message: "Installation method",
				options: [{
					value: "symlink",
					label: "Symlink (Recommended)",
					hint: "Single source of truth, easy updates"
				}, {
					value: "copy",
					label: "Copy to all agents",
					hint: "Independent copies for each agent"
				}]
			});
			if (isCancel(modeChoice)) {
				await cleanup(tempDir);
				exitInstallationCancelled();
			}
			installMode = modeChoice;
		}
		const lockedInstallMode = installMode === "copy" && (options.copy || defaultInstallMode(installTargets) === "symlink") ? { installMode: "copy" } : {};
		const cwd = process.cwd();
		const summaryLines = [];
		const overwriteChecks = await Promise.all(selectedSkills.flatMap((skill) => installTargets.map(async (target) => ({
			skillName: skill.name,
			target,
			installed: await isSkillInstalled(skill.name, target.agent, {
				global: installGlobally,
				eveSubagent: target.subagent
			})
		}))));
		const overwriteStatus = /* @__PURE__ */ new Map();
		for (const { skillName, target, installed } of overwriteChecks) {
			if (!overwriteStatus.has(skillName)) overwriteStatus.set(skillName, /* @__PURE__ */ new Map());
			overwriteStatus.get(skillName).set(targetKey(target), installed);
		}
		const groupedSummary = {};
		const ungroupedSummary = [];
		for (const skill of selectedSkills) if (skill.pluginName) {
			const group = skill.pluginName;
			if (!groupedSummary[group]) groupedSummary[group] = [];
			groupedSummary[group].push(skill);
		} else ungroupedSummary.push(skill);
		const printSkillSummary = (skills) => {
			for (const skill of skills) {
				if (summaryLines.length > 0) summaryLines.push("");
				const shortCanonical = shortenPath$2(installTargets.length === 1 ? getCanonicalPath(skill.name, {
					global: installGlobally,
					agent: installTargets[0].agent,
					eveSubagent: installTargets[0].subagent
				}) : getCanonicalPath(skill.name, { global: installGlobally }), cwd);
				summaryLines.push(`${import_picocolors.default.cyan(shortCanonical)}`);
				summaryLines.push(...buildTargetSummaryLines(installTargets, installMode));
				const skillOverwrites = overwriteStatus.get(skill.name);
				const overwriteAgents = installTargets.filter((t) => skillOverwrites?.get(targetKey(t))).map(targetDisplayName);
				if (overwriteAgents.length > 0) summaryLines.push(`  ${import_picocolors.default.yellow("overwrites:")} ${formatList$1(overwriteAgents)}`);
			}
		};
		const sortedGroups = Object.keys(groupedSummary).sort();
		for (const group of sortedGroups) {
			const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
			summaryLines.push("");
			summaryLines.push(import_picocolors.default.bold(title));
			printSkillSummary(groupedSummary[group]);
		}
		if (ungroupedSummary.length > 0) {
			if (sortedGroups.length > 0) {
				summaryLines.push("");
				summaryLines.push(import_picocolors.default.bold("General"));
			}
			printSkillSummary(ungroupedSummary);
		}
		console.log();
		note(summaryLines.join("\n"), "Installation Summary");
		let auditDataForJson = null;
		try {
			const auditData = await auditPromise;
			auditDataForJson = auditData;
			if (auditData && ownerRepoForAudit) {
				const securityLines = buildSecurityLines(auditData, selectedSkills.map((s) => ({
					slug: getSkillDisplayName(s),
					displayName: getSkillDisplayName(s)
				})), ownerRepoForAudit);
				if (securityLines.length > 0) note(securityLines.join("\n"), "Security Risk Assessments");
			}
		} catch {}
		if (!options.yes) {
			const confirmed = await confirm({ message: "Proceed with installation?" });
			if (isCancel(confirmed) || !confirmed) {
				await cleanup(tempDir);
				exitInstallationCancelled();
			}
		}
		spinner$4.start("Installing skills…");
		const results = await installToTargets(resolved, selectedSkills, {
			global: installGlobally,
			targets: installTargets,
			mode: installMode,
			createMissingAgentRoot: (agent) => explicitlySelectedAgents.has(agent)
		});
		spinner$4.stop("Installation complete");
		console.log();
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);
		const successfulSkillNames = new Set(successful.map((r) => r.skill));
		const skillFiles = getSkillRepoPaths(resolved, selectedSkills);
		const normalizedSource = directDownload ? null : getOwnerRepo(parsed);
		const lockSource = directDownload ? null : getLockSource(parsed.url, normalizedSource);
		if (normalizedSource) if (parseOwnerRepo(normalizedSource)) {
			if (await repoPrivacyPromise === false) track({
				event: "install",
				source: normalizedSource,
				skills: selectedSkills.map((s) => s.name).join(","),
				agents: targetAgents.join(","),
				...installGlobally && { global: "1" },
				skillFiles: JSON.stringify(skillFiles),
				metadata: options.metadata
			});
		} else track({
			event: "install",
			source: normalizedSource,
			skills: selectedSkills.map((s) => s.name).join(","),
			agents: targetAgents.join(","),
			...installGlobally && { global: "1" },
			skillFiles: JSON.stringify(skillFiles),
			metadata: options.metadata
		});
		const installedSkillHashes = /* @__PURE__ */ new Map();
		if (successful.length > 0 && (jsonMode || !installGlobally)) for (const skill of selectedSkills) {
			const skillDisplayName = getSkillDisplayName(skill);
			if (!successfulSkillNames.has(skillDisplayName)) continue;
			try {
				installedSkillHashes.set(skillDisplayName, await sourceSkillHash(skill));
			} catch {}
		}
		if (successful.length > 0 && installGlobally && (normalizedSource || parsed.type === "local" && !directDownload)) {
			let cachedTree;
			if (parsed.type === "github" && !blobResult && normalizedSource) cachedTree = await fetchRepoTree(normalizedSource, parsed.ref, getGitHubToken);
			for (const skill of selectedSkills) {
				const skillDisplayName = getSkillDisplayName(skill);
				if (successfulSkillNames.has(skillDisplayName)) try {
					let skillFolderHash = "";
					const skillPathValue = skillFiles[skill.name];
					if (blobResult && skillPathValue) {
						const hash = getSkillFolderHashFromTree(blobResult.tree, skillPathValue);
						if (hash) skillFolderHash = hash;
					} else if (parsed.type === "github" && skillPathValue && cachedTree) {
						const hash = getSkillFolderHashFromTree(cachedTree, skillPathValue);
						if (hash) skillFolderHash = hash;
					} else if (skillPathValue && tempDir) {
						const hash = await computeSkillFolderHash(join(tempDir, dirname(skillPathValue)));
						if (hash) skillFolderHash = hash;
					} else if (parsed.type === "local") {
						const hash = await computeSkillFolderHash(skill.path);
						if (hash) skillFolderHash = hash;
					}
					await addSkillToLock(skill.name, {
						source: lockSource || normalizedSource || parsed.url,
						sourceType: parsed.type,
						sourceUrl: parsed.url,
						ref: parsed.ref,
						skillPath: skillPathValue,
						skillFolderHash,
						pluginName: skill.pluginName,
						...lockedInstallMode
					});
				} catch {}
			}
		}
		if (successful.length > 0 && !installGlobally && !directDownload) {
			const eveSubagents = targetAgents.includes("eve") ? eveSubagentTargets.map((s) => s ?? "") : void 0;
			const recordSubagents = eveSubagents && (eveSubagents.length > 1 || eveSubagents.some((s) => s !== ""));
			for (const skill of selectedSkills) {
				const skillDisplayName = getSkillDisplayName(skill);
				if (successfulSkillNames.has(skillDisplayName)) try {
					const computedHash = installedSkillHashes.get(skillDisplayName);
					if (computedHash === void 0) continue;
					const skillPathValue = skillFiles[skill.name];
					await addSkillToLocalLock(skill.name, {
						...projectLockEntry(parsed, skillPathValue, computedHash),
						...recordSubagents && { subagents: eveSubagents },
						...lockedInstallMode
					}, cwd);
				} catch {}
			}
		}
		if (jsonMode) {
			const jsonSource = normalizedSource ?? (parsed.type === "local" ? parsed.localPath : parsed.url);
			for (const skill of selectedSkills) {
				const name = getSkillDisplayName(skill);
				const skillResults = results.filter((r) => r.skill === name);
				const failures = skillResults.filter((r) => !r.success);
				if (failures.length > 0) {
					jsonResults.push({
						name,
						status: "failed",
						error: failures[0].error ?? "Installation failed"
					});
					continue;
				}
				jsonResults.push({
					name,
					status: "installed",
					source: jsonSource,
					ref: parsed.ref ?? null,
					hash: installedSkillHashes.get(name) ?? null,
					path: skillResults[0]?.canonicalPath ?? skillResults[0]?.path,
					scope: installGlobally ? "global" : "project",
					agents: skillResults.filter((r) => !r.skipped).map((r) => r.agent),
					mode: skillResults[0]?.mode ?? installMode,
					security: buildJsonSecurity(auditDataForJson, name, ownerRepoForAudit)
				});
			}
			emitJson();
			if (failed.length > 0 || jsonResults.some((result) => result.status === "skipped")) process.exitCode = 1;
			return;
		}
		if (successful.length > 0) {
			const bySkill = /* @__PURE__ */ new Map();
			const groupedResults = {};
			const ungroupedResults = [];
			for (const r of successful) {
				const skillResults = bySkill.get(r.skill) || [];
				skillResults.push(r);
				bySkill.set(r.skill, skillResults);
				if (skillResults.length === 1) if (r.pluginName) {
					const group = r.pluginName;
					if (!groupedResults[group]) groupedResults[group] = [];
					groupedResults[group].push(r);
				} else ungroupedResults.push(r);
			}
			const skillCount = bySkill.size;
			const symlinkFailures = successful.filter((r) => r.mode === "symlink" && r.symlinkFailed);
			const copiedAgents = symlinkFailures.map((r) => r.agent);
			const resultLines = [];
			const printSkillResults = (entries) => {
				for (const entry of entries) {
					const skillResults = bySkill.get(entry.skill) || [];
					const firstResult = skillResults[0];
					if (firstResult.mode === "copy") {
						resultLines.push(`${import_picocolors.default.green("✓")} ${entry.skill} ${import_picocolors.default.dim("(copied)")}`);
						const shortPathsSet = /* @__PURE__ */ new Set();
						for (const r of skillResults) {
							const shortPath = shortenPath$2(r.path, cwd);
							if (!shortPathsSet.has(shortPath)) {
								shortPathsSet.add(shortPath);
								resultLines.push(`  ${import_picocolors.default.dim("→")} ${shortPath}`);
							}
						}
					} else {
						if (firstResult.canonicalPath) {
							const shortPath = shortenPath$2(firstResult.canonicalPath, cwd);
							resultLines.push(`${import_picocolors.default.green("✓")} ${shortPath}`);
						} else resultLines.push(`${import_picocolors.default.green("✓")} ${entry.skill}`);
						resultLines.push(...buildResultLines(skillResults, targetAgents));
					}
				}
			};
			const sortedResultGroups = Object.keys(groupedResults).sort();
			for (const group of sortedResultGroups) {
				const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
				resultLines.push("");
				resultLines.push(import_picocolors.default.bold(title));
				printSkillResults(groupedResults[group]);
			}
			if (ungroupedResults.length > 0) {
				if (sortedResultGroups.length > 0) {
					resultLines.push("");
					resultLines.push(import_picocolors.default.bold("General"));
				}
				printSkillResults(ungroupedResults);
			}
			const title = import_picocolors.default.green(`Installed ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
			note(resultLines.join("\n"), title);
			if (symlinkFailures.length > 0) {
				log.warn(import_picocolors.default.yellow(`Symlinks failed for: ${formatList$1(copiedAgents)}`));
				log.message(import_picocolors.default.dim("  Files were copied instead. On Windows, enable Developer Mode for symlink support."));
			}
		}
		if (failed.length > 0) {
			console.log();
			log.error(import_picocolors.default.red(`Failed to install ${failed.length}`));
			for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill} → ${r.agent}: ${import_picocolors.default.dim(r.error)}`);
		}
		console.log();
		outro(import_picocolors.default.green("Done!") + import_picocolors.default.dim("  Review skills before use; they run with full agent permissions."));
		await promptForFindSkills(options, targetAgents);
	} catch (error) {
		if (error instanceof GitCloneError) {
			log.error(import_picocolors.default.red("Failed to clone repository"));
			for (const line of error.message.split("\n")) log.message(import_picocolors.default.dim(line));
		} else log.error(error instanceof Error ? error.message : "Unknown error occurred");
		showInstallTip();
		outro(import_picocolors.default.red("Installation failed"));
		emitJsonAndExit(1, error instanceof GitCloneError ? `Failed to clone repository\n${error.message}` : error instanceof Error ? error.message : "Unknown error occurred");
	} finally {
		if (jsonMode) process.removeListener("exit", emitJsonOnExit);
		restoreStdout();
		await cleanup(tempDir);
	}
}
async function cleanup(tempDir) {
	if (tempDir) try {
		await cleanupTempDir(tempDir);
	} catch {}
}
async function promptForFindSkills(options, targetAgents) {
	if (!process.stdin.isTTY) return;
	if (options?.yes) return;
	try {
		if (await isPromptDismissed("findSkillsPrompt")) return;
		if (await isSkillInstalled("find-skills", "claude-code", { global: true })) {
			await dismissPrompt("findSkillsPrompt");
			return;
		}
		console.log();
		log.message(import_picocolors.default.dim("One-time prompt - you won't be asked again if you dismiss."));
		const install = await confirm({ message: `Install the ${import_picocolors.default.cyan("find-skills")} skill? It helps your agent discover and suggest skills.` });
		if (isCancel(install)) {
			await dismissPrompt("findSkillsPrompt");
			return;
		}
		if (install) {
			await dismissPrompt("findSkillsPrompt");
			const findSkillsAgents = targetAgents?.filter((a) => a !== "replit");
			if (!findSkillsAgents || findSkillsAgents.length === 0) return;
			console.log();
			log.step("Installing find-skills skill…");
			try {
				await runAdd(["vercel-labs/skills"], {
					skill: ["find-skills"],
					global: true,
					yes: true,
					agent: findSkillsAgents
				});
			} catch {
				log.warn("Failed to install find-skills. You can try again with:");
				log.message(import_picocolors.default.dim("  npx skills add vercel-labs/skills@find-skills -g -y --all"));
			}
		} else {
			await dismissPrompt("findSkillsPrompt");
			log.message(import_picocolors.default.dim("You can install it later with: npx skills add vercel-labs/skills@find-skills"));
		}
	} catch {}
}
function parseAddOptions(args) {
	const options = {};
	const source = [];
	const errors = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-g" || arg === "--global") options.global = true;
		else if (arg === "-y" || arg === "--yes") options.yes = true;
		else if (arg === "-l" || arg === "--list") options.list = true;
		else if (arg === "--all") options.all = true;
		else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg === "-s" || arg === "--skill") {
			options.skill = options.skill || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.skill.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg === "--metadata") {
			const metadata = args[++i];
			if (metadata === void 0) errors.push("--metadata requires a JSON value");
			else try {
				JSON.parse(metadata);
				options.metadata = metadata;
			} catch {
				errors.push("--metadata must be valid JSON");
			}
		} else if (arg === "--full-depth") options.fullDepth = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "--copy") options.copy = true;
		else if (arg === "--subagent") {
			options.subagent = options.subagent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.subagent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg && !arg.startsWith("-")) source.push(arg);
	}
	return {
		source,
		options,
		errors
	};
}
const RESET$3 = "\x1B[0m";
const BOLD$3 = "\x1B[1m";
const DIM$3 = "\x1B[38;5;102m";
const TEXT$2 = "\x1B[38;5;145m";
const CYAN$1 = "\x1B[36m";
const SEARCH_API_BASE = process.env.SKILLS_API_URL || "https://skills.sh";
const SEARCH_RESULT_LIMIT = "20";
function formatInstalls(count) {
	if (!count || count <= 0) return "";
	if (count >= 1e6) return `${(count / 1e6).toFixed(1).replace(/\.0$/, "")}M installs`;
	if (count >= 1e3) return `${(count / 1e3).toFixed(1).replace(/\.0$/, "")}K installs`;
	return `${count} install${count === 1 ? "" : "s"}`;
}
const GITHUB_OWNER_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i;
function parseFindOptions(args) {
	const queryParts = [];
	const options = {};
	const errors = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;
		let ownerValue;
		if (arg === "--owner") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				errors.push("--owner requires a GitHub owner");
				continue;
			}
			ownerValue = value;
			i++;
		} else if (arg.startsWith("--owner=")) {
			ownerValue = arg.slice(8);
			if (!ownerValue) {
				errors.push("--owner requires a GitHub owner");
				continue;
			}
		} else {
			queryParts.push(arg);
			continue;
		}
		const owner = ownerValue.trim().toLowerCase();
		if (!GITHUB_OWNER_PATTERN.test(owner)) {
			errors.push("--owner must be a valid GitHub owner");
			continue;
		}
		options.owner = owner;
	}
	return {
		query: queryParts.join(" "),
		options,
		errors
	};
}
async function searchSkillsAPI(query, owner) {
	try {
		const params = new URLSearchParams({
			q: query,
			limit: SEARCH_RESULT_LIMIT
		});
		if (owner) params.set("owner", owner);
		const url = `${SEARCH_API_BASE}/api/search?${params.toString()}`;
		const res = await fetch(url);
		if (!res.ok) return [];
		return (await res.json()).skills.map((skill) => ({
			name: sanitizeMetadata(skill.name),
			slug: sanitizeMetadata(skill.id),
			source: sanitizeMetadata(skill.source || ""),
			installs: skill.installs
		})).sort((a, b) => (b.installs || 0) - (a.installs || 0));
	} catch {
		return [];
	}
}
const HIDE_CURSOR = "\x1B[?25l";
const SHOW_CURSOR = "\x1B[?25h";
const CLEAR_DOWN = "\x1B[J";
const MOVE_UP = (n) => `\x1b[${n}A`;
const MOVE_TO_COL = (n) => `\x1b[${n}G`;
async function runSearchPrompt(initialQuery = "", owner) {
	let results = [];
	let selectedIndex = 0;
	let query = initialQuery;
	let loading = false;
	let debounceTimer = null;
	let lastRenderedLines = 0;
	if (process.stdin.isTTY) process.stdin.setRawMode(true);
	readline.emitKeypressEvents(process.stdin);
	process.stdin.resume();
	process.stdout.write(HIDE_CURSOR);
	function render() {
		if (lastRenderedLines > 0) process.stdout.write(MOVE_UP(lastRenderedLines) + MOVE_TO_COL(1));
		process.stdout.write(CLEAR_DOWN);
		const lines = [];
		const cursor = `${BOLD$3}_${RESET$3}`;
		lines.push(`${TEXT$2}Search skills:${RESET$3} ${query}${cursor}`);
		lines.push("");
		if (!query || query.length < 2) lines.push(`${DIM$3}Start typing to search (min 2 chars)${RESET$3}`);
		else if (results.length === 0 && loading) lines.push(`${DIM$3}Searching…${RESET$3}`);
		else if (results.length === 0) lines.push(`${DIM$3}No skills found${RESET$3}`);
		else {
			const visible = results.slice(0, 8);
			for (let i = 0; i < visible.length; i++) {
				const skill = visible[i];
				const isSelected = i === selectedIndex;
				const arrow = isSelected ? `${BOLD$3}>${RESET$3}` : " ";
				const name = isSelected ? `${BOLD$3}${skill.name}${RESET$3}` : `${TEXT$2}${skill.name}${RESET$3}`;
				const source = skill.source ? ` ${DIM$3}${skill.source}${RESET$3}` : "";
				const installs = formatInstalls(skill.installs);
				const installsBadge = installs ? ` ${CYAN$1}${installs}${RESET$3}` : "";
				const loadingIndicator = loading && i === 0 ? ` ${DIM$3}…${RESET$3}` : "";
				lines.push(`  ${arrow} ${name}${source}${installsBadge}${loadingIndicator}`);
			}
		}
		lines.push("");
		lines.push(`${DIM$3}up/down navigate | enter select | esc cancel${RESET$3}`);
		for (const line of lines) process.stdout.write(line + "\n");
		lastRenderedLines = lines.length;
	}
	function triggerSearch(q) {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		loading = false;
		if (!q || q.length < 2) {
			results = [];
			selectedIndex = 0;
			render();
			return;
		}
		loading = true;
		render();
		const debounceMs = Math.max(150, 350 - q.length * 50);
		debounceTimer = setTimeout(async () => {
			try {
				results = await searchSkillsAPI(q, owner);
				selectedIndex = 0;
			} catch {
				results = [];
			} finally {
				loading = false;
				debounceTimer = null;
				render();
			}
		}, debounceMs);
	}
	if (initialQuery) triggerSearch(initialQuery);
	render();
	return new Promise((resolve) => {
		function cleanup() {
			process.stdin.removeListener("keypress", handleKeypress);
			if (process.stdin.isTTY) process.stdin.setRawMode(false);
			process.stdout.write(SHOW_CURSOR);
			process.stdin.pause();
		}
		function handleKeypress(_ch, key) {
			if (!key) return;
			if (key.name === "escape" || key.ctrl && key.name === "c") {
				cleanup();
				resolve(null);
				return;
			}
			if (key.name === "return") {
				cleanup();
				resolve(results[selectedIndex] || null);
				return;
			}
			if (key.name === "up") {
				selectedIndex = Math.max(0, selectedIndex - 1);
				render();
				return;
			}
			if (key.name === "down") {
				selectedIndex = Math.min(Math.max(0, results.length - 1), selectedIndex + 1);
				render();
				return;
			}
			if (key.name === "backspace") {
				if (query.length > 0) {
					query = query.slice(0, -1);
					triggerSearch(query);
				}
				return;
			}
			if (key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1) {
				const char = key.sequence;
				if (char >= " " && char <= "~") {
					query += char;
					triggerSearch(query);
				}
			}
		}
		process.stdin.on("keypress", handleKeypress);
	});
}
function getOwnerRepoFromString(pkg) {
	const atIndex = pkg.lastIndexOf("@");
	const match = (atIndex > 0 ? pkg.slice(0, atIndex) : pkg).match(/^([^/]+)\/([^/]+)$/);
	if (match) return {
		owner: match[1],
		repo: match[2]
	};
	return null;
}
async function isRepoPublic(owner, repo) {
	return await isRepoPrivate(owner, repo) === false;
}
async function runFind(args) {
	const { query, options: findOptions, errors } = parseFindOptions(args);
	const owner = findOptions.owner;
	const isNonInteractive = !process.stdin.isTTY;
	const agentTip = `${DIM$3}Tip: if running in a coding agent, follow these steps:${RESET$3}
${DIM$3}  1) npx skills find [query] [--owner <owner>]${RESET$3}
${DIM$3}  2) npx skills add <owner/repo@skill>${RESET$3}`;
	if (errors.length > 0) {
		for (const error of errors) console.error(error);
		console.error("Usage: npx skills find <query> [--owner <owner>]");
		return;
	}
	if (query) {
		const results = await searchSkillsAPI(query, owner);
		track({
			event: "find",
			query,
			resultCount: String(results.length)
		});
		if (results.length === 0) {
			const ownerSuffix = owner ? ` from owner "${owner}"` : "";
			console.log(`${DIM$3}No skills found for "${query}"${ownerSuffix}${RESET$3}`);
			return;
		}
		console.log(`${DIM$3}Install with${RESET$3} npx skills add <owner/repo@skill>`);
		console.log();
		for (const skill of results) {
			const pkg = skill.source || skill.slug;
			const installs = formatInstalls(skill.installs);
			console.log(`${TEXT$2}${pkg}@${skill.name}${RESET$3}${installs ? ` ${CYAN$1}${installs}${RESET$3}` : ""}`);
			console.log(`${DIM$3}└ https://skills.sh/${skill.slug}${RESET$3}`);
			console.log();
		}
		return;
	}
	if (isNonInteractive || await isRunningInAgent()) {
		console.log(agentTip);
		console.log();
		console.log(`${DIM$3}Usage: npx skills find <query> [--owner <owner>]${RESET$3}`);
		return;
	}
	const selected = await runSearchPrompt("", owner);
	track({
		event: "find",
		query: "",
		resultCount: selected ? "1" : "0",
		interactive: "1"
	});
	if (!selected) {
		console.log(`${DIM$3}Search cancelled${RESET$3}`);
		console.log();
		return;
	}
	const pkg = selected.source || selected.slug;
	const skillName = selected.name;
	console.log();
	console.log(`${TEXT$2}Installing ${BOLD$3}${skillName}${RESET$3} from ${DIM$3}${pkg}${RESET$3}…`);
	console.log();
	const { source, options: addOptions } = parseAddOptions([
		pkg,
		"--skill",
		skillName
	]);
	await runAdd(source, addOptions);
	console.log();
	const info = getOwnerRepoFromString(pkg);
	if (info && await isRepoPublic(info.owner, info.repo)) console.log(`${DIM$3}View the skill at${RESET$3} ${TEXT$2}https://skills.sh/${selected.slug}${RESET$3}`);
	else console.log(`${DIM$3}Discover more skills at${RESET$3} ${TEXT$2}https://skills.sh${RESET$3}`);
	console.log();
}
const NPM_PREFIX = "npm:";
const REMOTE_SOURCE_TYPES = /* @__PURE__ */ new Set([
	"github",
	"gitlab",
	"git"
]);
function isSkillsFieldEntry(value) {
	if (typeof value === "string") return true;
	if (!value || typeof value !== "object" || !("source" in value)) return false;
	if (typeof value.source !== "string") return false;
	const skills = "skills" in value ? value.skills : void 0;
	const ref = "ref" in value ? value.ref : void 0;
	return (skills === void 0 || Array.isArray(skills) && skills.every((s) => typeof s === "string")) && (ref === void 0 || typeof ref === "string");
}
function parseSkillsField(entries, declarer) {
	const parsed = {
		npm: [],
		remote: [],
		errors: []
	};
	for (const raw of entries) {
		if (!isSkillsFieldEntry(raw)) {
			parsed.errors.push(`${declarer}: invalid "skills" entry ${JSON.stringify(raw)}`);
			continue;
		}
		const { source, skills = [], ref } = typeof raw === "string" ? { source: raw } : raw;
		if (!source.startsWith(NPM_PREFIX)) {
			const remote = parseSource(source);
			if (!REMOTE_SOURCE_TYPES.has(remote.type)) parsed.errors.push(`${declarer}: "${source}" is not a git source`);
			else if (ref !== void 0 && remote.ref !== void 0) parsed.errors.push(`${declarer}: "${source}" already has a ref; remove "ref"`);
			else parsed.remote.push({
				parsed: {
					...remote,
					ref: ref ?? remote.ref
				},
				skills: remote.skillFilter ? [...skills, remote.skillFilter] : skills
			});
		} else if (ref !== void 0) parsed.errors.push(`${declarer}: "ref" cannot be used with "${source}"`);
		else parsed.npm.push({
			package: source.slice(4),
			skills
		});
	}
	return parsed;
}
const isCancelled = (value) => typeof value === "symbol";
function matchesSkill(skill, patterns) {
	return patterns.some((pattern) => {
		const hash = pattern.indexOf("#");
		const packagePattern = hash === -1 ? pattern : pattern.slice(0, hash);
		const skillPattern = hash === -1 ? "**" : pattern.slice(hash + 1);
		return posix.matchesGlob(skill.packageName, packagePattern) && posix.matchesGlob(sanitizeName(skill.name), skillPattern);
	});
}
function allowedByFilters(skill, { include, exclude }) {
	return (!include?.length || matchesSkill(skill, include)) && !(exclude?.length && matchesSkill(skill, exclude));
}
function shortenPath$1(fullPath, cwd) {
	const home = homedir();
	if (fullPath === home || fullPath.startsWith(home + sep)) return "~" + fullPath.slice(home.length);
	if (fullPath === cwd || fullPath.startsWith(cwd + sep)) return "." + fullPath.slice(cwd.length);
	return fullPath;
}
async function readPackageJson(dir) {
	try {
		return JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
	} catch {
		return null;
	}
}
async function discoverPackageSkills(pkgDir, packageName, depth) {
	const pkg = await readPackageJson(pkgDir);
	if (!pkg) return [];
	const rootSkill = await hasSkillMd(pkgDir) ? await parseSkillMd(join(pkgDir, "SKILL.md")) : null;
	if (rootSkill) return [{
		...rootSkill,
		packageName,
		packageVersion: pkg.version,
		skillPath: "SKILL.md",
		depth
	}];
	const skills = [];
	for (const dir of ["skills", "dist/skills"]) for (const name of await readdir(join(pkgDir, dir)).catch(() => [])) {
		const skillDir = join(pkgDir, dir, name);
		if (!await hasSkillMd(skillDir)) continue;
		const skill = await parseSkillMd(join(skillDir, "SKILL.md"));
		if (skill) skills.push({
			...skill,
			packageName,
			packageVersion: pkg.version,
			skillPath: `${dir}/${name}/SKILL.md`,
			depth
		});
	}
	return skills;
}
function findInstalledPackage(from, name) {
	for (let dir = from;; dir = dirname(dir)) {
		const candidate = join(dir, "node_modules", name);
		if (existsSync(join(candidate, "package.json"))) return candidate;
		if (dirname(dir) === dir) return void 0;
	}
}
function remoteAllowsSkill(request, name, options) {
	return request.declarers.some((packageName) => allowedByFilters({
		name,
		packageName
	}, options));
}
function filterRemoteRequests(requests, options) {
	return requests.flatMap((request) => {
		const declarers = request.declarers.filter((name) => (!options.include?.length || options.include.some((p) => posix.matchesGlob(name, p.split("#")[0]))) && !options.exclude?.some((p) => !p.includes("#") && posix.matchesGlob(name, p)));
		if (declarers.length === 0) return [];
		const filtered = {
			...request,
			via: declarers[0],
			declarers
		};
		if (request.skills.length === 0) return [filtered];
		const skills = request.skills.filter((name) => remoteAllowsSkill(filtered, name, options));
		return skills.length > 0 ? [{
			...filtered,
			skills
		}] : [];
	});
}
function requestsLockedSkill(request, name, entry) {
	return isFromRequest(entry, request) && (request.skills.length === 0 || request.skills.some((selected) => sanitizeName(selected) === sanitizeName(name) || selected === posix.basename(posix.dirname(entry.skillPath ?? ""))));
}
const DEPENDENCY_FIELDS = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies"
];
async function findWorkspacePackages(cwd, pkg) {
	const patterns = [...Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages ?? []];
	try {
		const pnpm = parse(await readFile(join(cwd, "pnpm-workspace.yaml"), "utf-8"));
		if (pnpm && typeof pnpm === "object" && "packages" in pnpm && Array.isArray(pnpm.packages)) patterns.push(...pnpm.packages.filter((p) => typeof p === "string"));
	} catch {}
	const negated = patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1));
	const included = patterns.filter((p) => !p.startsWith("!"));
	const dirs = /* @__PURE__ */ new Set();
	for await (const file of glob(included.map((p) => posix.join(p, "package.json")), {
		cwd,
		exclude: (path) => basename(path) === "node_modules"
	})) {
		const dir = dirname(file).split(sep).join("/");
		if (dir !== "." && !negated.some((n) => posix.matchesGlob(dir, n))) dirs.add(join(cwd, dir));
	}
	return [...dirs].sort();
}
async function discoverNodeModuleSkills(cwd, recursive) {
	const warnings = [];
	const errors = [];
	const remote = /* @__PURE__ */ new Map();
	const pkg = await readPackageJson(cwd);
	if (!pkg) return {
		skills: [],
		remote: [],
		warnings,
		errors
	};
	const skills = [];
	const seen = /* @__PURE__ */ new Set();
	const add = async (found) => {
		for (const skill of found) {
			const key = await realpath(skill.path).catch(() => skill.path);
			if (seen.has(key)) continue;
			seen.add(key);
			skills.push(skill);
		}
	};
	const projects = [{
		name: ".",
		dir: cwd,
		pkg,
		depth: 0
	}];
	for (const dir of recursive ? await findWorkspacePackages(cwd, pkg) : []) {
		const workspacePkg = await readPackageJson(dir);
		const name = workspacePkg?.name ?? relative(cwd, dir).split(sep).join("/");
		if (workspacePkg) projects.push({
			name,
			dir,
			pkg: workspacePkg,
			depth: 1
		});
	}
	const declarers = [];
	for (const project of projects) {
		const installed = [...new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(project.pkg[field] ?? {})))].flatMap((name) => {
			const dir = findInstalledPackage(project.dir, name);
			return dir ? [{
				name,
				dir
			}] : [];
		});
		await add((await Promise.all(installed.map(({ name, dir }) => discoverPackageSkills(dir, name, project.depth)))).flat());
		declarers.push({
			name: project.name,
			dir: project.dir,
			depth: project.depth
		}, ...installed.map(({ name, dir }) => ({
			name,
			dir,
			depth: project.depth + 1
		})));
	}
	const visited = /* @__PURE__ */ new Set();
	for (const declarer of declarers) {
		const dir = await realpath(declarer.dir).catch(() => null);
		if (!dir || visited.has(dir)) continue;
		visited.add(dir);
		const problems = declarer.name === "." ? errors : warnings;
		const field = (await readPackageJson(dir))?.skills;
		if (field === void 0) continue;
		if (!Array.isArray(field)) {
			if (problems === errors) errors.push("package.json: \"skills\" must be an array");
			continue;
		}
		const parsed = parseSkillsField(field, declarer.name);
		problems.push(...parsed.errors);
		for (const request of parsed.remote) {
			const { url, ref, subpath } = request.parsed;
			const key = JSON.stringify([
				url,
				ref,
				subpath,
				request.skills
			]);
			const existing = remote.get(key);
			if (existing) {
				if (!existing.declarers.includes(declarer.name)) existing.declarers.push(declarer.name);
			} else remote.set(key, {
				...request,
				via: declarer.name,
				declarers: [declarer.name]
			});
		}
		for (const request of parsed.npm) {
			const target = findInstalledPackage(dir, request.package);
			if (!target) {
				problems.push(`${declarer.name}: cannot resolve "npm:${request.package}"; is it a dependency?`);
				continue;
			}
			await add((await discoverPackageSkills(target, request.package, declarer.depth)).filter((skill) => request.skills.length === 0 || request.skills.includes(basename(skill.path)) || request.skills.includes(sanitizeName(skill.name))).map((skill) => ({
				...skill,
				via: declarer.name
			})));
			declarers.push({
				name: request.package,
				dir: target,
				depth: declarer.depth + 1
			});
		}
	}
	return {
		skills,
		remote: [...remote.values()],
		warnings,
		errors
	};
}
function isUnderNodeModules(path) {
	return path.split(sep).includes("node_modules");
}
function installedBySync(entry) {
	return entry?.sourceType === "node_modules" || entry?.via !== void 0;
}
async function foreignDestination(dest, canonicalDir, lockEntry, cwd) {
	let stats;
	try {
		stats = await lstat(dest);
	} catch {
		return null;
	}
	if (stats.isSymbolicLink()) {
		const target = resolve(dirname(dest), await readlink(dest));
		if (isUnderNodeModules(target) || target === canonicalDir) return null;
		return `${shortenPath$1(dest, cwd)} is a symlink to ${shortenPath$1(target, cwd)}`;
	}
	if (installedBySync(lockEntry)) return null;
	return `${shortenPath$1(dest, cwd)} already exists and was not installed by sync`;
}
async function linksIntoNodeModules(path) {
	try {
		if (!(await lstat(path)).isSymbolicLink()) return false;
		return isUnderNodeModules(resolve(dirname(path), await readlink(path)));
	} catch {
		return false;
	}
}
async function pruneStaleSkills(cwd, keep, keepRemote, lock, dryRun) {
	const canonicalBase = getCanonicalSkillsDir(false, cwd);
	const lockKeys = /* @__PURE__ */ new Map();
	const explicit = /* @__PURE__ */ new Set();
	for (const [key, entry] of Object.entries(lock.skills)) {
		const remote = entry.sourceType !== "node_modules";
		if (installedBySync(entry) && !(remote && keepRemote(entry, key))) lockKeys.set(sanitizeName(key), key);
		else explicit.add(sanitizeName(key));
	}
	const candidates = new Set(lockKeys.keys());
	for (const name of await readdir(canonicalBase).catch(() => [])) if (await linksIntoNodeModules(join(canonicalBase, name))) candidates.add(name);
	const stale = [...candidates].filter((name) => !keep.has(name) && !explicit.has(name)).sort();
	if (dryRun || stale.length === 0) return stale;
	const allAgents = Object.keys(agents);
	for (const name of stale) {
		const canonicalDir = join(canonicalBase, name);
		const key = lockKeys.get(name);
		const lockEntry = key ? lock.skills[key] : void 0;
		const destinations = /* @__PURE__ */ new Set([canonicalDir, ...allAgents.map((agent) => getInstallPath(name, agent, { cwd }))]);
		for (const dest of destinations) if (!await foreignDestination(dest, canonicalDir, lockEntry, cwd)) await rm(dest, {
			recursive: true,
			force: true
		});
		if (key) delete lock.skills[key];
	}
	await writeLocalLock(lock, cwd);
	return stale;
}
async function blockedReason(name, targetAgents, lockEntry, cwd) {
	if (lockEntry && !installedBySync(lockEntry)) return `installed with \`skills add\` from ${lockEntry.source}`;
	const canonicalDir = getCanonicalPath(name, { cwd });
	const destinations = /* @__PURE__ */ new Set([canonicalDir, ...targetAgents.map((agent) => getInstallPath(name, agent, { cwd }))]);
	for (const dest of destinations) {
		const reason = await foreignDestination(dest, canonicalDir, lockEntry, cwd);
		if (reason) return reason;
	}
	return null;
}
async function resolveConflicts(skills, targetAgents, lockSkills, cwd) {
	const lockBySanitizedName = new Map(Object.entries(lockSkills).map(([name, entry]) => [sanitizeName(name), entry]));
	const byName = Map.groupBy(skills, (skill) => sanitizeName(skill.name));
	const install = [];
	const skipped = [];
	for (const [name, all] of byName) {
		const depth = Math.min(...all.map((c) => c.depth));
		const candidates = all.filter((c) => c.depth === depth);
		for (const skill of all.filter((c) => c.depth !== depth)) skipped.push({
			skill,
			reason: `${candidates[0].packageName} is closer to the project`
		});
		if (candidates.length > 1) {
			const packages = candidates.map((c) => c.packageName).join(", ");
			for (const skill of candidates) skipped.push({
				skill,
				reason: `shipped by ${packages}; drop this one with --exclude ${skill.packageName}#${name}`
			});
			continue;
		}
		const skill = candidates[0];
		const reason = await blockedReason(name, targetAgents, lockBySanitizedName.get(name), cwd);
		if (reason) skipped.push({
			skill,
			reason
		});
		else install.push(skill);
	}
	return {
		install,
		skipped
	};
}
async function promptForAgentChoice(choices, fallback) {
	const universalAgents = getUniversalAgents();
	const visibleUniversalAgents = getVisibleUniversalAgents();
	const last = await getLastSelectedAgents().catch(() => void 0);
	const remembered = choices.filter((a) => last?.includes(a));
	const selected = await searchMultiselect({
		message: "Which agents do you want to install to?",
		items: choices.map((a) => ({
			value: a,
			label: agents[a].displayName,
			hint: agents[a].skillsDir
		})),
		initialSelected: remembered.length > 0 ? remembered : fallback,
		lockedSection: {
			title: "Universal (.agents/skills)",
			items: visibleUniversalAgents.map((a) => ({
				value: a,
				label: agents[a].displayName
			})),
			hiddenCount: universalAgents.length - visibleUniversalAgents.length
		}
	});
	if (!isCancelled(selected)) await saveSelectedAgents(selected).catch(() => {});
	return selected;
}
function failOnLockChanges(changes) {
	if (changes.length === 0) return false;
	log.error(frozenLockfileError(changes));
	process.exitCode = 1;
	return true;
}
function isFromRequest(entry, request) {
	return entry.via !== void 0 && entry.source === getProjectLockSource(request.parsed) && entry.ref === request.parsed.ref;
}
function isRemoteInstalled(request, lock, cwd) {
	const installed = Object.entries(lock.skills).filter(([name, entry]) => isFromRequest(entry, request) && existsSync(getCanonicalPath(name, { cwd }))).map(([name]) => sanitizeName(name));
	return request.skills.length === 0 ? installed.length > 0 : request.skills.every((name) => installed.includes(sanitizeName(name)));
}
async function runSync(args, options = {}) {
	const cwd = process.cwd();
	const agentResult = await detectAgent();
	if (agentResult.isAgent) {
		options.yes = true;
		if (!options.agent || options.agent.length === 0) {
			const mappedAgent = getAgentType(agentResult.agent.name);
			if (mappedAgent) {
				const agentList = [mappedAgent];
				for (const ua of getUniversalAgents()) if (!agentList.includes(ua)) agentList.push(ua);
				options.agent = agentList;
			}
		}
	}
	console.log();
	if (!agentResult.isAgent) intro(import_picocolors.default.bgCyan(import_picocolors.default.black(" skills experimental_sync ")));
	if (agentResult.isAgent) log.info(import_picocolors.default.bgCyan(import_picocolors.default.black(import_picocolors.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — installing non-interactively");
	const spinner$2 = spinner();
	spinner$2.start("Scanning node_modules for skills…");
	const discovery = await discoverNodeModuleSkills(cwd, options.recursive ?? false);
	if (discovery.errors.length > 0) {
		spinner$2.stop(import_picocolors.default.red("Invalid skills field"));
		for (const error of discovery.errors) log.error(error);
		outro(import_picocolors.default.red("Fix the \"skills\" field in package.json and run sync again."));
		process.exitCode = 1;
		return;
	}
	const discoveredSkills = discovery.skills.filter((skill) => allowedByFilters(skill, options));
	const remote = filterRemoteRequests(discovery.remote, options);
	spinner$2.stop(discoveredSkills.length === 0 ? import_picocolors.default.yellow("No skills found") : `Found ${import_picocolors.default.green(String(discoveredSkills.length))} skill${discoveredSkills.length > 1 ? "s" : ""} in node_modules`);
	for (const warning of discovery.warnings) log.warn(warning);
	const localLock = await readLocalLock(cwd);
	const frozen = options.frozenLockfile ?? isCI();
	if (options.cleanup !== false) {
		const keep = new Set(discoveredSkills.map((skill) => sanitizeName(skill.name)));
		const keepRemote = (entry, name) => options.remote === false || remote.some((r) => requestsLockedSkill(r, name, entry) && remoteAllowsSkill(r, name, options));
		const stale = await pruneStaleSkills(cwd, keep, keepRemote, localLock, frozen || (options.dryRun ?? false));
		if (frozen) {
			if (failOnLockChanges(stale.map((name) => `${name} is no longer provided by a dependency`))) return;
		} else for (const name of stale) log.info(`${options.dryRun ? "Would remove" : "Removed"} ${import_picocolors.default.cyan(name)} ${import_picocolors.default.dim("(no longer provided by a dependency)")}`);
	}
	const remoteRequests = (options.remote === false ? [] : remote).filter((request) => !isRemoteInstalled(request, localLock, cwd));
	const cachedRemoteSkills = [];
	if (options.remote !== false) {
		const shippedNames = new Set(discoveredSkills.map((skill) => sanitizeName(skill.name)));
		for (const [name, entry] of Object.entries(localLock.skills)) {
			if (shippedNames.has(sanitizeName(name))) continue;
			if (!remote.some((request) => !remoteRequests.includes(request) && requestsLockedSkill(request, name, entry) && remoteAllowsSkill(request, name, options))) continue;
			const skill = await parseSkillMd(join(getCanonicalPath(name, { cwd }), "SKILL.md"));
			if (skill) cachedRemoteSkills.push({
				skill,
				source: entry.source
			});
		}
	}
	if (discoveredSkills.length === 0 && remoteRequests.length === 0 && cachedRemoteSkills.length === 0) {
		outro(import_picocolors.default.dim("Nothing to sync."));
		return;
	}
	for (const skill of discoveredSkills) {
		log.info(`${import_picocolors.default.cyan(skill.name)} ${import_picocolors.default.dim(`from ${skill.packageName}`)}`);
		if (skill.description) log.message(import_picocolors.default.dim(`  ${skill.description}`));
	}
	let targetAgents;
	const validAgents = Object.keys(agents);
	const universalAgents = getUniversalAgents();
	if (options.agent?.includes("*")) {
		targetAgents = validAgents;
		log.info(`Installing to all ${targetAgents.length} agents`);
	} else if (options.agent && options.agent.length > 0) {
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
			log.info(`Valid agents: ${validAgents.join(", ")}`);
			process.exit(1);
		}
		targetAgents = options.agent;
	} else {
		spinner$2.start("Loading agents…");
		const installedAgents = await detectInstalledAgents();
		const totalAgents = Object.keys(agents).length;
		spinner$2.stop(`${totalAgents} agents`);
		if (installedAgents.length === 0 && options.yes) {
			targetAgents = universalAgents;
			log.info("Installing to universal agents");
		} else if (installedAgents.length === 1 || options.yes) {
			targetAgents = [...installedAgents];
			for (const ua of universalAgents) if (!targetAgents.includes(ua)) targetAgents.push(ua);
		} else {
			const selected = await promptForAgentChoice(getNonUniversalAgents().filter((a) => installedAgents.length === 0 || installedAgents.includes(a)), installedAgents.filter((a) => !universalAgents.includes(a)));
			if (isCancelled(selected)) {
				cancel("Sync cancelled");
				process.exit(0);
			}
			targetAgents = selected;
		}
	}
	const { install: toInstall, skipped } = await resolveConflicts(discoveredSkills, targetAgents, localLock.skills, cwd);
	for (const { skill, reason } of skipped) log.warn(`Skipped ${import_picocolors.default.cyan(skill.name)} ${import_picocolors.default.dim(`from ${skill.packageName}`)}: ${reason}`);
	const cachedToInstall = [];
	for (const cached of cachedRemoteSkills) {
		const { skill } = cached;
		const missing = targetAgents.filter((agent) => !existsSync(getInstallPath(skill.name, agent, { cwd })));
		if (missing.length === 0) continue;
		const reason = await blockedReason(skill.name, missing, localLock.skills[skill.name], cwd);
		if (reason) log.warn(`Skipped ${import_picocolors.default.cyan(skill.name)}: ${reason}`);
		else cachedToInstall.push({
			...cached,
			agents: missing
		});
	}
	if (frozen) {
		const changes = [];
		for (const skill of toInstall) {
			const reason = lockChangeReason(localLock, skill.name, {
				computedHash: await computeSkillFolderHash(skill.path),
				version: skill.packageVersion
			});
			if (reason) changes.push(reason);
		}
		if (failOnLockChanges(changes)) return;
	}
	if (toInstall.length === 0 && remoteRequests.length === 0 && cachedToInstall.length === 0) {
		console.log();
		outro(import_picocolors.default.yellow("Nothing to sync."));
		return;
	}
	const mode = options.copy ? "copy" : "link";
	const summaryLines = [];
	for (const skill of toInstall) {
		const canonicalPath = getCanonicalPath(skill.name, { cwd });
		summaryLines.push(`${import_picocolors.default.cyan(skill.name)} ${import_picocolors.default.dim(`← ${skill.packageName}`)}`);
		summaryLines.push(`  ${import_picocolors.default.dim(`${shortenPath$1(canonicalPath, cwd)} ${mode === "link" ? "→" : "copied from"} ${shortenPath$1(skill.path, cwd)}`)}`);
	}
	for (const request of remoteRequests) summaryLines.push(`${import_picocolors.default.cyan(getProjectLockSource(request.parsed))} ${import_picocolors.default.dim(`← ${request.via} (remote)`)}`);
	for (const { skill, source, agents: missing } of cachedToInstall) summaryLines.push(`${import_picocolors.default.cyan(skill.name)} ${import_picocolors.default.dim(`← ${source} (cached), link to ${missing.join(", ")}`)}`);
	console.log();
	note(summaryLines.join("\n"), "Sync Summary");
	if (options.dryRun) {
		outro(import_picocolors.default.dim("Dry run — nothing changed."));
		return;
	}
	if (!options.yes) {
		const confirmed = await confirm({ message: "Proceed with sync?" });
		if (isCancel(confirmed) || !confirmed) {
			cancel("Sync cancelled");
			process.exit(0);
		}
	}
	spinner$2.start("Syncing skills…");
	const results = [];
	for (const { skill, source, agents: missing } of cachedToInstall) for (const agent of missing) {
		const result = await installSkillForAgent(skill, agent, {
			cwd,
			mode: "symlink",
			createMissingAgentRoot: true
		});
		results.push({
			skill: skill.name,
			packageName: source,
			agent: agents[agent].displayName,
			success: result.success,
			path: result.path,
			canonicalPath: result.canonicalPath,
			error: result.error
		});
	}
	for (const skill of toInstall) for (const agent of targetAgents) {
		const result = await installSkillForAgent(skill, agent, {
			global: false,
			cwd,
			mode: agent === "eve" ? "copy" : mode
		});
		results.push({
			skill: skill.name,
			packageName: skill.packageName,
			agent: agents[agent].displayName,
			success: result.success,
			path: result.path,
			canonicalPath: result.canonicalPath,
			error: result.error
		});
	}
	spinner$2.stop("Sync complete");
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	const successfulSkillNames = new Set(successful.map((r) => r.skill));
	for (const skill of toInstall) if (!frozen && successfulSkillNames.has(skill.name)) try {
		const computedHash = await computeSkillFolderHash(skill.path);
		await addSkillToLocalLock(skill.name, {
			source: skill.packageName,
			sourceType: "node_modules",
			skillPath: skill.skillPath,
			...skill.packageVersion && { version: skill.packageVersion },
			...skill.via && { via: skill.via },
			computedHash
		}, cwd);
	} catch {}
	const claimed = new Set(discoveredSkills.map((skill) => sanitizeName(skill.name)));
	const lockEntryFor = (name) => Object.entries(localLock.skills).find(([key]) => sanitizeName(key) === name)?.[1];
	const fetched = await fetchSources(remoteRequests);
	for (const [index, request] of remoteRequests.entries()) {
		const label = getProjectLockSource(request.parsed);
		const result = await installFromSource(fetched[index], {
			skills: request.skills,
			agents: targetAgents,
			via: request.via,
			...frozen && { frozenLock: localLock },
			select: async (skills) => {
				const selected = [];
				for (const skill of skills) {
					const name = sanitizeName(skill.name);
					if (!remoteAllowsSkill(request, name, options)) continue;
					const reason = claimed.has(name) ? "another source in this sync provides it" : await blockedReason(name, targetAgents, lockEntryFor(name), cwd);
					if (reason) {
						log.warn(`Skipped ${import_picocolors.default.cyan(name)} from ${label}: ${reason}`);
						continue;
					}
					claimed.add(name);
					selected.push(skill);
				}
				return selected;
			}
		});
		if (result.error) {
			log.error(`Failed to install from ${import_picocolors.default.cyan(label)}: ${result.error}`);
			process.exitCode = 1;
			continue;
		}
		if (result.installed.length > 0) log.success(`Installed ${result.installed.map((name) => import_picocolors.default.cyan(name)).join(", ")} from ${label}`);
		for (const failure of result.failed) log.error(failure);
		if (result.failed.length > 0) process.exitCode = 1;
	}
	console.log();
	if (successful.length > 0) {
		const bySkill = /* @__PURE__ */ new Map();
		for (const r of successful) {
			const skillResults = bySkill.get(r.skill) || [];
			skillResults.push(r);
			bySkill.set(r.skill, skillResults);
		}
		const resultLines = [];
		for (const [skillName, skillResults] of bySkill) {
			const firstResult = skillResults[0];
			const pkg = firstResult.packageName;
			if (firstResult.canonicalPath) {
				const shortPath = shortenPath$1(firstResult.canonicalPath, cwd);
				resultLines.push(`${import_picocolors.default.green("✓")} ${skillName} ${import_picocolors.default.dim(`← ${pkg}`)}`);
				resultLines.push(`  ${import_picocolors.default.dim(shortPath)}`);
			} else resultLines.push(`${import_picocolors.default.green("✓")} ${skillName} ${import_picocolors.default.dim(`← ${pkg}`)}`);
		}
		const skillCount = bySkill.size;
		const title = import_picocolors.default.green(`Synced ${skillCount} skill${skillCount !== 1 ? "s" : ""}`);
		note(resultLines.join("\n"), title);
	}
	if (failed.length > 0) {
		process.exitCode = 1;
		console.log();
		log.error(import_picocolors.default.red(`Failed to install ${failed.length}`));
		for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill} → ${r.agent}: ${import_picocolors.default.dim(r.error)}`);
	}
	track({
		event: "experimental_sync",
		skillCount: String(toInstall.length + cachedToInstall.length),
		successCount: String(successfulSkillNames.size),
		agents: targetAgents.join(",")
	});
	console.log();
	outro(import_picocolors.default.green("Done!") + import_picocolors.default.dim("  Review skills before use; they run with full agent permissions."));
}
function parseSyncOptions(args) {
	const options = {};
	let i = 0;
	const takeValues = () => {
		const values = [];
		while (args[i + 1] !== void 0 && !args[i + 1].startsWith("-")) values.push(args[++i]);
		return values;
	};
	for (; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-y" || arg === "--yes") options.yes = true;
		else if (arg === "--copy") options.copy = true;
		else if (arg === "--dry-run") options.dryRun = true;
		else if (arg === "--no-cleanup") options.cleanup = false;
		else if (arg === "--no-remote") options.remote = false;
		else if (arg === "--frozen-lockfile") options.frozenLockfile = true;
		else if (arg === "--no-frozen-lockfile") options.frozenLockfile = false;
		else if (arg === "-r" || arg === "--recursive") options.recursive = true;
		else if (arg === "-a" || arg === "--agent") options.agent = [...options.agent ?? [], ...takeValues()];
		else if (arg === "--include") options.include = [...options.include ?? [], ...takeValues()];
		else if (arg === "--exclude") options.exclude = [...options.exclude ?? [], ...takeValues()];
	}
	return { options };
}
function formatSourceInput(sourceUrl, ref) {
	if (!ref) return sourceUrl;
	return `${sourceUrl}#${ref}`;
}
function deriveSkillFolder(skillPath) {
	let folder = skillPath;
	if (folder.endsWith("/SKILL.md")) folder = folder.slice(0, -9);
	else if (folder.endsWith("SKILL.md")) folder = folder.slice(0, -8);
	if (folder.endsWith("/")) folder = folder.slice(0, -1);
	return folder;
}
function supportsAppendedSubpath(source) {
	if (source.startsWith("git@") || source.startsWith("ssh://")) return false;
	if (source.endsWith(".git")) return false;
	if (source.startsWith("http://") || source.startsWith("https://")) try {
		const host = new URL(source).hostname;
		return host === "github.com" || host === "gitlab.com";
	} catch {
		return false;
	}
	return true;
}
function isBareShorthand(source) {
	return !source.includes(":") && !source.startsWith(".") && !source.startsWith("/");
}
function getLocalSource(entry) {
	if (entry.sourceUrl) return entry.sourceUrl;
	if ((entry.sourceType === "git" || entry.sourceType === "gitlab") && isBareShorthand(entry.source)) return null;
	return entry.source;
}
function buildLocalCloneSource(entry) {
	const source = getLocalSource(entry);
	if (!source) return null;
	if (entry.sourceType === "github" && isBareShorthand(source)) return `https://github.com/${source.replace(/\.git$/, "")}.git`;
	return source;
}
function shouldUseFullDepthForUpdate(entry) {
	if (!entry.skillPath) return false;
	const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.source;
	return source !== null && !supportsAppendedSubpath(source);
}
function appendFolderAndRef(source, skillPath, ref) {
	if (!supportsAppendedSubpath(source)) return formatSourceInput(source, ref);
	const folder = deriveSkillFolder(skillPath);
	const withFolder = folder ? `${source}/${folder}` : source;
	return ref ? `${withFolder}#${ref}` : withFolder;
}
function buildUpdateInstallSource(entry) {
	if (!entry.skillPath) {
		const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.sourceUrl || entry.source;
		if (!source) return null;
		return formatSourceInput(source, entry.ref);
	}
	const source = entry.sourceType && entry.sourceType !== "github" ? getLocalSource(entry) : entry.source;
	if (!source) return null;
	return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
function buildLocalUpdateSource(entry) {
	const source = getLocalSource(entry);
	if (!source) return null;
	if (!entry.skillPath) return formatSourceInput(source, entry.ref);
	return appendFolderAndRef(source, entry.skillPath, entry.ref);
}
async function runInstallFromLock(args) {
	const cwd = process.cwd();
	const { options: syncOptions } = parseSyncOptions(args);
	const frozen = syncOptions.frozenLockfile ?? isCI();
	const force = args.includes("--force");
	const lock = await readLocalLock(cwd);
	const skillEntries = Object.entries(lock.skills);
	if (skillEntries.length === 0) {
		if (frozen) {
			log.error("Cannot install with --frozen-lockfile because skills-lock.json is absent or has no skills");
			process.exitCode = 1;
			return;
		}
		log.warn("No project skills found in skills-lock.json");
		log.info(`Add project-level skills with ${import_picocolors.default.cyan("npx skills add <package>")} (without ${import_picocolors.default.cyan("-g")})`);
		return;
	}
	const universalAgentNames = getUniversalAgents();
	const nodeModuleSkills = [];
	const alreadyInstalled = [];
	const bySource = /* @__PURE__ */ new Map();
	for (const [skillName, entry] of skillEntries) {
		if (entry.sourceType === "node_modules") {
			nodeModuleSkills.push(skillName);
			continue;
		}
		if (!force && existsSync(join(getCanonicalPath(skillName, { cwd }), "SKILL.md"))) {
			alreadyInstalled.push(skillName);
			continue;
		}
		const installSource = buildLocalUpdateSource(entry);
		if (!installSource) {
			log.error(`Cannot restore ${import_picocolors.default.cyan(skillName)}: skills-lock.json is missing sourceUrl for this generic Git source`);
			continue;
		}
		bySource.set(installSource, [...bySource.get(installSource) ?? [], skillName]);
	}
	if (alreadyInstalled.length > 0) log.info(`${import_picocolors.default.cyan(String(alreadyInstalled.length))} skill${alreadyInstalled.length !== 1 ? "s" : ""} already installed ${import_picocolors.default.dim("(use --force to reinstall)")}`);
	const remoteCount = skillEntries.length - nodeModuleSkills.length - alreadyInstalled.length;
	if (remoteCount > 0) log.info(`${syncOptions.dryRun ? "Would restore" : "Restoring"} ${import_picocolors.default.cyan(String(remoteCount))} skill${remoteCount !== 1 ? "s" : ""} from skills-lock.json into ${import_picocolors.default.dim(".agents/skills/")}`);
	if (syncOptions.dryRun) {
		for (const [source, skills] of bySource) log.message(`${skills.map((name) => import_picocolors.default.cyan(name)).join(", ")} ${import_picocolors.default.dim(`from ${source}`)}`);
		bySource.clear();
	}
	const requests = [...bySource].map(([source, skills]) => ({
		source,
		parsed: parseSource(source),
		skills
	}));
	const fetched = await fetchSources(requests);
	for (const [index, { source, skills }] of requests.entries()) {
		const result = await installFromSource(fetched[index], {
			skills,
			agents: universalAgentNames,
			...frozen && { frozenLock: lock }
		});
		if (result.error) {
			log.error(`Failed to install from ${import_picocolors.default.cyan(source)}: ${result.error}`);
			process.exitCode = 1;
			continue;
		}
		log.success(`Restored ${result.installed.map((name) => import_picocolors.default.cyan(name)).join(", ")}`);
		for (const failure of result.failed) log.error(failure);
		if (result.failed.length > 0) process.exitCode = 1;
	}
	if (nodeModuleSkills.length > 0) {
		log.info(`${import_picocolors.default.cyan(String(nodeModuleSkills.length))} skill${nodeModuleSkills.length !== 1 ? "s" : ""} from node_modules`);
		try {
			await runSync(args, {
				...syncOptions,
				frozenLockfile: frozen,
				yes: true,
				agent: universalAgentNames
			});
		} catch (error) {
			log.error(`Failed to sync node_modules skills: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}
}
const RESET$2 = "\x1B[0m";
const BOLD$2 = "\x1B[1m";
const DIM$2 = "\x1B[38;5;102m";
const CYAN = "\x1B[36m";
const YELLOW = "\x1B[33m";
function shortenPath(fullPath, cwd) {
	const home = homedir();
	if (fullPath.startsWith(home)) return fullPath.replace(home, "~");
	if (fullPath.startsWith(cwd)) return "." + fullPath.slice(cwd.length);
	return fullPath;
}
function formatList(items, maxShow = 5) {
	if (items.length <= maxShow) return items.join(", ");
	const shown = items.slice(0, maxShow);
	const remaining = items.length - maxShow;
	return `${shown.join(", ")} +${remaining} more`;
}
function parseListOptions(args) {
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-g" || arg === "--global") options.global = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			while (i + 1 < args.length && !args[i + 1].startsWith("-")) options.agent.push(args[++i]);
		}
	}
	return options;
}
async function readProjectLockOrWarn(cwd) {
	try {
		return (await readLocalLock(cwd)).skills;
	} catch (error) {
		if (!(error instanceof InvalidLocalLockError)) throw error;
		console.error(`${YELLOW}Warning: ${error.message}${RESET$2}`);
		return {};
	}
}
async function runList(args) {
	const options = parseListOptions(args);
	const scope = options.global === true ? true : false;
	let agentFilter;
	if (options.agent && options.agent.length > 0) {
		const validAgents = Object.keys(agents);
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			console.log(`${YELLOW}Invalid agents: ${invalidAgents.join(", ")}${RESET$2}`);
			console.log(`${DIM$2}Valid agents: ${validAgents.join(", ")}${RESET$2}`);
			process.exit(1);
		}
		agentFilter = options.agent;
	}
	const installedSkills = await listInstalledSkills({
		global: scope,
		agentFilter
	});
	const cwd = process.cwd();
	const lockedSkills = scope ? await getAllLockedSkills() : await readProjectLockOrWarn(cwd);
	const lockEntriesBySanitizedName = new Map(Object.entries(lockedSkills).map(([name, entry]) => [sanitizeName(name), entry]));
	const getLockEntry = (skillName) => lockedSkills[skillName] ?? lockEntriesBySanitizedName.get(sanitizeName(skillName));
	const installedNames = new Set(installedSkills.map((skill) => sanitizeName(skill.name)));
	const missingSkills = agentFilter ? [] : Object.entries(lockedSkills).filter(([name]) => !installedNames.has(sanitizeName(name)));
	if (options.json) {
		const jsonOutput = installedSkills.map((skill) => {
			const lockEntry = getLockEntry(skill.name);
			return {
				name: skill.name,
				path: skill.canonicalPath,
				scope: skill.scope,
				agents: skill.agents.map((a) => agents[a].displayName),
				source: lockEntry?.source ?? null,
				sourceUrl: lockEntry?.sourceUrl ?? null,
				sourceType: lockEntry?.sourceType ?? null,
				status: lockEntry ? "tracked" : "untracked"
			};
		});
		const missingOutput = missingSkills.map(([name, lockEntry]) => ({
			name,
			path: null,
			scope: scope ? "global" : "project",
			agents: [],
			source: lockEntry.source,
			sourceUrl: lockEntry.sourceUrl ?? null,
			sourceType: lockEntry.sourceType,
			status: "missing"
		}));
		console.log(JSON.stringify([...jsonOutput, ...missingOutput], null, 2));
		return;
	}
	const scopeLabel = scope ? "Global" : "Project";
	if (installedSkills.length === 0 && missingSkills.length === 0) {
		if (options.json) {
			console.log("[]");
			return;
		}
		console.log(`${DIM$2}No ${scopeLabel.toLowerCase()} skills found.${RESET$2}`);
		if (scope) console.log(`${DIM$2}Try listing project skills without -g${RESET$2}`);
		else console.log(`${DIM$2}Try listing global skills with -g${RESET$2}`);
		return;
	}
	function printSkill(skill, indent = false, maxNameLength = 0, maxPathLength = 0) {
		const prefix = indent ? "  " : "";
		const shortPath = shortenPath(skill.canonicalPath, cwd);
		const agentNames = skill.agents.map((a) => agents[a].displayName);
		const agentInfo = skill.agents.length > 0 ? formatList(agentNames) : `${YELLOW}not linked${RESET$2}`;
		const paddedName = sanitizeMetadata(skill.name).padEnd(maxNameLength);
		const paddedPath = shortPath.padEnd(maxPathLength);
		const source = getLockEntry(skill.name)?.source ?? null;
		const sourceLabel = source ? sanitizeMetadata(source) : `${YELLOW}untracked${RESET$2}`;
		console.log(`${prefix}${CYAN}${paddedName}${RESET$2} ${DIM$2}${paddedPath}${RESET$2}`);
		console.log(`${prefix}  ${DIM$2}Agents:${RESET$2} ${agentInfo}  ${DIM$2}Source:${RESET$2} ${sourceLabel}`);
	}
	console.log(`${BOLD$2}${scopeLabel} Skills${RESET$2}`);
	console.log();
	const groupedSkills = {};
	const ungroupedSkills = [];
	for (const skill of installedSkills) {
		const lockEntry = getLockEntry(skill.name);
		if (lockEntry?.pluginName) {
			const group = lockEntry.pluginName;
			if (!groupedSkills[group]) groupedSkills[group] = [];
			groupedSkills[group].push(skill);
		} else ungroupedSkills.push(skill);
	}
	if (Object.keys(groupedSkills).length > 0) {
		const sortedGroups = Object.keys(groupedSkills).sort();
		for (const group of sortedGroups) {
			const title = group.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
			console.log(`${BOLD$2}${title}${RESET$2}`);
			const skills = groupedSkills[group];
			if (skills) {
				let maxNameLength = 0;
				let maxPathLength = 0;
				for (const skill of skills) {
					const nameLength = sanitizeMetadata(skill.name).length;
					const pathLength = shortenPath(skill.canonicalPath, cwd).length;
					if (nameLength > maxNameLength) maxNameLength = nameLength;
					if (pathLength > maxPathLength) maxPathLength = pathLength;
				}
				for (const skill of skills) printSkill(skill, true, maxNameLength, maxPathLength);
			}
			console.log();
		}
		if (ungroupedSkills.length > 0) {
			console.log(`${BOLD$2}General${RESET$2}`);
			let maxNameLength = 0;
			let maxPathLength = 0;
			for (const skill of ungroupedSkills) {
				const nameLength = sanitizeMetadata(skill.name).length;
				const pathLength = shortenPath(skill.canonicalPath, cwd).length;
				if (nameLength > maxNameLength) maxNameLength = nameLength;
				if (pathLength > maxPathLength) maxPathLength = pathLength;
			}
			for (const skill of ungroupedSkills) printSkill(skill, true, maxNameLength, maxPathLength);
			console.log();
		}
	} else {
		let maxNameLength = 0;
		let maxPathLength = 0;
		for (const skill of installedSkills) {
			const nameLength = sanitizeMetadata(skill.name).length;
			const pathLength = shortenPath(skill.canonicalPath, cwd).length;
			if (nameLength > maxNameLength) maxNameLength = nameLength;
			if (pathLength > maxPathLength) maxPathLength = pathLength;
		}
		for (const skill of installedSkills) printSkill(skill, false, maxNameLength, maxPathLength);
		console.log();
	}
	if (missingSkills.length > 0) {
		console.log(`${BOLD$2}Missing${RESET$2} ${DIM$2}(in the lock file, not on disk)${RESET$2}`);
		for (const [name, entry] of missingSkills) console.log(`  ${CYAN}${sanitizeMetadata(name)}${RESET$2}  ${DIM$2}Source:${RESET$2} ${sanitizeMetadata(entry.source)}`);
		console.log();
	}
}
function resolveSkillsToRemove(requested, folderNames, lockKeys = [], sourceByKey = {}) {
	const identityBySanitized = /* @__PURE__ */ new Map();
	for (const folder of folderNames) identityBySanitized.set(sanitizeName(folder), folder);
	for (const key of lockKeys) identityBySanitized.set(sanitizeName(key), key);
	const matched = /* @__PURE__ */ new Set();
	for (const name of requested) {
		const hit = identityBySanitized.get(sanitizeName(name));
		if (hit) {
			matched.add(hit);
			continue;
		}
		for (const key of lockKeys) if (sourceByKey[key] === name) matched.add(key);
	}
	return Array.from(matched);
}
async function removeCommand(skillNames, options) {
	const agentResult = await detectAgent();
	if (agentResult.isAgent) {
		options.yes = true;
		log.info(import_picocolors.default.bgCyan(import_picocolors.default.black(import_picocolors.default.bold(` ${agentResult.agent.name} `))) + " Agent detected — removing non-interactively");
	}
	if (skillNames.includes("*")) {
		options.all = true;
		skillNames = skillNames.filter((name) => name !== "*");
	}
	const namedSkills = skillNames.filter((name) => name !== "*");
	if (options.all && namedSkills.length > 0) {
		log.error("Cannot combine --all with specific skill names.");
		log.info("Use `skills remove --all` to remove every skill, or omit --all to remove only the named skills.");
		log.info(`Example: skills remove ${namedSkills[0]} -y`);
		process.exit(1);
	}
	const isGlobal = options.global ?? false;
	const cwd = process.cwd();
	const spinner$1 = spinner();
	spinner$1.start("Scanning for installed skills…");
	const skillNamesSet = /* @__PURE__ */ new Set();
	const scanDir = async (dir) => {
		try {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
				if (!await hasSkillMd(join(dir, entry.name))) continue;
				skillNamesSet.add(entry.name);
			}
		} catch (err) {
			if (err instanceof Error && err.code !== "ENOENT") log.warn(`Could not scan directory ${dir}: ${err.message}`);
		}
	};
	if (isGlobal) {
		await scanDir(getCanonicalSkillsDir(true, cwd));
		for (const agent of Object.values(agents)) if (agent.globalSkillsDir !== void 0) await scanDir(agent.globalSkillsDir);
	} else {
		await scanDir(getCanonicalSkillsDir(false, cwd));
		for (const agent of Object.values(agents)) await scanDir(join(cwd, agent.skillsDir));
		for (const subagent of getEveSubagents(cwd)) await scanDir(getEveSubagentSkillsDir(subagent, cwd));
	}
	const installedSkills = Array.from(skillNamesSet).sort();
	spinner$1.stop(`Found ${installedSkills.length} unique installed skill(s)`);
	const lockEntries = isGlobal ? (await readSkillLock()).skills : (await readLocalLock(cwd)).skills;
	const lockSkillsKeys = Object.keys(lockEntries);
	const sourceByKey = Object.fromEntries(lockSkillsKeys.map((key) => [key, lockEntries[key]?.source]));
	const requestedSkills = options.all ? [...installedSkills, ...lockSkillsKeys] : skillNames;
	const resolvedRequestedSkills = options.all || skillNames.length > 0 ? resolveSkillsToRemove(requestedSkills, installedSkills, lockSkillsKeys, sourceByKey) : [];
	if (installedSkills.length === 0 && resolvedRequestedSkills.length === 0) {
		outro(import_picocolors.default.yellow("No skills found to remove."));
		return;
	}
	if (options.agent && options.agent.length > 0) {
		const validAgents = Object.keys(agents);
		const invalidAgents = options.agent.filter((a) => !validAgents.includes(a));
		if (invalidAgents.length > 0) {
			log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
			log.info(`Valid agents: ${validAgents.join(", ")}`);
			process.exit(1);
		}
	}
	let selectedSkills = [];
	if (options.all) selectedSkills = resolvedRequestedSkills;
	else if (skillNames.length > 0) {
		selectedSkills = resolvedRequestedSkills;
		if (selectedSkills.length === 0) {
			log.error(`No matching skills found for: ${skillNames.join(", ")}`);
			return;
		}
	} else {
		const choices = installedSkills.map((s) => ({
			value: s,
			label: s
		}));
		const selected = await multiselect({
			message: `Select skills to remove ${import_picocolors.default.dim("(space to toggle)")}`,
			options: choices,
			required: true
		});
		if (isCancel(selected)) {
			cancel("Removal cancelled");
			process.exit(0);
		}
		selectedSkills = resolveSkillsToRemove(selected, installedSkills, lockSkillsKeys);
	}
	let targetAgents;
	if (options.agent && options.agent.length > 0) targetAgents = options.agent;
	else {
		targetAgents = Object.keys(agents);
		spinner$1.stop(`Targeting ${targetAgents.length} potential agent(s)`);
	}
	if (!options.yes) {
		console.log();
		log.info("Skills to remove:");
		for (const skill of selectedSkills) log.message(`  ${import_picocolors.default.red("•")} ${skill}`);
		console.log();
		const confirmed = await confirm({ message: `Are you sure you want to uninstall ${selectedSkills.length} skill(s)?` });
		if (isCancel(confirmed) || !confirmed) {
			cancel("Removal cancelled");
			process.exit(0);
		}
	}
	spinner$1.start("Removing skills…");
	const results = [];
	for (const skillName of selectedSkills) try {
		const canonicalPath = getCanonicalPath(skillName, {
			global: isGlobal,
			cwd
		});
		for (const agentKey of targetAgents) {
			const agent = agents[agentKey];
			const skillPath = getInstallPath(skillName, agentKey, {
				global: isGlobal,
				cwd
			});
			const pathsToCleanup = /* @__PURE__ */ new Set([skillPath]);
			const sanitizedName = sanitizeName(skillName);
			if (isGlobal && agent.globalSkillsDir) pathsToCleanup.add(join(agent.globalSkillsDir, sanitizedName));
			else {
				pathsToCleanup.add(join(cwd, agent.skillsDir, sanitizedName));
				if (agentKey === "eve") for (const subagent of getEveSubagents(cwd)) pathsToCleanup.add(join(getEveSubagentSkillsDir(subagent, cwd), sanitizedName));
			}
			for (const pathToCleanup of pathsToCleanup) {
				if (pathToCleanup === canonicalPath) continue;
				try {
					if (await lstat(pathToCleanup).catch(() => null)) await rm(pathToCleanup, {
						recursive: true,
						force: true
					});
				} catch (err) {
					log.warn(`Could not remove skill from ${agent.displayName}: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		}
		const remainingAgents = (await detectInstalledAgents()).filter((a) => !targetAgents.includes(a));
		let isStillUsed = false;
		for (const agentKey of remainingAgents) if (await lstat(getInstallPath(skillName, agentKey, {
			global: isGlobal,
			cwd
		})).catch(() => null)) {
			isStillUsed = true;
			break;
		}
		if (!isStillUsed) await rm(canonicalPath, {
			recursive: true,
			force: true
		});
		let effectiveSource = "local";
		let effectiveSourceType = "local";
		if (isGlobal) {
			const lockEntry = await getSkillFromLock(skillName);
			effectiveSource = lockEntry?.source || "local";
			effectiveSourceType = lockEntry?.sourceType || "local";
			if (!isStillUsed) await removeSkillFromLock(skillName);
		} else {
			const lockEntry = (await readLocalLock(cwd)).skills[skillName];
			effectiveSource = lockEntry?.source || "local";
			effectiveSourceType = lockEntry?.sourceType || "local";
			if (!isStillUsed) await removeSkillFromLocalLock(skillName, cwd);
		}
		results.push({
			skill: skillName,
			success: true,
			source: effectiveSource,
			sourceType: effectiveSourceType
		});
	} catch (err) {
		results.push({
			skill: skillName,
			success: false,
			error: err instanceof Error ? err.message : String(err)
		});
	}
	spinner$1.stop("Removal process complete");
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	if (successful.length > 0) {
		const bySource = /* @__PURE__ */ new Map();
		for (const r of successful) {
			const source = r.sourceType === "local" ? "local" : r.source || "local";
			const existing = bySource.get(source) || { skills: [] };
			existing.skills.push(r.skill);
			existing.sourceType = r.sourceType;
			bySource.set(source, existing);
		}
		for (const [source, data] of bySource) track({
			event: "remove",
			source,
			skills: data.skills.join(","),
			agents: targetAgents.join(","),
			...isGlobal && { global: "1" },
			sourceType: data.sourceType
		});
	}
	if (successful.length > 0) log.success(import_picocolors.default.green(`Successfully removed ${successful.length} skill(s)`));
	if (failed.length > 0) {
		log.error(import_picocolors.default.red(`Failed to remove ${failed.length} skill(s)`));
		for (const r of failed) log.message(`  ${import_picocolors.default.red("✗")} ${r.skill}: ${r.error}`);
	}
	console.log();
	outro(import_picocolors.default.green("Done!"));
}
function parseRemoveOptions(args) {
	const options = {};
	const skills = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-g" || arg === "--global") options.global = true;
		else if (arg === "-y" || arg === "--yes") options.yes = true;
		else if (arg === "--all") {
			options.all = true;
			options.yes = true;
		} else if (arg === "-s" || arg === "--skill") {
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				skills.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg === "-a" || arg === "--agent") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			i--;
		} else if (arg && !arg.startsWith("-")) skills.push(arg);
	}
	return {
		skills,
		options
	};
}
function normalizeSkillName(name) {
	return name.toLowerCase().replace(/[\s_]+/g, "-");
}
function normalizeSkillPath(path) {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function resolveSkillLocations(lockedSkillNames, lockSkills, discovered, options = {}) {
	const discoveredPaths = new Set(discovered.map((skill) => normalizeSkillPath(skill.skillPath)));
	const pathsByName = /* @__PURE__ */ new Map();
	for (const skill of discovered) {
		const key = normalizeSkillName(skill.name);
		const paths = pathsByName.get(key) ?? /* @__PURE__ */ new Set();
		paths.add(normalizeSkillPath(skill.skillPath));
		pathsByName.set(key, paths);
	}
	const deletedSkills = [];
	const ambiguousSkills = [];
	const resolvedPaths = /* @__PURE__ */ new Map();
	for (const name of lockedSkillNames) {
		const lockedPath = lockSkills[name]?.skillPath;
		if (!lockedPath) continue;
		const normalizedLockedPath = normalizeSkillPath(lockedPath);
		const candidates = [...pathsByName.get(normalizeSkillName(name)) ?? []];
		const lockedPathStillExists = discoveredPaths.has(normalizedLockedPath);
		if (lockedPathStillExists && options.exactPathDisambiguates) {
			resolvedPaths.set(name, normalizedLockedPath);
			continue;
		}
		if (candidates.length > 1) {
			ambiguousSkills.push(name);
			continue;
		}
		if (lockedPathStillExists) {
			resolvedPaths.set(name, normalizedLockedPath);
			continue;
		}
		if (candidates.length === 1) resolvedPaths.set(name, candidates[0]);
		else deletedSkills.push(name);
	}
	return {
		deletedSkills,
		ambiguousSkills,
		resolvedPaths
	};
}
const RESET$1 = "\x1B[0m";
const BOLD$1 = "\x1B[1m";
const DIM$1 = "\x1B[38;5;102m";
const TEXT$1 = "\x1B[38;5;145m";
function printFetching(sourceCount) {
	if (sourceCount === 0) return;
	console.log(`${DIM$1}Fetching ${sourceCount} source${sourceCount === 1 ? "" : "s"}…${RESET$1}`);
}
function placementResolver(global) {
	let agentsPromise;
	return async (subagents, installMode) => {
		agentsPromise ??= nonInteractiveTargetAgents();
		let targetAgents = await agentsPromise;
		const hasSubagents = !!subagents?.length;
		if (hasSubagents && !targetAgents.includes("eve")) targetAgents = [...targetAgents, "eve"];
		const targets = buildInstallTargets(targetAgents, hasSubagents ? subagents.map((s) => s === "" ? void 0 : s) : [void 0]);
		return {
			global,
			targets,
			mode: installMode ?? defaultInstallMode(targets),
			createMissingAgentRoot: (agent) => hasSubagents && agent === "eve"
		};
	};
}
function reportInstall(name, outcome) {
	const safeName = sanitizeMetadata(name);
	for (const failure of outcome.failed) console.log(`  ${DIM$1}✗ ${failure}${RESET$1}`);
	if (outcome.ok && !outcome.error) {
		console.log(`  ${TEXT$1}✓${RESET$1} Updated ${safeName}`);
		return true;
	}
	console.log(`  ${DIM$1}✗ Failed to update ${safeName}${outcome.error ? `: ${outcome.error}` : ""}${RESET$1}`);
	return false;
}
async function installedSkillNames(global) {
	return new Set((await listInstalledSkills({ global })).map((skill) => skill.name));
}
function targetOutcome(results) {
	return {
		ok: results.some((r) => r.success),
		failed: results.filter((r) => !r.success).map((r) => `${r.agent}: ${r.error}`)
	};
}
function parseUpdateSource(installUrl, sourceType) {
	return parseSource(installUrl, sourceType === "github" ? { githubHost: "github.com" } : {});
}
function parseUpdateOptions(args) {
	const options = {};
	const positional = [];
	for (const arg of args) if (arg === "-g" || arg === "--global") options.global = true;
	else if (arg === "-p" || arg === "--project") options.project = true;
	else if (arg === "-y" || arg === "--yes") options.yes = true;
	else if (!arg.startsWith("-")) positional.push(arg);
	if (positional.length > 0) options.skills = positional;
	return options;
}
function hasProjectSkills(cwd) {
	const dir = cwd || process.cwd();
	if (existsSync(join(dir, "skills-lock.json"))) return true;
	const skillsDir = join(dir, ".agents", "skills");
	try {
		const entries = readdirSync(skillsDir, { withFileTypes: true });
		for (const entry of entries) if (entry.isDirectory()) {
			if (existsSync(join(skillsDir, entry.name, "SKILL.md"))) return true;
		}
	} catch {}
	return false;
}
async function resolveUpdateScope(options) {
	if (options.skills && options.skills.length > 0) {
		if (options.global) return "global";
		if (options.project) return "project";
		return "both";
	}
	if (options.global && options.project) return "both";
	if (options.global) return "global";
	if (options.project) return "project";
	if (options.yes || !process.stdin.isTTY) return hasProjectSkills() ? "project" : "global";
	const scope = await select({
		message: "Update scope",
		options: [
			{
				value: "project",
				label: "Project",
				hint: "Update skills in current directory"
			},
			{
				value: "global",
				label: "Global",
				hint: "Update skills in home directory"
			},
			{
				value: "both",
				label: "Both",
				hint: "Update all skills"
			}
		]
	});
	if (isCancel(scope)) {
		cancel("Cancelled");
		process.exit(0);
	}
	return scope;
}
function matchesSkillFilter(name, filter) {
	if (!filter || filter.length === 0) return true;
	const lower = name.toLowerCase();
	return filter.some((f) => f.toLowerCase() === lower);
}
function getSkipReason(entry) {
	if (entry.sourceType === "local") return "Local path";
	if (entry.sourceType === "git") return "Git URL";
	if (entry.sourceType === "well-known") return "Well-known skill";
	if (!entry.skillFolderHash) return "Private or deleted repo";
	if (!entry.skillPath) return "No skill path recorded";
	return "No version tracking";
}
function getInstallSource(skill) {
	let url = skill.sourceUrl;
	if (skill.sourceType === "well-known") {
		const idx = url.indexOf("/.well-known/");
		if (idx !== -1) url = url.slice(0, idx);
	}
	return formatSourceInput(url, skill.ref);
}
function printSkippedSkills(skipped) {
	if (skipped.length === 0) return;
	console.log();
	console.log(`${DIM$1}${skipped.length} skill(s) cannot be checked automatically:${RESET$1}`);
	const grouped = /* @__PURE__ */ new Map();
	for (const skill of skipped) {
		const source = getInstallSource(skill);
		const existing = grouped.get(source) || [];
		existing.push(skill);
		grouped.set(source, existing);
	}
	for (const [source, skills] of grouped) {
		if (skills.length === 1) {
			const skill = skills[0];
			console.log(`  ${TEXT$1}•${RESET$1} ${sanitizeMetadata(skill.name)} ${DIM$1}(${skill.reason})${RESET$1}`);
		} else {
			const reason = skills[0].reason;
			const names = skills.map((s) => sanitizeMetadata(s.name)).join(", ");
			console.log(`  ${TEXT$1}•${RESET$1} ${names} ${DIM$1}(${reason})${RESET$1}`);
		}
		console.log(`    ${DIM$1}To update: ${TEXT$1}npx skills add ${source} -g -y${RESET$1}`);
	}
}
async function getProjectSkillsForUpdate(skillFilter) {
	const localLock = await readLocalLock();
	const skills = [];
	for (const [name, entry] of Object.entries(localLock.skills)) {
		if (!matchesSkillFilter(name, skillFilter)) continue;
		if (entry.sourceType === "node_modules" || entry.sourceType === "local") continue;
		skills.push({
			name,
			source: entry.sourceUrl || entry.source,
			entry
		});
	}
	return skills;
}
async function promptDeletions(source, deletedSkills, isGlobal, options) {
	if (deletedSkills.length === 0) return;
	console.log();
	console.log(`${DIM$1}Warning:${RESET$1} The following skills from ${DIM$1}${source}${RESET$1} appear to have been deleted upstream:`);
	for (const s of deletedSkills) console.log(`  ${DIM$1}•${RESET$1} ${s}`);
	if (options.yes || !process.stdin.isTTY) {
		console.log(`${DIM$1}Skipping deletion in non-interactive mode.${RESET$1}`);
		return;
	}
	const confirmed = await confirm({ message: `Would you like to remove the local copies of these deleted skills?` });
	if (confirmed && !isCancel(confirmed)) for (const s of deletedSkills) {
		console.log(`${DIM$1}Removing${RESET$1} ${s}…`);
		await removeCommand([s], {
			yes: true,
			global: isGlobal
		});
	}
}
async function checkAndPromptForDeletions(source, allLockedForSource, lockSkills, isGlobal, options, discovered, locationOptions = {}) {
	const resolution = resolveSkillLocations(allLockedForSource, lockSkills, discovered, locationOptions);
	if (resolution.ambiguousSkills.length > 0) {
		console.log();
		console.log(`${DIM$1}Warning:${RESET$1} Multiple current paths match these skills from ${DIM$1}${source}${RESET$1}; skipping them rather than deleting or migrating the wrong skill:`);
		for (const name of resolution.ambiguousSkills) console.log(`  ${DIM$1}•${RESET$1} ${sanitizeMetadata(name)}`);
	}
	await promptDeletions(source, resolution.deletedSkills, isGlobal, options);
	return resolution;
}
async function checkWellKnownForUpdates(baseUrl, items) {
	let indexResult;
	try {
		indexResult = await wellKnownProvider.fetchIndex(baseUrl, { updateCheck: true });
	} catch {
		return { status: "error" };
	}
	if (!indexResult) return { status: "error" };
	const byName = new Map(indexResult.entries.map((entry) => [entry.name, entry]));
	const removedSkills = items.filter((item) => !byName.has(item.name)).map((item) => item.name);
	const localNames = new Set(items.map((item) => item.name));
	const newSkills = indexResult.entries.map((entry) => entry.name).filter((name) => !localNames.has(name));
	const changedSkills = [];
	const needsContentCheck = [];
	for (const item of items) {
		const entry = byName.get(item.name);
		if (!entry) continue;
		if (entry.version === "0.2.0") {
			if (!item.digest || entry.digest !== item.digest) changedSkills.push(item.name);
		} else needsContentCheck.push(item);
	}
	if (needsContentCheck.length > 0) {
		const tracked = new Set(needsContentCheck.map((item) => item.name));
		const skills = (await Promise.all(indexResult.entries.filter((entry) => tracked.has(entry.name)).map((entry) => wellKnownProvider.fetchSkillByEntry(entry).catch(() => null)))).filter((skill) => skill !== null);
		if (skills.length === 0) return { status: "error" };
		const digests = new Map(skills.map((skill) => [skill.installName, computeWellKnownSkillDigest(skill)]));
		for (const item of needsContentCheck) {
			const digest = digests.get(item.name);
			if (!digest || !item.digest || digest !== item.digest) changedSkills.push(item.name);
		}
	}
	if (changedSkills.length === 0 && removedSkills.length === 0) return {
		status: "current",
		newSkills
	};
	return {
		status: "changed",
		changedSkills,
		removedSkills,
		newSkills
	};
}
function printNewSkills(baseUrl, newSkills, isGlobal) {
	if (newSkills.length === 0) return;
	const names = newSkills.map(sanitizeMetadata);
	console.log(`  ${DIM$1}${newSkills.length} new skill(s) available from this source:${RESET$1} ${names.join(", ")}`);
	console.log(`    ${DIM$1}To install: ${TEXT$1}npx skills add ${baseUrl} --skill ${names.join(" ")}${isGlobal ? " -g" : ""}${RESET$1}`);
}
async function processWellKnownUpdates(groups, isGlobal, options) {
	let successCount = 0;
	let failCount = 0;
	let changed = false;
	const entries = [...groups];
	printFetching(entries.length);
	const results = await mapConcurrent(entries, ([baseUrl, items]) => checkWellKnownForUpdates(baseUrl, items));
	const pending = [];
	for (const [index, [baseUrl, items]] of entries.entries()) {
		process.stdout.write(`\r${DIM$1}Checking skills from source: ${baseUrl}${RESET$1}\x1b[K\n`);
		const result = results[index];
		if (result.status === "error") {
			console.log(`  ${DIM$1}✗ Failed to check skills from ${baseUrl}${RESET$1}`);
			continue;
		}
		if (result.status === "current") {
			printNewSkills(baseUrl, result.newSkills, isGlobal);
			continue;
		}
		changed = true;
		await promptDeletions(baseUrl, result.removedSkills, isGlobal, options);
		printNewSkills(baseUrl, result.newSkills, isGlobal);
		if (result.changedSkills.length > 0) if (options.reportOutdated) for (const name of result.changedSkills) options.reportOutdated(name);
		else pending.push({
			baseUrl,
			items,
			changedSkills: result.changedSkills
		});
	}
	const fetched = await fetchSources(pending.map(({ baseUrl, changedSkills }) => ({
		parsed: parseSource(baseUrl),
		skills: changedSkills
	})));
	const placementFor = placementResolver(isGlobal);
	for (const [index, { baseUrl, items, changedSkills }] of pending.entries()) {
		const source = fetched[index];
		const itemByName = new Map(items.map((item) => [item.name, item]));
		for (const name of changedSkills) {
			console.log(`${TEXT$1}Updating ${sanitizeMetadata(name)}…${RESET$1}`);
			const outcome = await installFetched(source, {
				skills: [name],
				placement: await placementFor(isGlobal ? void 0 : itemByName.get(name)?.subagents)
			});
			if (isGlobal) await recordGlobalWellKnownLock(baseUrl, outcome.installed);
			else await recordProjectLock(source, outcome.installed);
			if (reportInstall(name, {
				ok: outcome.installed.length > 0,
				...outcome
			})) successCount++;
			else failCount++;
		}
		await releaseSource(source);
	}
	return {
		successCount,
		failCount,
		changed
	};
}
async function fetchGlobalSource(entry, lockedSkillPaths) {
	let note;
	try {
		if (entry.sourceType === "github") {
			const tree = await fetchRepoTree(entry.source, entry.ref, getGitHubToken);
			if (tree) {
				const treePaths = new Set(tree.tree.filter((e) => e.type === "blob").map((e) => e.path));
				if (lockedSkillPaths.every((path) => !path || treePaths.has(path))) return { tree };
				note = "Skill paths changed; resolving via Git clone";
			} else note = "GitHub API unavailable; checking via Git clone";
		}
		return {
			tempDir: await cloneRepo(entry.sourceUrl || entry.source, entry.ref),
			note
		};
	} catch {
		return { error: true };
	}
}
async function updateGlobalSkills(options = {}) {
	const lock = await readSkillLock();
	const skillNames = Object.keys(lock.skills);
	let successCount = 0;
	let failCount = 0;
	if (skillNames.length === 0) {
		if (!options.skills) {
			console.log(`${DIM$1}No global skills tracked in lock file.${RESET$1}`);
			console.log(`${DIM$1}Install skills with${RESET$1} ${TEXT$1}npx skills add <package> -g${RESET$1}`);
		}
		return {
			successCount,
			failCount,
			checkedCount: 0
		};
	}
	const updates = [];
	const skipped = [];
	const checkable = [];
	const wellKnownGroups = /* @__PURE__ */ new Map();
	for (const skillName of skillNames) {
		if (!matchesSkillFilter(skillName, options.skills)) continue;
		const entry = lock.skills[skillName];
		if (!entry) continue;
		if (entry.sourceType === "well-known" && entry.sourceBaseUrl && entry.wellKnownDigest) {
			const group = wellKnownGroups.get(entry.sourceBaseUrl) || [];
			group.push({
				name: skillName,
				digest: entry.wellKnownDigest
			});
			wellKnownGroups.set(entry.sourceBaseUrl, group);
			continue;
		}
		if (!entry.skillFolderHash || !entry.skillPath) {
			skipped.push({
				name: skillName,
				reason: getSkipReason(entry),
				sourceUrl: entry.sourceUrl,
				sourceType: entry.sourceType,
				ref: entry.ref
			});
			continue;
		}
		checkable.push({
			name: skillName,
			entry
		});
	}
	const wellKnownCount = Array.from(wellKnownGroups.values()).reduce((sum, items) => sum + items.length, 0);
	const { successCount: wkSuccessCount, failCount: wkFailCount, changed: wkChanged } = await processWellKnownUpdates(wellKnownGroups, true, options);
	successCount += wkSuccessCount;
	failCount += wkFailCount;
	const bySource = /* @__PURE__ */ new Map();
	for (const item of checkable) {
		const key = `${item.entry.source}\n${item.entry.ref ?? ""}`;
		const existing = bySource.get(key) || [];
		existing.push(item);
		bySource.set(key, existing);
	}
	const lockedNamesFor = (first) => Object.entries(lock.skills).filter(([_, entry]) => entry.source === first.source && entry.ref === first.ref).map(([name, _]) => name);
	const onDisk = await installedSkillNames(true);
	const groups = [...bySource.values()];
	printFetching(groups.length);
	const checkouts = await mapConcurrent(groups, (itemsForSource) => {
		const firstEntry = itemsForSource[0].entry;
		return fetchGlobalSource(firstEntry, lockedNamesFor(firstEntry).map((name) => lock.skills[name]?.skillPath));
	});
	for (const [index, itemsForSource] of groups.entries()) {
		const firstEntry = itemsForSource[0].entry;
		const source = firstEntry.source;
		const isGitHubSource = firstEntry.sourceType === "github";
		const checkout = checkouts[index];
		process.stdout.write(`\r${DIM$1}Checking skills from source: ${source}${RESET$1}\x1b[K\n`);
		if ("error" in checkout) {
			console.log(`  ${DIM$1}✗ Failed to check skills from ${source}${RESET$1}`);
			continue;
		}
		if ("tree" in checkout) {
			for (const { name: skillName, entry } of itemsForSource) {
				const latestHash = getSkillFolderHashFromTree(checkout.tree, entry.skillPath);
				if (latestHash && (latestHash !== entry.skillFolderHash || !onDisk.has(skillName))) updates.push({
					name: skillName,
					entry,
					skillFolderHash: latestHash
				});
			}
			continue;
		}
		const { tempDir, note } = checkout;
		if (note) console.log(`  ${DIM$1}${note}${RESET$1}`);
		try {
			const discoveredLocations = (await discoverSkills(tempDir, void 0, {
				fullDepth: true,
				includeDuplicateNames: true
			})).map((skill) => ({
				name: skill.name,
				skillPath: join(relative(tempDir, skill.path), "SKILL.md").split(sep).join("/")
			}));
			const resolution = await checkAndPromptForDeletions(source, lockedNamesFor(firstEntry), lock.skills, true, options, discoveredLocations, { exactPathDisambiguates: !shouldUseFullDepthForUpdate(firstEntry) });
			const deletedSkillSet = new Set(resolution.deletedSkills);
			for (const { name: skillName, entry } of itemsForSource) {
				if (deletedSkillSet.has(skillName)) continue;
				const skillPath = resolution.resolvedPaths.get(skillName);
				if (!skillPath) continue;
				const latestHash = isGitHubSource && /^[0-9a-f]{40}$/i.test(entry.skillFolderHash) ? await getGitTreeHash(tempDir, skillPath) : await computeSkillFolderHash(join(tempDir, dirname(skillPath)));
				if (skillPath !== entry.skillPath || latestHash && (latestHash !== entry.skillFolderHash || !onDisk.has(skillName))) updates.push({
					name: skillName,
					entry: {
						...entry,
						skillPath
					},
					skillFolderHash: latestHash ?? ""
				});
			}
		} catch (error) {
			console.log(`  ${DIM$1}✗ Failed to check skills from ${source}${RESET$1}`);
		} finally {
			await cleanupTempDir(tempDir);
		}
	}
	if (checkable.length > 0) process.stdout.write("\r\x1B[K");
	const checkedCount = checkable.length + skipped.length + wellKnownCount;
	if (checkable.length === 0 && skipped.length === 0 && wellKnownCount === 0) {
		if (!options.skills) console.log(`${DIM$1}No global skills to check.${RESET$1}`);
		return {
			successCount,
			failCount,
			checkedCount: 0
		};
	}
	if (checkable.length === 0 && skipped.length === 0) {
		if (!wkChanged) console.log(`${TEXT$1}✓ All global skills are up to date${RESET$1}`);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	if (checkable.length === 0 && skipped.length > 0) {
		printSkippedSkills(skipped);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	if (updates.length === 0) {
		if (!wkChanged) console.log(`${TEXT$1}✓ All global skills are up to date${RESET$1}`);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	if (options.reportOutdated) {
		for (const { name } of updates) options.reportOutdated(name);
		printSkippedSkills(skipped);
		return {
			successCount,
			failCount,
			checkedCount
		};
	}
	console.log(`${TEXT$1}Found ${updates.length} global update(s)${RESET$1}`);
	console.log();
	const installable = updates.flatMap((update) => {
		const installUrl = buildUpdateInstallSource(update.entry);
		if (installUrl) return [{
			...update,
			installUrl
		}];
		failCount++;
		console.log(`  ${DIM$1}✗ Cannot update ${sanitizeMetadata(update.name)}: lock file is missing sourceUrl for this generic Git source${RESET$1}`);
		return [];
	});
	const fetched = await fetchSources(installable.map(({ entry, name, installUrl }) => ({
		parsed: parseUpdateSource(installUrl, entry.sourceType),
		skills: [name],
		fullDepth: shouldUseFullDepthForUpdate(entry)
	})));
	const placementFor = placementResolver(true);
	for (const [index, { name, entry, skillFolderHash }] of installable.entries()) {
		console.log(`${TEXT$1}Updating ${sanitizeMetadata(name)}…${RESET$1}`);
		const source = fetched[index];
		const outcome = await installFetched(source, {
			skills: [name],
			placement: await placementFor(void 0, entry.installMode)
		});
		await releaseSource(source);
		if (outcome.installed.length > 0) await addSkillToLock(name, {
			...entry,
			skillFolderHash
		});
		if (reportInstall(name, {
			ok: outcome.installed.length > 0,
			...outcome
		})) successCount++;
		else failCount++;
	}
	printSkippedSkills(skipped);
	return {
		successCount,
		failCount,
		checkedCount
	};
}
async function updateProjectSkills(options = {}) {
	const projectSkills = await getProjectSkillsForUpdate(options.skills);
	let successCount = 0;
	let failCount = 0;
	if (projectSkills.length === 0) {
		if (!options.skills) {
			console.log(`${DIM$1}No project skills to update.${RESET$1}`);
			console.log(`${DIM$1}Install project skills with${RESET$1} ${TEXT$1}npx skills add <package>${RESET$1}`);
		}
		return {
			successCount,
			failCount,
			foundCount: 0
		};
	}
	const wellKnownGroups = /* @__PURE__ */ new Map();
	const nonWellKnown = [];
	for (const skill of projectSkills) {
		const { entry } = skill;
		if (entry.sourceType === "well-known" && entry.sourceUrl && entry.wellKnownDigest) {
			const group = wellKnownGroups.get(entry.sourceUrl) || [];
			group.push({
				name: skill.name,
				digest: entry.wellKnownDigest,
				subagents: entry.subagents
			});
			wellKnownGroups.set(entry.sourceUrl, group);
		} else nonWellKnown.push(skill);
	}
	const wellKnownCount = Array.from(wellKnownGroups.values()).reduce((sum, items) => sum + items.length, 0);
	const updatable = nonWellKnown.filter((s) => s.entry.skillPath);
	const legacy = nonWellKnown.filter((s) => !s.entry.skillPath);
	if (updatable.length === 0 && wellKnownCount === 0) {
		console.log(`${DIM$1}No project skills can be updated in place.${RESET$1}`);
		printLegacyProjectSkills(legacy);
		return {
			successCount,
			failCount,
			foundCount: projectSkills.length
		};
	}
	const cwd = process.cwd();
	const targetAgentNames = [];
	let hasUniversal = false;
	for (const [type, config] of Object.entries(agents)) if (isUniversalAgent(type)) {
		if (!hasUniversal && existsSync(join(cwd, ".agents"))) hasUniversal = true;
	} else {
		const agentRoot = config.skillsDir.split("/")[0];
		if (existsSync(join(cwd, agentRoot))) targetAgentNames.push(config.displayName);
	}
	const targetParts = [];
	if (hasUniversal) targetParts.push("Universal");
	targetParts.push(...targetAgentNames);
	if (targetParts.length > 0) console.log(`${TEXT$1}Updating for: ${targetParts.join(", ")}${RESET$1}`);
	console.log(`${TEXT$1}Checking ${updatable.length + wellKnownCount} skill(s)…${RESET$1}`);
	console.log();
	const { successCount: wkSuccessCount, failCount: wkFailCount } = await processWellKnownUpdates(wellKnownGroups, false, options);
	successCount += wkSuccessCount;
	failCount += wkFailCount;
	const bySource = /* @__PURE__ */ new Map();
	for (const skill of updatable) {
		const key = `${skill.entry.sourceUrl || skill.entry.source}\n${skill.entry.ref ?? ""}`;
		const existing = bySource.get(key) || [];
		existing.push(skill);
		bySource.set(key, existing);
	}
	const localLock = await readLocalLock();
	const onDisk = await installedSkillNames(false);
	const placementFor = placementResolver(false);
	let upToDateCount = 0;
	const groups = [...bySource.values()].map((skillsForSource) => ({
		skillsForSource,
		cloneSource: buildLocalCloneSource(skillsForSource[0].entry)
	}));
	printFetching(groups.filter((group) => group.cloneSource !== null).length);
	const clones = await mapConcurrent(groups, ({ skillsForSource, cloneSource }) => cloneSource === null ? Promise.resolve(null) : cloneRepo(cloneSource, skillsForSource[0].entry.ref).catch(() => null));
	for (const [index, { skillsForSource, cloneSource }] of groups.entries()) {
		const firstEntry = skillsForSource[0].entry;
		const source = firstEntry.sourceUrl || firstEntry.source;
		const ref = firstEntry.ref;
		const allLockedForSource = Object.entries(localLock.skills).filter(([_, entry]) => (entry.sourceUrl || entry.source) === source && entry.ref === ref).map(([name, _]) => name);
		const tempDir = clones[index];
		if (cloneSource === null) {
			failCount += skillsForSource.length;
			console.log(`${DIM$1}✗ Cannot update ${source}: skills-lock.json is missing sourceUrl for this generic Git source${RESET$1}`);
			continue;
		}
		if (tempDir === null) {
			failCount += skillsForSource.length;
			console.log(`${DIM$1}✗ Failed to check for deleted skills from ${source}${RESET$1}`);
			continue;
		}
		let checked = false;
		try {
			const discovered = await discoverSkills(tempDir, void 0, {
				fullDepth: true,
				includeDuplicateNames: true
			});
			const discoveredLocations = discovered.map((skill) => ({
				name: skill.name,
				skillPath: join(relative(tempDir, skill.path), "SKILL.md").split(sep).join("/")
			}));
			const resolution = await checkAndPromptForDeletions(source, allLockedForSource, localLock.skills, false, options, discoveredLocations, { exactPathDisambiguates: !shouldUseFullDepthForUpdate(firstEntry) });
			checked = true;
			const deleted = new Set(resolution.deletedSkills);
			const skillAt = new Map(discovered.map((s, i) => [discoveredLocations[i].skillPath, s]));
			const resolved = {
				skills: discovered,
				tempDir,
				blobResult: null
			};
			for (const skill of skillsForSource) {
				if (deleted.has(skill.name)) continue;
				const skillPath = resolution.resolvedPaths.get(skill.name);
				const current = skillPath && skillAt.get(skillPath);
				if (!skillPath || !current) continue;
				const computedHash = await computeSkillFolderHash(current.path).catch(() => null);
				if (skillPath === skill.entry.skillPath && computedHash === skill.entry.computedHash && onDisk.has(skill.name)) {
					upToDateCount++;
					continue;
				}
				if (options.reportOutdated) {
					options.reportOutdated(skill.name);
					continue;
				}
				console.log(`${TEXT$1}Updating ${sanitizeMetadata(skill.name)}…${RESET$1}`);
				const outcome = targetOutcome(await installToTargets(resolved, [current], await placementFor(skill.entry.subagents, skill.entry.installMode)));
				if (outcome.ok && computedHash) await addSkillToLocalLock(skill.name, {
					...skill.entry,
					skillPath,
					computedHash
				});
				if (reportInstall(skill.name, outcome)) successCount++;
				else failCount++;
			}
		} catch {
			console.log(`${DIM$1}✗ Failed to check for deleted skills from ${source}${RESET$1}`);
			if (!checked) failCount += skillsForSource.length;
		} finally {
			await cleanupTempDir(tempDir);
		}
	}
	if (upToDateCount > 0) if (upToDateCount === updatable.length && wkSuccessCount === 0 && wkFailCount === 0) console.log(`${TEXT$1}✓ All project skills are up to date${RESET$1}`);
	else console.log(`${DIM$1}${upToDateCount} project skill(s) already up to date${RESET$1}`);
	printLegacyProjectSkills(legacy);
	return {
		successCount,
		failCount,
		foundCount: projectSkills.length
	};
}
function printLegacyProjectSkills(legacy) {
	if (legacy.length === 0) return;
	console.log();
	console.log(`${DIM$1}${legacy.length} project skill(s) cannot be updated automatically (installed before skillPath tracking):${RESET$1}`);
	for (const skill of legacy) {
		const reinstall = buildLocalUpdateSource(skill.entry);
		console.log(`  ${TEXT$1}•${RESET$1} ${sanitizeMetadata(skill.name)}`);
		if (reinstall) console.log(`    ${DIM$1}To refresh: ${TEXT$1}npx skills add ${reinstall} -y${RESET$1}`);
		else console.log(`    ${DIM$1}To refresh: reinstall using the original full Git URL; this lock entry only has an ambiguous shorthand.${RESET$1}`);
	}
}
async function runUpdate(args = [], mode = "update") {
	const options = parseUpdateOptions(args);
	let outdatedCount = 0;
	if (mode === "check") {
		options.yes = true;
		options.reportOutdated = (name) => {
			outdatedCount++;
			console.log(`${TEXT$1}↑ ${sanitizeMetadata(name)} has an update${RESET$1}`);
		};
	}
	const scope = await resolveUpdateScope(options);
	if (options.skills && mode === "update") console.log(`${TEXT$1}Updating ${options.skills.join(", ")}…${RESET$1}`);
	else console.log(`${TEXT$1}Checking for skill updates…${RESET$1}`);
	console.log();
	let totalSuccess = 0;
	let totalFail = 0;
	let totalFound = 0;
	if (scope === "global" || scope === "both") {
		if (scope === "both" && !options.skills) console.log(`${BOLD$1}Global Skills${RESET$1}`);
		const { successCount, failCount, checkedCount } = await updateGlobalSkills(options);
		totalSuccess += successCount;
		totalFail += failCount;
		totalFound += checkedCount;
		if (scope === "both" && !options.skills) console.log();
	}
	if (scope === "project" || scope === "both") {
		if (scope === "both" && !options.skills) console.log(`${BOLD$1}Project Skills${RESET$1}`);
		const { successCount, failCount, foundCount } = await updateProjectSkills(options);
		totalSuccess += successCount;
		totalFail += failCount;
		totalFound += foundCount;
	}
	if (options.skills && totalFound === 0) console.log(`${DIM$1}No installed skills found matching: ${options.skills.join(", ")}${RESET$1}`);
	console.log();
	if (totalSuccess > 0) console.log(`${TEXT$1}✓ Updated ${totalSuccess} skill(s)${RESET$1}`);
	if (totalFail > 0) {
		console.log(`${DIM$1}Failed to update ${totalFail} skill(s)${RESET$1}`);
		process.exitCode = 1;
	}
	if (outdatedCount > 0) {
		console.log(`${TEXT$1}${outdatedCount} skill(s) can be updated; run ${BOLD$1}npx skills update${RESET$1}${TEXT$1} to install${RESET$1}`);
		process.exitCode = 1;
	}
	track({
		event: "update",
		scope,
		skillCount: String(totalSuccess + totalFail),
		successCount: String(totalSuccess),
		failCount: String(totalFail)
	});
	console.log();
}
const BLOB_ALLOWED_OWNERS = [
	"vercel",
	"vercel-labs",
	"heygen-com",
	"remotion-dev"
];
const EXCLUDE_FILES = /* @__PURE__ */ new Set(["metadata.json"]);
const EXCLUDE_DIRS = /* @__PURE__ */ new Set([
	".git",
	"__pycache__",
	"__pypackages__"
]);
const USE_AGENT_CONFIGS = {
	"claude-code": {
		command: "claude",
		args: []
	},
	codex: {
		command: "codex",
		args: []
	},
	"sarvam-code": {
		command: "sarvam-code",
		args: []
	}
};
const SUPPORTED_USE_AGENTS = Object.keys(USE_AGENT_CONFIGS);
function parseUseOptions(args) {
	const source = [];
	const options = {};
	const errors = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;
		if (arg === "--help" || arg === "-h") options.help = true;
		else if (arg === "--full-depth") options.fullDepth = true;
		else if (arg === "--skill" || arg === "-s") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) errors.push(`${arg} requires a skill name`);
			else if (options.skill) {
				errors.push("Only one --skill value can be provided");
				i++;
			} else {
				options.skill = value;
				i++;
			}
		} else if (arg === "--agent" || arg === "-a") {
			options.agent = options.agent || [];
			i++;
			let nextArg = args[i];
			const startCount = options.agent.length;
			while (i < args.length && nextArg && !nextArg.startsWith("-")) {
				options.agent.push(nextArg);
				i++;
				nextArg = args[i];
			}
			if (options.agent.length === startCount) errors.push(`${arg} requires an agent name`);
			i--;
		} else if (arg.startsWith("-")) errors.push(`Unknown option: ${arg}`);
		else source.push(arg);
	}
	errors.push(...validateUseAgentOption(options.agent));
	return {
		source,
		options,
		errors
	};
}
function buildUsePrompt(input) {
	const sections = [
		"You are being given a Skill to execute for the user's next request.",
		"Use the following SKILL.md as your instructions:",
		`<SKILL.md>\n${input.skillMd}\n</SKILL.md>`
	];
	if (input.hasSupportingFiles && input.supportDir) sections.push(`Supporting files for this skill were downloaded to:\n${input.supportDir}\n\nWhen the SKILL.md references relative paths, read them from that directory.`);
	return sections.join("\n\n") + "\n";
}
async function materializeUseSkill(skill) {
	const tempRoot = await mkdtemp(join(tmpdir(), "skills-use-"));
	const skillDir = join(tempRoot, sanitizeName(skill.directoryName || skill.name));
	if (!isPathSafe(tempRoot, skillDir)) throw new Error("Invalid skill name: potential path traversal detected");
	await mkdir(skillDir, { recursive: true });
	if (skill.kind === "blob") await writeSnapshotFiles(skillDir, skill.files);
	else if (skill.kind === "well-known") await writeMapFiles(skillDir, skill.files);
	else await copySkillDirectory(skill.path, skillDir);
	return {
		tempRoot,
		skillDir,
		skillMd: skill.rawContent ?? await readFile(join(skillDir, "SKILL.md"), "utf-8"),
		hasSupportingFiles: await containsSupportingFiles(skillDir, skillDir)
	};
}
async function runUse(sourceArgs, options = {}, parseErrors = []) {
	let cloneTempDir = null;
	try {
		if (options.help) {
			console.log(getUseHelp());
			return;
		}
		if (parseErrors.length > 0) fail(parseErrors.join("\n"));
		if (sourceArgs.length === 0) fail(`Missing required argument: source\n\n${getUseHelp()}`);
		if (sourceArgs.length > 1) fail(`Expected one source, received ${sourceArgs.length}: ${sourceArgs.join(", ")}`);
		const useAgent = options.agent?.[0];
		if (useAgent && !USE_AGENT_CONFIGS[useAgent]) fail(formatUnsupportedAgentError(useAgent));
		const source = sourceArgs[0];
		const parsed = parseSource(source);
		const selector = resolveSelector(parsed.skillFilter, options.skill);
		const includeInternal = selector !== void 0;
		let selectedSkill;
		if (parsed.type === "well-known") {
			const skills = await wellKnownProvider.fetchAllSkills(parsed.url, { includeInternal }).catch((error) => {
				if (error instanceof WellKnownScopeNotFoundError) fail(error.message);
				return [];
			});
			if (skills.length > 0) selectedSkill = selectWellKnownSkill(skills, selector, source);
			else {
				const downloaded = await downloadSource(parsed.url);
				cloneTempDir = downloaded.tempDir;
				const selected = selectSkill(await discoverSkills(downloaded.rootDir, void 0, {
					includeInternal,
					fullDepth: options.fullDepth
				}), selector, source);
				selectedSkill = {
					kind: "disk",
					name: selected.name,
					directoryName: selected.name,
					rawContent: selected.rawContent,
					path: selected.path
				};
			}
		} else {
			let skills;
			let blobResult = null;
			if (parsed.type === "download") {
				const downloaded = await downloadSource(parsed.url);
				cloneTempDir = downloaded.tempDir;
				skills = await discoverSkills(downloaded.rootDir, void 0, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			} else if (parsed.type === "local") {
				if (!existsSync(parsed.localPath)) fail(`Local path does not exist: ${parsed.localPath}`);
				skills = await discoverSkills(parsed.localPath, parsed.subpath, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			} else if (parsed.type === "github" && !options.fullDepth) {
				const ownerRepo = getOwnerRepo(parsed);
				const owner = ownerRepo?.split("/")[0]?.toLowerCase();
				if (ownerRepo && owner && BLOB_ALLOWED_OWNERS.includes(owner)) blobResult = await tryBlobInstall(ownerRepo, {
					subpath: parsed.subpath,
					skillFilter: selector,
					ref: parsed.ref,
					getToken: getGitHubToken,
					includeInternal
				});
				if (blobResult) skills = blobResult.skills;
				else {
					cloneTempDir = await cloneRepo(parsed.url, parsed.ref);
					skills = await discoverSkills(cloneTempDir, parsed.subpath, {
						includeInternal,
						fullDepth: options.fullDepth
					});
				}
			} else {
				cloneTempDir = await cloneRepo(parsed.url, parsed.ref);
				skills = await discoverSkills(cloneTempDir, parsed.subpath, {
					includeInternal,
					fullDepth: options.fullDepth
				});
			}
			const selected = selectSkill(skills, selector, source);
			if (blobResult && isBlobSkill(selected)) selectedSkill = {
				kind: "blob",
				name: selected.name,
				directoryName: selected.name,
				rawContent: selected.rawContent ?? getSkillMdFromSnapshot(selected.files),
				files: selected.files
			};
			else selectedSkill = {
				kind: "disk",
				name: selected.name,
				directoryName: selected.name,
				rawContent: selected.rawContent,
				path: selected.path
			};
		}
		const materialized = await materializeUseSkill(selectedSkill);
		await cleanupClone(cloneTempDir);
		cloneTempDir = null;
		const prompt = buildUsePrompt({
			skillMd: materialized.skillMd,
			supportDir: materialized.skillDir,
			hasSupportingFiles: materialized.hasSupportingFiles
		});
		if (useAgent) {
			const exitCode = await launchAgentInteractively(useAgent, prompt);
			if (exitCode !== 0) process.exit(exitCode);
			return;
		}
		process.stdout.write(prompt);
	} catch (error) {
		await cleanupClone(cloneTempDir);
		if (error instanceof GitCloneError) fail(error.message);
		if (error instanceof UseCommandError) fail(error.message);
		fail(error instanceof Error ? error.message : "Unknown error");
	}
}
async function launchAgentInteractively(agent, prompt, spawnImpl = spawnAgent) {
	const config = USE_AGENT_CONFIGS[agent];
	if (!config) throw new UseCommandError(formatUnsupportedAgentError(agent));
	return new Promise((resolve, reject) => {
		const child = spawnImpl(config.command, [...config.args, prompt], { stdio: "inherit" });
		let settled = false;
		child.on("error", (error) => {
			if (settled) return;
			settled = true;
			if (error.code === "ENOENT") {
				reject(new UseCommandError(`Could not launch ${agents[agent].displayName}: command not found: ${config.command}`));
				return;
			}
			reject(error);
		});
		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			resolve(code ?? 1);
		});
	});
}
function spawnAgent(command, args) {
	return spawn(command, args, { stdio: "inherit" });
}
function getUseHelp() {
	return `Usage: skills use <source>[@<skill>] [options]

Generate a prompt for using one skill without installing it.

Options:
  -s, --skill <skill>   Select the skill to use
  -a, --agent <agent>   Start one supported agent interactively (${SUPPORTED_USE_AGENTS.join(", ")})
  --full-depth          Search nested directories like skills add --full-depth
  -h, --help            Show this help message

Examples:
  skills use vercel-labs/agent-skills@web-design-guidelines | claude
  skills use vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code
  skills use vercel-labs/agent-skills@web-design-guidelines --agent codex`;
}
function resolveSelector(sourceSelector, optionSelector) {
	if (sourceSelector && optionSelector) {
		if (sourceSelector.toLowerCase() !== optionSelector.toLowerCase()) throw new UseCommandError(`Conflicting skill selectors: source selects "${sourceSelector}" but --skill selects "${optionSelector}". Provide one selector.`);
		return optionSelector;
	}
	return optionSelector ?? sourceSelector;
}
function selectSkill(skills, selector, source) {
	if (skills.length === 0) throw new UseCommandError("No valid skills found. Skills require a SKILL.md with name and description.");
	if (!selector) {
		if (skills.length === 1) return skills[0];
		throw new UseCommandError(formatMultipleSkillsError(source, skills.map(getSkillDisplayName)));
	}
	const selected = filterSkills(skills, [selector]);
	if (selected.length === 0) throw new UseCommandError(formatNoMatchError(selector, skills.map(getSkillDisplayName)));
	if (selected.length > 1) throw new UseCommandError(`Skill selector "${selector}" matched multiple skills.`);
	return selected[0];
}
function selectWellKnownSkill(skills, selector, source) {
	if (skills.length === 0) throw new UseCommandError("No skills found at this URL. Make sure the server has a /.well-known/agent-skills/index.json or /.well-known/skills/index.json file.");
	let selected;
	if (!selector) {
		if (skills.length !== 1) throw new UseCommandError(formatMultipleSkillsError(source, skills.map((s) => s.installName)));
		selected = skills;
	} else {
		selected = skills.filter((skill) => skill.installName.toLowerCase() === selector.toLowerCase() || skill.name.toLowerCase() === selector.toLowerCase());
		if (selected.length === 0) throw new UseCommandError(formatNoMatchError(selector, skills.map((s) => s.installName)));
		if (selected.length > 1) throw new UseCommandError(`Skill selector "${selector}" matched multiple skills.`);
	}
	const skill = selected[0];
	return {
		kind: "well-known",
		name: skill.name,
		directoryName: skill.installName,
		rawContent: skill.content,
		files: skill.files
	};
}
function formatMultipleSkillsError(source, names) {
	return [
		"This source contains multiple skills. Specify exactly one skill:",
		...names.map((name) => `  - ${name}`),
		"",
		`Examples:\n  skills use ${source}@${names[0] ?? "<skill>"}\n  skills use ${source} --skill ${names[0] ?? "<skill>"}`
	].join("\n");
}
function formatNoMatchError(selector, names) {
	return [
		`No matching skill found for: ${selector}`,
		"Available skills:",
		...names.map((name) => `  - ${name}`)
	].join("\n");
}
function validateUseAgentOption(agentValues) {
	if (!agentValues || agentValues.length === 0) return [];
	const errors = [];
	const validAgents = Object.keys(agents);
	const invalidAgents = agentValues.filter((agent) => agent !== "*" && !validAgents.includes(agent));
	if (agentValues.includes("*")) errors.push("skills use --agent does not support '*'; specify exactly one agent.");
	if (agentValues.length > 1) errors.push("skills use --agent accepts exactly one agent.");
	if (invalidAgents.length > 0) errors.push(`Invalid agents: ${invalidAgents.join(", ")}\nValid agents: ${validAgents.join(", ")}`);
	return errors;
}
function formatUnsupportedAgentError(agent) {
	return [`Running ${agents[agent].displayName} is not supported yet.`, `Supported agents for skills use --agent: ${SUPPORTED_USE_AGENTS.join(", ")}`].join("\n");
}
async function writeSnapshotFiles(targetDir, files) {
	for (const file of files) await writeSafeFile(targetDir, file.path, file.contents);
}
async function writeMapFiles(targetDir, files) {
	for (const [path, contents] of files) await writeSafeFile(targetDir, path, contents);
}
async function writeSafeFile(targetDir, filePath, contents) {
	const fullPath = join(targetDir, filePath);
	if (!isPathSafe(targetDir, fullPath)) return;
	await mkdir(dirname(fullPath), { recursive: true });
	if (typeof contents === "string") await writeFile(fullPath, contents, "utf-8");
	else await writeFile(fullPath, contents);
}
async function copySkillDirectory(src, dest) {
	await mkdir(dest, { recursive: true });
	const entries = await readdir(src, { withFileTypes: true });
	await Promise.all(entries.filter((entry) => !isExcluded(entry.name, entry.isDirectory())).map(async (entry) => {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);
		if (!isPathSafe(dest, destPath)) return;
		if (entry.isDirectory()) {
			await copySkillDirectory(srcPath, destPath);
			return;
		}
		try {
			await cp(srcPath, destPath, {
				dereference: true,
				recursive: true
			});
		} catch (err) {
			if (err instanceof Error && "code" in err && err.code === "ENOENT" && entry.isSymbolicLink()) {
				console.error(`Skipping broken symlink: ${srcPath}`);
				return;
			}
			throw err;
		}
	}));
}
async function containsSupportingFiles(rootDir, currentDir) {
	const entries = await readdir(currentDir, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = join(currentDir, entry.name);
		const relPath = relative(rootDir, entryPath).split(sep).join("/");
		if (entry.isDirectory()) {
			if (await containsSupportingFiles(rootDir, entryPath)) return true;
		} else if (relPath.toLowerCase() !== "skill.md") return true;
	}
	return false;
}
function isBlobSkill(skill) {
	return Array.isArray(skill.files);
}
function getSkillMdFromSnapshot(files) {
	return files.find((file) => file.path.toLowerCase() === "skill.md")?.contents ?? "";
}
function isExcluded(name, isDirectory) {
	return EXCLUDE_FILES.has(name) || isDirectory && EXCLUDE_DIRS.has(name);
}
function isPathSafe(basePath, targetPath) {
	const normalizedBase = normalize(resolve(basePath));
	const normalizedTarget = normalize(resolve(targetPath));
	return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase;
}
async function cleanupClone(tempDir) {
	if (tempDir) await cleanupTempDir(tempDir).catch(() => {});
}
function fail(message) {
	console.error(message);
	process.exit(1);
}
var UseCommandError = class extends Error {};
const __dirname = dirname(fileURLToPath(import.meta.url));
function getVersion() {
	try {
		const pkgPath = join(__dirname, "..", "package.json");
		return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
	} catch {
		return "0.0.0";
	}
}
const VERSION = getVersion();
initTelemetry(VERSION);
const RESET = "\x1B[0m";
const BOLD = "\x1B[1m";
const DIM = "\x1B[38;5;102m";
const TEXT = "\x1B[38;5;145m";
const LOGO_LINES = [
	"███████╗██╗  ██╗██╗██╗     ██╗     ███████╗",
	"██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝",
	"███████╗█████╔╝ ██║██║     ██║     ███████╗",
	"╚════██║██╔═██╗ ██║██║     ██║     ╚════██║",
	"███████║██║  ██╗██║███████╗███████╗███████║",
	"╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝"
];
const GRAYS = [
	"\x1B[38;5;250m",
	"\x1B[38;5;248m",
	"\x1B[38;5;245m",
	"\x1B[38;5;243m",
	"\x1B[38;5;240m",
	"\x1B[38;5;238m"
];
function showLogo() {
	console.log();
	LOGO_LINES.forEach((line, i) => {
		console.log(`${GRAYS[i]}${line}${RESET}`);
	});
}
function showBanner() {
	showLogo();
	console.log();
	console.log(`${DIM}The open agent skills ecosystem${RESET}`);
	console.log();
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills add ${DIM}<package>${RESET}        ${DIM}Add a new skill${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills use ${DIM}<package>@<skill>${RESET} ${DIM}Use a skill without installing${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills remove${RESET}               ${DIM}Remove installed skills${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills list${RESET}                 ${DIM}List installed skills${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills find ${DIM}[query]${RESET}         ${DIM}Search for skills${RESET}`);
	console.log();
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills update${RESET}               ${DIM}Update installed skills${RESET}`);
	console.log();
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills experimental_install${RESET} ${DIM}Restore from skills-lock.json${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills init ${DIM}[name]${RESET}          ${DIM}Create a new skill${RESET}`);
	console.log(`  ${DIM}$${RESET} ${TEXT}npx skills experimental_sync${RESET}    ${DIM}Sync skills from node_modules${RESET}`);
	console.log();
	console.log(`${DIM}try:${RESET} npx skills add vercel-labs/agent-skills`);
	console.log();
	console.log(`Discover more skills at ${TEXT}https://skills.sh/${RESET}`);
	console.log();
}
function showHelp() {
	const examples = [
		["skills add vercel-labs/agent-skills"],
		["skills use vercel-labs/agent-skills@vercel-optimize | claude"],
		["skills use vercel-labs/agent-skills --skill vercel-optimize --agent claude-code"],
		["skills add vercel-labs/agent-skills -g"],
		["skills add vercel-labs/agent-skills --agent claude-code cursor"],
		["skills add vercel-labs/agent-skills --skill pr-review commit"],
		["skills add vercel-labs/agent-skills --json -y", "JSON output"],
		["skills remove", "interactive remove"],
		["skills remove web-design", "remove by name"],
		["skills rm --global frontend-design"],
		["skills list", "list project skills"],
		["skills ls -g", "list global skills"],
		["skills ls -a claude-code", "filter by agent"],
		["skills ls --json", "JSON output"],
		["skills find", "interactive search"],
		["skills find typescript", "search by keyword"],
		["skills find react --owner vercel", "search within an owner"],
		["skills update"],
		["skills update my-skill", "update a single skill"],
		["skills update -g", "update global skills only"],
		["skills experimental_install", "restore from skills-lock.json"],
		["skills init my-skill"],
		["skills experimental_sync", "sync from node_modules (experimental)"],
		["skills experimental_sync -y", "sync without prompts"]
	];
	const exampleWidth = Math.max(...examples.filter(([, description]) => description).map(([command]) => command.length));
	const formattedExamples = examples.map(([command, description]) => {
		const comment = description ? `${" ".repeat(exampleWidth - command.length + 2)}${DIM}# ${description}${RESET}` : "";
		return `  ${DIM}$${RESET} ${command}${comment}`;
	}).join("\n");
	console.log(`
${BOLD}Usage:${RESET} skills <command> [options]

${BOLD}Manage Skills:${RESET}
  add <package>        Add a skill package (alias: a)
                       e.g. vercel-labs/agent-skills
                            notion
                            https://notion.so/<skill-page>
                            https://github.com/vercel-labs/agent-skills
  use <package>@<skill>
                       Generate a prompt for using one skill without installing it
  remove [skills]      Remove installed skills
  list, ls             List installed skills
  find [query]         Search for skills interactively

${BOLD}Find Options:${RESET}
  --owner <owner>        Search only repositories from a GitHub owner

${BOLD}Updates:${RESET}
  update [skills...]   Update skills to latest versions (alias: upgrade)

${BOLD}Update Options:${RESET}
  -g, --global           Update global skills only
  -p, --project          Update project skills only
  -y, --yes              Skip scope prompt (auto-detect: project if in a project, else global)

${BOLD}Project:${RESET}
  experimental_install Restore skills from skills-lock.json
  init [name]          Initialize a skill (creates <name>/SKILL.md or ./SKILL.md)
  experimental_sync    Sync skills from node_modules into agent directories (alias: sync)

${BOLD}Experimental Install Options:${RESET}
  --dry-run              Show what would be restored without installing anything
  --frozen-lockfile      Fail instead of changing skills-lock.json (default in CI)
  --no-frozen-lockfile   Allow skills-lock.json to change in CI
  --force                Reinstall skills that are already installed

${BOLD}Add Options:${RESET}
  -g, --global           Install skill globally (user-level) instead of project-level
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -s, --skill <skills>   Specify skill names to install (use '*' for all skills)
  -l, --list             List available skills in the repository without installing
  -y, --yes              Skip confirmation prompts
  --copy                 Copy files instead of symlinking to agent directories
  --metadata <json>      Attach valid JSON to the install telemetry event
  --subagent <names>     Install to Eve subagents (use 'root' for the root agent)
  --all                  Shorthand for --skill '*' --agent '*' -y
  --full-depth           Search all subdirectories even when a root SKILL.md exists
  --json                 Output results as JSON (machine-readable, no ANSI codes)

${BOLD}Use Options:${RESET}
  -s, --skill <skill>    Specify the skill to use
  -a, --agent <agent>    Start one supported agent interactively
  --full-depth           Search all subdirectories even when a root SKILL.md exists

${BOLD}Remove Options:${RESET}
  -g, --global           Remove from global scope
  -a, --agent <agents>   Remove from specific agents (omit to clean all agent links)
  -s, --skill <skills>   Specify skills to remove (use '*' for all skills)
  -y, --yes              Skip confirmation prompts
  --all                  Remove every installed skill (-y implied). Do not combine with named skills.
  
${BOLD}Experimental Sync Options:${RESET}
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -y, --yes              Skip confirmation prompts
  --copy                 Copy skills instead of linking them to node_modules
  --dry-run              Show what would change without changing anything
  --no-cleanup           Keep skills whose package no longer ships them
  --no-remote            Skip git sources listed in package.json skills fields
  --frozen-lockfile      Fail instead of changing skills-lock.json (default in CI)
  --no-frozen-lockfile   Allow skills-lock.json to change in CI
  -r, --recursive        Also sync the dependencies of each workspace package
  --include <patterns>   Only sync matching packages (<pkg>) or skills (<pkg>#<skill>)
  --exclude <patterns>   Skip matching packages (<pkg>) or skills (<pkg>#<skill>)

${BOLD}List Options:${RESET}
  -g, --global           List global skills (default: project)
  -a, --agent <agents>   Filter by specific agents
  --json                 Output as JSON (machine-readable, no ANSI codes)

${BOLD}Options:${RESET}
  --help, -h        Show this help message
  --version, -v     Show version number

${BOLD}Examples:${RESET}
${formattedExamples}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}
function showRemoveHelp() {
	console.log(`
${BOLD}Usage:${RESET} skills remove [skills...] [options]

${BOLD}Description:${RESET}
  Remove installed skills from agents. If no skill names are provided,
  an interactive selection menu will be shown.

${BOLD}Arguments:${RESET}
  skills            Optional skill names to remove (space-separated)

${BOLD}Options:${RESET}
  -g, --global       Remove from global scope (~/) instead of project scope
  -a, --agent        Remove from specific agents (omit to clean all agent links)
  -s, --skill        Specify skills to remove (use '*' for all skills)
  -y, --yes          Skip confirmation prompts
  --all              Remove every installed skill (-y implied). Do not combine with named skills.

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills remove                           ${DIM}# interactive selection${RESET}
  ${DIM}$${RESET} skills remove my-skill                   ${DIM}# remove specific skill${RESET}
  ${DIM}$${RESET} skills remove skill1 skill2 -y           ${DIM}# remove multiple skills${RESET}
  ${DIM}$${RESET} skills remove --global my-skill          ${DIM}# remove from global scope${RESET}
  ${DIM}$${RESET} skills rm --agent claude-code my-skill   ${DIM}# remove from specific agent${RESET}
  ${DIM}$${RESET} skills remove --all                      ${DIM}# remove all skills${RESET}
  ${DIM}$${RESET} skills remove --skill '*' -a cursor      ${DIM}# remove all skills from cursor${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}
function runInit(args) {
	const cwd = process.cwd();
	const skillName = args[0] || basename(cwd);
	const hasName = args[0] !== void 0;
	const skillDir = hasName ? join(cwd, skillName) : cwd;
	const skillFile = join(skillDir, "SKILL.md");
	const displayPath = hasName ? `${skillName}/SKILL.md` : "SKILL.md";
	if (existsSync(skillFile)) {
		console.log(`${TEXT}Skill already exists at ${DIM}${displayPath}${RESET}`);
		return;
	}
	if (hasName) mkdirSync(skillDir, { recursive: true });
	writeFileSync(skillFile, `---
name: ${skillName}
description: A brief description of what this skill does
---

# ${skillName}

Instructions for the agent to follow when this skill is activated.

## When to use

Describe when this skill should be used.

## Instructions

1. First step
2. Second step
3. Additional steps as needed
`);
	console.log(`${TEXT}Initialized skill: ${DIM}${skillName}${RESET}`);
	console.log();
	console.log(`${DIM}Created:${RESET}`);
	console.log(`  ${displayPath}`);
	console.log();
	console.log(`${DIM}Next steps:${RESET}`);
	console.log(`  1. Edit ${TEXT}${displayPath}${RESET} to define your skill instructions`);
	console.log(`  2. Update the ${TEXT}name${RESET} and ${TEXT}description${RESET} in the frontmatter`);
	console.log();
	console.log(`${DIM}Publishing:${RESET}`);
	console.log(`  ${DIM}GitHub:${RESET}  Push to a repo, then ${TEXT}npx skills add <owner>/<repo>${RESET}`);
	console.log(`  ${DIM}URL:${RESET}     Host the file, then ${TEXT}npx skills add https://example.com/${displayPath}${RESET}`);
	console.log();
	console.log(`Browse existing skills for inspiration at ${TEXT}https://skills.sh/${RESET}`);
	console.log();
}
async function main() {
	const args = process.argv.slice(2);
	const inAgent = await isRunningInAgent();
	if (args.length === 0) {
		if (!inAgent) showBanner();
		return;
	}
	const command = args[0];
	const restArgs = args.slice(1);
	if (command !== "--help" && command !== "-h" && command !== "--version" && command !== "-v" && (restArgs.includes("--help") || restArgs.includes("-h"))) {
		if (command === "remove" || command === "rm" || command === "r") showRemoveHelp();
		else showHelp();
		return;
	}
	switch (command) {
		case "find":
		case "search":
		case "f":
		case "s":
			if (!inAgent) showLogo();
			console.log();
			await runFind(restArgs);
			break;
		case "init":
			if (!inAgent) showLogo();
			console.log();
			runInit(restArgs);
			break;
		case "experimental_install":
			if (!inAgent) showLogo();
			await runInstallFromLock(restArgs);
			break;
		case "i":
		case "install":
		case "a":
		case "add": {
			const { source: addSource, options: addOpts, errors } = parseAddOptions(restArgs);
			if (!inAgent && !addOpts.json) showLogo();
			if (errors.length > 0) {
				for (const error of errors) console.error(`Error: ${error}`);
				if (addOpts.json) console.log("[]");
				process.exitCode = 1;
				break;
			}
			await runAdd(addSource, addOpts);
			break;
		}
		case "use": {
			const { source: useSource, options: useOptions, errors: useErrors } = parseUseOptions(restArgs);
			await runUse(useSource, useOptions, useErrors);
			break;
		}
		case "remove":
		case "rm":
		case "r": {
			const { skills, options: removeOptions } = parseRemoveOptions(restArgs);
			await removeCommand(skills, removeOptions);
			break;
		}
		case "sync":
		case "experimental_sync": {
			if (!inAgent) showLogo();
			const { options: syncOptions } = parseSyncOptions(restArgs);
			await runSync(restArgs, syncOptions);
			break;
		}
		case "list":
		case "ls":
			await runList(restArgs);
			break;
		case "check":
			await runUpdate(restArgs, "check");
			break;
		case "update":
		case "upgrade":
			await runUpdate(restArgs);
			break;
		case "--help":
		case "-h":
			showHelp();
			break;
		case "--version":
		case "-v":
			console.log(VERSION);
			break;
		default:
			console.log(`Unknown command: ${command}`);
			console.log(`Run ${BOLD}skills --help${RESET} for usage.`);
			process.exitCode = 1;
	}
}
main().catch((error) => {
	if (!(error instanceof InvalidLocalLockError)) throw error;
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
}).finally(() => flushTelemetry().then(() => process.exit(process.exitCode ?? 0)));
export {};
