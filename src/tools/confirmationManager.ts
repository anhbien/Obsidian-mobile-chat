import type { ConfirmationRequest } from "../types";

type ConfirmationListener = (request: ConfirmationRequest) => void;

/**
 * Manages confirmation prompts for vault write operations.
 * Emits events that the React UI listens to for rendering inline approval cards.
 */
export class ConfirmationManager {
  private listener: ConfirmationListener | null = null;
  private _confirmBeforeWrite = true;

  get confirmBeforeWrite(): boolean {
    return this._confirmBeforeWrite;
  }

  set confirmBeforeWrite(value: boolean) {
    this._confirmBeforeWrite = value;
  }

  onConfirmationRequest(listener: ConfirmationListener): void {
    this.listener = listener;
  }

  removeListener(): void {
    this.listener = null;
  }

  /**
   * Request confirmation for a write operation.
   * Returns a promise that resolves to true (approved) or false (rejected).
   * If confirmBeforeWrite is disabled, auto-approves immediately.
   */
  async requestConfirmation(
    toolCallId: string,
    toolName: string,
    description: string,
    details: ConfirmationRequest["details"]
  ): Promise<boolean> {
    if (!this._confirmBeforeWrite) return true;

    return new Promise<boolean>((resolve) => {
      const request: ConfirmationRequest = {
        toolCallId,
        toolName,
        description,
        details,
        resolve,
      };

      if (this.listener) {
        this.listener(request);
      } else {
        // No UI listener, auto-approve
        resolve(true);
      }
    });
  }
}
