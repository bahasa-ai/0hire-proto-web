# Phase 2 Research: Chat UI + State Infrastructure

**Phase:** 02 — Chat UI + State Infrastructure  
**Researched:** 2026-02-19  
**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, RENDER-02, RENDER-03

---

## Key Dependency: prompt-kit

prompt-kit is a **shadcn-style copy-paste component library** — not an npm package. Components are installed individually via the shadcn CLI and land in `src/components/prompt-kit/`. Each component is owned code that can be customized freely.

### Install method (project uses Bun)

```bash
bunx shadcn@latest add "https://prompt-kit.com/c/[COMPONENT].json"
```

### Components needed for Phase 2

| Component           | Install slug        | Exports                                                                         | Usage                                              |
| ------------------- | ------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| `chat-container`    | `chat-container`    | `ChatContainerRoot`, `ChatContainerContent`                                     | Scrollable message area with auto-scroll-to-bottom |
| `message`           | `message`           | `Message`, `MessageContent`, `MessageAvatar`                                    | User and agent chat bubbles                        |
| `prompt-input`      | `prompt-input`      | `PromptInput`, `PromptInputTextarea`, `PromptInputActions`, `PromptInputAction` | Composer — auto-resizing textarea + send button    |
| `prompt-suggestion` | `prompt-suggestion` | `PromptSuggestion`                                                              | Clickable discovery cards for empty state          |

### ChatContainer behavior

`ChatContainerRoot` wraps an overflow-y-auto container. `ChatContainerContent` is the inner scrollable content area. Auto-scroll-to-bottom is built in via the library internals.

### Message component API

```tsx
// User message — right-aligned bubble
<Message className="justify-end">
  <MessageContent className="bg-muted rounded-3xl px-5 py-2.5">
    {text}
  </MessageContent>
</Message>

// Agent message — left-aligned with avatar
<Message className="justify-start">
  <MessageAvatar src="" fallback={agent.initials} />
  <MessageContent className="bg-transparent p-0">
    {text}
  </MessageContent>
</Message>
```

### PromptInput API

```tsx
<PromptInput
  value={input}
  onValueChange={setInput}
  isLoading={false}
  onSubmit={handleSubmit}
>
  <PromptInputTextarea placeholder="Message..." />
  <PromptInputActions>
    <PromptInputAction tooltip="Send">
      <Button ...><ArrowUp /></Button>
    </PromptInputAction>
  </PromptInputActions>
</PromptInput>
```

`PromptInput` handles Enter-to-submit internally via `PromptInputTextarea.handleKeyDown` — it calls `onSubmit?.()` from context when Enter is pressed without Shift. Pass `onSubmit` to `PromptInput` and it works automatically. Do NOT add a redundant `onKeyDown` to `PromptInputTextarea` — it will double-fire `handleSubmit` in the same tick before `isPending` updates.

### PromptSuggestion

Simple clickable chip/card. Accepts `onClick` and children (text). Used for empty state discovery.

---

## State Architecture

### Requirement

Per-agent message history must survive channel switching (CHAT-04). This means state must live above `WorkspaceMain` (which unmounts/remounts per agent switch) but below the router.

### Chosen approach: React Context + useReducer

`WorkspaceContext` provides message state for all agents keyed by `agentId`. `WorkspaceLayout` wraps everything in `WorkspaceProvider`. No external state library needed for this scope.

```typescript
type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId: string
  timestamp: number
}

type WorkspaceState = {
  messages: Record<string, ChatMessage[]> // agentId → messages
}

type WorkspaceAction =
  | { type: 'SEND_MESSAGE'; agentId: string; message: ChatMessage }
  | { type: 'RECEIVE_RESPONSE'; agentId: string; message: ChatMessage }
```

### Why not useState in WorkspaceLayout?

`useState` would work but `useReducer` keeps the message-appending logic predictable and testable. It also mirrors the pattern Phase 3 (streaming) will need — where we'll want `UPDATE_STREAMING_TOKEN` or `FINALIZE_STREAM` actions.

