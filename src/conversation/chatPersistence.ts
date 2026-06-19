import { App, normalizePath, TFile } from "obsidian";
import type { ChatMessage, Conversation } from "../types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Save a conversation as a markdown file in the vault.
 */
export async function saveChat(
  app: App,
  chatsFolderPath: string,
  conversationId: string,
  title: string,
  model: string,
  messages: ChatMessage[],
  created: number
): Promise<string> {
  const folder = normalizePath(chatsFolderPath);
  if (!app.vault.getFolderByPath(folder)) {
    await app.vault.createFolder(folder);
  }

  const safeTitle = title
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 60);
  const filename = `${safeTitle} (${conversationId}).md`;
  const filePath = normalizePath(`${folder}/${filename}`);

  const now = Date.now();
  const frontmatter = [
    "---",
    `chat_id: ${conversationId}`,
    `model: ${model}`,
    `created: ${new Date(created).toISOString()}`,
    `updated: ${new Date(now).toISOString()}`,
    `title: "${title}"`,
    "---",
    "",
  ].join("\n");

  const body = messages
    .map((msg) => {
      const roleHeader =
        msg.role === "user" ? "## 💬 User" : "## 🤖 Assistant";
      let content = msg.content;

      // Format tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const toolLines = msg.toolCalls.map((tc) => {
          const inputStr = JSON.stringify(tc.input, null, 2);
          const resultStr = tc.result
            ? `\n> Result: ${tc.result.slice(0, 200)}${tc.result.length > 200 ? "..." : ""}`
            : "";
          return `> 🔧 **${tc.name}**(${Object.keys(tc.input).join(", ")})${resultStr}`;
        });
        content = content + "\n\n" + toolLines.join("\n\n");
      }

      return `${roleHeader}\n${content}`;
    })
    .join("\n\n");

  const fullContent = frontmatter + body;

  const existing = app.vault.getFileByPath(filePath);
  if (existing) {
    await app.vault.modify(existing, fullContent);
  } else {
    await app.vault.create(filePath, fullContent);
  }

  return filePath;
}

/**
 * Load a conversation from a markdown file.
 */
export async function loadChat(
  app: App,
  filePath: string
): Promise<{ messages: ChatMessage[]; metadata: Partial<Conversation> } | null> {
  const file = app.vault.getFileByPath(filePath);
  if (!file) return null;

  const content = await app.vault.read(file);
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);

  const metadata: Partial<Conversation> = {};
  if (fmMatch) {
    const lines = fmMatch[1].split("\n");
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
        switch (key) {
          case "chat_id":
            metadata.id = val;
            break;
          case "model":
            metadata.model = val;
            break;
          case "title":
            metadata.title = val;
            break;
          case "created":
            metadata.created = new Date(val).getTime();
            break;
          case "updated":
            metadata.updated = new Date(val).getTime();
            break;
        }
      }
    }
  }

  const body = fmMatch ? content.slice(fmMatch[0].length) : content;
  const messages = parseMessagesFromMarkdown(body);

  return { messages, metadata };
}

function parseMessagesFromMarkdown(body: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const sections = body.split(/^## [💬🤖] (?:User|Assistant)\s*$/m);

  // First item is empty (before first heading), so skip it
  const headings = [...body.matchAll(/^## ([💬🤖]) (?:User|Assistant)\s*$/gm)];

  for (let i = 0; i < headings.length; i++) {
    const role = headings[i][1] === "💬" ? "user" : "assistant";
    const content = (sections[i + 1] ?? "").trim();

    messages.push({
      id: generateId(),
      role: role as "user" | "assistant",
      content,
      timestamp: Date.now(),
    });
  }

  return messages;
}

/**
 * List all saved conversations.
 */
export async function listChats(
  app: App,
  chatsFolderPath: string
): Promise<Conversation[]> {
  const folder = normalizePath(chatsFolderPath);
  const folderObj = app.vault.getFolderByPath(folder);
  if (!folderObj) return [];

  const conversations: Conversation[] = [];

  for (const child of folderObj.children) {
    if (!(child instanceof TFile) || !child.name.endsWith(".md")) continue;

    const cache = app.metadataCache.getFileCache(child);
    const fm = cache?.frontmatter;

    conversations.push({
      id: fm?.chat_id ?? child.basename,
      title: fm?.title ?? child.basename,
      model: fm?.model ?? "unknown",
      created: fm?.created ? new Date(fm.created).getTime() : child.stat.ctime,
      updated: fm?.updated ? new Date(fm.updated).getTime() : child.stat.mtime,
      messageCount: 0,
      filePath: child.path,
    });
  }

  return conversations.sort((a, b) => b.updated - a.updated);
}

/**
 * Delete a conversation file.
 */
export async function deleteChat(
  app: App,
  filePath: string
): Promise<void> {
  const file = app.vault.getFileByPath(filePath);
  if (file) {
    await app.vault.trash(file, true);
  }
}
