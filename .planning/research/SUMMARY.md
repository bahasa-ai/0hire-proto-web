# Project Research Summary

**Project:** Zero Hire — Agent Workspace MVP
**Domain:** Multi-agent AI chat workspace (Slack-like, streaming LLM, per-agent task boards)
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

Zero Hire's agent workspace is a well-understood product archetype in 2026: a Slack-like channel UI where each channel is a specialized AI employee, backed by real Claude streaming and a per-agent Kanban board that makes agent work visible. The canonical pattern — streaming via Server-Sent Events, per-channel message state, Kanban for task transparency, and explicit "Needs Input" blocking states — has been validated by Devin, Kaiban, Kubiya, and Microsoft Magentic-UI as the right UX model for human-in-the-loop AI. The product's differentiation is legibility: users always know what their AI team is doing.

The recommended implementation builds on the existing TanStack Start + React 19 + Tailwind v4 + shadcn base-nova foundation. New additions are minimal: Vercel AI SDK v6 (`ai` + `@ai-sdk/anthropic`) for streaming orchestration, prompt-kit for chat UI components (installed via shadcn CLI), and either Zustand or `useReducer`+Context for workspace state. The streaming pattern is well-documented via official TanStack Start + AI SDK guides; the build order should follow strict dependency layering — layout shell first, state infrastructure second, streaming third, task board fourth, then polish.

The highest-risk areas are streaming implementation pitfalls that are invisible until demo day: a React 19 Strict Mode double-invocation bug that doubles API costs in dev, a stale closure pattern that causes token duplication at high stream rates, a confirmed TanStack Start abort signal bug that lets streams run server-side after navigation, and a code-splitting fragility that can leak `ANTHROPIC_API_KEY` into the browser bundle. All four are preventable with known patterns but require intentional implementation — they cannot be retrofitted cheaply. The one architectural ambiguity to resolve at planning time is state management: STACK.md recommends Zustand for non-chat state (better performance at streaming rates), while ARCHITECTURE.md proposes `useReducer`+Context (no external dep). Both are valid; the roadmapper should pick one and document the decision.

---

## Key Findings

### Recommended Stack

The existing base is unchanged: TanStack Start 1.132.x, React 19, TypeScript strict, Tailwind v4, shadcn `base-nova`. New dependencies are scoped to four additions. Vercel AI SDK v6 (`ai@^6.0.91`, `@ai-sdk/anthropic@^3.0.45`, `@ai-sdk/react`) is the official integration path for TanStack Start streaming — it provides `useChat`, `streamText`, and `toUIMessageStreamResponse()` which together handle the full streaming lifecycle that would otherwise require manual `ReadableStream` plumbing. prompt-kit installs chat-specific components (PromptInput, Message, ChatContainer, Loader, Markdown) as shadcn source files directly into `src/components/ui/`, honoring existing Tailwind tokens with zero new runtime dependencies. Zustand v5 is recommended for agent/task UI state given its selector-based subscriptions prevent full-subtree re-renders during high-frequency streaming updates — a meaningful difference vs. Context at 20+ tokens/second.

**⚠️ Architecture divergence to resolve:** STACK.md recommends `createFileRoute` + `server.handlers.POST` + `useChat` (AI SDK route handler pattern). ARCHITECTURE.md recommends `createServerFn` + async generator + `useReducer`+Context (direct Anthropic SDK, no AI SDK). Both are verified to work. Pick one approach in planning and apply consistently — mixing patterns will produce a maintenance burden. STACK.md pattern has less boilerplate; ARCHITECTURE.md pattern has no Vercel AI SDK dependency.

**Core technologies (new):**

- `ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`: Vercel AI SDK v6 — streaming orchestration with `useChat` + `toUIMessageStreamResponse()`. AI SDK v6 API differs from v5: `sendMessage()` not `handleSubmit()`, `parts[]` not `content` string.
- `zustand@^5.0.11`: Agent/task board state — prevents excessive re-renders during streaming. Owns `activeAgentId`, task boards, agent status badges. `useChat` owns message state.
- `prompt-kit` (via shadcn CLI): Chat UI primitives. **Must** install only chat-specific components (PromptInput, Message, ChatContainer, Loader, Markdown) — installing prompt-kit's generic UI components (Button, Input, ScrollArea) will overwrite existing `base-nova` components with Radix UI versions.

### Expected Features

The product's value proposition — "you always know what your AI team is doing" — translates to a precise MVP scope. Streaming, persistent per-agent chat history, and the Kanban task board are all P1. The "Needs Input" blocking state (surfaced in both the board and sidebar) is the primary differentiator; every competitor either lacks it or buries it.

