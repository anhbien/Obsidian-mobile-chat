import { App } from "obsidian";
import { resolveFile } from "./vaultRead";

type SectionOp = "append_to_section" | "prepend_to_section" | "replace_section";

function findSectionBounds(
  lines: string[],
  sectionQuery: string
): { headingIdx: number; headingLevel: number; endIdx: number } | null {
  const query = sectionQuery.replace(/^#+\s*/, "").toLowerCase();

  let headingIdx = -1;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (m && m[2].trim().toLowerCase().includes(query)) {
      headingIdx = i;
      headingLevel = m[1].length;
      break;
    }
  }

  if (headingIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= headingLevel) {
      endIdx = i;
      break;
    }
  }

  return { headingIdx, headingLevel, endIdx };
}

function applySection(
  text: string,
  section: string,
  op: SectionOp,
  content: string
): string | null {
  const lines = text.split("\n");
  const bounds = findSectionBounds(lines, section);
  if (!bounds) return null;

  const { headingIdx, endIdx } = bounds;
  const contentLines = content === "" ? [] : content.split("\n");

  switch (op) {
    case "append_to_section":
      lines.splice(endIdx, 0, ...contentLines);
      break;
    case "prepend_to_section":
      lines.splice(headingIdx + 1, 0, ...contentLines);
      break;
    case "replace_section":
      lines.splice(headingIdx + 1, endIdx - headingIdx - 1, ...contentLines);
      break;
  }

  return lines.join("\n");
}

export async function handlePatchNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const notePath = args.path as string;
  const operation = args.operation as string;
  const oldText = args.old_text as string | undefined;
  const newText = args.new_text as string | undefined;
  const section = args.section as string | undefined;
  const content = args.content as string | undefined;
  const replaceAll = args.replace_all === true;

  if (!notePath) return "Error: path is required.";
  if (!operation)
    return "Error: operation is required (replace | append_to_section | prepend_to_section | replace_section).";

  const file = resolveFile(app, notePath);
  if (!file) return `Error: note not found — "${notePath}"`;

  let result = "";
  await app.vault.process(file, (text) => {
    switch (operation) {
      case "replace": {
        if (!oldText) {
          result = "Error: old_text is required for replace.";
          return text;
        }
        if (!text.includes(oldText)) {
          result = `Error: old_text not found in "${file.path}".`;
          return text;
        }
        const updated = replaceAll
          ? text.split(oldText).join(newText ?? "")
          : text.replace(oldText, newText ?? "");
        result = `Replaced in "${file.path}".`;
        return updated;
      }

      case "append_to_section":
      case "prepend_to_section":
      case "replace_section": {
        if (!section) {
          result = `Error: section is required for ${operation}.`;
          return text;
        }
        if (content === undefined) {
          result = "Error: content is required.";
          return text;
        }
        const patched = applySection(text, section, operation as SectionOp, content);
        if (!patched) {
          result = `Error: section "${section}" not found in "${file.path}".`;
          return text;
        }
        result = `Section "${section}" updated in "${file.path}".`;
        return patched;
      }

      default:
        result = `Error: unknown operation "${operation}". Valid: replace | append_to_section | prepend_to_section | replace_section`;
        return text;
    }
  });

  return result;
}

export async function handleUpsertFrontmatter(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const notePath = args.path as string;
  const updates = args.updates as Record<string, unknown> | undefined;

  if (!notePath) return "Error: path is required.";
  if (!updates || typeof updates !== "object" || Array.isArray(updates))
    return 'Error: updates must be a JSON object, e.g. {"status":"Active","tags":["work"]}';

  const file = resolveFile(app, notePath);
  if (!file) return `Error: note not found — "${notePath}"`;

  const changes: string[] = [];

  await app.vault.process(file, (text) => {
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    let fm: Record<string, unknown> = {};
    let body = text;

    if (fmMatch) {
      // Simple YAML parsing for frontmatter
      try {
        const lines = fmMatch[1].split("\n");
        for (const line of lines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            let value: unknown = line.slice(colonIdx + 1).trim();
            // Parse arrays like [a, b, c]
            if (typeof value === "string" && value.startsWith("[")) {
              try {
                value = JSON.parse(value);
              } catch {
                // Keep as string
              }
            }
            fm[key] = value;
          }
        }
      } catch {
        // If parsing fails, start fresh
      }
      body = text.slice(fmMatch[0].length);
    }

    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        if (key in fm) {
          delete fm[key];
          changes.push(`deleted "${key}"`);
        }
      } else {
        fm[key] = value;
        changes.push(`${key} → ${JSON.stringify(value)}`);
      }
    }

    if (changes.length === 0) return text;

    // Rebuild frontmatter
    const fmLines = Object.entries(fm).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
      if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v)}`;
      return `${k}: ${v}`;
    });

    return `---\n${fmLines.join("\n")}\n---\n${body}`;
  });

  if (changes.length === 0) return "No changes — keys were already up to date.";
  return `Frontmatter updated in "${file.path}": ${changes.join(", ")}`;
}
