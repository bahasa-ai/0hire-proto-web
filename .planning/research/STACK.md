# Stack Research

**Domain:** AI chat workspace with streaming LLM responses (multi-agent, Slack-like)
**Researched:** 2026-02-19
**Confidence:** HIGH (core libraries verified via official docs and npm; prompt-kit via official site; TanStack Start streaming via official docs)

---

## Context

This is a **subsequent milestone** adding to an existing TanStack Start + React 19 + TypeScript + Tailwind CSS v4 + shadcn base-nova app. The base infrastructure is in place. Research scope: Slack-like multi-agent chat UI with streaming Claude responses and per-agent task boards.

---

## Recommended Stack

### Core Technologies (New Additions)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ai` (Vercel AI SDK) | `^6.0.91` | Streaming orchestration, `useChat` hook, `streamText`, `UIMessage` types | Official TanStack Start integration path; provides `toUIMessageStreamResponse()` + `useChat` that handle the full streaming lifecycle with a single hook. Direct `@anthropic-ai/sdk` would require manual `ReadableStream` plumbing. HIGH confidence — verified via ai-sdk.dev/docs/getting-started/tanstack-start. |
| `@ai-sdk/anthropic` | `^3.0.45` | Anthropic Claude provider for Vercel AI SDK | Wraps `@anthropic-ai/sdk` with AI SDK's standardized `LanguageModel` interface. Swap to `@ai-sdk/openai` with one-line change later. HIGH confidence — verified via npmjs.com. |
| `@ai-sdk/react` | matches `ai` | `useChat` hook for client-side streaming state | Ships alongside `ai`; provides the streaming message state machine so you don't manage `isLoading`, `error`, token accumulation manually. HIGH confidence. |
| `zustand` | `^5.0.11` | Per-agent state (task boards, agent status, non-chat UI state) | At 20.7M weekly downloads, Zustand v5 is the 2026 consensus for React global state. Context API causes excessive re-renders on high-frequency streaming updates. `useChat` owns message state; Zustand owns everything else (agent task board, sidebar selection, agent status badges). HIGH confidence — verified via npmjs.com + multiple 2026 comparisons. |
| `prompt-kit` | latest (via shadcn CLI) | AI chat UI components (PromptInput, Message, CodeBlock, Reasoning, Steps, Loader) | Built on shadcn/ui + Tailwind CSS, installs directly into `@/components/ui/` via shadcn CLI. Zero new styling dependencies — slots into existing base-nova setup. Provides `PromptInput`, `ChatContainer`, `Message`, `ChainOfThought`, `Loader`, `TextShimmer`. HIGH confidence — verified via prompt-kit.com/docs/installation. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.x` (likely already installed via shadcn) | Schema validation for chat message payloads | Every route handler that accepts user input. Required for AI SDK tool definitions. |
| `@tanstack/react-query` | current (already in project via router-ssr-query) | Server state caching for agent task boards | Task board data (Scheduled/In Progress/Done/Failed) that is fetched, not streamed. Don't use for streaming message state — `useChat` handles that. |

### Development Tools (No Changes)

The existing stack (Bun, TypeScript strict, ESLint, Prettier) requires no additions.

---

## Architecture: Streaming Integration Pattern

### Route Handler (recommended over createServerFn for streaming)

The official TanStack Start + AI SDK pattern uses **file-based route handlers**, not `createServerFn`. Use `createFileRoute` with `server.handlers.POST`:

```typescript
// src/routes/api/chat.$agentId.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/chat/$agentId')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { messages }: { messages: UIMessage[] } = await request.json()

        const result = streamText({
          model: anthropic('claude-sonnet-4-5'),
          system: AGENT_SYSTEM_PROMPTS[params.agentId],
          messages: await convertToModelMessages(messages),
        })

        return result.toUIMessageStreamResponse()
      },
    },
  },
})
```

**Why not `createServerFn`?** `createServerFn` with `ReadableStream` works (verified in TanStack Start docs) but requires manual `ReadableStream` construction and client-side reader loop. The route handler + `useChat` combination handles the entire streaming lifecycle with far less code. Source: tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions.

### Client-Side: useChat per Agent

```typescript
// Each agent channel uses its own useChat instance
const { messages, sendMessage, status } = useChat({
  api: `/api/chat/${agentId}`,
})
```

`useChat` manages: message array, streaming accumulation, loading state, error state. Do not use Zustand for these — `useChat` is the authoritative source for chat messages.

### Client-Side: Zustand for Everything Else

```typescript
interface AgentStore {
  activeAgentId: string
  agents: Record<string, AgentMeta>
  taskBoards: Record<string, TaskBoard>
  setActiveAgent: (id: string) => void
  updateTask: (agentId: string, task: Task) => void
}
```

Zustand owns: which agent is selected, sidebar layout state, agent task board items, agent status badges (Idle/Thinking/Needs Input). Never put streaming messages here.

---

## prompt-kit Integration Details

### How it Works with shadcn base-nova

prompt-kit installs components as source files into `@/components/ui/` — exactly like shadcn components. They use your existing Tailwind CSS variables (`--primary`, `--muted`, etc.) and honor your `--radius` token. No conflict with `@base-ui/react` primitives since prompt-kit components are built on Radix UI via shadcn (not base-ui), but they coexist as separate components in the same directory.

**Installation pattern:**
```bash
bunx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
bunx shadcn@latest add "https://prompt-kit.com/c/message.json"
bunx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
bunx shadcn@latest add "https://prompt-kit.com/c/loader.json"
bunx shadcn@latest add "https://prompt-kit.com/c/markdown.json"
```

### Components to Install for This Project

| Component | Use |
|-----------|-----|
| `prompt-input` | Message composer at bottom of each agent channel |
| `message` | Individual message bubbles (user + AI) with avatar support |
| `chat-container` | Scroll container with auto-scroll-to-bottom |
| `loader` | Animated "thinking" indicator while streaming |
| `markdown` | Render AI markdown responses |
| `text-shimmer` | Token-by-token shimmer effect during streaming |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | Direct `@anthropic-ai/sdk` | Direct SDK requires manual `ReadableStream` + reader loop + client-side accumulation. No `useChat` hook. Would need to re-implement what Vercel AI SDK provides for free. Only choose direct SDK if you need Anthropic-specific features not exposed via AI SDK (currently none for this project). MEDIUM confidence that there are no gaps. |
| Vercel AI SDK | TanStack AI (`@tanstack/ai`) | TanStack AI is in **alpha** (December 2025). Its isomorphic tools are compelling architecturally but MCP support is "roadmap," and production stability is unproven. Revisit at v1.0. |
| `useChat` (Vercel AI SDK) for message state | TanStack Query for message state | TanStack Query is for server state with caching/revalidation. Streaming messages are not cacheable server state — they're ephemeral event sequences. `useChat` is the correct primitive. |
| Zustand for agent/task state | React Context + useReducer | Context causes full subtree re-renders on every token during streaming. At 20+ tokens/second, this tanks performance in the task board sidebar. Zustand's selector-based subscriptions prevent this. |
| Route handlers (`createFileRoute` + `server.handlers`) | `createServerFn` | `createServerFn` requires manual `ReadableStream` construction for streaming. Route handlers integrate directly with AI SDK's `toUIMessageStreamResponse()`. Cleaner, less boilerplate. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@anthropic-ai/sdk` directly in server functions | No `useChat` integration; manual stream plumbing required; 3-5x more boilerplate for the same result | `ai` + `@ai-sdk/anthropic` |
| `@tanstack/ai` | Alpha quality (Dec 2025), MCP support absent, limited community validation | Vercel AI SDK (stable v6) |
| Redux / Redux Toolkit | 13.8KB gzipped vs Zustand's 1.16KB; unnecessary ceremony for this scope | Zustand v5 |
| TanStack Query for streaming messages | Server state caching is wrong abstraction for streaming; adds cache invalidation complexity with no benefit | `useChat` from `@ai-sdk/react` |
| Server-Sent Events (SSE) built from scratch | AI SDK handles SSE/streaming protocol internally via `toUIMessageStreamResponse()` + `useChat`; rolling your own adds failure surface area | Vercel AI SDK streaming |

