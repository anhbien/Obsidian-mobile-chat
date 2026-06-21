import { App } from "obsidian";
import type {
  ChatMessage,
  ClaudeMessage,
  ContentBlock,
  ToolUseBlock,
  ToolCallInfo,
  TokenUsage,
  ConfirmationRequest,
} from "../types";
import type { PluginSettings } from "../settings/settings";
import { sendMessageStreaming } from "../api/claudeClient";
import { TOOL_DEFINITIONS } from "../tools/toolDefinitions";
import { executeTools } from "../tools/toolExecutor";
import { ConfirmationManager } from "../tools/confirmationManager";
import { getModelInfo } from "../api/models";
import { estimateTokens, trimMessages } from "./contextStrategy";
import { saveChat, loadChat } from "./chatPersistence";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export type ConversationEventType =
  | "message_added"
  | "message_updated"
  | "streaming_start"
  | "streaming_end"
  | "tool_call_start"
  | "tool_call_end"
  | "confirmation_request"
  | "conversation_loaded"
  | "error";

export type ConversationEvent = {
  type: ConversationEventType;
  message?: ChatMessage;
  toolCall?: ToolCallInfo;
  confirmation?: ConfirmationRequest;
  error?: string;
  usage?: TokenUsage;
};

type EventListener = (event: ConversationEvent) => void;

export class ConversationManager {
  private app: App;
  private settings: PluginSettings;
  private messages: ChatMessage[] = [];
  private apiMessages: ClaudeMessage[] = [];
  private listeners: EventListener[] = [];
  private abortController: AbortController | null = null;
  private _isStreaming = false;
  readonly confirmationManager = new ConfirmationManager();

  conversationId: string;
  title = "New Chat";
  model: string;
  created: number;
  totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  constructor(app: App, settings: PluginSettings) {
    this.app = app;
    this.settings = settings;
    this.conversationId = generateId();
    this.model = settings.model;
    this.created = Date.now();
    this.confirmationManager.confirmBeforeWrite = settings.confirmBeforeWrite;
  }

