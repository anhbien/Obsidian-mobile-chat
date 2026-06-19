import { CHAT_FOLDER_DEFAULT, DEFAULT_SYSTEM_PROMPT } from "../constants";

export interface PluginSettings {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  confirmBeforeWrite: boolean;
  chatsFolderPath: string;
  enablePromptCaching: boolean;
  showTokenUsage: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: "",
  model: "claude-haiku-4-5-20251001",
  maxTokens: 4096,
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  confirmBeforeWrite: true,
  chatsFolderPath: CHAT_FOLDER_DEFAULT,
  enablePromptCaching: true,
  showTokenUsage: false,
};
