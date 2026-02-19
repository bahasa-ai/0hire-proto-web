# Zero Hire — Agent Workspace MVP

## What This Is

A Slack-like workspace UI for 0hire AI agents. Non-technical small business operators chat with specialized AI employees (Chief of Staff, Designer, Finance, Legal) and see what those agents are working on in real time.

Built on TanStack Start + React 19 with real Claude API responses via Anthropic SDK server functions. Chat UI components from **prompt-kit** (https://www.prompt-kit.com) — purpose-built for AI interfaces.

## Core Value Proposition

Solve the **black box problem** (RFC-0003, §1.6 finding #7): users don't know what their agents can do, are doing, or have done. The workspace makes agent activity visible and the interaction model familiar — like texting a helpful assistant, not configuring a system.

## Design Vision

Mental model: **Slack for your AI team** — familiar sidebar + channel switching, but each "channel" is a specialized AI employee. The agent task board (like Slack threads) shows what's being worked on without needing to ask.

Key UX principles from RFC-0003:

- **Chat-first**: Day 1 feels like texting a helpful assistant
- **Transparency**: Agent task board solves the black box problem
- **Progressive disclosure**: Chat is simple on day 1; task board and capabilities reveal over time
- **Per-agent to-do list** (not Kanban): RFC-0003 decision (2026-02-19) — normie target users don't know what Kanban is

## Agent Model

4 predefined AI employees, each with own system prompt and shared workspace:

| Agent              | Role                  | Personality                                         |
| ------------------ | --------------------- | --------------------------------------------------- |
| **Chief of Staff** | Executive coordinator | Routes tasks, summarizes status, manages follow-ups |
| **Designer**       | Creative & brand      | Visual assets, PPT, social media content, brand     |
| **Finance**        | Financial operations  | Expense tracking, reports, tax calculation          |
| **Legal**          | Legal & compliance    | Contract review, risk flagging, compliance          |

Each agent maintains independent message history but shares file context (future v2).

## UI Component Strategy

**prompt-kit** for all chat-specific surfaces:

- `PromptInput` + `PromptInputTextarea` + `PromptInputActions` — message composer
- `Message` + `MessageContent` — chat bubbles (user + agent)
- `ChatContainer` — scrollable message area
- `PromptSuggestion` — discovery cards for first-message state
- `Loader` — thinking indicator while waiting for first token
- `ResponseStream` — not used for real streaming (LLM output goes direct); used for mock demos
- `Reasoning` — collapsible reasoning display if agent exposes CoT

**shadcn + @base-ui/react** for workspace chrome (sidebar, headers, tabs, badges).

## API Architecture

TanStack Start `createServerFn` handlers call Anthropic SDK server-side. API key via `ANTHROPIC_API_KEY` env var — never exposed to browser bundle. No streaming infrastructure beyond what TanStack Start's server functions support (SSE or chunked response).

## Current State

**Phase 1: Static Layout Shell** — Not started

**Remaining work**: All phases (1–5)

## Constraints

- **Tech stack**: TanStack Start + React 19 — no framework changes
- **Package manager**: Bun only — `bun`, `bunx`, never npm/yarn/pnpm
- **Styling**: Semantic color tokens only — no hardcoded hex/rgb/oklch in components
- **API key**: `ANTHROPIC_API_KEY` separate from Anthropic Console — Claude Code token cannot be reused
- **Prototype**: No backend persistence — all state is in-memory/client-side (except API calls)
- **Auth**: None — hardcoded user identity only

## Source Documents

- **RFC-0003**: `/Users/imo/Documents/GitHub/atlas/rfcs/projects/superagent/rfc-0003-ux-research-super-agent.md`
- **prompt-kit docs**: https://www.prompt-kit.com/llms-full.txt

## Key RFC Insights Applied

1. **Black box problem** (§1.6 #7) → solved by task board with real-time status
2. **Per-agent to-do list** (not Kanban) → RFC decision confirmed 2026-02-19
3. **Chat-first, task board week-2** → task board accessible via tab/toggle, not default view
4. **Named sessions/threads** (§1.6 #2) → v2 feature; MVP is single thread per agent
5. **Three-tier autonomy** (§1.4) → reflected in task status: Needs Input = "suggested" tier
6. **Discovery cards** (§3.1) → prompt-kit `PromptSuggestion` for empty state per agent

---

_Created: 2026-02-19_
