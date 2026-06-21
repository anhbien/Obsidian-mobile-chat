import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowUp, FileText, Square, X } from "lucide-react";
import { usePlugin } from "../context/PluginContext";

interface FileAttachment {
  path: string;
  basename: string;
}

interface Props {
  onSend: (text: string, attachedFiles?: FileAttachment[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export function InputBar({ onSend, onCancel, isStreaming, disabled }: Props) {
  const plugin = usePlugin();
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<FileAttachment[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Build file list once
  const allFiles = useMemo(() => {
    return plugin.app.vault
      .getMarkdownFiles()
      .map((f) => ({ path: f.path, basename: f.basename }))
      .sort((a, b) => a.basename.localeCompare(b.basename));
  }, [plugin.app.vault.getMarkdownFiles().length]);

  // Filter files on query change
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    const q = mentionQuery.toLowerCase();
    const filtered = allFiles
      .filter(
        (f) =>
          f.basename.toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q)
      )
      .slice(0, 8);
    setMentionResults(filtered);
    setMentionIndex(0);
  }, [mentionQuery, allFiles]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined);
    setText("");
    setAttachedFiles([]);
    setMentionQuery(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, isStreaming, disabled, onSend, attachedFiles]);

  const insertMention = useCallback(
    (file: FileAttachment) => {
      const before = text.slice(0, mentionStart);
      const after = text.slice(textareaRef.current?.selectionStart ?? text.length);
      const newText = `${before}[[${file.basename}]]${after}`;
      setText(newText);
      setAttachedFiles((prev) =>
        prev.some((f) => f.path === file.path) ? prev : [...prev, file]
      );
      setMentionQuery(null);
      setMentionStart(-1);
      // Focus back on textarea
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [text, mentionStart]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart;
    // Detect @ trigger
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf("@");

    if (atIdx >= 0) {
      // Only trigger if @ is at start or preceded by whitespace
      const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : " ";
      if (charBefore === " " || charBefore === "\n" || atIdx === 0) {
        const query = textBefore.slice(atIdx + 1);
        // Don't trigger if query contains spaces (user moved on)
        if (!query.includes(" ") && query.length < 50) {
          setMentionQuery(query);
          setMentionStart(atIdx);
          return;
        }
      }
    }
    setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention navigation
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && isStreaming) {
      onCancel();
    }
  };

  const removeAttachment = (path: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.path !== path));
  };

  return (
    <div className="claude-chat-input-wrapper">
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="claude-chat-attachments">
          {attachedFiles.map((f) => (
            <span key={f.path} className="claude-chat-attachment-chip">
              <FileText size={14} /> {f.basename}
              <button
                className="claude-chat-attachment-remove"
                onClick={() => removeAttachment(f.path)}
                aria-label={`Remove ${f.basename}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="claude-chat-input-bar">
        <div className="claude-chat-input-container">
          {/* @ mention dropdown */}
          {mentionQuery !== null && mentionResults.length > 0 && (
            <div className="claude-chat-mention-dropdown" ref={mentionRef}>
              {mentionResults.map((file, i) => (
                <div
                  key={file.path}
                  className={`claude-chat-mention-item ${i === mentionIndex ? "claude-chat-mention-item-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(file);
                  }}
                  onMouseEnter={() => setMentionIndex(i)}
                >
                  <span className="claude-chat-mention-icon">
                    <FileText size={16} />
                  </span>
                  <div className="claude-chat-mention-text">
                    <span className="claude-chat-mention-name">
                      {file.basename}
                    </span>
                    <span className="claude-chat-mention-path">
                      {file.path}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="claude-chat-input-textarea"
            placeholder="Message Claude... (@ to mention a note)"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            aria-label="Chat message input"
          />
        </div>

        {isStreaming ? (
          <button
            className="claude-chat-btn claude-chat-btn-cancel"
            onClick={onCancel}
            aria-label="Stop generation"
            title="Stop"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            className="claude-chat-btn claude-chat-btn-send"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            aria-label="Send message"
            title="Send"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