**Must have (table stakes):**
- Streaming message display (SSE, TTFT <500ms) — every AI product streams; absence feels broken
- Persistent chat history per agent — must survive page refresh; in-memory + localStorage acceptable for prototype
- Send on Enter / Shift+Enter for newline — universal chat convention
- Visual thinking/typing indicator — show immediately on submit, replace with stream on first token
- Sidebar agent navigation — 4 named agents with avatar, role, and status badge
- Markdown rendering in AI responses — raw markdown is unacceptable
- Error state handling with inline retry — silent failures destroy trust

**Should have (differentiators):**
- Per-agent task board (Kanban: Scheduled → In Progress → Needs Input → Done → Failed) — solves the black-box problem
- "Needs Input" blocking state — board column + sidebar badge + chat prompt
- Agent identity with role-specific personality — distinct avatar, color accent, system prompt per agent
- Agent status badge in sidebar — color-coded: idle/working/needs input/failed

**Defer (v2+):**
- Task card ↔ chat linking (creates tasks from chat messages) — HIGH complexity, requires chat↔task state bridge
- File upload to agents — complete upload/storage/parsing subsystem
- Multi-user team collaboration — presence, permissions, conflict resolution
- Business context configuration settings
- External integrations (email, CRM, calendar)

### Architecture Approach

The workspace renders as a single-page layout with a fixed sidebar and a swappable main panel. State is keyed by `AgentId` (`Record<AgentId, AgentState>`) — never a flat array filtered by agent — to prevent per-agent streaming race conditions. All Anthropic SDK calls must live in server-only files (`createServerFn` or route handler) to prevent the `@anthropic-ai/sdk` ~500KB package from reaching the browser bundle. prompt-kit provides the scroll container, message bubbles, and input composer; workspace components wrap these with domain-specific behavior.

**Major components:**

1. `WorkspaceLayout` — top-level layout shell; owns all state (`useReducer` or Zustand store); provides context to workspace tree
2. `WorkspaceSidebar` — agent channel list; reads `activeAgentId` + per-agent task counts for status badges
3. `AgentChannelView` — right pane for the active agent; renders `ChatView` + `TaskBoard` side-by-side or tabbed
4. `ChatView` + `ChatInput` — prompt-kit ChatContainer + Message list + PromptInput; integrates `useChat` or async generator streaming
5. `TaskBoard` + `TaskItem` — Kanban columns per agent; reads/writes task state from workspace store
6. `lib/agents.ts` — static agent definitions (id, name, role, avatar, color accent, system prompt) — single source of truth for all 4 agents
7. `lib/server/claude-stream.ts` (or route handler) — server-only; all Anthropic SDK calls isolated here

### Critical Pitfalls

1. **React 19 Strict Mode double API calls** — Never trigger streaming in `useEffect` on mount; only trigger on explicit user submit action. Add `AbortController` cleanup to any effect that touches the stream.

2. **Stale closure token duplication** — Never use `setState(prev => prev + token)` in a fast streaming loop. Accumulate in `useRef`, set state with the full ref value: `accumulatedRef.current += token; setState(accumulatedRef.current)`.

3. **`ANTHROPIC_API_KEY` leaked to browser bundle** — Keep `@anthropic-ai/sdk` (or `@ai-sdk/anthropic`) imports exclusively in server function files. After every build, verify: `grep -r "ANTHROPIC" dist/` must return no matches.

