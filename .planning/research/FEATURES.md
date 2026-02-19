# Feature Research

**Domain:** AI Agent Workspace — Slack-like chat UI for specialized AI employees
**Researched:** 2026-02-19
**Confidence:** HIGH (streaming/chat UX), MEDIUM (agent transparency patterns), MEDIUM (competitor analysis)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken compared to ChatGPT, Slack, or any messaging product they use daily.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Streaming message display | Every AI product streams — waiting for full response feels broken. TTFT under 500ms is the critical metric. Users perceive streaming as 40% faster even when total time is identical. | MEDIUM | Use SSE (Server-Sent Events), not WebSockets. Batch DOM updates every 50–100ms to avoid jank. Save partial responses for graceful retry. |
| Persistent chat history per agent | Users expect to scroll back and see what they said and what the AI replied. No memory = feels disposable. | LOW | In-memory or localStorage is fine for prototype. Key: history must survive page refresh. |
| Send message on Enter, Shift+Enter for newline | Every chat product (iMessage, Slack, WhatsApp) works this way. Wrong behavior is jarring. | LOW | Textarea with controlled keyboard events. |
| Visual "thinking/typing" indicator | Shows the AI is processing, not broken. Critical for responses that take >1 second to start. | LOW | Animated dots or pulse. Show immediately on send, replace with streaming when first token arrives. |
| Message timestamps | Users orient themselves in history via time. Without timestamps, chat feels untrustworthy. | LOW | Relative time (e.g., "2 min ago") acceptable. |
| Distinct visual treatment for user vs AI messages | Chat bubble conventions are universal. Without clear left/right or color separation, messages are unreadable. | LOW | Standard chat bubble pattern. AI message left-aligned, user right-aligned, or use name/avatar labels. |
| Markdown rendering in AI responses | AI responses contain headers, bullets, code blocks. Raw markdown is unacceptable in production. | LOW | `react-markdown` or similar. Pre-existing in most TanStack/React setups. |
| Sidebar agent navigation | Users expect a list of "who they can talk to." This is the core Slack metaphor the product uses. | LOW | Already planned. Sidebar with agent names, avatars, last-message preview. |
| Active agent indicator | Shows which agent you're currently chatting with. No indicator = users get lost. | LOW | Highlight in sidebar, name in chat header. |
| Empty state messaging | First-time empty chat needs a prompt or greeting from the agent, otherwise the product looks broken. | LOW | Per-agent intro message or suggested prompts. |
| Error state handling | Network errors, API failures must show something. Silent failures destroy trust immediately. | LOW | Inline error message with retry. Not a modal. |

---

### Differentiators (Competitive Advantage)

Features that make 0hire's "you always know what your AI team is doing" value prop tangible. Not expected from generic AI chat, but high value for small business operators who distrust black-box AI.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-agent task board (Kanban) | Solves the black box problem directly. Users see exactly what each AI employee is doing, what's blocked, and what's done — without having to ask. Kaiban Board, Claude Code Kanban, and Kubiya have all adopted this pattern in 2025–2026 as the canonical agent transparency UI. | MEDIUM | Columns: Scheduled → In Progress → Needs Input → Done → Failed. Cards show task name, brief description, timestamp. Clickable to expand. |
| "Needs Input" blocking state with notification | When an agent is blocked and can't proceed, it surfaces explicitly in the board AND in the sidebar (badge/indicator). This is the human-in-the-loop intervention point that differentiates 0hire from fire-and-forget AI. Microsoft Magentic-UI calls this "action guards." | MEDIUM | Needs Input column in board + unread indicator on sidebar agent + message in chat prompting the user. |
| Agent identity with role-specific personality | Specialized agents (Chief of Staff, Designer, Finance, Legal) feel like distinct people with different expertise registers. This creates psychological safety — users know who to talk to and what to expect. Research shows consistent persona outperforms adaptive mimicry for trust. | LOW | Distinct avatar, name, color accent, and system prompt per agent. Static personas outperform dynamic ones for trust. |
| Task card creation from chat | When the AI commits to a task in chat, it automatically appears on the board. Chat and board are synchronized views of the same work. This closes the loop — users don't have to wonder if the AI "remembered." | HIGH | Requires state model connecting chat messages to task records. Deferred to later milestone unless already architected. |
| Agent status badge in sidebar | Each agent in the sidebar shows their current work state at a glance (idle, thinking, in progress, needs input). Small business owners check in periodically — this gives them a dashboard without leaving chat. | LOW | Badge/dot on sidebar avatar. Color-coded: green=idle, blue=working, orange=needs input, red=failed. |
| Streaming token display with "reasoning visible" | Showing the AI thinking in real-time (not just the output, but the progression of thought) makes the process legible. Users who can watch the answer form trust it more than a response that appears fully-formed. | LOW | Standard streaming is sufficient. Do not need to expose chain-of-thought logs at this stage. |
| Task history / audit trail | Users can see what the agent did, when, and what the outcome was. This is especially important for Finance and Legal agents where accountability matters. | MEDIUM | Done column in Kanban is the MVP. Later: expandable task cards with full action log. |
| Per-agent context memory | Agent "remembers" the user's business context across sessions (what industry, what their goals are). Makes each agent feel dedicated vs. generic. | HIGH | Complex for prototype. Scope to static system prompts that encode business context for now. |

