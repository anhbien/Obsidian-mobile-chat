import {
  ChartBar,
  ListChecks,
  MessageSquare,
  Pencil,
  Search,
  type LucideIcon,
} from "lucide-react";

interface Props {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS: { icon: LucideIcon; text: string }[] = [
  { icon: ListChecks, text: "Summarize my recent notes" },
  { icon: Search, text: "Find TODOs across my vault" },
  { icon: ChartBar, text: "Give me a vault health report" },
  { icon: Pencil, text: "What did I work on today?" },
];

export function EmptyState({ onSuggestion }: Props) {
  return (
    <div className="claude-chat-empty">
      <div className="claude-chat-empty-icon">
        <MessageSquare size={40} />
      </div>
      <h3 className="claude-chat-empty-title">Claude Chat</h3>
      <p className="claude-chat-empty-subtitle">
        Ask me anything about your vault
      </p>

      <div className="claude-chat-suggestions">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.text}
              className="claude-chat-suggestion"
              onClick={() => onSuggestion(s.text)}
            >
              <span className="claude-chat-suggestion-emoji">
                <Icon size={16} />
              </span>
              <span>{s.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
