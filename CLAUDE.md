# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

An Obsidian plugin ("Claude Chat") that embeds a chat UI for Claude inside Obsidian, with tool-calling access to the user's vault (read/write/search/patch notes, frontmatter, tags, backlinks, vault structure/health). Targets both desktop and mobile.

## Commands

- `yarn dev` — esbuild in watch mode, emits `main.js` with inline sourcemaps.
- `yarn build` — type-checks (`tsc -noEmit`) then produces a minified production `main.js`.

There is no test suite or linter configured in this repo.

## Architecture

- `src/main.ts` — Plugin entry point. Registers the chat view, ribbon icon, commands, and settings tab.
- `src/api/` — Anthropic API client (`claudeClient.ts`), SSE stream parsing (`streamParser.ts`), and model list/pricing metadata (`models.ts`, fetched from the Models API with a static fallback).
- `src/conversation/` — Conversation state management (`conversationManager.ts`), persistence to vault files (`chatPersistence.ts`), and context-window trimming strategy (`contextStrategy.ts`).
- `src/tools/` — Vault tool definitions (`toolDefinitions.ts`, the Anthropic tool-use schemas) and per-domain executors: `vaultRead`, `vaultWrite`, `vaultSearch`, `vaultMetadata`, `vaultStructure`, `vaultNavigation`, `vaultDaily`, `vaultHealth`, `vaultIntelligence`. `toolExecutor.ts` dispatches by tool name; `confirmationManager.ts` gates write tools behind user confirmation when enabled.
- `src/settings/` — `PluginSettings` shape and defaults (`settings.ts`), settings tab UI (`settingsTab.ts`).
- `src/ui/` — React chat UI: `ChatApp.tsx` is the root, `components/` holds presentational pieces (message list/bubble, input bar, tool-call display, confirmation card), `hooks/` holds `useChat` and `useConversations`, `context/PluginContext.tsx` threads the plugin instance through.
- `src/views/chatView.ts` — Obsidian `ItemView` that mounts the React app into a workspace leaf.
- Build output (`main.js`) is bundled via esbuild (`esbuild.config.mjs`) targeting CommonJS/es2021, with `obsidian`, `electron`, and CodeMirror/Lezer packages marked external (provided by the Obsidian runtime).

## Conventions

- Tool definitions live in `toolDefinitions.ts` as Anthropic `input_schema` JSON; the `WRITE_TOOLS` set there determines which tool calls require write confirmation.
- All vault paths used by tools are vault-relative, not filesystem-absolute.
- The default system prompt (`constants.ts`) instructs Claude to read an in-vault `CLAUDE.md` if present — that is a *user vault* file, unrelated to this repo's own CLAUDE.md.
- Model IDs in `api/models.ts` use bare aliases (e.g. `claude-sonnet-4-6`), never date-suffixed snapshots, so the Models API resolves them to the current version.
