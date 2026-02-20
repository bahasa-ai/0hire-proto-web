---
phase: 08-pseudo-tool-calling
plan: 01
subsystem: ui
tags: [react, gemini, function-calling, tool-calling, streaming, collapsible, shadcn, prompt-kit]

# Dependency graph
requires:
  - phase: 03-claude-streaming-integration
    provides: streamChatFn server function, StreamChunk type, @google/genai integration
  - phase: 02-chat-ui-state
    provides: WorkspaceContext, ChatMessage, reducer pattern, chat-view.tsx streaming loop
provides:
  - Gemini real function calling with two-turn loop (sendMessageStream x2)
  - Tool collapsible card component (prompt-kit/tool.tsx) with status icons and badges
  - tool_call_start / tool_call_end StreamChunk types
  - APPEND_TOOL_CALL / UPDATE_TOOL_CALL reducer actions and ToolCall type
  - Per-agent function declarations (4 agents, 1 tool each)
  - Fake tool results with 5-30s abort-aware simulated sleep
affects: [future-agent-features, chat-view, workspace-context]

# Tech tracking
tech-stack:
  added:
    - "@base-ui/react/collapsible (via shadcn collapsible component)"
    - "Gemini FunctionDeclaration API (tools: [{ functionDeclarations }])"
  patterns:
    - "Two-turn function call loop: first sendMessageStream captures functionCall part, second sends functionResponse Part"
    - "tool_call_start acts as first-chunk trigger for agent message shell creation"
    - "Abort-aware sleep: Promise wrapping setTimeout + signal.addEventListener(abort)"
    - "ToolCall status lifecycle: running → done | error"

key-files:
  created:
    - src/components/prompt-kit/tool.tsx
    - src/components/ui/collapsible.tsx
  modified:
    - src/server/chat.ts
    - src/components/workspace/workspace-context.tsx
    - src/components/workspace/chat-view.tsx

key-decisions:
  - "Use real Gemini function calling API (not client-side keyword detection) — Gemini decides when to call tools based on intent"
  - "CollapsibleTrigger is styled directly (no asChild) — base-ui does not support asChild pattern unlike Radix"
  - "Timeout extended from 10s to 60s — tool calls take 5-30s before yielding any text chunks"
  - "tool_call_start chunk creates the agent message shell — no separate pre-send shell needed"

patterns-established:
  - "Tool card pattern: ToolPart type bridges ToolCall (context state) to Tool component (render primitive)"
  - "Agent-specific tools: AGENT_TOOLS[agentId] keyed by agent ID, spread into chat config only when present"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-02-20
---

# Phase 8 Plan 01: Pseudo-Tool Calling Summary

**Real Gemini function calling with two-turn streaming loop — tool call cards render inline in chat with spinner/checkmark status transitions and collapsible input/output panels**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-20T03:20:37Z
- **Completed:** 2026-02-20T03:27:45Z
- **Tasks:** 5
- **Files modified:** 5 (created 2, modified 3)

## Accomplishments

- Installed shadcn collapsible (base-ui backed) used by the Tool component
- Built `src/components/prompt-kit/tool.tsx` — collapsible card with spinner/check/error icons and Processing/Completed/Error badges
- Extended `src/server/chat.ts` with real Gemini function declarations per agent, two-turn sendMessageStream loop, and 5-30s abort-aware fake sleep
- Added `ToolCall` type, `toolCalls` field on `ChatMessage`, and `APPEND_TOOL_CALL` / `UPDATE_TOOL_CALL` reducer actions to workspace-context
- Wired `tool_call_start` / `tool_call_end` chunk handling in `chat-view.tsx` runStream loop with inline Tool card rendering

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn collapsible** - `d9c3ffc` (chore)
2. **Task 2: Add tool.tsx to prompt-kit** - `15afa0d` (feat)
3. **Task 3: Add StreamChunk types + tool declarations to chat.ts** - `4fda46b` (feat)
4. **Task 4: Extend workspace-context** - `1bb3ebb` (feat)
5. **Task 5: Wire into chat-view.tsx** - `53f4e5a` (feat)

## Files Created/Modified

