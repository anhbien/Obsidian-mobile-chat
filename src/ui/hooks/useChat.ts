import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatMessage, ConfirmationRequest, TokenUsage } from "../../types";
import type {
  ConversationEvent,
  ConversationManager,
} from "../../conversation/conversationManager";

export interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  pendingConfirmation: ConfirmationRequest | null;
  totalUsage: TokenUsage;
  sendMessage: (text: string, displayText?: string) => Promise<void>;
  cancelGeneration: () => void;
  newChat: () => void;
  confirmAction: (confirmed: boolean) => void;
  loadConversation: (filePath: string) => Promise<void>;
}

export function useChat(conversationManager: ConversationManager): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ConfirmationRequest | null>(null);
  const [totalUsage, setTotalUsage] = useState<TokenUsage>({
    input_tokens: 0,
    output_tokens: 0,
  });

  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    const handler = (event: ConversationEvent) => {
      switch (event.type) {
        case "message_added":
        case "message_updated":
          setMessages(conversationManager.getMessages());
          break;
        case "streaming_start":
          setIsStreaming(true);
          setError(null);
          break;
        case "streaming_end":
          setIsStreaming(false);
          if (event.usage) setTotalUsage({ ...event.usage });
          break;
        case "confirmation_request":
          if (event.confirmation) {
            confirmResolverRef.current = event.confirmation.resolve;
            setPendingConfirmation(event.confirmation);
          }
          break;
        case "conversation_loaded":
          setMessages(conversationManager.getMessages());
          setError(null);
          setIsStreaming(false);
          setTotalUsage({ ...conversationManager.totalUsage });
          break;
        case "error":
          setError(event.error ?? "Unknown error");
          break;
      }
    };

    conversationManager.addEventListener(handler);

    // Set up confirmation listener
    conversationManager.confirmationManager.onConfirmationRequest(
      (request) => {
        confirmResolverRef.current = request.resolve;
        setPendingConfirmation(request);
        conversationManager.addEventListener(handler);
      }
    );

    // Initialize with existing messages
    setMessages(conversationManager.getMessages());

    return () => {
      conversationManager.removeEventListener(handler);
      conversationManager.confirmationManager.removeListener();
    };
  }, [conversationManager]);

  const sendMessage = useCallback(
    async (text: string, displayText?: string) => {
      setError(null);
      await conversationManager.sendMessage(text, displayText);
    },
    [conversationManager]
  );

  const cancelGeneration = useCallback(() => {
    conversationManager.cancelGeneration();
  }, [conversationManager]);

  const newChat = useCallback(() => {
    conversationManager.reset();
    setMessages([]);
    setError(null);
    setTotalUsage({ input_tokens: 0, output_tokens: 0 });
  }, [conversationManager]);

  const confirmAction = useCallback((confirmed: boolean) => {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
    setPendingConfirmation(null);
  }, []);

  const loadConversation = useCallback(
    async (filePath: string) => {
      setError(null);
      await conversationManager.loadConversation(filePath);
    },
    [conversationManager]
  );

  return {
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
  };
}
