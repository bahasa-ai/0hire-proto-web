# Plan 01: Multi-Conversation State + Sidebar Wiring

## Goal

Replace the single-conversation-per-agent model with multi-conversation support. Wire the sidebar history to real conversation data. Enable creating, switching, renaming, and deleting conversations.

---

## Tasks

### Task 1: Restructure `WorkspaceState` for multi-conversation support

**File:** `src/components/workspace/workspace-context.tsx`

**Current state:** `messages: Record<string, ChatMessage[]>` — one flat array per agent.

**Target state:**

```ts
interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

interface WorkspaceState {
  conversations: Record<string, Record<string, Conversation>>
  // agentId → conversationId → Conversation
  activeConversationId: Record<string, string | null>
  // agentId → active conversation id (null = no conversation yet)
}
```

**Changes:**

1. Add `Conversation` interface with `id`, `title`, `messages`, `createdAt`
2. Replace `messages: Record<string, ChatMessage[]>` with `conversations: Record<string, Record<string, Conversation>>` and `activeConversationId: Record<string, string | null>`
3. Add a `generateConversationId()` helper (same pattern as existing `makeMessage` — timestamp + random)
4. Add new reducer actions:
   - `CREATE_CONVERSATION` — creates a new empty conversation for an agent, sets it active
   - `SWITCH_CONVERSATION` — sets `activeConversationId[agentId]` to a given conversation id
   - `RENAME_CONVERSATION` — updates `title` on a conversation
   - `DELETE_CONVERSATION` — removes a conversation; if it was active, switches to the most recent remaining (or null)
5. Update ALL existing message-related actions (`APPEND_MESSAGE`, `START_STREAMING`, `APPEND_STREAM_CHUNK`, `FINISH_STREAMING`, `INTERRUPT_STREAMING`, `APPEND_THINKING_CHUNK`, `SET_FEEDBACK`) to operate on the active conversation's messages instead of the flat array. Each action should:
   - Resolve the active conversation id from `state.activeConversationId[agentId]`
   - If no active conversation exists, auto-create one on `APPEND_MESSAGE` (lazy creation — the first user message creates the conversation)
   - Update the `title` of a conversation to the first user message's content (truncated to 50 chars) on the first `APPEND_MESSAGE` if the title is still the default
6. Update helper functions `appendToChannel` and `updateInChannel` to navigate the new nested structure
7. Add a convenience selector: `getActiveMessages(state, agentId): ChatMessage[]` that returns the current conversation's messages (or `[]`)
8. Add a convenience selector: `getConversationList(state, agentId): Array<{ id: string; title: string; createdAt: number }>` that returns all conversations for an agent, sorted newest-first
9. Export `Conversation` type and both selector functions

**Verification:** TypeScript compiles. All existing `dispatch()` calls continue to work without changes (they still send the same action shapes — the reducer internals handle the new nesting).

---

### Task 2: Update `ChatView` to use multi-conversation state

**File:** `src/components/workspace/chat-view.tsx`

**Changes:**

1. Replace `const messages = state.messages[agent.id] ?? []` with `const messages = getActiveMessages(state, agent.id)` (import the new selector)
2. Replace `state.messages[agent.id]` references in `handleSend` and `handleRetry` with the same selector
3. Add a `useEffect` that watches `state.activeConversationId[agent.id]` — when it changes (conversation switch), reset `isWaitingForFirstToken` to `false`, call `abortCurrentStream()`, and clear `error`. This mirrors the existing agent-switch cleanup `useEffect` at line 130–134 but fires on conversation switch within the same agent
4. No other changes needed — all dispatch calls remain identical since the reducer handles routing to the active conversation internally

**Verification:** Chat behavior is unchanged — messages still appear, streaming works, retry works. The only difference is messages now live inside a `Conversation` object.

---

### Task 3: Wire sidebar history to real conversation data

**File:** `src/components/workspace/agent-channel-item.tsx`

**Changes:**

1. Import `useWorkspace` and `getConversationList` from `workspace-context`
2. Remove the hardcoded `historyItems` array
3. Get real conversations: `const conversations = getConversationList(state, agent.id)`
4. Add new props to `AgentChannelItemProps`:
   - `onNewChat: (agentId: string) => void`
   - `onSwitchConversation: (agentId: string, conversationId: string) => void`
5. Map over `conversations` instead of `historyItems` — each item shows `conversation.title` (or "New chat" if title is empty)
6. Wire the history item's `Button` `onClick` to call `onSwitchConversation(agent.id, conversation.id)`
7. Wire the "Rename" dropdown item to open an inline rename flow (see Task 5)
8. Wire the "Delete" dropdown item to dispatch `DELETE_CONVERSATION` (see Task 5)
9. If `conversations` is empty, show nothing (no placeholder text needed — the empty state is handled by `EmptyChat`)

**Verification:** Sidebar shows real conversation titles after the user starts chatting. New conversations appear at the top. Clicking a conversation switches the chat view.

---

### Task 4: Add "New Chat" affordance + conversation switching

