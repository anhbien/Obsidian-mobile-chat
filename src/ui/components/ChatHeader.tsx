import { CLAUDE_MODELS } from "../../api/models";

interface Props {
  model: string;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
  onToggleHistory: () => void;
}

export function ChatHeader({
  model,
  onModelChange,
  onNewChat,
  onToggleHistory,
}: Props) {
  return (
    <div className="claude-chat-header">
      <button
        className="claude-chat-header-btn"
        onClick={onToggleHistory}
        aria-label="Chat history"
        title="Chat history"
      >
        ☰
      </button>

      <select
        className="claude-chat-model-select"
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        aria-label="Select model"
      >
        {CLAUDE_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <button
        className="claude-chat-header-btn"
        onClick={onNewChat}
        aria-label="New chat"
        title="New chat"
      >
        ＋
      </button>
    </div>
  );
}