---

## Installation

```bash
# Core AI SDK
bun add ai @ai-sdk/anthropic @ai-sdk/react

# State management
bun add zustand

# prompt-kit components (install individually as needed)
bunx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
bunx shadcn@latest add "https://prompt-kit.com/c/message.json"
bunx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
bunx shadcn@latest add "https://prompt-kit.com/c/loader.json"
bunx shadcn@latest add "https://prompt-kit.com/c/markdown.json"

# zod (likely already present via shadcn)
bun add zod
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai@^6.0.91` | React 19, TanStack Start 1.132.x | Verified: official TanStack Start quickstart uses AI SDK v6 |
| `@ai-sdk/anthropic@^3.0.45` | `ai@^6.x` | Same release train; versions must stay in sync (major version coupling) |
| `@ai-sdk/react@^1.x` (ships with `ai@6`) | React 19 | `useChat` API changed from v5 → v6: uses `sendMessage()` not `handleSubmit()`, messages use `parts[]` not `content` string |
| `zustand@^5.0.11` | React 19 | No Provider required; hooks-only API |
| `prompt-kit` | shadcn/ui + Tailwind CSS v4, React 19 | Installs as source; no runtime dependency conflict |

### Breaking Change Warning: AI SDK v5 → v6 API

The `useChat` API in `ai@6` is **different** from training data / older examples:

