import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ClaudeChatPlugin from "../main";
import {
  fetchModels,
  getCachedModels,
  setCachedModels,
} from "../api/models";
import { DEFAULT_SYSTEM_PROMPT } from "../constants";

export class ClaudeChatSettingTab extends PluginSettingTab {
  plugin: ClaudeChatPlugin;
  private modelsFetched = false;

  constructor(app: App, plugin: ClaudeChatPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** Fetch the live model list from the API and re-render. */
  private async refreshModels(silent = false): Promise<void> {
    const apiKey = this.plugin.settings.apiKey;
    if (!apiKey) {
      if (!silent) new Notice("Add your API key first to load models.");
      return;
    }
    try {
      const models = await fetchModels(apiKey);
      setCachedModels(models);
      if (!silent) new Notice(`Loaded ${models.length} models.`);
      this.display();
    } catch (e) {
      if (!silent) {
        new Notice(
          `Could not load models: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Claude Chat Settings" });

    // ── API Key ──────────────────────────────────────────────────────────
    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Your Anthropic API key from platform.claude.com/settings/keys")
      .addText((text) =>
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        const input = setting.controlEl.querySelector("input");
        if (input) input.type = "password";
      });

    // ── Model ────────────────────────────────────────────────────────────
    new Setting(containerEl)
      .setName("Model")
      .setDesc("Claude model to use for chat (refresh to load the latest list)")
      .addDropdown((dropdown) => {
        const models = getCachedModels();
        const current = this.plugin.settings.model;
        // Keep the current selection visible even if it's not in the list.
        if (current && !models.some((m) => m.id === current)) {
          dropdown.addOption(current, current);
        }
        for (const model of models) {
          dropdown.addOption(model.id, model.name);
        }
        dropdown.setValue(current);
        dropdown.onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        });
      })
      .addExtraButton((btn) =>
        btn
          .setIcon("refresh-cw")
          .setTooltip("Refresh model list from the API")
          .onClick(() => this.refreshModels())
      );

    // Auto-load the live model list the first time settings open with a key.
    if (this.plugin.settings.apiKey && !this.modelsFetched) {
      this.modelsFetched = true;
      void this.refreshModels(true);
    }

    // ── Max Tokens ───────────────────────────────────────────────────────
    new Setting(containerEl)
      .setName("Max output tokens")
      .setDesc("Maximum number of tokens in Claude's response")
      .addText((text) =>
        text
          .setPlaceholder("4096")
          .setValue(String(this.plugin.settings.maxTokens))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.maxTokens = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // ── Temperature ──────────────────────────────────────────────────────
    new Setting(containerEl)
      .setName("Temperature")
      .setDesc("Controls randomness (0 = deterministic, 1 = creative)")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.temperature = value;
            await this.plugin.saveSettings();
          })
      );

    // ── System Prompt ────────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "System Prompt" });

    new Setting(containerEl)
      .setName("Custom system prompt")
      .setDesc("Instructions that guide Claude's behavior in your vault")
      .addTextArea((text) => {
        text
          .setPlaceholder(DEFAULT_SYSTEM_PROMPT)
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 8;
        text.inputEl.style.width = "100%";
      });

    // ── Behavior ─────────────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Behavior" });

    new Setting(containerEl)
      .setName("Confirm before writing")
      .setDesc(
        "Show a confirmation prompt before Claude creates, edits, or deletes notes"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.confirmBeforeWrite)
          .onChange(async (value) => {
            this.plugin.settings.confirmBeforeWrite = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show token usage")
      .setDesc("Display token count and estimated cost per message")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showTokenUsage)
          .onChange(async (value) => {
            this.plugin.settings.showTokenUsage = value;
            await this.plugin.saveSettings();
          })
      );

    // ── Storage ──────────────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Storage" });

    new Setting(containerEl)
      .setName("Chat folder")
      .setDesc("Vault folder where chat transcripts are saved")
      .addText((text) =>
        text
          .setPlaceholder("_chats")
          .setValue(this.plugin.settings.chatsFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.chatsFolderPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable prompt caching")
      .setDesc(
        "Cache system prompt to reduce API costs (~90% savings on repeated messages)"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enablePromptCaching)
          .onChange(async (value) => {
            this.plugin.settings.enablePromptCaching = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