4. **Env vars undefined in production builds** — `process.env.ANTHROPIC_API_KEY` works in dev but silently breaks in production due to a confirmed TanStack Start issue (#4318). Always run a production smoke test: `bun run build && ANTHROPIC_API_KEY=xxx bun run start` after the first server function is wired.

5. **Abort signal not propagated to streaming handler** — Confirmed TanStack Start bug (#4651). Without abort handling, navigating away mid-stream leaves the Anthropic request running server-side indefinitely. Pass `signal` through the handler and check `signal.aborted` at every `yield`.

6. **prompt-kit overwrites base-nova shadcn components** — `bunx shadcn@latest add` for prompt-kit components that depend on Button/Input/ScrollArea will overwrite existing `base-nova` components with Radix UI versions. Install only chat-specific prompt-kit components; audit `git diff` after every CLI install.

---

## Implications for Roadmap

Based on the dependency chain in FEATURES.md + the build order in ARCHITECTURE.md, a 5-phase structure emerges. Dependencies are strict: later phases break without earlier ones in place.

### Phase 1: Static Layout Shell
**Rationale:** Everything else mounts inside this shell. No state or API calls needed — pure visual structure. Fastest possible "it looks like a product" moment.
**Delivers:** Sidebar with 4 agents (name, avatar, role), clickable channel switching, WorkspaceLayout with correct responsive structure, ChannelHeader with agent identity
**Addresses:** Sidebar agent navigation, agent identity (table stakes from FEATURES.md)
**Avoids:** Building state before the layout is settled (layout changes break state assumptions)
**Research flag:** None — standard Tailwind/shadcn layout work; skip `/gsd:research-phase`

### Phase 2: Chat State Infrastructure
**Rationale:** State architecture must be correct before streaming is layered on top. The per-agent keyed map (`Record<AgentId, AgentState>`) and the streaming-aware reducer actions (`APPEND_CHUNK`, `FINISH_STREAMING`) must exist before any API calls are wired, or the race condition pitfall (Pitfall 7) becomes expensive to fix.
**Delivers:** `lib/agents.ts` static definitions, workspace state (useReducer or Zustand), WorkspaceContext, ChatView with mock responses, per-agent message history that persists across channel switches
**Uses:** `zustand@^5` (if Zustand path) or React Context + useReducer (if Context path)
**Implements:** WorkspaceContext, workspace-reducer, ChatView, ChatInput (mock send)
**Avoids:** Per-agent state race conditions (Pitfall 7 — keyed map from day 1)
**Research flag:** None if Zustand path (well-documented); none if useReducer path. Resolve the architectural ambiguity before this phase.

### Phase 3: Claude Streaming Integration
**Rationale:** Requires Phase 2 state infrastructure. `APPEND_CHUNK` actions and `isStreaming` flag must exist before streaming dispatches tokens. This phase introduces the highest-density pitfall cluster.
**Delivers:** Real Claude responses streaming token-by-token in each agent's chat, per-agent system prompts, Loader indicator during streaming, abort handling on navigation, error states with retry
**Uses:** `ai@^6` + `@ai-sdk/anthropic` + `useChat` (AI SDK path) OR `@anthropic-ai/sdk` + `createServerFn` async generator (direct path)
**Implements:** `lib/server/claude-stream.ts` (server-only), streaming integration in ChatInput
**Avoids:** Pitfalls 1–5 (double API calls, stale closures, bundle leak, prod env vars, abort signal) — must implement all prevention patterns from day one; none can be retrofitted easily
**Research flag:** ⚠️ **Needs research-phase if AI SDK route handler pattern is chosen** — verify `createFileRoute` + `server.handlers.POST` pattern with current TanStack Start version before starting; API changed between versions. Skip if using `createServerFn` path (well-documented in official docs).

### Phase 4: prompt-kit Integration + Task Board
**Rationale:** Can be built in parallel with Phase 3 but benefits from the reducer already existing. prompt-kit replaces any hand-rolled chat UI from Phase 2 with production-quality components. Task board is entirely independent of streaming.
**Delivers:** prompt-kit ChatContainer + Message + PromptInput + Loader replacing Phase 2 mock UI; per-agent Kanban task board (Scheduled / In Progress / Needs Input / Done / Failed) with seeded realistic tasks; agent status badges in sidebar derived from task state
**Uses:** prompt-kit (shadcn CLI install)
**Implements:** `TaskBoard`, `TaskItem`, task reducer actions, `AgentChannelItem` status badge
**Avoids:** Pitfalls 6 + 8 (prompt-kit/base-nova conflicts, Tailwind v4 style conflicts) — audit `git diff` after every `bunx shadcn add`; visual regression across all 4 agent views
**Research flag:** ⚠️ **Needs research-phase** — verify prompt-kit component list and install URLs against current prompt-kit.com/docs before installing; component JSON paths may have changed

### Phase 5: Polish + Production Hardening
**Rationale:** Correct functional behavior first, then quality. All "looks done but isn't" items live here.
**Delivers:** Markdown rendering in AI responses, typing indicator (SET_TYPING to first chunk gap), MessageActions (copy button), "Needs Input" sidebar badge + board call-to-action, empty state per agent, per-agent scroll position persistence on channel switch, 10s timeout with retry button for hung streams, bundle security audit
**Avoids:** Minor pitfalls (Pitfall 10: Markdown flicker, Pitfall 11: conversation history cost cap at 20 messages, Pitfall 12: thinking vs. error visual distinction); production readiness checklist from PITFALLS.md
**Research flag:** None — standard UX polish; skip `/gsd:research-phase`

### Phase Ordering Rationale

- **Layout before state:** Phase 1 produces a stable component tree; Phase 2 adds state into that tree. Reversing this order forces layout rework after state is wired.
- **State before streaming:** The `APPEND_CHUNK` reducer action and per-agent keyed map must exist before the streaming loop dispatches tokens. Building streaming first means retrofitting a different state shape later.
- **Streaming before task board:** Phase 3 is the highest-risk phase (most pitfalls, most new dependencies). Completing it before Phase 4 ensures the core value prop (streaming chat) is proven before adding complexity.
- **prompt-kit integration deferred to Phase 4:** prompt-kit introduces a known conflict risk with `base-nova` components. Integrating it after streaming is stable means any conflict is isolated to the UI layer, not tangled with state bugs.
- **Polish last:** All Phase 5 items are independent improvements on a working system. They can be prioritized individually within the phase.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 3 (if AI SDK route handler path):** Verify `createFileRoute` + `server.handlers.POST` streaming pattern with current TanStack Start version — API surface changed between RC and stable releases
- **Phase 4 (prompt-kit):** Verify current component install URLs (prompt-kit.com/c/*.json) and component API before wiring — install URLs have historically changed between prompt-kit versions

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1:** Standard Tailwind/shadcn layout
- **Phase 2 (if useReducer path):** Well-documented React pattern
- **Phase 5:** Standard UX polish patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core libraries verified against official docs and npm (2026-02-19). AI SDK v6 verified via ai-sdk.dev/docs; prompt-kit via prompt-kit.com/docs; Zustand via npmjs.com. One ambiguity: route handler vs. createServerFn approach — both are documented but require choosing one. |
| Features | HIGH (table stakes), MEDIUM (differentiators) | Table stakes verified against universal chat product conventions. Differentiator analysis based on competitor research (Devin, Lindy, Kaiban) at MEDIUM confidence — vendor blogs and product pages, not independent validation. |
| Architecture | HIGH | Component boundaries, data model, and build order verified against TanStack Start and React patterns. One unresolved ambiguity: state management approach (STACK.md vs. ARCHITECTURE.md disagree on Zustand vs. useReducer). |
| Pitfalls | HIGH (security, streaming bugs), MEDIUM (prompt-kit conflicts) | Critical pitfalls 1–5 have GitHub issue numbers and reproduction steps — HIGH confidence. prompt-kit/base-nova conflict (Pitfall 6) is inferred from component source inspection — MEDIUM; actual severity depends on which prompt-kit components are installed. |

**Overall confidence:** HIGH

### Gaps to Address

- **State management approach:** Resolve Zustand vs. useReducer+Context before Phase 2. STACK.md's Zustand recommendation is motivated by streaming performance; ARCHITECTURE.md's useReducer is motivated by zero external deps. Decision criteria: if task board and sidebar interactions are expected to be complex/frequent, pick Zustand. For a simple prototype, useReducer is sufficient.
- **AI SDK vs. direct Anthropic SDK:** STACK.md advocates Vercel AI SDK v6 route handler pattern; ARCHITECTURE.md advocates `createServerFn` async generator with direct `@anthropic-ai/sdk`. Both work, but mixing them produces two streaming patterns in the same codebase. Decide at roadmap creation time.
- **prompt-kit Tailwind v4 compatibility:** prompt-kit targets shadcn/ui (Radix UI + Tailwind) but this project uses `base-nova` (@base-ui/react + OKLCH tokens). Compatibility is expected but not fully verified. Plan for manual token reconciliation after each prompt-kit install.
- **Context window cost management:** Sending full conversation history per request is acceptable for MVP but will produce unexpected API costs at demo scale. Cap at last 20 messages per agent from the start; add a comment in the server function.

---

## Sources

### Primary (HIGH confidence)
- `ai-sdk.dev/docs/getting-started/tanstack-start` — TanStack Start + AI SDK v6 official quickstart
- `tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions` — TanStack Start streaming docs
- `tanstack.com/start/latest/docs/framework/react/server-functions` — createServerFn docs
- `prompt-kit.com/docs/installation` — prompt-kit shadcn CLI install pattern
- `npmjs.com/package/ai`, `npmjs.com/package/@ai-sdk/anthropic`, `npmjs.com/package/zustand` — latest versions verified
- `arxiv.org/abs/2507.22358` — Microsoft Magentic-UI (academic paper, agent management UX patterns)
- `anthropic.com/news/projects` — Anthropic Projects (agent memory patterns)

### Secondary (MEDIUM confidence)
- `kaibanjs.com/kanban-for-ai` — Kanban for agent transparency pattern
- `docs.kubiya.ai/core-concepts/task-kanban` — Task Kanban docs
- `getathenic.com/blog/streaming-llm-responses-real-time-ux` — streaming UX best practices
- `lukew.com/ff/entry.asp?2106=` — agent management interface patterns
- TanStack Start GitHub issues #3990, #4318, #4651, #3117 — confirmed bugs with workarounds
- `blog.logrocket.com/tanstack-vs-vercel-ai-library-react/` — TanStack AI vs. Vercel AI SDK comparison (Jan 2026)

### Tertiary (LOW confidence)
- `nikiforovall.blog/ai/productivity/2026/02/07/claude-code-kanban.html` — Claude Code Kanban pattern (individual blog)
- `medium.com/@anastasiawalia/ai-chat-layout-patterns...` — AI chat layout patterns (individual article)

---
*Research completed: 2026-02-19*
*Ready for roadmap: yes*
