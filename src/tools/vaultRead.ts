import { App, TFile, TFolder } from "obsidian";

/** Resolve a note path: exact match first, then fuzzy basename match */
export function resolveFile(app: App, input: string): TFile | null {
  const file = app.vault.getFileByPath(input);
  if (file) return file;

  // Try with .md extension
  if (!input.endsWith(".md")) {
    const withExt = app.vault.getFileByPath(input + ".md");
    if (withExt) return withExt;
  }

  // Fuzzy fallback: find first note whose basename contains the query
  const query = input
    .replace(/\.md$/, "")
    .split("/")
    .pop()!
    .toLowerCase();
  return (
    app.vault
      .getMarkdownFiles()
      .find((f) => f.basename.toLowerCase().includes(query)) ?? null
  );
}

export async function handleReadNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;
  return await app.vault.cachedRead(file);
}

export async function handleFindNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const query = (args.query as string).toLowerCase();
  const matches = app.vault
    .getMarkdownFiles()
    .filter((f) => f.basename.toLowerCase().includes(query))
    .map((f) => f.path);

  if (matches.length === 0) return "No notes found.";
  return matches.join("\n");
}

export async function handleGetCurrentNote(
  app: App,
  _args: Record<string, unknown>
): Promise<string> {
  const file = app.workspace.getActiveFile();
  if (!file) return "No note is currently open.";

  const content = await app.vault.cachedRead(file);
  return `Path: ${file.path}\n\n${content}`;
}
