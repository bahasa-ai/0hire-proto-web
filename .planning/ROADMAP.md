# Roadmap: Zero Hire — Agent Workspace MVP

## Overview

Eight-phase build from static shell to fully functional AI workspace. All 8 phases are complete.

The single core value — a non-technical operator can talk to their AI team and see exactly what it's doing — is realized after Phase 4. Phase 5 makes it demo-ready. Phase 6 adds conversation management. Phase 7 floats the sidebar. Phase 8 makes tool use visible.

---

## Phases

### Phase 1: Static Layout Shell

**Goal:** The workspace looks and feels like a real product — sidebar with all 4 agents, clickable channel switching, and identity-rich channel headers — with no state management or API calls.

**Requirements:** LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, INFRA-02

**Plans:** 1 plan

Plans:

- [ ] 01-PLAN.md — Full workspace shell (data layer + sidebar + main panel + route wiring)

**Success Criteria — All must be TRUE:**

1. Sidebar lists Chief of Staff, Designer, Finance, Legal with avatar initials and role label
2. Clicking an agent switches the main panel to that agent's view
3. Active agent is visually highlighted in the sidebar
4. Channel header shows the active agent's name, role, and description
5. Workspace loads directly with hardcoded user identity — no login prompt

---

### Phase 2: Chat UI + State Infrastructure

**Goal:** Users can have a functional mock conversation with each agent using prompt-kit components, with per-agent message history that survives channel switching.

**Depends on:** Phase 1

**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, RENDER-02, RENDER-03

**Key work:**

- Install prompt-kit: `PromptInput`, `Message`, `ChatContainer`, `PromptSuggestion`, `Loader`
- `useReducer` + React Context for per-agent message state (`WorkspaceContext`)
- `ChatView` component — `ChatContainer` + message list + `PromptInput`
- `MessageBubble` — user vs. agent variants using prompt-kit `Message`
- Per-agent empty state with `PromptSuggestion` discovery cards (4 per agent, role-specific)
- Mock agent responses — fixed text strings per agent, no API call
- Channel tab toggle — Chat | Tasks (Tasks panel is empty placeholder in Phase 2)

**Success Criteria — All must be TRUE:**

1. User sees a scrollable conversation history for the active agent channel (`ChatContainer`)
2. User can type and send a message — a mock response appears after a short delay
3. Enter sends; Shift+Enter inserts a newline
4. Switching agents and back preserves both agents' conversation histories independently
5. User messages appear as right-aligned bubbles; agent replies show the agent's avatar initials and name
6. Empty channel shows 4 discovery suggestion cards specific to that agent's role

---

### Phase 3: Claude Streaming Integration

**Goal:** Each agent responds with real Claude API streaming — tokens appear in real time, each agent has a distinct persona, and the system is secure and resilient.

**Depends on:** Phase 2

**Requirements:** CHAT-06, STREAM-01, STREAM-02, STREAM-03, STREAM-04, INFRA-01, RENDER-01

**Key work:**

- `createServerFn` handler: `sendMessage(agentId, messages[])` → streamed Claude response
- Per-agent system prompts in `agents.ts` (Chief of Staff, Designer, Finance, Legal personas)
- Anthropic SDK `stream()` → SSE or chunked response piped to client
- `Loader` from prompt-kit as thinking indicator (shown from send until first token)
- Markdown rendering for agent responses (`react-markdown` or prompt-kit `Markdown` component)
- Error boundary: inline error card with retry button
- Abort controller: cancel stream on channel switch or component unmount

**Success Criteria — All must be TRUE:**

1. Agent responses stream token-by-token — text visibly grows as Claude generates it
2. Chief of Staff, Designer, Finance, and Legal each respond with clearly distinct personalities
3. `ANTHROPIC_API_KEY` is server-side only — `grep -r "ANTHROPIC" dist/` returns no matches
4. On Claude API failure, user sees an inline error message with a retry button
5. Navigating away mid-stream cancels the request — no orphaned API calls
6. AI responses render markdown (bold, italic, code blocks, lists, headers)

---

### Phase 4: Task Board + Agent Status Badges

