# Zero Hire — Agent Workspace MVP

## What This Is

A Slack-like workspace UI for 0hire AI agents — a web app where small business operators can chat with specialized AI employees (Chief of Staff, Designer, Finance, Legal) and see what those agents are working on in real time. Built on top of the existing 0hire prototype using TanStack Start + React 19, with real Claude API responses via Anthropic SDK server functions.

## Core Value

A non-technical business owner can talk to their AI team and always know what it's doing — solving the "black box problem" through a familiar chat + task board interface.

## Requirements

### Validated

- ✓ TanStack Start + React 19 + TypeScript project scaffolded — existing
- ✓ shadcn `base-nova` component library with @base-ui/react — existing
- ✓ Tailwind CSS v4 with OKLCH semantic color tokens — existing
- ✓ File-based TanStack Router — existing

### Active

- [ ] Slack-like sidebar with 4 agent channels (Chief of Staff, Designer, Finance, Legal)
- [ ] Full chat conversation view with multi-agent message history per channel
- [ ] Real Claude API integration — agents actually respond via Anthropic SDK server functions
- [ ] Streaming message responses (token-by-token display)
- [ ] Per-agent to-do list board (Scheduled, In Progress, Needs Input, Done, Failed)
- [ ] Agent profiles (name, role, brief description shown in channel header)
- [ ] Prompt-kit UI components for chat input and message bubbles
- [ ] Mock task data seeded per agent to demonstrate the board UX
- [ ] Agent system prompts per role (Chief of Staff, Designer, Finance, Legal personas)
- [ ] Hardcoded user identity (no auth — prototype only)

### Out of Scope

- File Browser / Zero Drive — deferred to v2; focus is chat + task board first
- Authentication / user accounts — prototype, no auth needed
- Multi-user / real-time collaboration — single user only
- SOP authoring wizard — deferred; the RFC hero feature, but requires more design work
- WhatsApp / Telegram / Slack channel integration — backend infrastructure, not MVP
- Agent memory persistence (SOUL.md, USER.md) — deferred to v2
- Skill store / ClawHub integration — deferred
- Voice calls — post-launch per RFC
- Mobile app — web-only for MVP

## Context

**RFC Source:** `rfc-0003-ux-research-super-agent.md` — comprehensive UX research document covering user sentiment, competitive analysis, and three-interface model design recommendations.

**Key UX insight from RFC:** The #1 problem is the "black box" — users don't know what their agents can do, are doing, or have done. The task board directly addresses this. The chat interface must feel like texting a helpful assistant, not configuring a system.

**Agent model:** 4 predefined roles sharing a workspace:
- **Chief of Staff** — coordinator, routes tasks, status summaries
- **Designer** — PPT, content creation, social media
- **Finance** — tax, spending tracking, receipt processing
- **Legal** — contract review, compliance

**UI components:** prompt-kit (https://www.prompt-kit.com) for chat-specific components (message bubbles, prompt input, loading states, markdown rendering). Existing shadcn/base-ui library for layout and chrome.

**Existing codebase:** Prototype with shadcn component examples only (`component-example.tsx`). The routes structure (`__root.tsx`, `index.tsx`) and full design system are in place. The new workspace UI replaces `index.tsx`.

**API approach:** TanStack Start `createServerFn` handlers call Anthropic SDK server-side. API key via `ANTHROPIC_API_KEY` env var. Never exposed to browser bundle.

## Constraints

- **Tech stack**: TanStack Start + React 19 — must stay within existing stack
- **Package manager**: Bun only — never npm/yarn/pnpm
- **Styling**: Semantic color tokens only — no hardcoded hex/rgb/oklch in components
- **Components**: shadcn add via `bunx shadcn@latest add <component>` — don't hand-write from scratch
- **API key**: Separate `ANTHROPIC_API_KEY` from Anthropic Console — Claude Code token cannot be reused
- **Prototype**: No backend persistence — all state is in-memory/client-side (except API calls)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Chat + task board only (no file browser) | Ships faster, solves the black box problem — the #1 UX issue from RFC | — Pending |
| Real Claude API (not mock) | Makes the prototype feel real for stakeholder demos | — Pending |
| Per-agent to-do list (not Kanban) | RFC decision (2026-02-19): Kanban is foreign to normie target users | — Pending |
| prompt-kit for chat components | Purpose-built for AI chat UIs, avoids reinventing message bubbles/streaming | — Pending |
| 4 predefined agents (no custom agents) | Simplest path to demonstrating multi-agent UX; custom agents deferred | — Pending |
| TanStack Start server functions for API | Keeps API key server-side, aligns with existing stack | — Pending |
| All GSD agents on Sonnet | User preference for token cost control during development | — Pending |

---
*Last updated: 2026-02-19 after initialization*
