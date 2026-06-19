import { useConversations } from "../hooks/useConversations";

interface Props {
  onSelectChat: (filePath: string) => void;
  onClose: () => void;
}

export function ChatHistory({ onSelectChat, onClose }: Props) {
  const { conversations, loading, remove } = useConversations();

  const groupByDate = (
    chats: typeof conversations
  ): Record<string, typeof conversations> => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const groups: Record<string, typeof conversations> = {
      Today: [],
      Yesterday: [],
      "Last 7 Days": [],
      Older: [],
    };

    for (const chat of chats) {
      const age = now - chat.updated;
      if (age < day) groups["Today"].push(chat);
      else if (age < 2 * day) groups["Yesterday"].push(chat);
      else if (age < 7 * day) groups["Last 7 Days"].push(chat);
      else groups["Older"].push(chat);
    }

    return groups;
  };

  const grouped = groupByDate(conversations);

  return (
    <div className="claude-chat-history">
      <div className="claude-chat-history-header">
        <span>Chat History</span>
        <button
          className="claude-chat-header-btn"
          onClick={onClose}
          aria-label="Close history"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="claude-chat-history-loading">Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="claude-chat-history-empty">No saved chats yet</div>
      ) : (
        <div className="claude-chat-history-list">
          {Object.entries(grouped).map(
            ([group, chats]) =>
              chats.length > 0 && (
                <div key={group} className="claude-chat-history-group">
                  <div className="claude-chat-history-group-label">
                    {group}
                  </div>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="claude-chat-history-item"
                      onClick={() =>
                        chat.filePath && onSelectChat(chat.filePath)
                      }
                    >
                      <div className="claude-chat-history-item-title">
                        {chat.title}
                      </div>
                      <div className="claude-chat-history-item-meta">
                        {new Date(chat.updated).toLocaleDateString()}
                      </div>
                      <button
                        className="claude-chat-history-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (chat.filePath) remove(chat.filePath);
                        }}
                        aria-label="Delete chat"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
