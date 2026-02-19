# Roadmap: Zero Hire — Agent Workspace MVP

## Overview

Five phases building from the outside in: visual shell first (Phase 1), chat state infrastructure second (Phase 2), real Claude streaming third (Phase 3), prompt-kit UI and task board fourth (Phase 4), then production hardening and polish last (Phase 5). Each phase delivers a coherent, verifiable capability that unblocks the next. The core value — a non-technical operator can talk to their AI team and see exactly what it's doing — is fully realized after Phase 5.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Static Layout Shell** - Workspace chrome with sidebar, channel switching, and agent headers — no state or API calls
- [ ] **Phase 2: Chat State Infrastructure** - Per-agent message state, mock chat UX, and channel persistence using useReducer+Context
- [ ] **Phase 3: Claude Streaming Integration** - Real Claude API streaming via createServerFn + direct Anthropic SDK
- [ ] **Phase 4: prompt-kit + Task Board** - Production chat UI via prompt-kit, per-agent task boards, sidebar status badges
- [ ] **Phase 5: Polish + Production Hardening** - Typing indicators, error recovery, abort handling, scroll state, bundle security audit

## Phase Details

### Phase 1: Static Layout Shell
**Goal**: The workspace looks and feels like a real product — sidebar with all 4 agents, clickable channel switching, and identity-rich channel headers — with no state management or API calls
**Depends on**: Nothing (first phase)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, INFRA-02
**Success Criteria** (what must be TRUE):
  1. User sees a sidebar listing Chief of Staff, Designer, Finance, and Legal — each with name, avatar, and role label
  2. User can click any agent channel and the main panel switches to that agent's view
  3. The active agent is visually highlighted in the sidebar
  4. The channel header displays the active agent's name, role, and brief description
  5. Workspace loads directly with hardcoded user identity — no login prompt
**Plans**: TBD

### Phase 2: Chat State Infrastructure
**Goal**: Users can have a functional chat conversation with each agent using mock responses, with per-agent message history that survives channel switching
**Depends on**: Phase 1
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, RENDER-02, RENDER-03
**Success Criteria** (what must be TRUE):
  1. User sees a scrollable conversation history for the active agent channel
  2. User can type and send a message — a mock response appears immediately
  3. Pressing Enter sends the message; Shift+Enter inserts a newline without sending
  4. Switching to another agent and back preserves both agents' conversation histories independently
  5. User messages appear as right-aligned plain-text bubbles; agent replies show the agent's avatar and name
**Plans**: TBD

### Phase 3: Claude Streaming Integration
**Goal**: Each agent responds with real Claude API streaming — tokens appear in real time, each agent has a distinct persona, and the system is secure and resilient against failures and navigation
**Depends on**: Phase 2
**Requirements**: STREAM-01, STREAM-02, STREAM-03, STREAM-04, INFRA-01
**Success Criteria** (what must be TRUE):
  1. Agent responses stream token-by-token in real time — text visibly grows as Claude generates it
  2. Chief of Staff, Designer, Finance, and Legal each respond with a clearly distinct personality and domain focus
  3. `ANTHROPIC_API_KEY` is server-side only — `grep -r "ANTHROPIC" dist/` returns no matches after a production build
  4. If the Claude API request fails, the user sees an inline error message with a retry button
  5. Navigating away from a channel mid-stream cancels the server-side request — no orphaned API calls
**Plans**: TBD

### Phase 4: prompt-kit + Task Board
**Goal**: The chat UI uses production-quality prompt-kit components and every agent has a pre-seeded task board that makes their work visible
**Depends on**: Phase 3
**Requirements**: RENDER-01, BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05
**Success Criteria** (what must be TRUE):
  1. AI responses render markdown formatting — bold, italic, code blocks, lists, and headers display correctly
  2. User can view a per-agent task board with 5 columns: Scheduled, In Progress, Needs Input, Done, Failed
  3. Each agent's board has pre-seeded realistic mock tasks visible on first load
  4. Task cards display a task name and brief description
  5. Sidebar agent entries show a color-coded status badge (idle / working / needs-input / failed) derived from task board state
**Plans**: TBD

### Phase 5: Polish + Production Hardening
**Goal**: The workspace is production-ready — smooth UX details, resilient error handling, per-agent scroll state, and a clean bundle security audit
**Depends on**: Phase 4
**Requirements**: *(cross-cutting — all 23 v1 requirements are functionally complete after Phase 4; this phase delivers quality attributes that make the product demo-ready)*
**Success Criteria** (what must be TRUE):
  1. A visual thinking/loading indicator appears immediately after sending a message and disappears when the first token arrives
  2. Hung streams time out after 10 seconds and show a retry button — no indefinite spinner
  3. Each agent channel preserves its scroll position when switching between agents and back
  4. Empty agent channels show a welcoming prompt, not a blank screen
  5. `grep -r "ANTHROPIC" dist/` returns no matches after a clean production build
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Static Layout Shell | 0/? | Not started | - |
| 2. Chat State Infrastructure | 0/? | Not started | - |
| 3. Claude Streaming Integration | 0/? | Not started | - |
| 4. prompt-kit + Task Board | 0/? | Not started | - |
| 5. Polish + Production Hardening | 0/? | Not started | - |

---
*Roadmap created: 2026-02-19*
*Coverage: 23/23 v1 requirements mapped*