---

### Anti-Features (Deliberately NOT Building)

Features that seem natural for a "workspace" product but would bloat scope, undermine UX, or distract from the core transparency value prop in a single-user prototype.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| User authentication / login | "Every real product has auth" | Single-user prototype — auth adds zero value and significant complexity. Zero Hire's thesis is speed of delivery, not security infrastructure. | Skip entirely. Add only when multi-user is required. |
| Multi-user / team collaboration | "Make it like real Slack" | Collaboration requires presence, permissions, conflict resolution, and shared state — months of engineering. The product's value is human ↔ AI, not human ↔ human. | Document as a Phase 3+ feature if product-market fit is established. |
| File upload / attachment handling | "I want to send my PDF to Legal" | Multipart uploads, storage, parsing pipeline, and context injection are a complete subsystem. Real value, but significant distraction from core chat → task → transparency loop. | Deferred to v2. Note it as a planned differentiator. |
| Real-time push notifications / desktop alerts | "Alert me when the agent is done" | Requires background worker, push token registration, notification permissions UX. No backend means no server-side triggers. | Board's "Needs Input" badge is the pull-based equivalent — users check in rather than being interrupted. |
| Complex admin / settings panel | "I need to configure each agent" | Settings pages are scope traps. Every option you expose becomes a support burden. Small business owners don't want to configure AI — they want it to work. | Bake defaults into agent system prompts. Expose only what is genuinely differentiating (e.g., business name/industry context). |
| Agent-to-agent visible collaboration | "Show agents talking to each other" | Multi-agent orchestration is invisible infrastructure, not a UX feature. Showing raw agent-to-agent chatter confuses users, introduces latency, and undermines the "clean employee" metaphor. | Model multi-agent coordination as tasks that appear on the board — users see outcomes, not plumbing. |
| Message editing / deletion | "I want to fix my message" | Editing chat history in an AI product requires re-generating responses downstream. Complex and breaks conversation linearity. | Accept messages as immutable. Users can simply send a follow-up correction. |
| Onboarding wizard / setup flow | "New users won't know what to do" | Wizard flows are high effort, often skipped, and date quickly. Core UX should be self-evident from the interface. | Empty state messages and agent intros handle onboarding inline. |
| Integrations (Slack, email, CRM) | "Make it actually useful" | Every integration is a production-grade subsystem. This is a UI prototype — integrations are out of scope until the UX is validated. | Document as Phase 4+ infrastructure layer. |

---

## Feature Dependencies

```
Sidebar Agent Navigation
    └──requires──> Agent Identity (name, avatar, role)
                       └──requires──> Agent color/theme tokens
                                          └──requires──> Design system tokens in styles.css

Per-Agent Task Board (Kanban)
    └──requires──> Task data model (id, title, status, agentId, timestamp)
    └──requires──> Agent Identity

Agent Status Badge in Sidebar
    └──requires──> Sidebar Agent Navigation
    └──requires──> Task data model (to derive current status)

"Needs Input" Blocking State
    └──requires──> Per-Agent Task Board
    └──requires──> Agent Status Badge in Sidebar

Streaming Message Display
    └──requires──> Claude API integration (real SSE stream)
    └──enhances──> Visual Thinking Indicator (indicator disappears when stream starts)

Task Card Creation from Chat
    └──requires──> Task data model
    └──requires──> Streaming Message Display
    └──conflicts──> Simple hardcoded task data (must migrate to dynamic state)

Persistent Chat History
    └──requires──> Message data model (per agent, ordered)
    └──enhances──> Streaming Message Display (appends to persistent list)
```

### Dependency Notes

- **Agent Identity required by everything:** Every visual and functional feature depends on a consistent agent identity model (id, name, role, avatar, color). This must be defined first.
- **Task data model gates transparency features:** The Kanban board, status badges, and "Needs Input" flow all require a shared task record shape. This is the architectural crux of the product.
- **Streaming requires real API integration:** The prototype already targets real Claude API calls. Fake/mocked streaming is an anti-pattern — it destroys the trust value that streaming creates.
- **Task card creation from chat is high complexity:** Requires connecting the chat event stream to a task mutation. Defer until core chat + board are stable.

---

## MVP Definition

### Launch With (v1 — Current Milestone)

Minimum to validate the core "know what your AI team is doing" thesis.

- [ ] **Sidebar with agent channels** — navigation between 4 specialized agents, with identity (name, avatar, role)
- [ ] **Full chat conversation view** — persistent history per agent, streaming responses, markdown rendering, send on Enter
- [ ] **Streaming from real Claude API** — SSE stream, TTFT indicator, graceful error handling
- [ ] **Per-agent task board** — Kanban columns: Scheduled / In Progress / Needs Input / Done / Failed, seeded with realistic tasks
- [ ] **Agent status badge in sidebar** — derived from current task board state, color-coded
- [ ] **Agent profile view** — role, specialization, current status — reinforces "employee" metaphor
- [ ] **"Needs Input" visual call-to-action** — board column + sidebar indicator for blocked tasks

