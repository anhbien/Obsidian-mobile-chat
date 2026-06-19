/** Claude API message types */
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** Internal chat message for UI display */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: "pending" | "running" | "complete" | "error";
  result?: string;
  isError?: boolean;
  /** Whether this tool requires user confirmation */
  requiresConfirmation?: boolean;
  /** Whether confirmation was granted */
  confirmed?: boolean;
}

/** Conversation metadata */
export interface Conversation {
  id: string;
  title: string;
  model: string;
  created: number;
  updated: number;
  messageCount: number;
  filePath?: string;
}

/** Tool definition for Claude API */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** Streaming events emitted by the API client */
export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "tool_input_delta"; partial_json: string }
  | { type: "tool_use_end"; id: string }
  | { type: "message_start"; model: string }
  | { type: "message_end"; stop_reason: string; usage: TokenUsage }
  | { type: "error"; message: string };

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/** Confirmation request for write operations */
export interface ConfirmationRequest {
  toolCallId: string;
  toolName: string;
  description: string;
  details: {
    path?: string;
    content?: string;
    oldContent?: string;
    operation?: string;
  };
  resolve: (confirmed: boolean) => void;
}