### Why not Zustand/Jotai?

MVP scope, no persistence requirement in Phase 2. React Context is sufficient and avoids adding a dependency. Phase 3 may revisit if streaming complexity demands it.

---

## Mock Response Strategy

Phase 2 uses hardcoded fixed strings per agent (no API call). A `setTimeout` of ~1000ms simulates network latency.

```typescript
const MOCK_RESPONSES: Record<string, string> = {
  'chief-of-staff':
    "Got it. I've noted that in your priorities and will track it across departments. What's the deadline?",
  'designer':
    "Understood! I'll work up some visual concepts. Do you have existing brand guidelines or color preferences I should follow?",
  'finance':
    "Acknowledged. I'll pull the relevant financial data and prepare a summary. Would you like a monthly or quarterly breakdown?",
  'legal':
    "Noted. I'll review the applicable regulations and flag any compliance concerns. Is there a specific jurisdiction I should focus on?",
}
```

Located in `agents.ts` alongside the `AGENTS` array.

---

## Empty State Design

Per-agent `PromptSuggestion` cards (4 per agent) shown when `messages[agentId]` is empty. Clicking a suggestion pre-fills and submits that text as a user message.

### Suggestions per agent

**Chief of Staff:**

- "What's on my agenda this week?"
- "Summarize my team's priorities"
- "Draft a project status update"
- "What deadlines are coming up?"

**Designer:**

- "Create a logo concept for my brand"
- "Suggest a color palette for my website"
- "Review my landing page design"
- "Generate copy for a social media banner"

**Finance:**

- "Show me this month's cash flow summary"
- "Identify our top 3 cost centers"
- "Prepare a Q1 financial report draft"
- "Flag any budget risks I should know about"

**Legal:**

- "Review this contract for red flags"
- "What compliance requirements apply to my business?"
- "Draft a simple NDA template"
- "Am I protected against this liability?"

---

## Channel Tab Toggle

Phase 2 adds a **Chat | Tasks** tab toggle above the message area. `activeTab` state lives in `WorkspaceMain` (local, per-render — no persistence needed across agent switches). Tasks panel is an empty placeholder in Phase 2.

UI: two small tab buttons in the channel header area or just below it. Use `Button` with `variant="ghost"` + active state via `bg-accent`.

---

## Component File Plan

| File                                             | Type   | Purpose                                                          |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| `src/components/workspace/workspace-context.tsx` | New    | `WorkspaceContext`, `WorkspaceProvider`, `useWorkspace` hook     |
| `src/components/workspace/chat-view.tsx`         | New    | Full chat panel — `ChatContainer` + message list + `PromptInput` |
| `src/components/workspace/empty-chat.tsx`        | New    | Empty state — centered `PromptSuggestion` grid per agent         |
| `src/components/workspace/workspace-main.tsx`    | Modify | Add tab toggle; replace `flex-1` placeholder with `ChatView`     |
| `src/components/workspace/workspace-layout.tsx`  | Modify | Wrap with `WorkspaceProvider`                                    |
| `src/components/workspace/agents.ts`             | Modify | Add `MOCK_RESPONSES` + `AGENT_SUGGESTIONS` exports               |

---

## Integration with Phase 1

Phase 1 established:

- `WorkspaceLayout` owns `activeAgentId` state
- `WorkspaceMain` receives `activeAgent: Agent` prop
- Components in `src/components/workspace/`

Phase 2 adds `WorkspaceProvider` wrapping inside `WorkspaceLayout` and replaces the `flex-1` placeholder in `WorkspaceMain` with `ChatView`.

---

## Phase 3 Forward Compatibility

The `useReducer` pattern and `ChatMessage` type are designed to extend cleanly:

- `role: 'user' | 'agent'` → Phase 3 adds no new role, streaming just appends tokens
- `WorkspaceAction` can grow with `UPDATE_STREAM_TOKEN` / `FINALIZE_STREAM` actions
- `ChatView` can be updated to pass an `isStreaming` prop without structural change

---

_Research completed: 2026-02-19_
