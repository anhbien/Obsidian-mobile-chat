# Claude Chat for Obsidian

An [Obsidian](https://obsidian.md) plugin that adds a mobile-first chat panel for talking to Claude, with full agentic access to your vault — search, read, write, and reorganize notes from the conversation.

## Features

- **Chat panel or tab** — open as a sidebar panel or a full tab; works on desktop and mobile.
- **Vault-aware tools** — Claude can read, search, create, append, and surgically patch notes, manage frontmatter, navigate folders, and inspect tags/backlinks.
- **Vault intelligence** — find orphan notes, broken links, related notes, and a vault health/stats dashboard.
- **Daily notes** — fetch or create today's daily note.
- **Write confirmation** — optional confirmation prompt before any tool modifies the vault.
- **Model picker** — fetches the live model list from the Anthropic Models API (with a static fallback for offline use), with per-model context/pricing info.
- **Prompt caching & token usage** — optional prompt caching and token usage display.
- **Custom system prompt** — editable system prompt, with support for an in-vault `CLAUDE.md` for vault-specific instructions.

## Installation (development)

This plugin is not yet on the community plugin store. To run it locally:

1. Clone this repo into your vault's `.obsidian/plugins/` directory (or symlink it there).
2. Install dependencies:
   ```bash
   yarn install   # or npm install
   ```
3. Build:
   ```bash
   yarn dev     # watches and rebuilds main.js on change
   yarn build   # one-off production build (type-checks first)
   ```
4. In Obsidian, enable "Claude Chat" under Settings → Community plugins.

## Setup

Open Settings → Claude Chat and enter your Anthropic API key. From there you can choose a model, adjust max tokens/temperature, edit the system prompt, and toggle write confirmation, prompt caching, and token usage display.

## Usage

- Click the chat-bubble ribbon icon, or run **Open chat panel** / **Open chat in new tab** from the command palette.
- Run **Chat about current note** to open the chat with the active note in context.
- Ask Claude to find, summarize, create, or edit notes — it will call the appropriate vault tool and (depending on settings) ask for confirmation before writing.

## Project structure

```
src/
  main.ts                 Plugin entry point — commands, ribbon icon, view registration
  constants.ts            View type id, default chat folder, default system prompt
  api/                     Anthropic API client, streaming parser, model list/pricing
  conversation/            Chat persistence, conversation manager, context strategy
  settings/                Plugin settings + settings tab UI
  tools/                   Vault tool definitions and executors (read/write/search/metadata/...)
  ui/                      React chat UI (components, hooks, context)
  views/                   Obsidian ItemView wrapper for the chat panel
```

## Tech stack

TypeScript, React, esbuild, and the [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin).
