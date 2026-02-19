# Requirements: Zero Hire — Agent Workspace MVP

**Defined:** 2026-02-19 (revised)
**Core Value:** Solve the black box problem — a non-technical operator can talk to their AI team and always know what it's doing.

---

## v1 Requirements

### Layout (Phase 1)

- [ ] **LAYOUT-01**: Sidebar lists 4 agent channels (Chief of Staff, Designer, Finance, Legal) with name, avatar initials, and role label
- [ ] **LAYOUT-02**: Clicking an agent channel switches the main panel to that agent's view
- [ ] **LAYOUT-03**: Active agent channel is visually highlighted in the sidebar
- [ ] **LAYOUT-04**: Channel header shows the active agent's name, role, and brief description
- [ ] **INFRA-02**: User identity is hardcoded — no authentication required

### Chat UI (Phase 2)

- [ ] **CHAT-01**: Scrollable conversation history per agent channel using `ChatContainer` from prompt-kit
- [ ] **CHAT-02**: Message composer using `PromptInput` + `PromptInputTextarea` from prompt-kit
- [ ] **CHAT-03**: Enter sends; Shift+Enter inserts newline
- [ ] **CHAT-04**: Per-agent message history survives channel switching (in-memory)
- [ ] **CHAT-05**: Empty channel shows prompt-kit `PromptSuggestion` discovery cards (3–4 per agent)
- [ ] **RENDER-02**: User messages as `Message` bubbles aligned right
- [ ] **RENDER-03**: Agent reply bubbles show agent avatar initials and name via `Message` component

### Streaming + API (Phase 3)

- [ ] **CHAT-06**: Visual thinking indicator (`Loader` from prompt-kit) appears immediately after send, before first token
- [ ] **STREAM-01**: Agent responses stream token-by-token via Claude API
- [ ] **STREAM-02**: Each agent responds with a distinct role-specific persona (system prompt per agent)
- [ ] **STREAM-03**: Inline error message with retry button on Claude API failure
- [ ] **STREAM-04**: Navigating away mid-stream cancels the server-side request
- [ ] **INFRA-01**: `ANTHROPIC_API_KEY` is server-side only — never in browser bundle
- [ ] **RENDER-01**: AI responses render markdown (bold, italic, code blocks, lists, headers)

### Task Board (Phase 4)

- [ ] **BOARD-01**: Per-agent task board accessible via tab toggle alongside chat
- [ ] **BOARD-02**: Task board shows 5 status groups: Scheduled, In Progress, Needs Input, Done, Failed
- [ ] **BOARD-03**: Each agent has pre-seeded realistic mock tasks visible on first load
- [ ] **BOARD-04**: Task cards show task name, brief description, and status icon
- [ ] **BOARD-05**: Sidebar agent entries show a status badge (idle / working / needs-input / failed) derived from task state

---

## v2 Requirements (Out of Scope for MVP)

### Task Intelligence

- **TASK-01**: Create a task from a chat message (chat ↔ board linking)
- **TASK-02**: Task cards link back to originating chat message

### Persistence

- **PERS-01**: Chat history survives browser refresh (localStorage / IndexedDB)
- **PERS-02**: Task board state survives browser refresh

### Agent Customization

- **AGENT-01**: User can configure shared business context (company name, industry)
- **AGENT-02**: Agent name and personality customizable (maps to RFC-0003 §3.6 SOUL.md abstraction)

### File Browser

- **FILE-01**: Cloud workspace file browser (RFC-0003 Interface 2) — Zero Drive sync deferred

### SOP Authoring

- **SOP-01**: Guided SOP wizard — RFC-0003 §3.2 hero feature, requires dedicated design pass

---

## Out of Scope

| Feature                                      | Reason                                                   |
| -------------------------------------------- | -------------------------------------------------------- |
| File Browser / Zero Drive                    | Deferred to v2 — focus is chat + task board first        |
| Authentication / user accounts               | Prototype only                                           |
| Multi-user / real-time collaboration         | Single user only                                         |
| SOP authoring wizard                         | Requires dedicated design; deferred per RFC              |
| WhatsApp / Telegram / Slack integration      | Backend infra; not MVP                                   |
| Agent memory persistence (SOUL.md / USER.md) | Deferred to v2                                           |
| Skill store / ClawHub integration            | Deferred                                                 |
| Voice calls                                  | Post-launch per RFC §3.8                                 |
| Mobile app                                   | Web-only for MVP                                         |
| File upload to agents                        | Complete upload/storage/parsing subsystem; deferred      |
| Named thread sessions                        | v2 — RFC §1.6 finding #2; MVP is single thread per agent |

---

## Traceability

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| LAYOUT-01   | Phase 1 | Pending |
| LAYOUT-02   | Phase 1 | Pending |
| LAYOUT-03   | Phase 1 | Pending |
| LAYOUT-04   | Phase 1 | Pending |
| INFRA-02    | Phase 1 | Pending |
| CHAT-01     | Phase 2 | Pending |
| CHAT-02     | Phase 2 | Pending |
| CHAT-03     | Phase 2 | Pending |
| CHAT-04     | Phase 2 | Pending |
| CHAT-05     | Phase 2 | Pending |
| RENDER-02   | Phase 2 | Pending |
| RENDER-03   | Phase 2 | Pending |
| CHAT-06     | Phase 3 | Pending |
| STREAM-01   | Phase 3 | Pending |
| STREAM-02   | Phase 3 | Pending |
| STREAM-03   | Phase 3 | Pending |
| STREAM-04   | Phase 3 | Pending |
| INFRA-01    | Phase 3 | Pending |
| RENDER-01   | Phase 3 | Pending |
| BOARD-01    | Phase 4 | Pending |
| BOARD-02    | Phase 4 | Pending |
| BOARD-03    | Phase 4 | Pending |
| BOARD-04    | Phase 4 | Pending |
| BOARD-05    | Phase 4 | Pending |

**Coverage:** 24 v1 requirements — 0 complete, 24 pending (Phases 1–4)

---

_Created: 2026-02-19_
