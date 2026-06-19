import { App } from "obsidian";

export async function handleHealthCheck(
  app: App,
  _args: Record<string, unknown>
): Promise<string> {
  const notes = app.vault.getMarkdownFiles();

  // Find the most recently modified note
  let latestFile = "";
  let latestMtime = 0;
  for (const file of notes) {
    if (file.stat.mtime > latestMtime) {
      latestMtime = file.stat.mtime;
      latestFile = file.path;
    }
  }

  const lastModified = latestMtime
    ? new Date(latestMtime).toISOString().replace("T", " ").slice(0, 19)
    : "unknown";

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayFilename = `${yyyy}-${mm}-${dd}.md`;
  const todayPath = `Daily Notes/${todayFilename}`;
  const hasTodayNote = app.vault.getFileByPath(todayPath) !== null;

  return [
    `✅ Vault accessible`,
    `📝 Total notes: ${notes.length}`,
    `🕐 Last modified: ${lastModified} (${latestFile})`,
    `📅 Today's note (${todayFilename}): ${hasTodayNote ? "exists" : "not created yet"}`,
  ].join("\n");
}
