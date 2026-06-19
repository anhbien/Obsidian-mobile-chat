import { App, TFile, TFolder } from "obsidian";

export async function handleGetVaultTree(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const maxDepth = (args.depth as number) ?? 4;

  function buildTree(folder: TFolder, depth: number, indent: string): string[] {
    if (depth > maxDepth) return [];
    const lines: string[] = [];

    const subfolders = folder.children
      .filter((c): c is TFolder => c instanceof TFolder && !c.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));

    const noteCount = (f: TFolder): number => {
      let count = 0;
      for (const child of f.children) {
        if (child instanceof TFolder) count += noteCount(child);
        else if (child.name.endsWith(".md")) count++;
      }
      return count;
    };

    for (const sub of subfolders) {
      const count = noteCount(sub);
      lines.push(
        `${indent}📁 ${sub.name}/  (${count} note${count !== 1 ? "s" : ""})`
      );
      lines.push(...buildTree(sub, depth + 1, indent + "  "));
    }

    // Show files at leaf depth
    if (subfolders.length === 0 || depth === maxDepth) {
      const files = folder.children
        .filter((c) => !(c instanceof TFolder) && c.name.endsWith(".md"))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const file of files) {
        lines.push(`${indent}📄 ${file.name}`);
      }
    }

    return lines;
  }

  const root = app.vault.getRoot();
  const lines = buildTree(root, 1, "");
  return lines.length ? lines.join("\n") : "(empty vault)";
}

export async function handleGetRecentNotes(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const limit = (args.limit as number) ?? 10;

  const notes = app.vault
    .getMarkdownFiles()
    .sort((a, b) => b.stat.mtime - a.stat.mtime)
    .slice(0, limit);

  return notes
    .map((f) => {
      const dt = new Date(f.stat.mtime)
        .toISOString()
        .replace("T", " ")
        .slice(0, 16);
      return `${dt}  ${f.path}`;
    })
    .join("\n");
}

export async function handleGetAllTags(
  app: App,
  _args: Record<string, unknown>
): Promise<string> {
  const counts: Record<string, number> = {};

  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) continue;

    // Frontmatter tags
    if (cache.frontmatter?.tags) {
      const fmTags = cache.frontmatter.tags;
      const tagList = Array.isArray(fmTags) ? fmTags : [fmTags];
      for (const t of tagList) {
        if (typeof t === "string") {
          counts[t] = (counts[t] ?? 0) + 1;
        }
      }
    }

    // Inline tags
    if (cache.tags) {
      for (const t of cache.tags) {
        const tag = t.tag.replace(/^#/, "");
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "No tags found in vault.";
  return sorted.map(([tag, count]) => `#${tag}  (${count})`).join("\n");
}
