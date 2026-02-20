# Project State: Zero Hire — Agent Workspace MVP

## Current Phase

**Phase 8: Pseudo-Tool Calling** — complete.

## Execution History

| Phase                                     | Status      | Date       | Notes                                                                                                          |
| ----------------------------------------- | ----------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| Phase 1: Static Layout Shell              | ✅ Complete | 2026-02-19 | Sidebar + main panel, 4 agents, channel switching, user footer                                                 |
| Phase 2: Chat UI + State Infrastructure   | ✅ Complete | 2026-02-19 | prompt-kit chat UI, WorkspaceContext, memo-style agent messages, underline tabs                                |
| Phase 3: Claude Streaming Integration     | ✅ Complete | 2026-02-19 | Google Gemini streaming via `streamChatFn`; Streamdown markdown; abort/retry/timeout; error banner             |
| Phase 4: Task Board + Agent Status Badges | ✅ Complete | 2026-02-19 | TaskBoard + TaskCard; 19 pre-seeded tasks across 4 agents; sidebar status dots with pulse; --warning token     |
| Phase 5: Polish + Production Hardening    | ✅ Complete | 2026-02-19 | Always-mount panels; auto-focus input; arrow-key sidebar nav; Zero Hire title; devtools guard; fade-in         |
| Phase 6: Chat History Sidebar             | ✅ Complete | 2026-02-19 | Multi-conversation state; sidebar history wired to real messages; rename/delete conversations; new chat button |
| Phase 7: Floating Sidebar Redesign        | ✅ Complete | 2026-02-20 | Floating sidebar with rounded corners, inset padding, visual separation from main content                      |
| Phase 8: Pseudo-Tool Calling              | ✅ Complete | 2026-02-20 | Real Gemini function calling; Tool card component; two-turn stream loop; 5-30s fake sleep; 4 agent tools       |

## Key Decisions Log

| Date       | Decision                                                      | Rationale                                                                                    |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2026-02-19 | Per-agent to-do list (not Kanban)                             | RFC-0003 team decision — Kanban foreign to normie target users                               |
| 2026-02-19 | prompt-kit for all chat UI components                         | Purpose-built for AI interfaces; avoids reinventing message bubbles/streaming                |
| 2026-02-19 | TanStack Start `createServerFn` for Claude API                | Keeps API key server-side; aligns with existing stack                                        |
| 2026-02-19 | Mock responses in Phase 2, real Claude in Phase 3             | Derisks chat state implementation before adding streaming complexity                         |
| 2026-02-19 | 4 predefined agents, no custom agents for MVP                 | Simplest path to demonstrating multi-agent UX                                                |
| 2026-02-19 | prompt-kit components sourced from GitHub                     | prompt-kit.com registry returned 429; components manually installed from ibelick/prompt-kit  |
| 2026-02-19 | Google Gemini instead of Anthropic Claude                     | Switched to `@google/genai` with `gemini-2.5-flash-lite`; same streaming contract            |
| 2026-02-19 | Static module import for task data                            | Tasks are read-only in Phase 4 — direct import avoids prop drilling with no downsides        |
| 2026-02-19 | `--warning` OKLCH token added to styles.css                   | No amber token existed; added for `needs-input` status — preserves semantic-token convention |
| 2026-02-20 | Real Gemini function calling (not keyword detection)          | Gemini API `tools: [{ functionDeclarations }]` lets the model decide when to call tools      |
| 2026-02-20 | CollapsibleTrigger without asChild (base-ui constraint)       | base-ui Trigger renders its own button — no asChild support unlike Radix                     |
| 2026-02-20 | tool_call_start as first-chunk trigger for agent message shell | Keeps runStream clean — no separate pre-send shell needed                                    |
| 2026-02-20 | Stream timeout extended to 60s for tool-call paths           | Tool calls take 5-30s; original 10s timeout would fire before any text yielded               |

## Active Constraints

- Bun only — never npm/yarn/pnpm
- Semantic color tokens only — no hardcoded hex/rgb/oklch
- `GOOGLE_AI_API_KEY` server-side only — never in browser bundle
- No backend persistence — all state in-memory/client-side for MVP

## Next Action

All planned phases complete. Project MVP is ready.

---

_Last updated: 2026-02-20_
_Last session: Completed 08-pseudo-tool-calling 01-PLAN.md (5 tasks, 7 min)_
