import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import type { ToolCallInfo } from "../../types";

interface Props {
  toolCall: ToolCallInfo;
}

const STATUS_ICONS: Record<string, LucideIcon> = {
  pending: Clock,
  running: LoaderCircle,
  complete: CircleCheck,
  error: CircleX,
};

export function ToolCallDisplay({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);

  const Icon = STATUS_ICONS[toolCall.status] ?? Clock;
  const inputSummary = Object.entries(toolCall.input)
    .map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}: ${val.length > 40 ? val.slice(0, 40) + "…" : val}`;
    })
    .join(", ");

  return (
    <div
      className={`claude-chat-tool-call claude-chat-tool-call-${toolCall.status}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="claude-chat-tool-call-header">
        <span className="claude-chat-tool-call-icon">
          <Icon size={16} />
        </span>
        <span className="claude-chat-tool-call-name">{toolCall.name}</span>
        <span className="claude-chat-tool-call-chevron">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </div>

      {!expanded && inputSummary && (
        <div className="claude-chat-tool-call-summary">{inputSummary}</div>
      )}

      {expanded && (
        <div className="claude-chat-tool-call-details">
          <div className="claude-chat-tool-call-section">
            <strong>Input:</strong>
            <pre>{JSON.stringify(toolCall.input, null, 2)}</pre>
          </div>

          {toolCall.result && (
            <div className="claude-chat-tool-call-section">
              <strong>Result:</strong>
              <pre>{toolCall.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
