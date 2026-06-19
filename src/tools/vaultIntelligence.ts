import { App, TFile, TFolder } from "obsidian";
import { resolveFile } from "./vaultRead";

/** Get all tags for a file from the metadata cache */
function getFileTags(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return [];
  const tags = new Set<string>();

  if (cache.frontmatter?.tags) {
    const fmTags = cache.frontmatter.tags;
    const list = Array.isArray(fmTags) ? fmTags : [fmTags];
    for (const t of list) {
      if (typeof t === "string") tags.add(t.toLowerCase());
    }
  }
  if (cache.tags) {
    for (const t of cache.tags) tags.add(t.tag.replace(/^#/, "").toLowerCase());
  }
  return [...tags];
}

/** Get outgoing link targets for a file */
function getOutgoingLinks(app: App, file: TFile): Set<string> {
  const links = new Set<string>();
  const resolved = app.metadataCache.resolvedLinks[file.path];
  if (resolved) {
    for (const target of Object.keys(resolved)) {
      links.add(target);
    }
  }
  return links;
}

/** Get files that link to a given file */
function getBacklinkSources(app: App, file: TFile): string[] {
  const sources: string[] = [];
  for (const [sourcePath, links] of Object.entries(app.metadataCache.resolvedLinks)) {
    if (links[file.path] && links[file.path] > 0) {
      sources.push(sourcePath);
    }
  }
  return sources;
}

export async function handleFindOrphanNotes(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const folder = (args.folder as string | undefined)?.toLowerCase();
  const notes = app.vault.getMarkdownFiles();
  const linkedTo = new Set<string>();

  for (const [_source, links] of Object.entries(app.metadataCache.resolvedLinks)) {
    for (const target of Object.keys(links)) {
      linkedTo.add(target);
    }
  }

  const skipPattern = /template|claude\.md|moc\.md/i;
  const orphans = notes.filter((n) => {
    if (skipPattern.test(n.path)) return false;
    if (folder && !n.path.toLowerCase().startsWith(folder)) return false;
    return !linkedTo.has(n.path);
  });

  if (orphans.length === 0) return "No orphan notes found.";
  return (
    `Orphan notes (${orphans.length}) — no incoming wiki links:\n\n` +
    orphans.map((n) => n.path).join("\n")
  );
}

export async function handleFindBrokenLinks(
  app: App,
  _args: Record<string, unknown>
): Promise<string> {
  const broken: { source: string; link: string }[] = [];

  for (const [sourcePath, links] of Object.entries(
    app.metadataCache.unresolvedLinks
  )) {
    if (/template/i.test(sourcePath)) continue;
    for (const target of Object.keys(links)) {
      broken.push({ source: sourcePath, link: target });
    }
  }

  if (broken.length === 0) return "No broken links found.";
  const lines = broken.map((b) => `${b.source}\n  → [[${b.link}]]`);
  return `Broken links (${broken.length}):\n\n` + lines.join("\n\n");
}

export async function handleRelatedNotes(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const notePath = args.path as string;
  if (!notePath) return "Error: path is required.";
  const max = (args.limit as number) ?? 15;

  const file = resolveFile(app, notePath);
  if (!file) return `Error: note not found — "${notePath}"`;

  const targetTags = new Set(getFileTags(app, file));
  const targetLinks = getOutgoingLinks(app, file);
  const targetFolder = file.parent?.path ?? "";

  const scores = new Map<string, number>();
  const add = (path: string, points: number) => {
    if (path === file.path) return;
    scores.set(path, (scores.get(path) ?? 0) + points);
  };

  for (const n of app.vault.getMarkdownFiles()) {
    if (n.path === file.path || /template/i.test(n.path)) continue;

    // Shared tags
    const tags = getFileTags(app, n);
    for (const t of tags) {
      if (targetTags.has(t)) add(n.path, 2);
    }

    // This note links to target (backlink)
    const outgoing = app.metadataCache.resolvedLinks[n.path];
    if (outgoing?.[file.path]) add(n.path, 3);

    // Target links to this note (outgoing link)
    if (targetLinks.has(n.path)) add(n.path, 3);

    // Same folder
    if (n.parent?.path === targetFolder) add(n.path, 1);
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);

  if (ranked.length === 0) return `No related notes found for "${file.path}".`;
  const lines = ranked.map(([n, score]) => `(score: ${score})  ${n}`);
  return `Related notes for "${file.path}":\n\n` + lines.join("\n");
}

export async function handleSearchByTag(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const tag = args.tag as string;
  if (!tag) return "Error: tag is required.";
  const query = tag.replace(/^#/, "").toLowerCase();

  const matches: string[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const tags = getFileTags(app, file);
    if (tags.some((t) => t === query || t.includes(query))) {
      matches.push(file.path);
    }
  }

  if (matches.length === 0) return `No notes found with tag "#${query}".`;
  return `Notes tagged #${query} (${matches.length}):\n\n` + matches.join("\n");
}

export async function handleVaultStats(
  app: App,
  _args: Record<string, unknown>
): Promise<string> {
  const notes = app.vault.getMarkdownFiles();

  // Notes by top-level folder
  const byFolder: Record<string, number> = {};
  for (const n of notes) {
    const top = n.path.split("/")[0] ?? "(root)";
    byFolder[top] = (byFolder[top] ?? 0) + 1;
  }

  // Linked-to set and backlink counts
  const linkedTo = new Set<string>();
  const backlinkCount = new Map<string, number>();
  let brokenCount = 0;

  for (const [_source, links] of Object.entries(app.metadataCache.resolvedLinks)) {
    for (const [target, count] of Object.entries(links)) {
      linkedTo.add(target);
      backlinkCount.set(target, (backlinkCount.get(target) ?? 0) + count);
    }
  }

  for (const [source, links] of Object.entries(app.metadataCache.unresolvedLinks)) {
    if (/template/i.test(source)) continue;
    brokenCount += Object.keys(links).length;
  }

  // Orphan count
  const skipPattern = /template|claude\.md|moc\.md/i;
  const orphanCount = notes.filter(
    (n) => !skipPattern.test(n.path) && !linkedTo.has(n.path)
  ).length;

  // Most linked notes (top 10)
  const topLinked = [...backlinkCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Recent notes (last 7 days)
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = notes.filter((n) => n.stat.mtime >= cutoff).length;

  const folderLines = Object.entries(byFolder)
    .sort((a, b) => b[1] - a[1])
    .map(([f, c]) => `  ${f.padEnd(30)} ${c}`)
    .join("\n");

  const topLinkedLines = topLinked
    .map(([n, c]) => `  (${String(c).padStart(3)} links)  ${n}`)
    .join("\n");

  return [
    `Vault Stats`,
    `─────────────────────────────`,
    `Total notes:      ${notes.length}`,
    `Modified (7d):    ${recentCount}`,
    `Orphan notes:     ${orphanCount}`,
    `Broken links:     ${brokenCount}`,
    ``,
    `Notes by folder:`,
    folderLines,
    ``,
    `Most linked notes:`,
    topLinkedLines || "  (none)",
  ].join("\n");
}
