import type { StreamEvent } from "../types";

/**
 * Parse an SSE stream from the Claude Messages API into typed events.
 * Uses a ReadableStream reader and yields StreamEvent objects.
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }

      const parsed = mapSSEEvent(event);
      if (parsed) yield parsed;
    }
  }
}

function mapSSEEvent(event: Record<string, unknown>): StreamEvent | null {
  const type = event.type as string;

  switch (type) {
    case "message_start": {
      const message = event.message as Record<string, unknown>;
      return {
        type: "message_start",
        model: (message?.model as string) ?? "",
      };
    }

    case "content_block_start": {
      const block = event.content_block as Record<string, unknown>;
      if (block?.type === "tool_use") {
        return {
          type: "tool_use_start",
          id: block.id as string,
          name: block.name as string,
        };
      }
      return null;
    }

    case "content_block_delta": {
      const delta = event.delta as Record<string, unknown>;
      if (delta?.type === "text_delta") {
        return { type: "text_delta", text: delta.text as string };
      }
      if (delta?.type === "input_json_delta") {
        return {
          type: "tool_input_delta",
          partial_json: delta.partial_json as string,
        };
      }
      return null;
    }

    case "content_block_stop": {
      const index = event.index as number;
      // We emit tool_use_end with the index as a proxy for the tool ID;
      // the caller tracks the active tool block to correlate.
      return { type: "tool_use_end", id: String(index) };
    }

    case "message_delta": {
      const delta = event.delta as Record<string, unknown>;
      const usage = event.usage as Record<string, number> | undefined;
      return {
        type: "message_end",
        stop_reason: (delta?.stop_reason as string) ?? "end_turn",
        usage: {
          input_tokens: usage?.input_tokens ?? 0,
          output_tokens: usage?.output_tokens ?? 0,
        },
      };
    }

    case "error": {
      const error = event.error as Record<string, string>;
      return { type: "error", message: error?.message ?? "Unknown error" };
    }

    default:
      return null;
  }
}
