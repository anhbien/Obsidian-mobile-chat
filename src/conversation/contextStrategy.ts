/** Rough token estimation: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trim messages to fit within a token budget.
 * Keeps the system prompt and the most recent messages.
 * Returns a new array with trimmed messages.
 */
export function trimMessages<T extends { role: string; content: unknown }>(
  messages: T[],
  maxTokens: number,
  estimateMessageTokens: (msg: T) => number
): T[] {
  // Always keep at least the last message
  if (messages.length <= 1) return messages;

  let totalTokens = 0;
  const result: T[] = [];

  // Work backwards from the most recent message
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = estimateMessageTokens(messages[i]);
    if (totalTokens + tokens > maxTokens && result.length > 0) {
      break;
    }
    totalTokens += tokens;
    result.unshift(messages[i]);
  }

  // Ensure conversation starts with a user message
  while (result.length > 0 && result[0].role !== "user") {
    result.shift();
  }

  return result;
}
