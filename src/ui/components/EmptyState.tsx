interface Props {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  { emoji: "📋", text: "Summarize my recent notes" },
  { emoji: "🔍", text: "Find TODOs across my vault" },
  { emoji: "📊", text: "Give me a vault health report" },
  { emoji: "📝", text: "What did I work on today?" },
];

export function EmptyState({ onSuggestion }: Props) {
  return (
    <div className="claude-chat-empty">
      <div className="claude-chat-empty-icon">💬</div>
      <h3 className="claude-chat-empty-title">Claude Chat</h3>
      <p className="claude-chat-empty-subtitle">
        Ask me anything about your vault
      </p>

      <div className="claude-chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            className="claude-chat-suggestion"
            onClick={() => onSuggestion(s.text)}
          >
            <span className="claude-chat-suggestion-emoji">{s.emoji}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
