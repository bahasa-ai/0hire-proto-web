# Roadmap: Zero Hire — Agent Workspace MVP

## Overview

Four-phase build from static shell to fully functional AI workspace. Phase 1 is complete. The remaining phases wire up real chat (Phase 2), live Claude streaming (Phase 3), the agent task board (Phase 4), and production polish (Phase 5).

The single core value — a non-technical operator can talk to their AI team and see exactly what it's doing — is realized after Phase 4. Phase 5 makes it demo-ready.

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

## Progress

| Phase                               | Status      | Completed  |
| ----------------------------------- | ----------- | ---------- |
| 1. Static Layout Shell              | ✅ Complete | 2026-02-19 |
| 2. Chat UI + State Infrastructure   | ✅ Complete | 2026-02-19 |
| 3. Claude Streaming Integration     | ✅ Complete | 2026-02-19 |
| 4. Task Board + Agent Status Badges | ✅ Complete | 2026-02-19 |
| 5. Polish + Production Hardening    | ✅ Complete | 2026-02-19 |

**Execution order:** 1 → 2 → 3 → 4 → 5

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

---

_Roadmap created: 2026-02-19_
_Requirements coverage: 24/24 v1 requirements mapped across Phases 1–4_
