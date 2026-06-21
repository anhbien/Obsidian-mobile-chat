import { Menu, Plus } from "lucide-react";
import { getCachedModels, type ModelInfo } from "../../api/models";

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
  const models = getCachedModels();
  // Keep the active model selectable even if it's not in the fetched list.
  const options: ModelInfo[] = models.some((m) => m.id === model)
    ? models
    : [{ id: model, name: model, contextWindow: 0, maxOutput: 0 }, ...models];

  return (
    <div className="claude-chat-header">
      <button
        className="claude-chat-header-btn"
        onClick={onToggleHistory}
        aria-label="Chat history"
        title="Chat history"
      >
        <Menu size={18} />
      </button>

      <select
        className="claude-chat-model-select"
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        aria-label="Select model"
      >
        {options.map((m) => (
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
        <Plus size={18} />
      </button>
    </div>
  );
}