**Goal:** Every agent has a pre-seeded task board that makes their work visible — directly solving the black box problem from RFC-0003 §1.6 finding #7.

**Depends on:** Phase 3

**Requirements:** BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05

**Key work:**

- `TaskBoard` component — 5 status sections: Scheduled, In Progress, Needs Input, Done, Failed
- `TaskCard` component — task name, description, status icon, timestamp
- Mock task data per agent (`src/components/workspace/tasks.ts`) — 3–5 tasks each, realistic
- Channel tab toggle — Chat | Tasks (now wired to TaskBoard)
- Sidebar status badge logic: derive agent status from task data (idle / working / needs-input / failed)
- RFC-0003 §3.1 status icons: clock (Scheduled), spinner (In Progress), bell (Needs Input), check (Done), warning (Failed)

**Success Criteria — All must be TRUE:**

1. User can toggle between Chat and Tasks tab per agent channel
2. Task board shows 5 status sections with appropriate icons
3. Each agent's board has 3–5 pre-seeded realistic tasks on first load
4. Task cards show task name, description, and status
5. Sidebar agent entries show a color-coded status badge derived from task state

---

### Phase 5: Polish + Production Hardening

**Goal:** The workspace is demo-ready — smooth UX, resilient error handling, accessible, and bundle-clean.

**Depends on:** Phase 4

**Key work:**

- Per-channel scroll position preservation on channel switch
- Smooth empty → content transitions when first message arrives
- Hung stream timeout (10s) with retry button
- Loading skeleton for initial workspace mount
- Focus management: auto-focus input on channel switch
- Keyboard navigation: sidebar focusable via keyboard
- Bundle audit: confirm no API keys or secrets in `dist/`
- `bun run check` passes clean

**Success Criteria — All must be TRUE:**

1. Thinking indicator appears immediately after sending; disappears on first token
2. Hung streams time out after 10s and show a retry button — no indefinite spinner
3. Each agent channel preserves its scroll position when switching agents
4. Empty agent channels show a welcoming prompt with discovery cards, not a blank screen
5. `grep -r "ANTHROPIC" dist/` returns zero matches after a clean production build

---

### Phase 6: Chat History Sidebar

**Goal:** Replace placeholder sidebar history items with real per-agent conversation history — users can start multiple conversations per agent, switch between them, and see a scrollable history list derived from actual messages.

**Depends on:** Phase 5

**Key work:**

- Restructure `WorkspaceState` to support multiple conversations per agent (`Record<string, Record<string, ChatMessage[]>>`) with active conversation tracking
- Derive conversation titles from first user message
- Wire sidebar history items to real conversation list from state
- "New chat" button to start a fresh conversation per agent
- Conversation switching — clicking a history item loads that conversation
- Wire rename/delete dropdown actions to dispatch state updates

Plans:

- [x] 01-PLAN.md — Multi-conversation state + sidebar wiring

**Success Criteria — All must be TRUE:**

1. Each agent supports multiple independent conversations
2. Sidebar history list shows real conversations titled by first user message
3. Clicking a history item switches to that conversation's messages
4. Starting a "new chat" clears the active conversation and shows the empty state
5. Rename and delete actions in the dropdown menu work on conversation entries

---

### Phase 7: Floating Sidebar Redesign

**Goal:** Give the sidebar a modern, floating appearance — rounded corners, inset padding, and visual separation from the main content area — so it feels detached and elevated rather than flush to the edge.

**Depends on:** Phase 6

**Key work:**

- Wrap sidebar content in a rounded, padded container with a gap from the viewport edges
- Apply subtle background, border, and/or shadow to make the sidebar visually "float"
- Ensure the floating style works in both light and dark mode using semantic color tokens
- Preserve all existing sidebar functionality (agent list, status badges, history items, new chat button)

**Plans:**

- [ ] 01-PLAN.md — Floating sidebar visual treatment

**Success Criteria — All must be TRUE:**

1. Sidebar has visible padding/margin separating it from all viewport edges
2. Sidebar container has rounded corners on all sides
3. Sidebar visually appears elevated/detached from the main content panel
4. No sidebar functionality is broken (switching, history, status badges)
5. Design works correctly in both light and dark mode

