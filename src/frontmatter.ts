import { parse as parseYaml, parseDocument } from 'yaml';

/**
 * Minimal frontmatter parser. Only supports YAML (the `---` delimiter).
 * Does NOT support `---js` / `---javascript` to avoid eval()-based RCE
 * that exists in gray-matter's built-in JS engine.
 */
export function parseFrontmatter(
  raw: string,
  options?: { onWarning?: (message: string) => void }
): {
  data: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  let parsed: unknown;
  if (options?.onWarning) {
    const document = parseDocument(match[1]!);
    for (const warning of document.warnings) options.onWarning(warning.message);
    if (document.errors.length > 0) throw document.errors[0];
    // Keep parse-time validation, then suppress conversion warnings for this document only.
    document.options.logLevel = 'silent';
    parsed = document.toJS();
  } else {
    parsed = parseYaml(match[1]!);
  }
  const data = (parsed as Record<string, unknown>) ?? {};
  return { data, content: match[2] ?? '' };
}
