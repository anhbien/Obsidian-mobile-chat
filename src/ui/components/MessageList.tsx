import { useRef, useEffect } from "react";
import type { ChatMessage } from "../../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive or streaming updates
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messages[messages.length - 1]?.content]);

  return (
    <div className="claude-chat-messages" ref={containerRef}>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isStreaming={msg.isStreaming ?? false}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
