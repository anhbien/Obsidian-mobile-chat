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