  get isStreaming(): boolean {
    return this._isStreaming;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  addEventListener(listener: EventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: EventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private emit(event: ConversationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  cancelGeneration(): void {
    this.abortController?.abort();
    this._isStreaming = false;
    this.emit({ type: "streaming_end" });
  }

  /**
   * Send a user message and get Claude's response (with tool use loop).
   */
  async sendMessage(text: string, displayText?: string): Promise<void> {
    if (!this.settings.apiKey) {
      this.emit({
        type: "error",
        error: "No API key configured. Open Settings → Claude Chat to add your Anthropic API key.",
      });
      return;
    }

    // Add user message — display text may differ from API text (e.g. file attachments)
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: displayText ?? text,
      timestamp: Date.now(),
    };
    this.messages.push(userMessage);
    this.apiMessages.push({ role: "user", content: text });
    this.emit({ type: "message_added", message: userMessage });

    // Auto-title after first message
    if (this.messages.length === 1) {
      const titleText = displayText ?? text;
      this.title = titleText.slice(0, 50) + (titleText.length > 50 ? "..." : "");
    }

    // Start response loop
    await this.runResponseLoop();
  }

  private async runResponseLoop(): Promise<void> {
    this._isStreaming = true;
    this.emit({ type: "streaming_start" });
    this.abortController = new AbortController();

    try {
      let continueLoop = true;

      while (continueLoop) {
        continueLoop = false;

        // Trim messages to fit context window
        const modelInfo = getModelInfo(this.model);
        const contextBudget = Math.floor(modelInfo.contextWindow * 0.8);
        const trimmed = trimMessages(
          this.apiMessages,
          contextBudget,
          (msg) => {
            if (typeof msg.content === "string") {
              return estimateTokens(msg.content);
            }
            return estimateTokens(JSON.stringify(msg.content));
          }
        );

        // Create assistant message placeholder
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          toolCalls: [],
          isStreaming: true,
        };
        this.messages.push(assistantMessage);
        this.emit({ type: "message_added", message: assistantMessage });

        let currentToolCallInfo: ToolCallInfo | null = null;

        const result = await sendMessageStreaming(
          {
            apiKey: this.settings.apiKey,
            model: this.model,
            maxTokens: this.settings.maxTokens,
            temperature: this.settings.temperature,
            systemPrompt: this.settings.systemPrompt,
            messages: trimmed,
            tools: TOOL_DEFINITIONS,
            enableCaching: this.settings.enablePromptCaching,
            signal: this.abortController.signal,
          },
          {
            onTextDelta: (text) => {
              assistantMessage.content += text;
              this.emit({ type: "message_updated", message: assistantMessage });
            },
            onToolUseStart: (id, name) => {
              currentToolCallInfo = {
                id,
                name,
                input: {},
                status: "pending",
              };
              if (!assistantMessage.toolCalls) assistantMessage.toolCalls = [];
              assistantMessage.toolCalls.push(currentToolCallInfo);
              this.emit({
                type: "tool_call_start",
                toolCall: currentToolCallInfo,
              });
            },
            onToolUseEnd: (toolUse) => {
              if (currentToolCallInfo) {
                currentToolCallInfo.input = toolUse.input;
                currentToolCallInfo.status = "running";
                this.emit({
                  type: "message_updated",
                  message: assistantMessage,
                });
              }
              currentToolCallInfo = null;
            },
            onMessageEnd: (_stopReason, usage) => {
              this.totalUsage.input_tokens += usage.input_tokens;
              this.totalUsage.output_tokens += usage.output_tokens;
            },
            onError: (error) => {
              this.emit({ type: "error", error });
            },
          }
        );

        assistantMessage.isStreaming = false;
        this.emit({ type: "message_updated", message: assistantMessage });

        // Add assistant response to API messages
        this.apiMessages.push({
          role: "assistant",
          content: result.contentBlocks,
        });

        // Handle tool use
        if (result.stopReason === "tool_use") {
          const toolUseBlocks = result.contentBlocks.filter(
            (b): b is ToolUseBlock => b.type === "tool_use"
          );

          if (toolUseBlocks.length > 0) {
            // Execute tools
            const toolResults = await executeTools(
              this.app,
              toolUseBlocks,
              this.confirmationManager
            );

            // Update tool call info in the message
            for (const tr of toolResults) {
              const tc = assistantMessage.toolCalls?.find(
                (t) => t.id === tr.toolUseId
              );
              if (tc) {
                tc.status = tr.isError ? "error" : "complete";
                tc.result = tr.content;
                tc.isError = tr.isError;
                this.emit({ type: "tool_call_end", toolCall: tc });
              }
            }

            this.emit({ type: "message_updated", message: assistantMessage });

            // Add tool results as user message
            const toolResultContent: ContentBlock[] = toolResults.map(
              (tr) => ({
                type: "tool_result" as const,
                tool_use_id: tr.toolUseId,
                content: tr.content,
                is_error: tr.isError,
              })
            );

            this.apiMessages.push({
              role: "user",
              content: toolResultContent,
            });

            continueLoop = true;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled
      } else {
        const message = err instanceof Error ? err.message : String(err);
        this.emit({ type: "error", error: message });
      }
    } finally {
      this._isStreaming = false;
      this.abortController = null;
      this.emit({
        type: "streaming_end",
        usage: this.totalUsage,
      });
      this.autoSave();
    }
  }

  private async autoSave(): Promise<void> {
    try {
      await saveChat(
        this.app,
        this.settings.chatsFolderPath,
        this.conversationId,
        this.title,
        this.model,
        this.messages,
        this.created
      );
    } catch {
      // Silently fail — saving is best-effort
    }
  }

  /** Load a previously saved conversation from a vault file */
  async loadConversation(filePath: string): Promise<boolean> {
    const loaded = await loadChat(this.app, filePath);
    if (!loaded) return false;

    this.cancelGeneration();
    this.messages = loaded.messages;
    this.apiMessages = loaded.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    this.conversationId = loaded.metadata.id ?? this.conversationId;
    this.title = loaded.metadata.title ?? this.title;
    this.model = loaded.metadata.model ?? this.model;
    this.created = loaded.metadata.created ?? this.created;
    this.totalUsage = { input_tokens: 0, output_tokens: 0 };
    this.emit({ type: "conversation_loaded" });
    return true;
  }

  /** Reset for a new conversation */
  reset(): void {
    this.cancelGeneration();
    this.messages = [];
    this.apiMessages = [];
    this.conversationId = generateId();
    this.title = "New Chat";
    this.created = Date.now();
    this.totalUsage = { input_tokens: 0, output_tokens: 0 };
  }

  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
    this.confirmationManager.confirmBeforeWrite = settings.confirmBeforeWrite;
  }
}
