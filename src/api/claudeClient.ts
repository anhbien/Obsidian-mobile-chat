import { requestUrl } from "obsidian";
import { parseSSEStream } from "./streamParser";
import type {
  ClaudeMessage,
  ToolDefinition,
  StreamEvent,
  ToolUseBlock,
  TokenUsage,
} from "../types";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export interface SendMessageOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  messages: ClaudeMessage[];
  tools?: ToolDefinition[];
  enableCaching?: boolean;
  signal?: AbortSignal;
}

export interface StreamCallbacks {
  onTextDelta?: (text: string) => void;
  onToolUseStart?: (id: string, name: string) => void;
  onToolInputDelta?: (partial: string) => void;
  onToolUseEnd?: (toolUse: ToolUseBlock) => void;
  onMessageEnd?: (stopReason: string, usage: TokenUsage) => void;
  onError?: (error: string) => void;
}

/**
 * Send a message to Claude with streaming.
 * Returns the complete assistant content blocks when done.
 */
export async function sendMessageStreaming(
  options: SendMessageOptions,
  callbacks: StreamCallbacks
): Promise<{
  contentBlocks: Array<{ type: "text"; text: string } | ToolUseBlock>;
  stopReason: string;
  usage: TokenUsage;
}> {
  const systemContent = options.enableCaching
    ? [
        {
          type: "text",
          text: options.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ]
    : options.systemPrompt;

  const body: Record<string, unknown> = {
    model: options.model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    system: systemContent,
    messages: options.messages,
    stream: true,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }

  // Try native fetch for streaming support
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": options.apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch {
    // Fallback to requestUrl for environments where fetch doesn't work
    return sendMessageNonStreaming(options, callbacks);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error?.message ?? errorBody;
    } catch {
      errorMessage = errorBody;
    }

    if (response.status === 401) {
      throw new Error(
        "Invalid API key. Check your key in Claude Chat settings."
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Rate limited. Please wait a moment and try again."
      );
    }
    if (response.status === 529) {
      throw new Error("Claude is overloaded. Please try again shortly.");
    }
    throw new Error(`API error (${response.status}): ${errorMessage}`);
  }

  if (!response.body) {
    throw new Error("No response body — streaming not supported");
  }

  const reader = response.body.getReader();
  const contentBlocks: Array<
    { type: "text"; text: string } | ToolUseBlock
  > = [];
  let currentText = "";
  let currentToolBlock: Partial<ToolUseBlock> | null = null;
  let currentToolInput = "";
  let stopReason = "end_turn";
  let usage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  try {
    for await (const event of parseSSEStream(reader)) {
      if (options.signal?.aborted) break;

      switch (event.type) {
        case "text_delta":
          currentText += event.text;
          callbacks.onTextDelta?.(event.text);
          break;

        case "tool_use_start":
          // Flush any accumulated text
          if (currentText) {
            contentBlocks.push({ type: "text", text: currentText });
            currentText = "";
          }
          currentToolBlock = {
            type: "tool_use",
            id: event.id,
            name: event.name,
          };
          currentToolInput = "";
          callbacks.onToolUseStart?.(event.id, event.name);
          break;

        case "tool_input_delta":
          currentToolInput += event.partial_json;
          callbacks.onToolInputDelta?.(event.partial_json);
          break;

        case "tool_use_end":
          if (currentToolBlock) {
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse(currentToolInput);
            } catch {
              // Empty or malformed input
            }
            const toolUse: ToolUseBlock = {
              type: "tool_use",
              id: currentToolBlock.id!,
              name: currentToolBlock.name!,
              input,
            };
            contentBlocks.push(toolUse);
            callbacks.onToolUseEnd?.(toolUse);
            currentToolBlock = null;
            currentToolInput = "";
          }
          break;

        case "message_end":
          stopReason = event.stop_reason;
          usage = event.usage;
          callbacks.onMessageEnd?.(event.stop_reason, event.usage);
          break;

        case "error":
          callbacks.onError?.(event.message);
          throw new Error(event.message);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Flush remaining text
  if (currentText) {
    contentBlocks.push({ type: "text", text: currentText });
  }

  return { contentBlocks, stopReason, usage };
}

/**
 * Fallback non-streaming implementation using Obsidian's requestUrl.
 */
async function sendMessageNonStreaming(
  options: SendMessageOptions,
  callbacks: StreamCallbacks
): Promise<{
  contentBlocks: Array<{ type: "text"; text: string } | ToolUseBlock>;
  stopReason: string;
  usage: TokenUsage;
}> {
  const systemContent = options.enableCaching
    ? [
        {
          type: "text",
          text: options.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ]
    : options.systemPrompt;

  const body: Record<string, unknown> = {
    model: options.model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    system: systemContent,
    messages: options.messages,
    stream: false,
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
  }

  const response = await requestUrl({
    url: API_URL,
    method: "POST",
    headers: {
      "x-api-key": options.apiKey,
      "anthropic-version": API_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    throw: false,
  });

  if (response.status !== 200) {
    const msg = response.json?.error?.message ?? response.text;
    throw new Error(`API error (${response.status}): ${msg}`);
  }

  const data = response.json;
  const contentBlocks: Array<
    { type: "text"; text: string } | ToolUseBlock
  > = [];

  for (const block of data.content) {
    if (block.type === "text") {
      contentBlocks.push({ type: "text", text: block.text });
      callbacks.onTextDelta?.(block.text);
    } else if (block.type === "tool_use") {
      const toolUse: ToolUseBlock = {
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input,
      };
      contentBlocks.push(toolUse);
      callbacks.onToolUseStart?.(block.id, block.name);
      callbacks.onToolUseEnd?.(toolUse);
    }
  }

  const usage: TokenUsage = {
    input_tokens: data.usage?.input_tokens ?? 0,
    output_tokens: data.usage?.output_tokens ?? 0,
    cache_creation_input_tokens:
      data.usage?.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: data.usage?.cache_read_input_tokens ?? 0,
  };

  callbacks.onMessageEnd?.(data.stop_reason, usage);

  return {
    contentBlocks,
    stopReason: data.stop_reason,
    usage,
  };
}
