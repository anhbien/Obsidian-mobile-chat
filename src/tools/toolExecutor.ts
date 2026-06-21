import { App } from "obsidian";
import type { ToolUseBlock } from "../types";
import { WRITE_TOOLS } from "./toolDefinitions";
import { ConfirmationManager } from "./confirmationManager";
import { handleReadNote, handleFindNote, handleGetCurrentNote } from "./vaultRead";
import {
  handleWriteNote,
  handleAppendToNote,
  handleMoveNote,
  handleDeleteNote,
  handleDeleteFolder,
} from "./vaultWrite";
import { handleSearchVault, handleListFolder } from "./vaultSearch";
import { handleGetBacklinks, handleGetTags, handleGetMetadata } from "./vaultMetadata";
import {
  handleGetVaultTree,
  handleGetRecentNotes,
  handleGetAllTags,
} from "./vaultStructure";
import {
  handleFindOrphanNotes,
  handleFindBrokenLinks,
  handleRelatedNotes,
  handleSearchByTag,
  handleVaultStats,
} from "./vaultIntelligence";
import { handlePatchNote, handleUpsertFrontmatter } from "./vaultAutomator";
import { handleDailyNote } from "./vaultDaily";
import { handleHealthCheck } from "./vaultHealth";
import { handleOpenNote, handleCreateFolder } from "./vaultNavigation";

type ToolHandler = (
  app: App,
  args: Record<string, unknown>
) => Promise<string>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  read_note: handleReadNote,
  find_note: handleFindNote,
  get_current_note: handleGetCurrentNote,
  write_note: handleWriteNote,
  append_to_note: handleAppendToNote,
  move_note: handleMoveNote,
  delete_note: handleDeleteNote,
  delete_folder: handleDeleteFolder,
  search_vault: handleSearchVault,
  list_folder: handleListFolder,
  daily_note: handleDailyNote,
  get_backlinks: handleGetBacklinks,
  get_tags: handleGetTags,
  get_metadata: handleGetMetadata,
  get_vault_tree: handleGetVaultTree,
  get_recent_notes: handleGetRecentNotes,
  get_all_tags: handleGetAllTags,
  find_orphan_notes: handleFindOrphanNotes,
  find_broken_links: handleFindBrokenLinks,
  related_notes: handleRelatedNotes,
  search_by_tag: handleSearchByTag,
  vault_stats: handleVaultStats,
  patch_note: handlePatchNote,
  upsert_frontmatter: handleUpsertFrontmatter,
  open_note: handleOpenNote,
  create_folder: handleCreateFolder,
  health_check: handleHealthCheck,
};

/** Friendly descriptions for write operations */
function describeWriteOp(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "write_note":
      return input.overwrite
        ? `Overwrite note "${input.path}"`
        : `Create note "${input.path}"`;
    case "append_to_note":
      return `Append to "${input.path}"`;
    case "patch_note":
      return `Edit "${input.path}" (${input.operation})`;
    case "upsert_frontmatter":
      return `Update frontmatter in "${input.path}"`;
    case "create_folder":
      return `Create folder "${input.path}"`;
    case "move_note":
      return `Move "${input.path}" to "${input.new_path}"`;
    case "delete_note":
      return `Delete note "${input.path}"`;
    case "delete_folder":
      return `Delete folder "${input.path}"${input.recursive ? " and all its contents" : ""}`;
    default:
      return `${name} on "${input.path}"`;
  }
}

/**
 * Execute a single tool call, handling confirmation for write operations.
 */
export async function executeTool(
  app: App,
  toolUse: ToolUseBlock,
  confirmationManager: ConfirmationManager
): Promise<{ content: string; isError: boolean }> {
  const handler = TOOL_HANDLERS[toolUse.name];
  if (!handler) {
    return {
      content: `Error: unknown tool "${toolUse.name}"`,
      isError: true,
    };
  }

  // Check if this is a write operation requiring confirmation
  if (WRITE_TOOLS.has(toolUse.name)) {
    const description = describeWriteOp(toolUse.name, toolUse.input);
    const confirmed = await confirmationManager.requestConfirmation(
      toolUse.id,
      toolUse.name,
      description,
      {
        path: toolUse.input.path as string,
        content: (toolUse.input.content as string) ?? undefined,
        operation: (toolUse.input.operation as string) ?? undefined,
      }
    );

    if (!confirmed) {
      return {
        content: `User declined: ${description}. Ask the user what they'd like to do instead.`,
        isError: true,
      };
    }
  }

  try {
    const result = await handler(app, toolUse.input);
    return { content: result, isError: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: `Error executing ${toolUse.name}: ${message}`,
      isError: true,
    };
  }
}

/**
 * Execute multiple tool calls in parallel.
 */
export async function executeTools(
  app: App,
  toolUses: ToolUseBlock[],
  confirmationManager: ConfirmationManager
): Promise<Array<{ toolUseId: string; content: string; isError: boolean }>> {
  const results = await Promise.all(
    toolUses.map(async (toolUse) => {
      const { content, isError } = await executeTool(
        app,
        toolUse,
        confirmationManager
      );
      return { toolUseId: toolUse.id, content, isError };
    })
  );
  return results;
}
