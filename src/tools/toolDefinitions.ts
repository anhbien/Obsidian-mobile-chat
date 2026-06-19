import type { ToolDefinition } from "../types";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── Read ───────────────────────────────────────────────────────────────
  {
    name: "read_note",
    description:
      "Read a note by its vault-relative path (e.g. 'Daily Notes/2026-05-03.md'). Falls back to fuzzy filename match if exact path not found.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative path or partial filename",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "find_note",
    description:
      "Fuzzy search for notes by filename. Returns all matching vault-relative paths.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Partial filename to search for",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_current_note",
    description:
      "Get the currently active note's path and content. Returns the note the user is currently viewing in the editor.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── Write ──────────────────────────────────────────────────────────────
  {
    name: "write_note",
    description:
      "Create or overwrite a note. Requires overwrite=true to replace an existing file.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative path, e.g. 'Daily Notes/2026-05-03.md'",
        },
        content: { type: "string", description: "Full note content" },
        overwrite: {
          type: "boolean",
          description: "Pass true to overwrite an existing note",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "append_to_note",
    description: "Append content to the end of an existing note.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Vault-relative path" },
        content: { type: "string", description: "Content to append" },
      },
      required: ["path", "content"],
    },
  },

  // ── Search ─────────────────────────────────────────────────────────────
  {
    name: "search_vault",
    description:
      "Full-text search across all notes. Returns file path, line number, and matching excerpt.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        max_results: {
          type: "number",
          description: "Max results to return (default: 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_folder",
    description:
      "List files and folders at a vault path. Use empty string for vault root.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Vault-relative folder path, or empty string for root",
        },
      },
      required: [],
    },
  },

  // ── Daily ──────────────────────────────────────────────────────────────
  {
    name: "daily_note",
    description:
      "Get today's daily note (YYYY-MM-DD.md). Returns content if it exists, or creates it from the template.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── Metadata (direct via metadataCache) ────────────────────────────────
  {
    name: "get_backlinks",
    description:
      "Get all notes that link to a given note. Uses Obsidian's metadata cache for accurate results.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative path, e.g. 'Projects/MyProject.md'",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "get_tags",
    description:
      "Get all tags (frontmatter + inline) for a note.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Vault-relative path" },
      },
      required: ["path"],
    },
  },
  {
    name: "get_metadata",
    description:
      "Get frontmatter metadata for a note.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Vault-relative path" },
      },
      required: ["path"],
    },
  },

  // ── Structure ──────────────────────────────────────────────────────────
  {
    name: "get_vault_tree",
    description:
      "Get the full recursive folder structure of the vault with note counts per folder. Use this at the start of a session to orient to the vault layout.",
    input_schema: {
      type: "object",
      properties: {
        depth: {
          type: "number",
          description: "Max folder depth to expand (default: 4)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_recent_notes",
    description:
      "Get the N most recently modified notes with timestamps. Use this to see what's been actively worked on.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of notes to return (default: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_all_tags",
    description:
      "Get all tags used across the vault with occurrence counts, sorted by frequency.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── Intelligence ───────────────────────────────────────────────────────
  {
    name: "find_orphan_notes",
    description:
      "Find notes with no incoming wiki links. Useful for surfacing forgotten knowledge. Optionally filter by folder prefix.",
    input_schema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          description: "Optional folder prefix to limit scope",
        },
      },
      required: [],
    },
  },
  {
    name: "find_broken_links",
    description:
      "Find all [[wiki links]] that point to notes that don't exist. Returns source note and the broken link target.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "related_notes",
    description:
      "Find notes related to a given note by shared tags, outgoing links, backlinks, or same folder. Results ranked by connection strength.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative path of the source note",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 15)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_by_tag",
    description:
      "Find all notes that contain a specific tag (frontmatter or inline). Partial tag match supported.",
    input_schema: {
      type: "object",
      properties: {
        tag: {
          type: "string",
          description: "Tag to search for, with or without the # prefix",
        },
      },
      required: ["tag"],
    },
  },
  {
    name: "vault_stats",
    description:
      "Vault health dashboard — total notes, notes by folder, orphan count, broken link count, most-linked notes, and notes modified in the last 7 days.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── Automator ──────────────────────────────────────────────────────────
  {
    name: "patch_note",
    description:
      "Surgical edits to a note without rewriting the whole file. Supports: replace (find & replace text), append_to_section (add content after a heading), prepend_to_section (insert right after a heading), replace_section (swap out a full section body).",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative path or partial filename",
        },
        operation: {
          type: "string",
          description:
            "replace | append_to_section | prepend_to_section | replace_section",
        },
        old_text: {
          type: "string",
          description: "Text to find (required for replace)",
        },
        new_text: {
          type: "string",
          description: "Replacement text (required for replace)",
        },
        replace_all: {
          type: "boolean",
          description:
            "Pass true to replace every occurrence (replace only)",
        },
        section: {
          type: "string",
          description:
            "Heading text to target, e.g. '## Tasks' or just 'Tasks' (required for section ops)",
        },
        content: {
          type: "string",
          description:
            "Content to insert or use as section body (required for section ops)",
        },
      },
      required: ["path", "operation"],
    },
  },
  {
    name: "upsert_frontmatter",
    description:
      "Add, update, or delete YAML frontmatter fields without touching the note body. Pass updates as a JSON object. Set a value to null to delete that key.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative path or partial filename",
        },
        updates: {
          type: "object",
          description:
            'Key-value pairs, e.g. {"status":"Active","tags":["work"]}. Set value to null to delete.',
        },
      },
      required: ["path", "updates"],
    },
  },

  // ── Navigation ─────────────────────────────────────────────────────────
  {
    name: "open_note",
    description:
      "Open a note in the Obsidian editor. Use this when the user asks to navigate to or open a specific note.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Vault-relative path" },
      },
      required: ["path"],
    },
  },
  {
    name: "create_folder",
    description: "Create a new folder in the vault.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Vault-relative folder path to create",
        },
      },
      required: ["path"],
    },
  },

  // ── Health ─────────────────────────────────────────────────────────────
  {
    name: "health_check",
    description:
      "Quick vault health check. Returns note count, last modified file, and whether today's daily note exists.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

/** Tools that modify the vault and may require confirmation */
export const WRITE_TOOLS = new Set([
  "write_note",
  "append_to_note",
  "patch_note",
  "upsert_frontmatter",
  "create_folder",
]);
