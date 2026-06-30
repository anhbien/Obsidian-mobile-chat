import { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { MarkdownRenderer, Component } from "obsidian";
import type { ChatMessage } from "../../types";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { usePlugin } from "../context/PluginContext";
import { linkifyNotePaths } from "../utils/linkify";

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
      linkifyNotePaths(content),
      el,
      "",
      componentRef.current
    );

    // MarkdownRenderer produces internal-link anchors, but they don't open on
    // click inside a custom view — handle them and open the note in a new tab.
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const a = target.closest("a.internal-link");
      if (!a) return;
      e.preventDefault();
      const linktext = a.getAttribute("data-href") ?? a.textContent ?? "";
      if (linktext) {
        plugin.app.workspace.openLinkText(linktext, "", "tab");
      }
    };
    el.addEventListener("click", onClick);

    return () => {
      el.removeEventListener("click", onClick);
      componentRef.current?.unload();
    };
  }, [content, plugin.app]);

  return <div ref={ref} className="claude-chat-markdown" />;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const el = document.createElement('textarea');
        el.value = message.content;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

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

      {message.content && (
        <div className={`claude-chat-bubble-actions${isUser ? " claude-chat-bubble-actions-user" : ""}`}>
          <button
            className={`claude-chat-copy-btn${copied ? " claude-chat-copy-btn-copied" : ""}`}
            onClick={handleCopy}
            aria-label="Copy message"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied && <span className="claude-chat-copy-label">Copied!</span>}
          </button>
        </div>
      )}
    </div>
  );
}
