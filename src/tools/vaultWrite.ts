import { App, normalizePath } from "obsidian";
import { resolveFile } from "./vaultRead";

export async function handleWriteNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = normalizePath(args.path as string);
  const content = args.content as string;
  const overwrite = args.overwrite === true;

  const existing = app.vault.getFileByPath(path);
  if (existing && !overwrite) {
    return `Error: note already exists: "${path}". Pass overwrite=true to replace it.`;
  }

  if (existing) {
    await app.vault.modify(existing, content);
    return `Overwritten: ${path}`;
  }

  // Ensure parent folder exists
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir && !app.vault.getFolderByPath(dir)) {
    await app.vault.createFolder(dir);
  }

  await app.vault.create(path, content);
  return `Created: ${path}`;
}

export async function handleAppendToNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const content = args.content as string;

  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;

  await app.vault.append(file, "\n" + content);
  return `Appended to: ${file.path}`;
}

export async function handleMoveNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = args.path as string;
  const newPath = normalizePath(args.new_path as string);

  const file = resolveFile(app, path);
  if (!file) return `Error: note not found: "${path}"`;
  if (app.vault.getAbstractFileByPath(newPath)) {
    return `Error: a file already exists at "${newPath}"`;
  }

  await app.fileManager.renameFile(file, newPath);
  return `Moved: ${path} → ${newPath}`;
}

export async function handleDeleteNote(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = normalizePath(args.path as string);
  const file = app.vault.getFileByPath(path);
  if (!file) return `Error: note not found: "${path}"`;

  await app.vault.trash(file, true);
  return `Deleted: ${path}`;
}

export async function handleDeleteFolder(
  app: App,
  args: Record<string, unknown>
): Promise<string> {
  const path = normalizePath(args.path as string);
  const recursive = args.recursive === true;

  const folder = app.vault.getFolderByPath(path);
  if (!folder) return `Error: folder not found: "${path}"`;
  if (!recursive && folder.children.length > 0) {
    return `Error: folder "${path}" is not empty. Pass recursive=true to delete it and its contents.`;
  }

  await app.vault.trash(folder, true);
  return `Deleted folder: ${path}`;
}
