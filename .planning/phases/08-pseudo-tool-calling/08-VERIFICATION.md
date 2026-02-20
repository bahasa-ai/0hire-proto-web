---
phase: 08-pseudo-tool-calling
verified: 2026-02-20T04:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Ask any agent 'create a presentation on Q1 strategy'"
    expected: 'Tool card appears with spinner and Processing badge for 5–30s, transitions to green checkmark and Completed badge, then text response streams in'
    why_human: 'Requires live Gemini API call with real tool call routing — cannot verify server-side function call detection or timing behavior programmatically'
  - test: "Ask 'what is 2+2' (non-presentation intent)"
    expected: 'No tool call card rendered — just streamed text response'
    why_human: 'Requires Gemini deciding not to call a tool based on intent — cannot mock model decision'
  - test: 'Click a completed tool card to expand it'
    expected: 'Input fields (e.g. title) and Output fields (e.g. url, slides) visible in collapsible panel'
    why_human: 'Requires browser interaction with @base-ui/react collapsible — animation and expand state cannot be verified via grep'
---

# Phase 8: Pseudo-Tool Calling Verification Report

**Phase Goal:** When a user asks an agent to create a presentation, deck, or slides, the agent shows a real Gemini tool call card in the chat that spins for 5–30 seconds before resolving — then streams the text response. Uses prompt-kit's tool.tsx component for rendering.
**Verified:** 2026-02-20T04:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                          | Status   | Evidence                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tool component exists and is substantive with spinner/checkmark/error states                                   | VERIFIED | `src/components/prompt-kit/tool.tsx` — 192 lines, exports `Tool`, `ToolPart`, `ToolProps`; full switch for `input-streaming`/`output-available`/`output-error` states                                                              |
| 2   | Collapsible dependency installed and wired into Tool                                                           | VERIFIED | `src/components/ui/collapsible.tsx` exists (20 lines, wraps `@base-ui/react/collapsible`); `tool.tsx` imports `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`                         |
| 3   | Server emits `tool_call_start` / `tool_call_end` chunks with 5–30s sleep and real Gemini function declarations | VERIFIED | `src/server/chat.ts` lines 8–17: `StreamChunk` union with both types; lines 27–110: `AGENT_TOOLS` for 4 agents; lines 225–237: `5_000 + Math.random() * 25_000` abort-aware sleep; two-turn `sendMessageStream` loop lines 182–276 |
| 4   | State layer has `ToolCall` type, `toolCalls` on `ChatMessage`, `APPEND_TOOL_CALL` / `UPDATE_TOOL_CALL` actions | VERIFIED | `workspace-context.tsx` lines 5–11: `ToolCall` interface; line 24: `toolCalls?: Array<ToolCall>`; lines 81–92: both action types; lines 286–298: reducer cases                                                                     |
| 5   | `chat-view.tsx` handles `tool_call_start` / `tool_call_end` chunks and renders Tool component                  | VERIFIED | Lines 184–212: `tool_call_start` handler dispatches `START_STREAMING` + `APPEND_TOOL_CALL`; lines 213–220: `tool_call_end` dispatches `UPDATE_TOOL_CALL`; lines 386–403: renders `<Tool>` for each `msg.toolCalls` entry           |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact                                         | Expected                                                             | Status   | Details                                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/prompt-kit/tool.tsx`             | Tool component with spinner/check/error states and collapsible panel | VERIFIED | 192 lines — full implementation with `ToolPart`, `ToolProps`, `getStateIcon()`, `getStateBadge()`, `formatValue()`, `Collapsible` wiring                                      |
| `src/components/ui/collapsible.tsx`              | shadcn collapsible wrapping @base-ui                                 | VERIFIED | 20 lines — `Collapsible`, `CollapsibleTrigger` (via `CollapsiblePrimitive.Trigger`), `CollapsibleContent` (via `CollapsiblePrimitive.Panel`) exported                         |
| `src/server/chat.ts`                             | Extended StreamChunk, AGENT_TOOLS, FAKE_TOOL_RESULTS, two-turn loop  | VERIFIED | 278 lines — all four elements present: extended union (lines 8–17), AGENT_TOOLS (lines 27–110), FAKE_TOOL_RESULTS (lines 113–146), two-turn streaming handler (lines 148–277) |
| `src/components/workspace/workspace-context.tsx` | ToolCall type, toolCalls field, two new reducer actions              | VERIFIED | ToolCall interface (lines 5–11), toolCalls on ChatMessage (line 24), APPEND_TOOL_CALL/UPDATE_TOOL_CALL actions (lines 81–92), reducer cases (lines 286–298)                   |
| `src/components/workspace/chat-view.tsx`         | Chunk handling + Tool rendering                                      | VERIFIED | tool_call_start/end chunk handling in runStream (lines 184–220); Tool import (lines 14, 39); Tool rendering in JSX (lines 386–403)                                            |

---

### Key Link Verification

| From             | To                      | Via                                                              | Status | Details                                                                                                                                                                              |
| ---------------- | ----------------------- | ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chat-view.tsx`  | `prompt-kit/tool.tsx`   | `import { Tool }` + `import type { ToolPart }`                   | WIRED  | Lines 14 and 39 — both type and value imported; used at line 401 `<Tool key={tc.id} toolPart={toolPart} />`                                                                          |
| `chat-view.tsx`  | `server/chat.ts`        | `import { streamChatFn }` + `import type { StreamChunk }`        | WIRED  | Line 42: `streamChatFn` called in `runStream`; line 15: `StreamChunk` used as generator type annotation                                                                              |
| `chat-view.tsx`  | `workspace-context.tsx` | `dispatch(APPEND_TOOL_CALL)` + `dispatch(UPDATE_TOOL_CALL)`      | WIRED  | Lines 202–212: APPEND_TOOL_CALL dispatched on tool_call_start; lines 214–220: UPDATE_TOOL_CALL dispatched on tool_call_end                                                           |
| `tool.tsx`       | `collapsible.tsx`       | `import { Collapsible, CollapsibleTrigger, CollapsibleContent }` | WIRED  | Line 11–15 of tool.tsx; all three used in JSX at lines 117, 118, 138                                                                                                                 |
| `server/chat.ts` | Gemini API              | `ai.chats.create` with `tools: [{ functionDeclarations }]`       | WIRED  | Lines 163–168: `agentTools` spread into chat config; lines 182–211: `sendMessageStream` first turn captures `functionCall` part; lines 253–262: second turn sends `functionResponse` |

