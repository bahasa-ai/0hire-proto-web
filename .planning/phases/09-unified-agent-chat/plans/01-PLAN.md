# Phase 9 Plan: Unified Agent Chat Simplification

## Goal

Collapse the per-agent multi-conversation architecture to a single flat message list per agent. Remove all conversation UI (history accordion, "New chat" button, rename/delete, LayoutGroup). Each agent has exactly one persistent chat.

## Files Changed

| File                                              | Action                                        |
| ------------------------------------------------- | --------------------------------------------- |
| `src/components/workspace/workspace-context.tsx`  | Rewrite state shape + reducer                 |
| `src/components/workspace/agent-channel-item.tsx` | Strip all conversation UI                     |
| `src/components/workspace/workspace-sidebar.tsx`  | Remove LayoutGroup + New chat button          |
| `src/routes/$agentId/index.tsx`                   | Simplify — no conversation creation logic     |
| `src/routes/$agentId/$conversationId.tsx`         | Delete                                        |
| `src/components/workspace/chat-view.tsx`          | Remove conversation props + creation dispatch |

---

## Step 1 — Rewrite `workspace-context.tsx`

**New state shape:**

```ts
interface WorkspaceState {
  messages: Record<string, ChatMessage[]>
}
```

**Remove entirely:**

- `Conversation` interface
- `generateId()` — no longer exported (no callers after this phase)
- `makeConversation()`, `setConversation()`, `setActiveConvo()`, `ensureConversation()`, `appendToChannel()` helpers
- Actions: `CREATE_CONVERSATION`, `SWITCH_CONVERSATION`, `CLEAR_ACTIVE_CONVERSATION`, `RENAME_CONVERSATION`, `DELETE_CONVERSATION`
- `getConversationList()` export

**Rewrite helpers (flat):**

```ts
// Direct append to agent's flat message list
function appendMessage(
  state: WorkspaceState,
  agentId: string,
  message: ChatMessage,
): WorkspaceState {
  return {
    ...state,
    messages: {
      ...state.messages,
      [agentId]: [...(state.messages[agentId] ?? []), message],
    },
  }
}

// Update a specific message in the agent's flat list
function updateMessage(
  state: WorkspaceState,
  agentId: string,
  messageId: string,
  update: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
): WorkspaceState {
  const msgs = state.messages[agentId] ?? []
  return {
    ...state,
    messages: {
      ...state.messages,
      [agentId]: msgs.map(m => {
        if (m.id !== messageId) return m
        return typeof update === 'function' ? update(m) : { ...m, ...update }
      }),
    },
  }
}
```

**Updated reducer cases:**

- `APPEND_MESSAGE` / `START_STREAMING` → call `appendMessage`
- All other message cases → call `updateMessage`
- Remove all conversation cases

**Updated selector:**

```ts
export function getActiveMessages(
  state: WorkspaceState,
  agentId: string,
): Array<ChatMessage> {
  return state.messages[agentId] ?? []
}
```

**Updated initial state:**

```ts
const INITIAL_STATE: WorkspaceState = { messages: {} }
```

**Updated `WorkspaceAction` union** — remove 5 conversation actions, keep all message/tool actions.

---

## Step 2 — Rewrite `agent-channel-item.tsx`

**Remove imports:** `AnimatePresence`, `motion`, `DropdownMenu*`, `ScrollArea`, `MessageSquare`, `MoreHorizontal`, `Pencil`, `Trash2`, `getConversationList`

**Remove props:** `activeConversationId` from `AgentChannelItemProps`

**Remove internal state/refs:** `editingId`, `editValue`, `editInputRef`, `handleRenameStart`, `handleRenameCommit`, `handleDelete`

**Remove:** `HistoryLink` component, `streamingConvoId` detection, `conversations` variable

**Remove from agent row:** The hover "Start new chat" swap — always show `agent.role` in the subtitle

**Remove:** `motion.div` layout wrapper — render a plain `<div>` with the same class

**Remove:** the `AnimatePresence` + history accordion entirely

**Remove:** `useWorkspace()` hook call (no longer needed — no dispatch, no state)

**Simplified render:**