---

### Phase 8: Pseudo-Tool Calling

**Goal:** When a user sends a task-oriented message (e.g., "Create a presentation on Q4 results"), the agent visually steps through simulated tool calls in the chat — showing exactly what it's "doing" before delivering the final response. This makes the black box transparent without requiring real tool infrastructure.

**Depends on:** Phase 7

**Key work:**

- `ToolCallCard` component — shows tool name, status icon (spinner → check/error), and collapsible output/result text; sourced from prompt-kit's `Tool` component pattern
- `ToolCallGroup` — wraps a sequence of `ToolCallCard` entries inside an agent message; animates each card through pending → running → done with ~500ms stagger
- Extend `ChatMessage` with a `toolCalls` field: `Array<{ id, name, status, args?, result? }>`
- Add `APPEND_TOOL_CALL` and `UPDATE_TOOL_CALL` dispatch actions to `WorkspaceContext`
- Keyword detection in `chat-view.tsx`: if the user message matches task-oriented patterns (e.g., "create", "draft", "build", "make", "generate"), trigger a tool call sequence before streaming the text reply
- Per-agent tool call libraries (`tasks.ts` or new `tool-calls.ts`): define 3–5 realistic tool sequences per agent role (e.g., Chief of Staff → web_search, draft_doc, send_email; Designer → search_templates, generate_mockup, export_pdf)
- Tool call animation: cards appear sequentially with a stagger; each card transitions from "Running…" spinner to "Done" checkmark as the sequence progresses; the text response streams in after all tool calls complete

**Plans:**

- [x] 01-PLAN.md — Tool call message type + ToolCallCard + per-agent sequences + chat-view integration

**Success Criteria — All must be TRUE:**

1. Sending a task-oriented message (e.g. "create a presentation") triggers at least 2 visible tool call cards before the agent text reply
2. Each tool card cycles through: pending (grey) → running (spinner) → done (green check) or error (red X)
3. Tool call cards are collapsed by default; clicking expands to show args/result details
4. Different agents show different, role-appropriate tool names (e.g. Designer gets "search_templates", Finance gets "pull_financials")
5. Non-task messages (e.g. "what's your name?") show no tool call cards — just a streamed text reply
6. The full sequence — tool cards → text stream — feels coherent and natural, not jarring

## Progress

| Phase                               | Status      | Completed  |
| ----------------------------------- | ----------- | ---------- |
| 1. Static Layout Shell              | ✅ Complete | 2026-02-19 |
| 2. Chat UI + State Infrastructure   | ✅ Complete | 2026-02-19 |
| 3. Claude Streaming Integration     | ✅ Complete | 2026-02-19 |
| 4. Task Board + Agent Status Badges | ✅ Complete | 2026-02-19 |
| 5. Polish + Production Hardening    | ✅ Complete | 2026-02-19 |
| 6. Chat History Sidebar             | ✅ Complete | 2026-02-19 |
| 7. Floating Sidebar Redesign        | ✅ Complete | 2026-02-20 |
| 8. Pseudo-Tool Calling              | ✅ Complete | 2026-02-20 |

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## prompt-kit Component Map

| Component             | Phase | Usage                                              |
| --------------------- | ----- | -------------------------------------------------- |
| `PromptInput`         | 2     | Message composer root                              |
| `PromptInputTextarea` | 2     | Auto-resizing text input                           |
| `PromptInputActions`  | 2     | Send button + future attachments                   |
| `Message`             | 2     | User and agent chat bubbles                        |
| `MessageContent`      | 2     | Bubble content wrapper                             |
| `ChatContainer`       | 2     | Scrollable message area                            |
| `PromptSuggestion`    | 2     | Empty state discovery cards                        |
| `Loader`              | 3     | Thinking indicator (pre-first-token)               |
| `Markdown`            | 3     | Agent response markdown rendering                  |
| `Reasoning`           | 3+    | Optional CoT display (if Claude returns reasoning) |
| `Tool` (pattern)      | 8     | Tool call card — name, status, collapsible result  |

---

_Roadmap created: 2026-02-19_
_Requirements coverage: 24/24 v1 requirements mapped across Phases 1–4_
