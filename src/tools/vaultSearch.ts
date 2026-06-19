import { App, TFile, TFolder, normalizePath } from "obsidian";

export async function handleSearchVault(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const query = (args.query as string).toLowerCase();
  const limit = (args.max_results as number) ?? 20;
  const hits: { file: string; line: number; excerpt: string }[] = [];

  for (const file of app.vault.getMarkdownFiles()) {
    if (hits.length >= limit) break;
    const content = await app.vault.cachedRead(file);
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query)) {
        hits.push({
          file: file.path,
          line: i + 1,
          excerpt: lines[i].trim().slice(0, 120),
        });
        if (hits.length >= limit) break;
      }
    }
  }

  if (hits.length === 0) return "No results found.";
  return hits.map((h) => `${h.file}:${h.line}  ${h.excerpt}`).join("\n");
}

export async function handleListFolder(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const folderPath = normalizePath((args.path as string) ?? "");

  let folder: TFolder | null;
  if (!folderPath || folderPath === ".") {
    folder = app.vault.getRoot();
  } else {
    folder = app.vault.getFolderByPath(folderPath);
  }

  if (!folder) return `Error: folder not found: "${folderPath}"`;

  const lines = folder.children
    .filter((c) => !c.name.startsWith("."))
    .sort((a, b) => {
      // Folders first
      const aIsFolder = a instanceof TFolder ? 0 : 1;
      const bIsFolder = b instanceof TFolder ? 0 : 1;
      if (aIsFolder !== bIsFolder) return aIsFolder - bIsFolder;
      return a.name.localeCompare(b.name);
    })
    .map((c) =>
      c instanceof TFolder
        ? `[folder] ${c.name}`
        : `[file]   ${c.name}`
    );

  return lines.length ? lines.join("\n") : "(empty)";
}
