import { App } from "obsidian";

export async function handleDailyNote(
  app: App,
  _args: Record<string, unknown>
): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const filename = `${yyyy}-${mm}-${dd}.md`;
  const notePath = `Daily Notes/${filename}`;

  const existing = app.vault.getFileByPath(notePath);
  if (existing) {
    const content = await app.vault.cachedRead(existing);
    return content;
  }

  // Create from template if it exists
  const templatePath = "Daily Notes/Template - Daily Note.md";
  const template = app.vault.getFileByPath(templatePath);

  let content: string;
  if (template) {
    content = await app.vault.cachedRead(template);
  } else {
    content = `# 📅 ${yyyy}-${mm}-${dd}\n`;
  }

  // Ensure folder exists
  if (!app.vault.getFolderByPath("Daily Notes")) {
    await app.vault.createFolder("Daily Notes");
  }

  await app.vault.create(notePath, content);
  return `Created today's note: ${notePath}\n\n${content}`;
}
