import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowUp, FileText, Paperclip, Plus, Square, X } from "lucide-react";
import { usePlugin } from "../context/PluginContext";

interface FileAttachment {
  path: string;
  basename: string;
}

export interface UploadedFile {
  name: string;
  content: string;
}

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_UPLOAD_EXTENSIONS = [".txt", ".md"];

interface Props {
  onSend: (
    text: string,
    attachedFiles?: FileAttachment[],
    uploadedFiles?: UploadedFile[]
  ) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export function InputBar({ onSend, onCancel, isStreaming, disabled }: Props) {
  const plugin = usePlugin();
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-dismiss upload errors
  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(null), 5000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(
      trimmed,
      attachedFiles.length > 0 ? attachedFiles : undefined,
      uploadedFiles.length > 0 ? uploadedFiles : undefined
    );
    setText("");
    setAttachedFiles([]);
    setUploadedFiles([]);
    setMentionQuery(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, isStreaming, disabled, onSend, attachedFiles, uploadedFiles]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (files.length === 0) return;

      const errors: string[] = [];
      const accepted: UploadedFile[] = [];

      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isAllowedType = ALLOWED_UPLOAD_EXTENSIONS.some((ext) =>
          lowerName.endsWith(ext)
        );
        if (!isAllowedType) {
          errors.push(`${file.name}: only .txt and .md files are supported`);
          continue;
        }
        if (file.size > MAX_UPLOAD_SIZE) {
          errors.push(`${file.name}: file exceeds the 2MB size limit`);
          continue;
        }
        try {
          const content = await file.text();
          accepted.push({ name: file.name, content });
        } catch {
          errors.push(`${file.name}: could not read file`);
        }
      }

      if (accepted.length > 0) {
        setUploadedFiles((prev) => [
          ...prev.filter((f) => !accepted.some((a) => a.name === f.name)),
          ...accepted,
        ]);
      }
      setUploadError(errors.length > 0 ? errors.join("; ") : null);
    },
    []
  );

  const removeUploadedFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name));
  };

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
      {uploadError && <div className="claude-chat-upload-error">{uploadError}</div>}

      <div className="claude-chat-input-bar">
        {/* Attached files (rendered inside the pill, above the input row) */}
        {(attachedFiles.length > 0 || uploadedFiles.length > 0) && (
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
            {uploadedFiles.map((f) => (
              <span key={f.name} className="claude-chat-attachment-chip">
                <Paperclip size={14} /> {f.name}
                <button
                  className="claude-chat-attachment-remove"
                  onClick={() => removeUploadedFile(f.name)}
                  aria-label={`Remove ${f.name}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="claude-chat-input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
            aria-hidden="true"
          />
          <button
            className="claude-chat-btn claude-chat-btn-upload"
            onClick={handleUploadClick}
            disabled={disabled}
            aria-label="Attach a .txt or .md file"
            title="Attach file (.txt, .md, max 2MB)"
          >
            <Plus size={20} />
          </button>

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
    </div>
  );
}
