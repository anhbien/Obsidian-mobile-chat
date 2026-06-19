import { App, normalizePath } from "obsidian";
import { resolveFile } from "./vaultRead";

export async function handleOpenNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;

  const leaf = app.workspace.getLeaf("tab");
  await leaf.openFile(file);
  return `Opened: ${file.path}`;
}

export async function handleCreateFolder(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = normalizePath(args.path as string);

  if (app.vault.getFolderByPath(path)) {
    return `Folder already exists: "${path}"`;
  }

  await app.vault.createFolder(path);
  return `Created folder: ${path}`;
}
