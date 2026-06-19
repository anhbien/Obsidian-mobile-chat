import { useRef, useEffect } from "react";
import { MarkdownRenderer, Component } from "obsidian";
import type { ChatMessage } from "../../types";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { usePlugin } from "../context/PluginContext";

interface Props {
  message: ChatMessage;
  isStreaming: boolean;
}

function RenderedMarkdown({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const componentRef = useRef<Component | null>(null);
  const plugin = usePlugin();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Clean up previous render
    componentRef.current?.unload();
    componentRef.current = new Component();
    componentRef.current.load();
    el.empty();

    MarkdownRenderer.render(
      plugin.app,
      content,
      el,
      "",
      componentRef.current
    );

    return () => {
      componentRef.current?.unload();
    };
  }, [content, plugin.app]);

  return <div ref={ref} className="claude-chat-markdown" />;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`claude-chat-bubble ${isUser ? "claude-chat-bubble-user" : "claude-chat-bubble-assistant"}`}
    >
      <div className="claude-chat-bubble-content">
        {message.content && (
          <div className="claude-chat-bubble-text">
            <RenderedMarkdown content={message.content} />
            {isStreaming && !isUser && !message.content && (
              <div className="claude-chat-typing">
                <span className="claude-chat-typing-dot" />
                <span className="claude-chat-typing-dot" />
                <span className="claude-chat-typing-dot" />
              </div>
            )}
            {isStreaming && !isUser && message.content && (
              <span className="claude-chat-cursor" />
            )}
          </div>
        )}

        {!message.content && isStreaming && (
          <div className="claude-chat-typing">
            <span className="claude-chat-typing-dot" />
            <span className="claude-chat-typing-dot" />
            <span className="claude-chat-typing-dot" />
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="claude-chat-tool-calls">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