**File:** `src/components/workspace/workspace-sidebar.tsx`, `src/components/workspace/workspace-layout.tsx`

**Changes to `workspace-layout.tsx`:**

1. Import `useWorkspace` and lift conversation management handlers:
   - `handleNewChat(agentId)` — dispatches `CREATE_CONVERSATION` for the given agent
   - `handleSwitchConversation(agentId, conversationId)` — dispatches `SWITCH_CONVERSATION`
2. Pass these as props through `WorkspaceSidebar` → `AgentChannelItem`

**Changes to `workspace-sidebar.tsx`:**

1. Add new props: `onNewChat: (agentId: string) => void`, `onSwitchConversation: (agentId: string, conversationId: string) => void`
2. Wire the existing `+` button next to the "Agents" label to call `onNewChat(activeId)` — this creates a new conversation for the currently selected agent. Update the button's `title` from "Add agent" to "New chat"
3. Pass `onNewChat` and `onSwitchConversation` down to each `AgentChannelItem`

**Verification:** Clicking `+` starts a new empty conversation. The chat area shows the empty state. Previous conversation remains in history. Clicking a history item loads that conversation's messages.

---

### Task 5: Rename and delete conversations

**Files:** `src/components/workspace/agent-channel-item.tsx`, `src/components/workspace/workspace-context.tsx`

**Rename flow:**

1. Add local state `editingId: string | null` and `editValue: string` to `AgentChannelItem`
2. When "Rename" is clicked from the dropdown, set `editingId` to that conversation's id and `editValue` to current title
3. Replace the conversation title `<span>` with a controlled `<input>` when `editingId` matches
4. On Enter or blur: dispatch `RENAME_CONVERSATION` with the new title, clear `editingId`
5. On Escape: cancel editing, clear `editingId`

**Delete flow:**

1. When "Delete" is clicked from the dropdown, dispatch `DELETE_CONVERSATION` with the conversation id
2. The reducer handles switching to the next most recent conversation (or `null` if none remain)
3. No confirmation dialog for MVP — keep it simple

**Verification:** Renaming updates the sidebar title immediately. Deleting removes the conversation and switches to the next one. Deleting the last conversation shows the empty state.

---

### Task 6: Handle agent switching + abort cleanup

**File:** `src/components/workspace/chat-view.tsx`

**Changes:**

1. The existing `useEffect` that runs on `agent.id` change already calls `abortCurrentStream()` — this continues to work correctly because the conversation state persists in context
2. Verify that switching agents while streaming aborts cleanly and the interrupted message stays in the correct conversation
3. No code changes expected — this is a verification task to confirm the existing abort logic works with the new state shape

**Verification:** Switch agents mid-stream → stream aborts, "interrupted" label shows on the correct message in the correct conversation. Switch back → previous conversation messages are intact.

---

## Execution Order

```
Task 1 (state restructure) → Task 2 (ChatView update) → Task 3 (sidebar wiring) → Task 4 (new chat + switching) → Task 5 (rename/delete) → Task 6 (verification)
```

Tasks 1–2 are the critical path. Task 3–5 can be done incrementally after the state layer works. Task 6 is verification-only.

---

## Files Modified

| File                                              | Change                                                     |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `src/components/workspace/workspace-context.tsx`  | Major — new state shape, new actions, selectors            |
| `src/components/workspace/chat-view.tsx`          | Minor — swap message access to use selector                |
| `src/components/workspace/agent-channel-item.tsx` | Moderate — replace hardcoded history, add rename/delete UI |
| `src/components/workspace/workspace-sidebar.tsx`  | Minor — pass new props through                             |
| `src/components/workspace/workspace-layout.tsx`   | Minor — add conversation management handlers               |

## Files NOT Modified

- `agents.ts` — no changes needed
- `empty-chat.tsx` — already works as-is (shown when active conversation is empty)
- `channel-header.tsx` — no changes needed for MVP
- `server/chat.ts` — server is stateless, no changes
- `tasks.ts`, `task-board.tsx`, `task-card.tsx` — task system is independent

---

## Success Criteria Mapping

| Criterion                                                                      | Addressed By                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------- |
| Each agent supports multiple independent conversations                         | Task 1 (state), Task 4 (new chat)                  |
| Sidebar history list shows real conversations titled by first user message     | Task 1 (title derivation), Task 3 (sidebar wiring) |
| Clicking a history item switches to that conversation's messages               | Task 3 + Task 4 (switching)                        |
| Starting a "new chat" clears the active conversation and shows the empty state | Task 4                                             |
| Rename and delete actions in the dropdown menu work on conversation entries    | Task 5                                             |

---

## Risk Notes

- **State migration:** The state shape change is breaking — all reducer actions must be updated atomically in Task 1. If any action is missed, the app will crash on that action type. Mitigation: update all cases in the switch statement in a single pass.
- **Lazy conversation creation:** Auto-creating a conversation on first message avoids a "required setup step" UX. The trade-off is slightly more complex reducer logic for `APPEND_MESSAGE`.
- **No persistence:** All conversations are lost on page refresh. This is acceptable for MVP (documented in active constraints).
