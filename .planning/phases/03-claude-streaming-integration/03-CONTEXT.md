# Phase 3 Context: Claude Streaming Integration

_Decisions captured from discuss-phase session on 2026-02-19. Researcher and planner must treat these as locked unless explicitly reopened._

---

## 1. API Provider

**Decision: Gemini (Google AI) instead of Anthropic.**

The roadmap references Anthropic SDK and `ANTHROPIC_API_KEY`, but the chosen provider for Phase 3 is Google Gemini.

- Researcher must investigate the Gemini SDK (not Anthropic) for TanStack Start `createServerFn` streaming integration
- Environment variable: `GOOGLE_AI_API_KEY` (or equivalent — researcher to confirm Gemini SDK convention)
- Phase name remains "Streaming Integration" — success criteria still applies (tokens stream, secure server-side key, error handling, abort on unmount)
- `ANTHROPIC_API_KEY` references in roadmap/docs are superseded by this decision

---

## 2. Agent Personas

**Tone:** Professional but warm across all four agents — capable, clear, approachable. Each agent has their own distinct flavor within this baseline.

**Company context:** Rich, hardcoded fake company context baked into every system prompt. Include:
- A realistic company name (researcher to invent a plausible Series A tech startup)
- Stage: early-stage / Series A
- Headcount: ~25 employees
- Open roles: a realistic mix relevant to each agent's function (e.g., Finance agent knows about their budget and headcount; Legal knows active contracts/compliance status)

**Length/depth:** Do what produces the highest quality responses. No strict token target — the researcher should evaluate what caliber of system prompt yields the most useful, distinct responses from each persona.

**Formatting instructions in system prompts:**
- Instruct agents to use markdown: headers (`##`), bold, bullets, inline code, fenced code blocks where contextually appropriate
- Keep responses concise — avoid walls of text; prefer structured answers
- Optimize for how prompt-kit's `Markdown` component (and Streamdown — see Area 3) renders output

**The four agents:**

| Agent | Role | Persona flavor |
| ------------------- | ----------------------- | --------------------------------------------------- |
| Chief of Staff | Operations / strategy | Decisive, big-picture, bridges cross-functional gaps |
| Designer | Product / UX design | Visual thinker, opinionated on craft, concise |
| Finance | CFO-level finance | Numbers-first, precise, flags risks clearly |
| Legal | General counsel | Careful, qualifying, risk-aware but actionable |

---

## 3. Streaming UX Behavior

**Thinking indicator (pre-first-token):**
- Show prompt-kit `Loader` from the moment the message is sent until the first token arrives
- On first token: fade out `Loader`, message bubble fades in with the streaming content
- Loader lives outside the bubble; bubble pre-renders and fades in on first token

**Markdown rendering during streaming:**
- Use `streamdown` (`vercel/streamdown`) — a drop-in `react-markdown` replacement purpose-built for AI streaming
- Handles incomplete/unterminated markdown syntax gracefully (no flicker on partial code fences, etc.)
- Block-level memoization: stable completed blocks do not re-render on new token arrival
- Syntax highlighting via Shiki (built-in)
- This replaces any use of plain `react-markdown` in the project

**Scroll behavior:**
- Smart auto-scroll: if the user is at (or near) the bottom of the chat, auto-follow the growing message
- If the user has scrolled up to read earlier messages, do NOT force-scroll them down during streaming
- Resume auto-follow when user manually scrolls back to the bottom

**Abort / channel switch mid-stream:**
- Cancelling a stream (by switching agents or unmounting) should preserve the partial message in that agent's history
- Mark the partial message visually as incomplete (e.g., a small "interrupted" label or faded state)
- The request is aborted server-side — no orphaned API calls

---

## 4. Error Handling Surface

**Error placement:**
- Persistent banner directly below the input bar (not inside the message bubble, not a toast)
- Stays visible until the user retries or sends a new message

**Error copy — typed messages per error class:**

| Error type | User-facing message |
| ------------ | --------------------------------------------------- |
| Rate limited | "Rate limited — wait a moment before trying again." |
| Network/offline | "Connection lost — check your network and retry." |
| Timeout (>10s) | "Response timed out — try again." |
| Generic/unknown | "Something went wrong. Try again." |

**Retry behavior:**
- Retry re-sends the full conversation history including the failed user message
- This is the natural stateless approach — the server function always receives the full thread

**Sending a new message after an error:**
- Error banner clears automatically when the user sends a new message
- The new send is treated as an implicit retry (error state is not preserved in history)

---

## 5. Conversation Context Window

**History sent per turn:** Full conversation history — every message in the thread is sent on each request. Appropriate for MVP where conversation lengths are short.

**Message role attribution:** Agent name is prefixed in the content of assistant messages sent to the Gemini API — e.g. `[Chief of Staff]: Here's the plan...`. This helps the model maintain persona continuity within a thread.

**Cross-agent isolation:** Each agent's conversation is fully isolated. Agent A's thread is never included in Agent B's context. `WorkspaceContext` already manages per-agent message arrays — the server function only receives the active agent's messages.

**System prompt:** Included on every request as the first message in the conversation array (stateless, no caching). Gemini API convention to be confirmed by researcher.

---

## Deferred Ideas

These came up during discussion but are out of scope for Phase 3:

- **Thesys / Generative UI (C1 API):** Replace text responses with dynamically rendered UI components (charts, forms, tables). Interesting for future phases — would require C1 middleware, Thesys React SDK, and a redesign of how agent messages are rendered. Revisit after MVP is stable.

---

_Context created: 2026-02-19_
_Next step: Run `/gsd:plan-phase 3` (researcher will use this CONTEXT.md)_
