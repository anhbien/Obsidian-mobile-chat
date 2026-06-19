import { Plugin, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_CHAT } from "./constants";
import { ChatView } from "./views/chatView";
import { ClaudeChatSettingTab } from "./settings/settingsTab";
import { DEFAULT_SETTINGS, type PluginSettings } from "./settings/settings";

export default class ClaudeChatPlugin extends Plugin {
  settings!: PluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register the chat view
    this.registerView(
      VIEW_TYPE_CHAT,
      (leaf) => new ChatView(leaf, this)
    );

    // Ribbon icon
    this.addRibbonIcon("message-square", "Open Claude Chat", () => {
      this.activateView();
    });

    // Commands
    this.addCommand({
      id: "open-chat-panel",
      name: "Open chat panel",
      callback: () => this.activateView("panel"),
    });

    this.addCommand({
      id: "open-chat-tab",
      name: "Open chat in new tab",
      callback: () => this.activateView("tab"),
    });

    this.addCommand({
      id: "chat-about-current-note",
      name: "Chat about current note",
      callback: () => this.chatAboutCurrentNote(),
    });

    // Settings tab
    this.addSettingTab(new ClaudeChatSettingTab(this.app, this));
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHAT);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateView(mode: "panel" | "tab" = "panel"): Promise<void> {
    const { workspace } = this.app;

    // Check if already open
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];

    if (!leaf) {
      if (mode === "tab") {
        leaf = workspace.getLeaf("tab");
      } else {
        leaf = workspace.getRightLeaf(false)!;
      }
      await leaf.setViewState({
        type: VIEW_TYPE_CHAT,
        active: true,
      });
    }

    await workspace.revealLeaf(leaf);
  }

  private async chatAboutCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    await this.activateView();

    // The chat view will have access to the active file via the workspace API
    // The user can reference it through the get_current_note tool
  }
}
