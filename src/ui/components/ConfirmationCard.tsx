import { Check, Lock, X } from "lucide-react";
import type { ConfirmationRequest } from "../../types";

interface Props {
  request: ConfirmationRequest;
  onConfirm: () => void;
  onReject: () => void;
}

export function ConfirmationCard({ request, onConfirm, onReject }: Props) {
  return (
    <div className="claude-chat-confirmation">
      <div className="claude-chat-confirmation-header">
        <span className="claude-chat-confirmation-icon">
          <Lock size={16} />
        </span>
        <span>{request.description}</span>
      </div>

      {request.details.path && (
        <div className="claude-chat-confirmation-detail">
          <strong>File:</strong> {request.details.path}
        </div>
      )}

      {request.details.content && (
        <div className="claude-chat-confirmation-detail">
          <strong>Content preview:</strong>
          <pre>
            {request.details.content.slice(0, 200)}
            {request.details.content.length > 200 ? "…" : ""}
          </pre>
        </div>
      )}

      <div className="claude-chat-confirmation-actions">
        <button
          className="claude-chat-btn claude-chat-btn-approve"
          onClick={onConfirm}
        >
          <Check size={16} /> Approve
        </button>
        <button
          className="claude-chat-btn claude-chat-btn-reject"
          onClick={onReject}
        >
          <X size={16} /> Reject
        </button>
      </div>
    </div>
  );
}
