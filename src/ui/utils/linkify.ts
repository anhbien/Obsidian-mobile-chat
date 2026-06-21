// Rewrites plain note paths in assistant markdown into Obsidian wikilinks
// (`[[path]]`) so MarkdownRenderer turns them into clickable internal links.
// Leaves existing links and code blocks alone, with one exception: a path
// wrapped in inline code (e.g. `Notes/My File.md`) is converted, since that is
// the reliable way to express paths containing spaces.

// Path inside inline code, possibly containing spaces.
const CODE_PATH = /`([^`\n]*?\.md)(:\d+)?`/g;

function toWikilink(path: string, lineSuffix: string | undefined): string {
  const display = `${path}${lineSuffix ?? ""}`;
  // Obsidian links can't target a line, so the target is the bare path while
  // the alias preserves any `:line` suffix for display.
  return lineSuffix ? `[[${path}|${display}]]` : `[[${path}]]`;
}

export function linkifyNotePaths(content: string): string {
  if (!content) return content;

  // Split out fenced code blocks so their contents are never rewritten.
  const segments = content.split(/(```[\s\S]*?```)/g);

  return segments
    .map((segment) => {
      // Odd-indexed segments are fenced code blocks — leave untouched.
      if (segment.startsWith("```")) return segment;

      // First, convert inline-code-wrapped paths (handles spaces). Replacing
      // these first removes the backticks so they aren't treated as code below.
      segment = segment.replace(CODE_PATH, (_m, path, line) =>
        toWikilink(path, line)
      );

      // Then convert bare paths, skipping anything already inside a wikilink,
      // a markdown link target, or remaining inline code.
      segment = segment.replace(
        /(\[\[[^\]]*?\]\]|`[^`\n]*?`|\]\([^)]*?\))|([\w\-./]+\.md)(:\d+)?/g,
        (match, skip, path, line) => {
          if (skip) return skip;
          return toWikilink(path, line);
        }
      );

      return segment;
    })
    .join("");
}
