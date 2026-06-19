import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { VIEW_TYPE_CHAT } from "../constants";
import type ClaudeChatPlugin from "../main";
import { ChatApp } from "../ui/ChatApp";

export class ChatView extends ItemView {
  plugin: ClaudeChatPlugin;
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeChatPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return "Claude Chat";
  }

  getIcon(): string {
    return "message-square";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("claude-chat-container");
    this.root = createRoot(this.contentEl);
    this.root.render(createElement(ChatApp, { plugin: this.plugin }));
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}