### Add After Validation (v1.x)

Features to add once core loop is validated by real users.

- [ ] **Task card detail panel** — expand a task card to see description, creation timestamp, and any associated chat message
- [ ] **Message linking to tasks** — when AI creates a task in chat, link it to the board
- [ ] **Agent intro messages** — first-open greeting from each agent to replace empty state

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] **File upload to agents** — documents sent to Legal/Finance agents for analysis
- [ ] **Business context configuration** — lightweight settings (industry, company name) injected into agent system prompts
- [ ] **Real task execution** — agents that actually do things (send emails, create documents) not just acknowledge tasks
- [ ] **Multi-user / team accounts** — shared workspace for actual teams
- [ ] **Integration layer** — connect to real tools (email, calendar, CRM)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Sidebar agent navigation | HIGH | LOW | P1 |
| Streaming chat (real Claude API) | HIGH | MEDIUM | P1 |
| Per-agent Kanban task board | HIGH | MEDIUM | P1 |
| Agent status badge | HIGH | LOW | P1 |
| Markdown rendering | HIGH | LOW | P1 |
| Typing/thinking indicator | MEDIUM | LOW | P1 |
| Persistent chat history | HIGH | LOW | P1 |
| Error state handling | HIGH | LOW | P1 |
| "Needs Input" blocking state | HIGH | MEDIUM | P1 |
| Agent profile view | MEDIUM | LOW | P2 |
| Task card detail panel | MEDIUM | MEDIUM | P2 |
| Agent intro messages / empty state | MEDIUM | LOW | P2 |
| Task card ↔ chat linking | HIGH | HIGH | P3 |
| Business context configuration | MEDIUM | MEDIUM | P3 |
| File upload | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when possible
- P3: Nice to have, future milestone

---

## Competitor Feature Analysis

| Feature | Slack / Agentforce | Lindy 3.0 | Devin (Cognition) | 0hire Approach |
|---------|-------------------|-----------|-------------------|----------------|
| Agent identity / persona | Strong (department agents, @mention) | Weak (tool-like, not personified) | None (single agent) | Strong — 4 named AI employees with roles and avatars |
| Task visibility / transparency | Weak (linear chat only) | Partial (workflow automations, not real-time status) | Strong (Progress tab, shell/IDE/browser views) | Strong — Kanban board per agent, "Needs Input" state |
| Streaming responses | Yes | Yes | Yes | Yes — real Claude SSE |
| Human-in-the-loop blocking | Partial (notification-based) | None | Partial (pause and ask) | Explicit — "Needs Input" is a first-class column and sidebar state |
| Multi-agent coordination | Yes (complex orchestration) | Yes (agent chains) | No | No — 4 siloed specialists, no agent-to-agent UI |
| Small business focus | No (enterprise) | Yes (positioning) | No (developer tool) | Yes — non-technical operators, plain language |
| Setup complexity | High | Medium | High | None — zero-config prototype |

---

## Sources

- Slack AI Agents product page: https://slack.com/ai-agents (MEDIUM confidence — marketing page)
- Lindy 3.0 launch post: https://lindy.ai/blog/lindy-3-0 (MEDIUM confidence — vendor blog)
- Devin Session Tools docs: https://docs.devin.ai/product-guides/interactive-browser (HIGH confidence — official docs)
- Kaiban Board / KaibanJS: https://www.kaibanjs.com/kanban-for-ai (MEDIUM confidence — product site)
- Kubiya Task Kanban docs: https://docs.kubiya.ai/core-concepts/task-kanban (MEDIUM confidence — official docs)
- Claude Code Kanban (Feb 2026): https://nikiforovall.blog/ai/productivity/2026/02/07/claude-code-kanban.html (LOW confidence — individual blog)
- Streaming LLM Responses UX: https://getathenic.com/blog/streaming-llm-responses-real-time-ux (MEDIUM confidence — technical blog, verifiable claims)
- Ably resumable token streaming: https://ably.com/blog/token-streaming-for-ai-ux (MEDIUM confidence — vendor technical content)
- AI Chat Layout Patterns (Jan 2026): https://medium.com/@anastasiawalia/ai-chat-layout-patterns-when-to-use-them-real-examples-d03f04a19194 (LOW confidence — individual article)
- LukeW Agent Management Interface Patterns: https://lukew.com/ff/entry.asp?2106= (MEDIUM confidence — established UX practitioner)
- Magentic-UI (Microsoft Research, 2025): https://arxiv.org/abs/2507.22358 (HIGH confidence — academic paper)
- Agentic observability best practices: https://gradientflow.com/observability-for-agentic-ai/ (MEDIUM confidence — technical publication)
- Anthropic Projects announcement: https://www.anthropic.com/news/projects (HIGH confidence — official Anthropic)

---
*Feature research for: AI Agent Workspace — Zero Hire prototype*
*Researched: 2026-02-19*