```typescript
// OLD (ai v5 and earlier) — DO NOT USE
const { messages, input, handleInputChange, handleSubmit } = useChat()
// messages[].content is a string

// NEW (ai v6) — USE THIS
const { messages, sendMessage, status } = useChat()
// messages[].parts is an array of typed parts
// sendMessage({ text: input }) replaces handleSubmit
```

Route handler pattern also changed: use `createFileRoute` with `server.handlers.POST`, not API route files.

---

## Stack Patterns by Variant

**Per-agent chat channels (Slack-like):**
- One `useChat` instance per agent, keyed by `agentId`
- Route handler at `/api/chat/$agentId` reads agent system prompt from param
- Zustand holds `activeAgentId` and `taskBoards[agentId]`

**Task board state (Scheduled / In Progress / Needs Input / Done / Failed):**
- Zustand store, not TanStack Query
- Updates triggered by AI tool calls or user drag-drop
- Persist middleware optional for session recovery

**Streaming indicator:**
- `useChat` exposes `status: 'idle' | 'loading' | 'streaming' | 'error'`
- Use `prompt-kit` `<Loader>` component when `status === 'streaming'`

---

## Sources

- `ai-sdk.dev/docs/getting-started/tanstack-start` — TanStack Start + AI SDK official quickstart (HIGH confidence; fetched 2026-02-19)
- `tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions` — TanStack Start streaming docs; `ReadableStream` and async generator patterns (HIGH confidence; fetched 2026-02-19)
- `npmjs.com/package/ai` — `ai@6.0.91` latest verified (HIGH confidence)
- `npmjs.com/package/@ai-sdk/anthropic` — `@ai-sdk/anthropic@3.0.45` latest verified (HIGH confidence)
- `npmjs.com/package/zustand` — `zustand@5.0.11` latest verified (HIGH confidence)
- `prompt-kit.com/docs/installation` — prompt-kit shadcn CLI install pattern (HIGH confidence; fetched 2026-02-19)
- `blog.logrocket.com/tanstack-vs-vercel-ai-library-react/` — TanStack AI vs Vercel AI SDK comparison (January 2026) — TanStack AI alpha status confirmed (MEDIUM confidence)
- Multiple 2026 WebSearch results for Zustand vs useReducer for streaming state — Zustand recommendation (MEDIUM confidence; corroborated by npm download numbers)

---
*Stack research for: Zero Hire — Agent Workspace MVP (subsequent milestone)*
*Researched: 2026-02-19*
