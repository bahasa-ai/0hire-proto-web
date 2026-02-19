# Architecture Research

**Domain:** Multi-agent AI chat workspace (Slack-like, single-page, in-memory)
**Researched:** 2026-02-19
**Confidence:** HIGH — TanStack Start streaming docs verified via official docs; prompt-kit API verified via official site; Anthropic SDK streaming pattern verified via official docs

---

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Browser (React 19)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   WorkspaceLayout (index.tsx)             │   │
│  │                                                           │   │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │ WorkspaceSidebar │  │      AgentChannelView         │  │   │
│  │  │                  │  │                               │  │   │
│  │  │ - Logo/branding  │  │  ┌─────────────────────────┐ │  │   │
│  │  │ - AgentChannelList│  │  │     ChannelHeader        │ │  │   │
│  │  │   (4 agents)     │  │  └─────────────────────────┘ │  │   │
│  │  │ - Active state   │  │  ┌─────────────────────────┐ │  │   │
│  │  │                  │  │  │   ChatView (prompt-kit)  │ │  │   │
│  │  │                  │  │  │  ChatContainerRoot       │ │  │   │
│  │  │                  │  │  │   └─ ChatContainerContent│ │  │   │
│  │  │                  │  │  │       └─ Message[]        │ │  │   │
│  │  │                  │  │  │  ScrollButton             │ │  │   │
│  │  │                  │  │  └─────────────────────────┘ │  │   │
│  │  │                  │  │  ┌─────────────────────────┐ │  │   │
│  │  │                  │  │  │   PromptInput (prompt-kit│ │  │   │
│  │  └──────────────────┘  │  └─────────────────────────┘ │  │   │
│  │                        │  ┌─────────────────────────┐ │  │   │
│  │                        │  │      TaskBoard           │ │  │   │
│  │                        │  └─────────────────────────┘ │  │   │
│  │                        └──────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│          useWorkspaceReducer (in-memory state)                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                    createServerFn (RPC over HTTP)
                               │
┌─────────────────────────────────────────────────────────────────┐
│                       TanStack Start Server                      │
│                                                                  │
│   streamAgentResponse (async generator) → Anthropic SDK stream  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `WorkspaceLayout` | Top-level layout, owns `useWorkspaceReducer`, provides context | All workspace components via context |
| `WorkspaceSidebar` | Channel list, active agent selection | `WorkspaceContext` (reads activeAgentId, dispatches setActiveAgent) |
| `AgentChannelItem` | Single agent entry in sidebar (avatar, name, unread indicator) | Parent `WorkspaceSidebar` |
| `AgentChannelView` | Renders the full right-pane for the active agent | `WorkspaceContext` (reads agent state) |
| `ChannelHeader` | Agent profile: avatar, name, role, status indicator | Props from `AgentChannelView` |
| `ChatView` | Message list + scroll behavior using prompt-kit | `WorkspaceContext` (reads messages[activeAgentId]) |
| `ChatInput` | Wraps `PromptInput` from prompt-kit, handles submit + loading | `WorkspaceContext` (dispatches addMessage, calls server fn) |
| `TaskBoard` | Per-agent task list, collapsible side panel | `WorkspaceContext` (reads/writes tasks[activeAgentId]) |
| `TaskItem` | Single task row with status toggle | Parent `TaskBoard` via props |
| `streamAgentResponse` | TanStack Start `createServerFn` — calls Anthropic SDK | Server only; called from `ChatInput` |

---

## Recommended Project Structure

```
src/
├── routes/
│   ├── __root.tsx               # Existing root layout (unchanged)
│   └── index.tsx                # Replace with WorkspaceLayout render
├── components/
│   ├── workspace/
│   │   ├── workspace-layout.tsx  # Top-level layout shell (sidebar + main)
│   │   ├── workspace-sidebar.tsx # Agent channel list sidebar
│   │   ├── agent-channel-item.tsx
│   │   ├── agent-channel-view.tsx # Right pane for active agent
│   │   ├── channel-header.tsx    # Agent profile header
│   │   ├── chat-view.tsx         # prompt-kit ChatContainer + Message list
│   │   ├── chat-input.tsx        # prompt-kit PromptInput wrapper
│   │   ├── task-board.tsx        # Per-agent task board panel
│   │   └── task-item.tsx
│   ├── prompt-kit/               # prompt-kit components (installed via shadcn CLI)
│   │   ├── chat-container.tsx
│   │   ├── message.tsx
│   │   ├── prompt-input.tsx
│   │   ├── markdown.tsx
│   │   ├── scroll-button.tsx
│   │   └── loader.tsx
│   └── ui/                       # Existing shadcn components (unchanged)
├── lib/
│   ├── agents.ts                 # Static agent definitions (id, name, role, avatar, systemPrompt)
│   ├── workspace-context.tsx     # WorkspaceContext + useWorkspace hook
│   ├── workspace-reducer.ts      # useReducer logic: messages, tasks, streaming state
│   └── server/
│       └── claude-stream.ts      # createServerFn — Anthropic streaming
└── styles.css                    # Existing (unchanged)
```

### Structure Rationale

- **`components/workspace/`:** All workspace-specific components co-located; easy to find, delete, or extract later.
- **`components/prompt-kit/`:** prompt-kit installs as shadcn source components (not npm packages) — they live here as editable source files.
- **`lib/workspace-context.tsx` + `workspace-reducer.ts`:** State logic separated from components. Context provides state to the entire workspace tree without prop drilling.
- **`lib/server/`:** Server functions isolated from client code. `createServerFn` files are the only place with server-only imports (Anthropic SDK).
- **`lib/agents.ts`:** Static configuration file — hardcoded agent definitions. Single source of truth for the 4 agents.

---

## Data Model

```typescript
// lib/agents.ts
export type AgentId = 'chief-of-staff' | 'designer' | 'finance' | 'legal'

export type Agent = {
  id: AgentId
  name: string
  role: string
  description: string
  avatarFallback: string   // 2-letter initials
  color: string            // Tailwind semantic token for accent
  systemPrompt: string
}

// lib/workspace-reducer.ts
export type ChatMessage = {
  id: string               // crypto.randomUUID()
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean     // true while chunks are arriving
}

export type Task = {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'done'
  createdAt: number
}

export type AgentState = {
  messages: ChatMessage[]
  tasks: Task[]
  isTyping: boolean        // true while awaiting first chunk
}

export type WorkspaceState = {
  activeAgentId: AgentId
  agents: Record<AgentId, AgentState>
}
```

---

## Architectural Patterns

### Pattern 1: Async Generator Server Function for Streaming

**What:** `createServerFn` using an async generator (`function*`) to stream Anthropic response chunks to the client. Each yielded value is a typed string chunk.

**When to use:** Any time Claude API is called. This is the only streaming pattern needed.

**Why generators over ReadableStream:** Cleaner syntax, same type safety, leaner client-side consumption with `for await...of`.

**Example:**
```typescript
// lib/server/claude-stream.ts
import { createServerFn } from '@tanstack/start'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export const streamAgentResponse = createServerFn()
  .validator(z.object({
    messages: z.array(MessageSchema),
    systemPrompt: z.string(),
  }))
  .handler(async function* ({ data }) {
    const stream = client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: data.systemPrompt,
      messages: data.messages,
    })
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  })
```

---

### Pattern 2: useReducer for Workspace State

**What:** A single `useReducer` at `WorkspaceLayout` level, exposed via React Context. All mutations go through typed dispatch actions.

**When to use:** All in-memory state for this MVP — messages, tasks, active agent, streaming state.

**Why not Zustand/Jotai:** No external dependency needed. Reducers make streaming state mutations (appending chunks) predictable. useReducer is sufficient for this scope.

**Example:**
```typescript
// lib/workspace-reducer.ts
type Action =
  | { type: 'SET_ACTIVE_AGENT'; agentId: AgentId }
  | { type: 'ADD_MESSAGE'; agentId: AgentId; message: ChatMessage }
  | { type: 'APPEND_CHUNK'; agentId: AgentId; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; agentId: AgentId; messageId: string }
  | { type: 'SET_TYPING'; agentId: AgentId; isTyping: boolean }
  | { type: 'ADD_TASK'; agentId: AgentId; task: Task }
  | { type: 'UPDATE_TASK_STATUS'; agentId: AgentId; taskId: string; status: Task['status'] }

function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'APPEND_CHUNK':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agentId]: {
            ...state.agents[action.agentId],
            messages: state.agents[action.agentId].messages.map(m =>
              m.id === action.messageId
                ? { ...m, content: m.content + action.chunk }
                : m
            ),
          },
        },
      }
    // ...other cases
  }
}
```

---

### Pattern 3: prompt-kit Component Composition

**What:** prompt-kit components are installed as editable source files via shadcn CLI. They are composed — not configured via monolithic props.

**When to use:** All chat UI elements. Do not hand-roll message bubbles, auto-scroll logic, or input handling.

**Installation:**
```bash
bunx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
bunx shadcn@latest add "https://prompt-kit.com/c/message.json"
bunx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
bunx shadcn@latest add "https://prompt-kit.com/c/markdown.json"
bunx shadcn@latest add "https://prompt-kit.com/c/scroll-button.json"
bunx shadcn@latest add "https://prompt-kit.com/c/loader.json"
```

**Component mapping to workspace UI:**

| UI Element | prompt-kit Component(s) |
|------------|------------------------|
| Scrollable message container | `ChatContainerRoot` + `ChatContainerContent` + `ChatContainerScrollAnchor` |
| Individual message bubble | `Message` + `MessageAvatar` + `MessageContent` (markdown=true) |
| Message copy/action buttons | `MessageActions` + `MessageAction` |
| Chat input field | `PromptInput` + `PromptInputTextarea` + `PromptInputActions` |
| Scroll-to-bottom button | `ScrollButton` |
| Streaming loading indicator | `Loader` |
| AI markdown response | `Markdown` (via `MessageContent markdown` prop) |

---

## Data Flow

### Chat Message Send + Stream Flow

```
User types in PromptInput → onSubmit fires
    ↓
dispatch(ADD_MESSAGE, role: 'user', content)        [local state]
dispatch(ADD_MESSAGE, role: 'assistant', content: '', isStreaming: true)
dispatch(SET_TYPING, true)
    ↓
for await (const chunk of await streamAgentResponse({ messages, systemPrompt }))
    ↓ [each chunk]
dispatch(APPEND_CHUNK, assistantMessageId, chunk)   [React re-render per chunk]
    ↓ [stream ends]
dispatch(FINISH_STREAMING, assistantMessageId)
dispatch(SET_TYPING, false)
    ↓
ChatView reads messages[activeAgentId] from context
    → ChatContainerRoot auto-scrolls to bottom (use-stick-to-bottom)
    → Message with isStreaming=true renders with Loader indicator until done
```

### Agent Channel Switch Flow

```
User clicks AgentChannelItem
    ↓
dispatch(SET_ACTIVE_AGENT, agentId)
    ↓
WorkspaceContext.activeAgentId updates
    ↓
AgentChannelView reads agents[activeAgentId] → renders that agent's messages + tasks
    (chat history for previous agent is preserved in state.agents[prevId])
```

### Task Board Flow

```
User creates task in TaskBoard
    ↓
dispatch(ADD_TASK, activeAgentId, task)
    ↓
TaskBoard reads tasks[activeAgentId] from context, re-renders list

User clicks task status toggle
    ↓
dispatch(UPDATE_TASK_STATUS, taskId, newStatus)
    ↓
TaskItem updates optimistically (same render cycle)
```

### State Ownership Summary

```
WorkspaceLayout (owns useReducer)
    ↓ provides WorkspaceContext
WorkspaceSidebar           → reads: activeAgentId, agents (for unread counts)
                           → writes: SET_ACTIVE_AGENT
AgentChannelView           → reads: agents[activeAgentId]
ChatView                   → reads: agents[activeAgentId].messages
ChatInput                  → reads: isTyping; writes: ADD_MESSAGE, APPEND_CHUNK, FINISH_STREAMING
TaskBoard                  → reads/writes: agents[activeAgentId].tasks
```

---

## Suggested Build Order

Build order is determined by dependencies: layout before content, static before dynamic, state before streaming.

### Phase 1: Static Layout Shell
**Build:** WorkspaceLayout, WorkspaceSidebar, AgentChannelItem (4 hardcoded agents), ChannelHeader, route change in `index.tsx`.
**Gate:** Sidebar renders with 4 agents, clicking switches the visible panel, layout matches target design.
**Why first:** Everything else mounts inside this shell. No state needed yet — just visual structure.

### Phase 2: Chat View (Static + State)
**Build:** `workspace-reducer.ts`, `workspace-context.tsx`, `lib/agents.ts` definitions, `ChatView` with prompt-kit components, `ChatInput`, hardcoded/mock assistant responses.
**Gate:** Send a message → appears in chat list → mock reply appears below it. Agent switching preserves each agent's separate history.
**Why second:** State infrastructure must exist before streaming is added. prompt-kit components integrate here. Streaming is layered on top.

### Phase 3: Streaming Integration
**Build:** `lib/server/claude-stream.ts` (createServerFn + async generator), `ChatInput` calls server fn, streaming APPEND_CHUNK dispatch loop, Loader indicator during streaming.
**Gate:** Real Claude response streams in token-by-token. Auto-scroll follows streaming content. Each agent has its own system prompt.
**Why third:** Requires Phase 2 state infrastructure. The `APPEND_CHUNK` action and `isStreaming` flag on messages must exist before streaming works.

### Phase 4: Task Board
**Build:** `TaskBoard`, `TaskItem`, task actions in reducer (`ADD_TASK`, `UPDATE_TASK_STATUS`, `DELETE_TASK`), collapsible panel UI.
**Gate:** Can add tasks per agent, toggle status (todo → in-progress → done), tasks persist while switching channels.
**Why fourth:** Entirely independent of streaming. Can be built in parallel with Phase 3 but benefits from the reducer already existing.

### Phase 5: Polish
**Build:** Markdown rendering in messages, typing indicator between SET_TYPING and first chunk, MessageActions (copy, retry), agent status badges, empty state illustrations per agent.
**Gate:** UI matches production quality, no rough edges, markdown in AI responses renders correctly.

---

## Integration Points

### TanStack Start createServerFn — Critical Details

| Concern | Detail |
|---------|--------|
| Import restriction | Anthropic SDK (`@anthropic-ai/sdk`) must only be imported inside `createServerFn` handler — it is server-only. If imported in a client component, the build will include it in the browser bundle. |
| Async generator support | Verified in TanStack Start official docs — `handler(async function* () { yield ... })` is supported. Client consumes with `for await...of`. |
| Validator | Use `zod` (already a dep via shadcn) with `.validator()` before `.handler()`. Validates the `data` argument. |
| Error handling | Wrap the `for await` loop in try/catch. Dispatch an error message if the stream fails mid-flight. |
| API key | `ANTHROPIC_API_KEY` in `.env`. TanStack Start exposes server env vars to `createServerFn` handlers automatically — never to client. |

### prompt-kit — Integration Notes

| Concern | Detail |
|---------|--------|
| Installation target | Components install to `src/components/prompt-kit/` by default. Verify the shadcn `components.json` `ui` path. |
| Tailwind v4 compatibility | prompt-kit targets shadcn/ui which supports Tailwind v4 — should work, but verify after installation that color tokens resolve correctly with this project's OKLCH tokens. |
| `use-stick-to-bottom` dependency | `ChatContainerRoot` installs `use-stick-to-bottom` as an npm dep automatically via the shadcn add command. |
| Streaming + auto-scroll | `ChatContainerRoot` auto-detects content height changes via ResizeObserver — no manual scroll management needed. Just keep appending content and it scrolls. |

---

## Anti-Patterns

### Anti-Pattern 1: Prop Drilling State Through 4+ Levels

**What people do:** Pass `messages`, `dispatch`, `activeAgentId` as props from `WorkspaceLayout` → `AgentChannelView` → `ChatView` → `ChatInput`.
**Why it's wrong:** 4-level prop chains break when components are rearranged (e.g., moving TaskBoard).
**Do this instead:** Create `WorkspaceContext` at `WorkspaceLayout` level. Any component reads `useWorkspace()` directly. Only pass component-local state as props.

---

### Anti-Pattern 2: Importing Anthropic SDK Outside createServerFn

**What people do:** `import Anthropic from '@anthropic-ai/sdk'` at the top of a component or lib file that runs on the client.
**Why it's wrong:** TanStack Start bundles all non-`createServerFn` code for the browser. Anthropic SDK is ~500KB and will throw errors in browser context.
**Do this instead:** The Anthropic SDK import must live exclusively inside `lib/server/claude-stream.ts` within a `createServerFn` handler. The file can be imported on the client, but the SDK import only runs server-side.

---

### Anti-Pattern 3: One Global Messages Array for All Agents

**What people do:** `messages: ChatMessage[]` with an `agentId` field, filtered per-channel on render.
**Why it's wrong:** Every message add causes a full array scan on render. More importantly, switching agents re-filters and potentially disrupts streaming state.
**Do this instead:** `agents: Record<AgentId, AgentState>` — each agent owns its slice. Direct indexed access, no filtering.

---

### Anti-Pattern 4: Streaming State with useState Instead of useReducer

**What people do:** `const [streamingContent, setStreamingContent] = useState('')` inside `ChatInput`, sync to messages on completion.
**Why it's wrong:** Streaming content in a separate state causes two-phase rendering: streaming preview then final message swap. Causes flash on completion.
**Do this instead:** Add the assistant message to the main `messages` array immediately with `isStreaming: true` and `content: ''`. Each `APPEND_CHUNK` action mutates that message's content directly. No separate streaming state needed.

---

## Scaling Considerations

This is an in-memory MVP with no backend persistence. Scaling considerations are deferred by design.

| Concern | MVP Approach | When to Revisit |
|---------|--------------|-----------------|
| Message persistence | In-memory only — lost on page refresh | When backend is added |
| Concurrent agent streams | Each stream is independent (separate `for await` loops can run in parallel) | Not a concern at this scale |
| Bundle size | Anthropic SDK is server-only via `createServerFn` — zero browser bundle impact | Non-issue |
| React re-renders during streaming | Each chunk = one dispatch = one render. For fast streams, consider debouncing chunk batches (e.g., accumulate 3-5 chunks per frame) | If render performance degrades during streaming |

---

## Sources

- TanStack Start Streaming Guide (official docs, verified 2026-02-19): https://tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions
- prompt-kit ChatContainer docs (official, verified 2026-02-19): https://www.prompt-kit.com/docs/chat-container
- prompt-kit Message docs (official, verified 2026-02-19): https://www.prompt-kit.com/docs/message
- prompt-kit PromptInput docs (official, verified 2026-02-19): https://www.prompt-kit.com/docs/prompt-input
- Anthropic streaming SSE reference (official, verified 2026-02-19): https://docs.anthropic.com/claude/reference/streaming
- TanStack Start Server Functions (official docs): https://tanstack.com/start/latest/docs/framework/react/server-functions

---
*Architecture research for: Zero Hire — Agent Workspace MVP*
*Researched: 2026-02-19*