---

### Requirements Coverage

No `requirements:` field in plan frontmatter and no requirement IDs mapped to phase 08 in REQUIREMENTS.md. Coverage not applicable.

---

### Anti-Patterns Found

No blockers, warnings, or notable stubs found. Scan across all five phase files returned clean results:

- No `TODO`/`FIXME`/`HACK`/`placeholder` comments in phase files
- No stub return patterns (`return null`, `return {}`, `return []`)
- The `placeholder` match in `chat-view.tsx` line 485 is a textarea `placeholder` attribute — not a stub

**One noted deviation (acceptable):** `tool.tsx` uses `CollapsibleTrigger` styled directly via `className` rather than `CollapsibleTrigger asChild` wrapping a `Button` as specified in the plan. This is the correct adaptation — `@base-ui/react/collapsible` renders its own interactive element and does not support the `asChild` pattern. The result is functionally equivalent and visually styled correctly.

---

### Human Verification Required

#### 1. Tool call card triggers on presentation intent

**Test:** Open the app, navigate to any agent (e.g., Chief of Staff), type "create a presentation on Q1 hiring strategy" and send.
**Expected:** The agent message area shows a tool call card with `create_presentation` name, a blue spinning Loader2 icon, and "Processing" badge. After 5–30 seconds the card transitions to green CheckCircle and "Completed" badge, then the text response streams in below.
**Why human:** Requires live Gemini API to classify user intent and emit a `functionCall` part. Cannot mock Gemini's decision-making or verify timing behavior programmatically.

#### 2. Non-presentation messages bypass tool call flow

**Test:** Send "what is your name?" or "summarize the last meeting" to any agent.
**Expected:** No tool call card rendered. Text response streams directly with no spinner.
**Why human:** Requires Gemini to decide not to invoke the tool — depends on model intent classification which cannot be replicated with grep.

#### 3. Collapsible expand/collapse interaction

**Test:** After a tool card resolves to "Completed", click the card header.
**Expected:** Panel expands to reveal Input section (e.g., `title: Q1 hiring strategy`) and Output section (e.g., `url`, `slides_generated`, `sections`). Clicking again collapses.
**Why human:** Requires browser interaction with `@base-ui/react/collapsible` — open/close state and panel animation cannot be verified statically.

#### 4. Agent tool name differentiation

**Test:** Ask the Designer agent "build me a pitch deck" and the Finance agent "create a financial model deck".
**Expected:** Designer card shows `generate_deck_design`, Finance card shows `build_financial_model`. Output fields differ per fake result.
**Why human:** Requires live API calls per agent and verifying rendered tool card names match AGENT_TOOLS declarations.

---

### Gaps Summary

No gaps. All five must-haves pass all three verification levels (exists, substantive, wired). The two-turn Gemini function calling loop, abort-aware fake sleep, ToolCall reducer pattern, and Tool card rendering pipeline are all fully implemented and correctly connected. Human verification is recommended to confirm the end-to-end flow with a live API key.

---

_Verified: 2026-02-20T04:00:00Z_
_Verifier: Claude (gsd-verifier)_