- `src/components/ui/collapsible.tsx` — shadcn collapsible wrapping @base-ui/react/collapsible
- `src/components/prompt-kit/tool.tsx` — Tool component with ToolPart/ToolProps types, status icons, expandable panels
- `src/server/chat.ts` — Extended StreamChunk union, AGENT_TOOLS declarations, FAKE_TOOL_RESULTS, two-turn function call handler
- `src/components/workspace/workspace-context.tsx` — ToolCall interface, toolCalls on ChatMessage, APPEND_TOOL_CALL / UPDATE_TOOL_CALL actions and reducer cases
- `src/components/workspace/chat-view.tsx` — tool_call_start/end chunk handling, Tool card rendering, 60s timeout

## Decisions Made

- **Real Gemini function calling over keyword detection:** Gemini API's `tools: [{ functionDeclarations }]` config lets the model decide when to call tools based on intent — no fragile client-side string matching
- **CollapsibleTrigger without asChild:** The installed base-ui collapsible does not support `asChild`. The trigger is styled via `className` directly on `CollapsibleTrigger`
- **Timeout extended to 60s:** The original 10s timeout would fire before the 5-30s tool sleep completes. Extended to 60s to accommodate the full tool call lifecycle
- **tool_call_start as first-chunk trigger:** Treating the tool_call_start chunk as the "first event" that creates the agent message shell keeps the runStream logic clean without a separate pre-send shell

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted tool.tsx for base-ui collapsible (no asChild)**
- **Found during:** Task 2 (Add tool.tsx)
- **Issue:** Plan specified `CollapsibleTrigger asChild` wrapping a Button — base-ui's CollapsibleTrigger renders its own button element and doesn't support asChild
- **Fix:** Styled CollapsibleTrigger directly with className instead of nesting a Button inside it
- **Files modified:** src/components/prompt-kit/tool.tsx
- **Verification:** Component renders correctly, lint passes clean
- **Committed in:** `15afa0d` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Fixed __root.tsx pre-existing lint error**
- **Found during:** Task 2 (first lint run)
- **Issue:** `state.conversations[agentId]?.[conversationId]?.title` flagged as unnecessary optional chain — blocked bun run check
- **Fix:** Added eslint-disable-next-line comment to suppress the false positive
- **Files modified:** src/routes/__root.tsx
- **Verification:** `bun run check` passes clean
- **Committed in:** `15afa0d` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed multiple lint errors in chat.ts**
- **Found during:** Task 3 (lint run after writing chat.ts)
- **Issues:** `FunctionDeclaration[]` → `Array<FunctionDeclaration>` (array-type rule); unnecessary type assertion; unnecessary optional chain; TypeScript false-positives on `signal.aborted` after await
- **Fix:** Used Array<T> syntax; removed unnecessary `as` cast; added eslint-disable comments for signal.aborted checks (valid at runtime but TS thinks they're always false)
- **Files modified:** src/server/chat.ts
- **Verification:** `bun run check` passes clean
- **Committed in:** `4fda46b` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 adaptation, 2 lint/type fixes)
**Impact on plan:** All fixes necessary for correct operation and clean build. No scope creep.

## Issues Encountered

- `sendMessageStream` function response format: `message: [{ functionResponse: { name, response } }]` works correctly — `Part[]` is accepted via `PartListUnion = PartUnion[] | PartUnion` where `PartUnion = Part | string`
- base-ui CollapsiblePanel uses `data-[open]` / `data-[closed]` attributes, not Radix-style `data-[state=open]`. Removed Radix animation classes from tool.tsx — collapsible works without CSS animations

## User Setup Required

None - no external service configuration required. `GOOGLE_AI_API_KEY` already in use from Phase 3.

## Next Phase Readiness

- Tool call feature is complete and functional end-to-end
- All 4 agents have tool declarations — asking any agent to create a presentation/deck/document triggers the tool card
- `bun run check` passes clean
- No blockers for future phases

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/components/ui/collapsible.tsx | FOUND |
| src/components/prompt-kit/tool.tsx | FOUND |
| src/server/chat.ts | FOUND |
| src/components/workspace/workspace-context.tsx | FOUND |
| src/components/workspace/chat-view.tsx | FOUND |
| .planning/phases/08-pseudo-tool-calling/08-pseudo-tool-calling-01-SUMMARY.md | FOUND |
| Commit d9c3ffc (Task 1) | FOUND |
| Commit 15afa0d (Task 2) | FOUND |
| Commit 4fda46b (Task 3) | FOUND |
| Commit 1bb3ebb (Task 4) | FOUND |
| Commit 53f4e5a (Task 5) | FOUND |

---
*Phase: 08-pseudo-tool-calling*
*Completed: 2026-02-20*