```tsx
export function AgentChannelItem({ agent, isActive }: AgentChannelItemProps) {
  const agentStatus = deriveAgentStatus(AGENT_TASKS[agent.id] ?? [])
  const dotClass = statusDotClass(agentStatus)

  return (
    <div
      className={cn('rounded-xl p-1', isActive && 'bg-muted inset-shadow-sm')}
    >
      <Link
        to="/$agentId"
        params={{ agentId: agent.id }}
        data-agent-item
        className={cn(
          'group/agent focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
          isActive
            ? 'relative z-10 bg-blue-50 bg-linear-to-b from-blue-200 to-blue-100 text-blue-900 shadow-xs ring-1 inset-shadow-2xs ring-blue-200 inset-shadow-white/50'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <span
          className={cn(
            'relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs',
            isActive ? 'bg-blue-300' : 'bg-border',
          )}
        >
          {agent.emoji}
          {dotClass && (
            <span
              className={cn(
                'absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-1',
                'ring-sidebar',
                dotClass,
              )}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-medium">
            {agent.name}
          </p>
          <p
            className={cn(
              'truncate text-xs leading-tight',
              isActive ? 'opacity-60' : 'text-muted-foreground',
            )}
          >
            {agent.role}
          </p>
        </div>
      </Link>
    </div>
  )
}
```

**Keep:** `statusDotClass`, `PulseDotLoader` import/usage is removed (no streaming indicator in sidebar), `AgentStatus` import, `AGENT_TASKS`, `deriveAgentStatus`, `cn`, `Link`.

> Note: Remove `PulseDotLoader` import since it was only used in `HistoryLink`.

---

## Step 3 — Simplify `workspace-sidebar.tsx`

**Remove imports:** `LayoutGroup` from `motion/react`, `Plus` from `lucide-react`

**Remove param:** `conversationId` from `useParams` call

**Remove:** `activeConversationId` local variable

**Remove:** The "New chat" `<Link>` button (the `<Plus>` icon) in the Agents section header

**Remove:** `<LayoutGroup id="agent-channels">` wrapper — replace with plain `<>`

**Remove:** `activeConversationId` prop passed to `AgentChannelItem`

**Updated agents section header** (no Plus button):

```tsx
<div className="mb-1 flex items-center px-2">
  <p className="text-muted-foreground/70 flex-1 text-[11px] font-semibold tracking-widest uppercase">
    Agents
  </p>
</div>
```

**Updated agent list:**

```tsx
{
  AGENTS.map(agent => (
    <AgentChannelItem
      key={agent.id}
      agent={agent}
      isActive={agent.id === activeId}
    />
  ))
}
```

---

## Step 4 — Simplify `src/routes/$agentId/index.tsx`

**Remove imports:** `useNavigate`, `useWorkspace`, `useCallback`, `useEffect`

**Remove:** `handleConversationCreated` callback, `navigate`, `state`, `dispatch`, `useEffect` for clearing active conversation

**Simplified route:**

```tsx
import { AGENTS } from '@/components/workspace/agents'
import { ChatView } from '@/components/workspace/chat-view'
import { createFileRoute, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/$agentId/')({
  component: AgentRoute,
})

function AgentRoute() {
  const { agentId } = useParams({ from: '/$agentId/' })
  const agent = AGENTS.find(a => a.id === agentId) ?? AGENTS[0]
  return <ChatView agent={agent} />
}
```

---

## Step 5 — Delete `src/routes/$agentId/$conversationId.tsx`

Delete the file entirely. All navigation to `/$agentId/$conversationId` was conversation-switching; those links no longer exist.

---

## Step 6 — Simplify `chat-view.tsx`

**Remove from `ChatViewProps`:** `conversationId?: string`, `onConversationCreated?: (id: string) => void`

**Remove import:** `generateId` from workspace-context

**Remove:** `activeConvoId` variable (line 154)

**Remove from `useEffect` deps:** `activeConvoId` — effect now keyed only on `agent.id`:

```ts
useEffect(() => {
  abortCurrentStream()
  setIsWaitingForFirstToken(false)
  setError(null)
}, [agent.id]) // was: [agent.id, activeConvoId]
```

**Remove from `handleSend`:** The new-chat creation block:

```ts
// REMOVE this entire block:
if (!conversationId && !state.activeConversationId[agent.id]) {
  const newConvoId = generateId()
  dispatch({
    type: 'CREATE_CONVERSATION',
    agentId: agent.id,
    conversationId: newConvoId,
  })
  onConversationCreated?.(newConvoId)
}
```

**Remove from `handleSend` deps:** `conversationId`, `onConversationCreated`

**Keep all streaming logic unchanged.** `getActiveMessages(state, agent.id)` now reads from the flat `state.messages[agentId]` — no change needed in chat-view since the selector handles it.

---

## Verification

After all changes, run:

```bash
bun run check
```

All must pass. Also confirm manually:

1. Clicking an agent in sidebar shows its single persistent chat
2. Sending a message works — streaming, tool cards, abort, retry
3. Sidebar shows no history accordion, no "New chat" button
4. Switching agents preserves each agent's messages
5. No TypeScript errors from removed `Conversation` type or dead action dispatches
