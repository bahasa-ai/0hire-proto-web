# Phase 6: Chat History Sidebar

## Goal

Replace placeholder sidebar history items with real per-agent conversation history — users can start multiple conversations per agent, switch between them, and see a scrollable history list derived from actual messages.

## Current State

- `agent-channel-item.tsx` has a hardcoded `historyItems` array (5 generic strings) that renders when the agent is active
- `workspace-context.tsx` stores messages as `Record<string, ChatMessage[]>` — a single flat conversation per agent
- No concept of multiple conversations/threads per agent
- History item UI (expand/collapse, scroll area, rename/delete dropdown) is already built

## Key Work

1. **Multi-conversation state** — restructure `WorkspaceState` from flat per-agent messages to per-agent, per-conversation messages (`Record<string, Record<string, ChatMessage[]>>`) with active conversation tracking
2. **Conversation management** — create new conversations, switch active conversation, derive title from first user message
3. **Wire sidebar history** — replace hardcoded `historyItems` with real conversation list from state, pass click handler to switch conversations
4. **"New chat" affordance** — button or action to start a fresh conversation for an agent
5. **Rename/delete conversations** — wire the existing dropdown menu items to dispatch actions

## Depends On

Phase 5 (all prior phases complete)

## Requirements Addressed

- Conversation history visibility in sidebar
- Multi-conversation support per agent channel
- Conversation switching without losing context
