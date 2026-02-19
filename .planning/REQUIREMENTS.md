# Requirements: Zero Hire — Agent Workspace MVP

**Defined:** 2026-02-19
**Core Value:** A non-technical business owner can talk to their AI team and always know what it's doing — solving the "black box problem" through a familiar chat + task board interface.

## v1 Requirements

### Layout

- [ ] **LAYOUT-01**: User can see a workspace sidebar listing 4 agent channels (Chief of Staff, Designer, Finance, Legal), each with name, avatar, and role label
- [ ] **LAYOUT-02**: User can click an agent channel to switch the active view to that agent
- [ ] **LAYOUT-03**: Active agent channel is visually highlighted in the sidebar
- [ ] **LAYOUT-04**: Channel header displays the active agent's name, role, and brief description

### Chat

- [ ] **CHAT-01**: User can view a scrollable conversation history for the active agent channel
- [ ] **CHAT-02**: User can type a message in an input field and send it to the active agent
- [ ] **CHAT-03**: User can send a message by pressing Enter; Shift+Enter inserts a newline
- [ ] **CHAT-04**: Conversation history persists in-memory when switching between agent channels and back
- [ ] **CHAT-05**: User sees a visual typing/thinking indicator immediately after sending a message, before the first token arrives

### Streaming

- [ ] **STREAM-01**: Agent responses stream token-by-token in real time via the Claude API
- [ ] **STREAM-02**: Each agent responds with a distinct role-specific persona defined by a per-agent system prompt
- [ ] **STREAM-03**: User sees an inline error message with a retry button if the Claude API request fails
- [ ] **STREAM-04**: Navigating away from a channel while a response is streaming cancels the server-side request (no orphaned API calls)

### Rendering

- [ ] **RENDER-01**: AI responses render markdown formatting (bold, italic, code blocks, lists, headers)
- [ ] **RENDER-02**: User messages render as distinct plain-text bubbles aligned to the right
- [ ] **RENDER-03**: AI message bubbles display the agent's avatar and name

### Task Board

- [ ] **BOARD-01**: User can view a per-agent task board alongside (or tabbed with) the chat view
- [ ] **BOARD-02**: Task board has 5 columns: Scheduled, In Progress, Needs Input, Done, Failed
- [ ] **BOARD-03**: Each agent has pre-seeded realistic mock task data demonstrating the board UX
- [ ] **BOARD-04**: Task cards display a task name and brief description
- [ ] **BOARD-05**: Sidebar agent entries display a status badge reflecting current task board state (idle, working, needs-input, failed)

### Infrastructure

- [ ] **INFRA-01**: `ANTHROPIC_API_KEY` is loaded from an environment variable server-side and never exposed to the browser bundle
- [ ] **INFRA-02**: User identity is hardcoded (no authentication or user accounts)

## v2 Requirements

### Task Intelligence

- **TASK-01**: User can create a task from a chat message (chat ↔ task board linking)
- **TASK-02**: Task cards link back to the originating chat message

### Persistence

- **PERS-01**: Chat history persists across browser refresh (localStorage or IndexedDB)
- **PERS-02**: Task board state persists across browser refresh

### Agent Customization

- **AGENT-01**: User can configure business context shared across all agents (company name, industry, etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| File Browser / Zero Drive | Deferred to v2; focus is chat + task board first |
| Authentication / user accounts | Prototype only; no auth needed |
| Multi-user / real-time collaboration | Single user only |
| SOP authoring wizard | Requires more design work; deferred |
| WhatsApp / Telegram / Slack integration | Backend infrastructure; not MVP |
| Agent memory persistence (SOUL.md, USER.md) | Deferred to v2 |
| Skill store / ClawHub integration | Deferred |
| Voice calls | Post-launch per RFC |
| Mobile app | Web-only for MVP |
| File upload to agents | Complete upload/storage/parsing subsystem; deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 1 | Pending |
| LAYOUT-02 | Phase 1 | Pending |
| LAYOUT-03 | Phase 1 | Pending |
| LAYOUT-04 | Phase 1 | Pending |
| CHAT-01 | Phase 2 | Pending |
| CHAT-02 | Phase 2 | Pending |
| CHAT-03 | Phase 2 | Pending |
| CHAT-04 | Phase 2 | Pending |
| CHAT-05 | Phase 2 | Pending |
| STREAM-01 | Phase 3 | Pending |
| STREAM-02 | Phase 3 | Pending |
| STREAM-03 | Phase 3 | Pending |
| STREAM-04 | Phase 3 | Pending |
| RENDER-01 | Phase 4 | Pending |
| RENDER-02 | Phase 2 | Pending |
| RENDER-03 | Phase 2 | Pending |
| BOARD-01 | Phase 4 | Pending |
| BOARD-02 | Phase 4 | Pending |
| BOARD-03 | Phase 4 | Pending |
| BOARD-04 | Phase 4 | Pending |
| BOARD-05 | Phase 4 | Pending |
| INFRA-01 | Phase 3 | Pending |
| INFRA-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-19 after initial definition*
