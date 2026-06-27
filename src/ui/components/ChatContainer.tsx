import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { ConversationManager } from "../../conversation/conversationManager";
import { useChat } from "../hooks/useChat";
import { usePlugin } from "../context/PluginContext";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { EmptyState } from "./EmptyState";
import { ChatHistory } from "./ChatHistory";
import { ConfirmationCard } from "./ConfirmationCard";

interface FileAttachment {
  path: string;
  basename: string;
}

interface UploadedFile {
  name: string;
  content: string;
}

interface Props {
  conversationManager: ConversationManager;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export function ChatContainer({ conversationManager }: Props) {
  const plugin = usePlugin();
  const {
    messages,
    isStreaming,
    error,
    pendingConfirmation,
    totalUsage,
    sendMessage,
    cancelGeneration,
    newChat,
    confirmAction,
    loadConversation,
  } = useChat(conversationManager);

  const [showHistory, setShowHistory] = useState(false);

  const handleSend = async (
    text: string,
    attachedFiles?: FileAttachment[],
    uploadedFiles?: UploadedFile[]
  ) => {
    // If files are attached/uploaded, prepend their content for Claude but display only user text
    const contextBlocks: string[] = [];

    if (attachedFiles && attachedFiles.length > 0) {
      for (const f of attachedFiles) {
        const file = plugin.app.vault.getFileByPath(f.path);
        if (file) {
          const content = await plugin.app.vault.cachedRead(file);
          contextBlocks.push(
            `<attached_note path="${f.path}">\n${content}\n</attached_note>`
          );
        }
      }
    }

    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const f of uploadedFiles) {
        contextBlocks.push(`[File: ${f.name}]\n${f.content}\n`);
      }
    }

    if (contextBlocks.length > 0) {
      const apiText = `${contextBlocks.join("\n\n")}\n\n${text}`;
      await sendMessage(apiText, text);
    } else {
      await sendMessage(text);
    }
  };

  const handleSuggestion = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div className="claude-chat-root">
      <ChatHeader
        model={conversationManager.model}
        onModelChange={(model) => {
          conversationManager.model = model;
        }}
        onNewChat={newChat}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      {showHistory && (
        <ChatHistory
          onSelectChat={(filePath) => {
            loadConversation(filePath);
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div className="claude-chat-body">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={handleSuggestion} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      {pendingConfirmation && (
        <ConfirmationCard
          request={pendingConfirmation}
          onConfirm={() => confirmAction(true)}
          onReject={() => confirmAction(false)}
        />
      )}

      {error && (
        <div className="claude-chat-error">
          <span className="claude-chat-error-icon">
            <TriangleAlert size={16} />
          </span>
          {error}
        </div>
      )}

      <InputBar
        onSend={handleSend}
        onCancel={cancelGeneration}
        isStreaming={isStreaming}
        disabled={!!pendingConfirmation}
      />

      {plugin.settings.showTokenUsage &&
        (totalUsage.input_tokens > 0 || totalUsage.output_tokens > 0) && (
          <div className="claude-chat-token-footer">
            {formatTokens(totalUsage.input_tokens + totalUsage.output_tokens)} tks
          </div>
        )}
    </div>
  );
}
