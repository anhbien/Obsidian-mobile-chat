import { App, TFile } from "obsidian";
import { resolveFile } from "./vaultRead";

export async function handleGetBacklinks(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;

  const backlinks: string[] = [];
  const resolvedLinks = app.metadataCache.resolvedLinks;

  for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
    if (links[file.path] && links[file.path] > 0) {
      backlinks.push(sourcePath);
    }
  }

  if (backlinks.length === 0) return `No backlinks found for "${file.path}".`;
  return `Backlinks to "${file.path}":\n${backlinks.join("\n")}`;
}

export async function handleGetTags(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;

  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return `No cached metadata for "${file.path}".`;

  const tags = new Set<string>();

  // Frontmatter tags
  if (cache.frontmatter?.tags) {
    const fmTags = cache.frontmatter.tags;
    if (Array.isArray(fmTags)) {
      fmTags.forEach((t: string) => tags.add(t));
    } else if (typeof fmTags === "string") {
      tags.add(fmTags);
    }
  }

  // Inline tags
  if (cache.tags) {
    cache.tags.forEach((t) => tags.add(t.tag.replace(/^#/, "")));
  }

  if (tags.size === 0) return `No tags found in "${file.path}".`;
  return `Tags in "${file.path}":\n${[...tags].join(", ")}`;
}

export async function handleGetMetadata(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;

  const cache = app.metadataCache.getFileCache(file);
  if (!cache?.frontmatter)
    return `No frontmatter in "${file.path}".`;

  // Remove the "position" metadata that Obsidian adds internally
  const { position, ...metadata } = cache.frontmatter;
  return `Metadata for "${file.path}":\n${JSON.stringify(metadata, null, 2)}`;
}
