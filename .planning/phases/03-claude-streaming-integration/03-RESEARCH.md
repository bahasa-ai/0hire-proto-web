# Phase 3 Research: Gemini Streaming Integration

**Researched:** 2026-02-19
**Domain:** Gemini AI SDK + TanStack Start streaming + React streaming UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API Provider:** Google Gemini (NOT Anthropic). Environment variable: `GOOGLE_AI_API_KEY`.

**Streaming UX:**
- Show prompt-kit `Loader` from send until first token; fade out on first token; message bubble fades in
- Use `streamdown` (vercel/streamdown) for markdown rendering during streaming
- Smart auto-scroll: follow bottom unless user scrolled up; resume on scroll-back-to-bottom
- On channel switch or unmount: abort the stream, preserve partial message as "interrupted"

**Error handling:**
- Persistent banner below input bar (not toast, not inside bubble)
- Error types: rate limited, network/offline, timeout (>10s), generic
- Retry re-sends full conversation history

**Conversation context:**
- Full history sent per turn
- Agent name prefixed in assistant content: `[Chief of Staff]: Here's the plan...`
- Each agent's thread is fully isolated
- System prompt on every request (stateless)

**Agent personas (4 agents):**
Professional but warm. Realistic Series A tech startup (~25 employees). Each agent knows their domain context. Formatting: use markdown. Concise, structured.

### Deferred Ideas (OUT OF SCOPE)
- Thesys / Generative UI (C1 API) — generative UI components from agent responses
</user_constraints>

---

## Summary

Phase 3 replaces the mock `setTimeout` response loop in `ChatView` with a real Gemini streaming integration. The approach: a `createServerFn` async generator on the server calls the `@google/genai` SDK, yields text chunks to the client, which appends them token-by-token to a "streaming" message in `WorkspaceContext`. `streamdown` replaces plain text rendering for agent messages.

The existing `ChatContainerRoot` already uses `use-stick-to-bottom` via `StickToBottom` component — smart auto-scroll is already architecturally in place. The `prompt-kit Loader` component needs to be added (not yet in the project). The `WorkspaceContext` needs two new action types: `START_STREAMING` (begin a streaming message) and `APPEND_STREAM_CHUNK` (append a token) and `FINISH_STREAMING` / `INTERRUPT_STREAMING`.

**Primary recommendation:** Use `createServerFn` with async generator pattern for streaming. Use `getRequest().signal` server-side to propagate abort to Gemini. Wire `AbortController` on the client to the channel-switch and unmount lifecycle.

---

## 1. Gemini SDK

### Package Name + Install

```bash
bun add @google/genai
```

Package: `@google/genai` (the new unified Google Gen AI JavaScript SDK, 2025+).

> **Note on env var:** The Gemini SDK samples use `GEMINI_API_KEY` or `process.env.GEMINI_API_KEY`. The CONTEXT.md decision is `GOOGLE_AI_API_KEY`. Both work — since we name the env var ourselves, use `GOOGLE_AI_API_KEY` as decided. In server code: `new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })`.

**Do NOT use** the older `@google/generative-ai` package. That's the legacy SDK. The current package is `@google/genai`.

### Basic Initialization

```typescript
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
```

### Recommended Model

Use `gemini-2.0-flash` for snappy responses at reasonable cost. This is the current fast model (verified Feb 2026).

### generateContentStream / Streaming Pattern

**Option A: Chat session (recommended for multi-turn)**

```typescript
const chat = ai.chats.create({
  model: 'gemini-2.0-flash',
  config: {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 2048,
  },
  history: previousTurns, // Content[] — all turns except the last user message
})

const stream = await chat.sendMessageStream({ message: lastUserMessage })

for await (const chunk of stream) {
  yield chunk.text ?? ''
}
```

**Option B: Stateless generateContentStream**

For our use case (full history sent per-request, system prompt every time), Option A is cleaner.

### Conversation History Format

Gemini uses `Content[]` with `role: 'user' | 'model'` (NOT 'assistant' — it's `'model'`).

```typescript
import type { Content } from '@google/genai'

// Format our ChatMessage[] for Gemini
function toGeminiHistory(messages: ChatMessage[]): Content[] {
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))
}
```

**CRITICAL:** The `history` passed to `ai.chats.create()` must be all turns **except** the final user message. The final user message goes into `chat.sendMessageStream({ message: ... })`. History must alternate user/model and start with a user turn.

### System Instruction Format

Pass as a string to `config.systemInstruction`:

```typescript
ai.chats.create({
  model: 'gemini-2.0-flash',
  config: {
    systemInstruction: 'You are a helpful assistant...',
  },
})
```

### Agent Name Prefix in Responses

Per CONTEXT.md decision, prefix assistant messages stored in history with `[AgentName]: `. When formatting history for Gemini, strip this prefix from the stored `content` field before passing to the API — otherwise the model sees its own name prefix as part of its previous output, which is fine but could cause it to repeat the prefix. Actually, keeping the prefix in history is fine — it reinforces persona continuity. Leave it as-is.

### Sources

- Context7 `/googleapis/js-genai` — HIGH confidence
- https://github.com/googleapis/js-genai

---

## 2. TanStack Start Streaming

### createServerFn Async Generator Pattern (Recommended)

The async generator approach is cleaner than ReadableStream for AI streaming.

```typescript
// src/server/chat.ts
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { GoogleGenAI } from '@google/genai'
import type { ChatMessage } from '@/components/workspace/workspace-context'

interface ChatStreamInput {
  agentId: string
  messages: ChatMessage[]
  systemPrompt: string
}

export const streamChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChatStreamInput) => data)
  .handler(async function* ({ data }) {
    const { agentId, messages, systemPrompt } = data
    const request = getRequest()
    const signal = request.signal  // propagate abort from client disconnect

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

    // All messages except the last user message go into history
    const historyMessages = messages.slice(0, -1)
    const lastMessage = messages[messages.length - 1]

    const history = historyMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model' as const,
      parts: [{ text: msg.content }],
    }))

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      history,
    })

    const stream = await chat.sendMessageStream({ message: lastMessage.content })

    for await (const chunk of stream) {
      if (signal.aborted) break
      yield chunk.text ?? ''
    }
  })
```

### Typed Return

The yielded type is `string` — each chunk is a text token. TanStack Start's async generator serialization handles the rest.

### Client-Side Reading

```typescript
// In ChatView component
const generatorRef = useRef<AsyncGenerator<string> | null>(null)

const handleSend = async (text: string) => {
  // ... dispatch user message, set streaming state ...

  const generator = await streamChatFn({ data: { agentId, messages, systemPrompt } })
  generatorRef.current = generator

  let accumulated = ''
  let isFirst = true

  try {
    for await (const chunk of generator) {
      accumulated += chunk

      if (isFirst) {
        isFirst = false
        // Trigger: hide Loader, show message bubble
        dispatch({ type: 'START_STREAMING', agentId, messageId })
      }

      dispatch({ type: 'APPEND_STREAM_CHUNK', agentId, messageId, chunk })
    }

    dispatch({ type: 'FINISH_STREAMING', agentId, messageId })
  } catch (err) {
    // Error handling
  }
}
```

### For-Await with AbortController (client-side abort)

Since TanStack Start server functions are fetch calls under the hood, aborting the generator on the client side terminates the underlying HTTP connection.

```typescript
const abortRef = useRef<AbortController | null>(null)

// On send:
abortRef.current?.abort()
const controller = new AbortController()
abortRef.current = controller

// On channel switch / unmount:
useEffect(() => {
  return () => {
    abortRef.current?.abort()
    // Save partial message as interrupted
  }
}, [agent.id])
```

**Note:** TanStack Start's `createServerFn` does not expose a public API to pass an `AbortSignal` through the call. However:
1. When the client closes the connection (via `return()` on the generator or component unmount), the server receives a request abort signal via `request.signal` (retrieved with `getRequest()`)
2. On the client, breaking out of the `for await` loop and calling `.return()` on the generator effectively closes the stream

```typescript
// Abort the generator iterator:
generatorRef.current?.return(undefined)
generatorRef.current = null
```

### ReadableStream Alternative

Also supported, but async generators are recommended:

```typescript
.handler(async () => {
  const stream = new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of geminiStream) {
        controller.enqueue(chunk.text ?? '')
      }
      controller.close()
    },
  })
  return stream
})
```

Client reads with `response.getReader()`. Abort via `reader.cancel()`.

### Sources

- TanStack Start docs: https://tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions — HIGH confidence
- TanStack Start server functions guide — HIGH confidence

---

## 3. streamdown

### Package + Install

```bash
bun add streamdown @streamdown/code
```

- Main package: `streamdown` — v2.2.0 (published Feb 9, 2026)
- Syntax highlighting: `@streamdown/code` — separate plugin, uses Shiki under the hood
- Optional extras (not needed for Phase 3): `@streamdown/mermaid`, `@streamdown/math`

### Required Tailwind Config

Add to `src/styles.css` (after the existing `@import` lines):

```css
/* Required: allows Tailwind to detect streamdown utility classes */
@source "../node_modules/streamdown/dist/*.js";
```

Also import the styles in the component or globally:

```typescript
import 'streamdown/styles.css'
```

Put this import in `src/routes/__root.tsx` or the component file.

### Basic Component Usage

```tsx
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import 'streamdown/styles.css'

// During streaming (isAnimating=true while stream is active):
<Streamdown
  plugins={{ code }}
  isAnimating={isStreaming}
  animated
>
  {accumulatedText}
</Streamdown>

// After streaming completes:
<Streamdown
  plugins={{ code }}
  isAnimating={false}
>
  {finalText}
</Streamdown>
```

### Key Props

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `children` | `string` | required | The markdown text (partial or complete) |
| `isAnimating` | `boolean` | `false` | Set `true` while streaming — enables streaming-optimized rendering |
| `animated` | `boolean` | `false` | Fade-in animation for each block as it appears |
| `mode` | `'streaming' \| 'static'` | `'streaming'` | Use `'static'` for completed messages to skip streaming logic |
| `plugins` | `object` | `{}` | Plugin map — pass `{ code }` for syntax highlighting |
| `caret` | `'block' \| 'circle'` | none | Shows cursor at end during streaming |
| `className` | `string` | — | Additional CSS classes |
| `shikiTheme` | `[string, string]` | — | `[lightTheme, darkTheme]` for code blocks |

### Syntax Highlighting with @streamdown/code

```tsx
import { code } from '@streamdown/code'

// Default (github-light / github-dark themes):
<Streamdown plugins={{ code }}>{markdown}</Streamdown>

// Custom themes:
import { createCodePlugin } from '@streamdown/code'

const customCode = createCodePlugin({
  themes: ['one-light', 'one-dark-pro'],
})
<Streamdown plugins={{ code: customCode }}>{markdown}</Streamdown>
```

### How It Handles Partial Markdown

`streamdown` uses `remend` internally to auto-complete incomplete markdown syntax:
- Unclosed ` ``` ` code fences → auto-closed for rendering, re-opened on next token
- Unclosed `**bold**` → auto-completed
- No flickering or layout jumps on partial syntax

### Performance: Block Memoization

Completed blocks (paragraphs, code blocks) are memoized and do not re-render when new tokens arrive. Only the trailing/incomplete block re-renders on each chunk. This makes it very efficient for long responses.

### Sources

- Context7 `/vercel/streamdown` — HIGH confidence
- npm: https://www.npmjs.com/package/streamdown — HIGH confidence (verified current version)

---

## 4. prompt-kit Loader

### Status: NOT YET INSTALLED

The project currently has these prompt-kit components:
- `src/components/prompt-kit/chat-container.tsx` ✓
- `src/components/prompt-kit/message.tsx` ✓
- `src/components/prompt-kit/prompt-input.tsx` ✓
- `src/components/prompt-kit/prompt-suggestion.tsx` ✓

`loader.tsx` is **missing** — needs to be added manually from source (prompt-kit components are copy-pasted, not npm-installed).

### Source Location

https://github.com/ibelick/prompt-kit/blob/main/components/prompt-kit/loader.tsx

### Full Source to Add at `src/components/prompt-kit/loader.tsx`

```tsx
import { cn } from '@/lib/utils'
import React from 'react'

export interface LoaderProps {
  variant?:
    | 'circular'
    | 'classic'
    | 'pulse'
    | 'pulse-dot'
    | 'dots'
    | 'typing'
    | 'wave'
    | 'bars'
    | 'terminal'
    | 'text-blink'
    | 'text-shimmer'
    | 'loading-dots'
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function DotsLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dotSizes = { sm: 'h-1.5 w-1.5', md: 'h-2 w-2', lg: 'h-2.5 w-2.5' }
  const containerSizes = { sm: 'h-4', md: 'h-5', lg: 'h-6' }

  return (
    <div
      className={cn(
        'flex items-center space-x-1',
        containerSizes[size],
        className,
      )}
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-muted-foreground animate-[bounce-dots_1.4s_ease-in-out_infinite] rounded-full',
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TypingLoader({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dotSizes = { sm: 'h-1 w-1', md: 'h-1.5 w-1.5', lg: 'h-2 w-2' }
  const containerSizes = { sm: 'h-4', md: 'h-5', lg: 'h-6' }

  return (
    <div
      className={cn(
        'flex items-center space-x-1',
        containerSizes[size],
        className,
      )}
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-muted-foreground animate-[typing_1s_infinite] rounded-full',
            dotSizes[size],
          )}
          style={{ animationDelay: `${i * 250}ms` }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function TextShimmerLoader({
  text = 'Thinking',
  className,
  size = 'md',
}: {
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

  return (
    <div
      className={cn(
        'bg-[linear-gradient(to_right,var(--muted-foreground)_40%,var(--foreground)_60%,var(--muted-foreground)_80%)]',
        'bg-size-[200%_auto] bg-clip-text font-medium text-transparent',
        'animate-[shimmer_4s_infinite_linear]',
        textSizes[size],
        className,
      )}
    >
      {text}
    </div>
  )
}

function Loader({ variant = 'circular', size = 'md', text, className }: LoaderProps) {
  switch (variant) {
    case 'dots':
      return <DotsLoader size={size} className={className} />
    case 'typing':
      return <TypingLoader size={size} className={className} />
    case 'text-shimmer':
      return <TextShimmerLoader text={text} size={size} className={className} />
    default:
      return <DotsLoader size={size} className={className} />
  }
}

export { Loader }
```

> **Note:** The full source has many more variants (circular, classic, pulse, bars, terminal, etc.). The above is a pruned version with just the variants useful for the loading state. Copy the full source from GitHub for completeness if other variants are needed later.

### Recommended Variant for Pre-Token State

Use `<Loader variant="typing" size="sm" />` or `<Loader variant="text-shimmer" text="Thinking" size="sm" />`. The typing variant (3 animated dots) is the most universally recognized AI "thinking" indicator. The text-shimmer with "Thinking" is more expressive.

**Recommended:** `<Loader variant="typing" size="sm" />` inside the agent accent-bordered container where the bubble will appear.

### Required CSS Animations

The `typing` variant uses `animate-[typing_1s_infinite]`. This keyframe must be defined. Check `src/styles.css` — if not present, add:

```css
@keyframes typing {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}
```

The `tw-animate-css` package (already in `package.json`) may provide some of these. Verify at runtime.

### Usage in ChatView

```tsx
{isWaitingForFirstToken && (
  <div className="flex justify-start">
    <div className={cn('border-l-2 pl-3', accentBorder)}>
      <p className="text-muted-foreground mb-1 text-xs font-medium">{agent.name}</p>
      <Loader variant="typing" size="sm" />
    </div>
  </div>
)}
```

---

## 5. Smart Auto-scroll

### Current State: Already Wired

`ChatContainerRoot` already uses `StickToBottom` from `use-stick-to-bottom` (v1.1.3, already in `package.json`). From `src/components/prompt-kit/chat-container.tsx`:

```tsx
import { StickToBottom } from 'use-stick-to-bottom'

function ChatContainerRoot({ children, className, ...props }) {
  return (
    <StickToBottom
      className={cn('relative overflow-y-auto', className)}
      role="log"
      {...props}
    >
      {children}
    </StickToBottom>
  )
}
```

`ChatContainerContent` uses `StickToBottom.Content`. **The smart auto-scroll behavior (stick to bottom when content grows, release when user scrolls up) is already handled automatically by the library.**

### What `StickToBottom` Does Automatically

- **Sticks:** When new content is appended and user was at/near the bottom → scrolls to bottom
- **Releases:** User scrolls up → stops auto-scrolling
- **Resumes:** User scrolls back to bottom → re-enables auto-scroll

This is exactly the required behavior. **No additional wiring needed for the basic smart-scroll.**

### Optional: "Scroll to bottom" button

If desired, `useStickToBottomContext()` exposes `isAtBottom` and `scrollToBottom`:

```tsx
import { useStickToBottomContext } from 'use-stick-to-bottom'

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  return (
    <button
      className="absolute bottom-4 left-1/2 -translate-x-1/2 ..."
      onClick={() => scrollToBottom({ animation: 'smooth' })}
    >
      ↓ New messages
    </button>
  )
}
```

This component must be rendered **inside** the `StickToBottom` component (i.e., inside `ChatContainerRoot`).

### Key API

```typescript
const {
  isAtBottom,        // boolean — user is at (or near) bottom
  isNearBottom,      // boolean — within ~100px of bottom
  escapedFromLock,   // boolean — user has scrolled up
  scrollToBottom,    // (options?) => Promise<boolean>
  contentRef,        // ref to content element
} = useStickToBottomContext()
```

`scrollToBottom` options:
- `animation: 'smooth' | 'instant' | { damping, stiffness, mass }` (spring physics)
- `ignoreEscapes: boolean` — scroll even if user scrolled up (useful for forced scroll-to-bottom on send)

### Source

- Context7 `/stackblitz-labs/use-stick-to-bottom` — MEDIUM confidence (small lib, well-documented)

---

## 6. Abort Controller Pattern

### Client-Side: Generator Reference Approach

```tsx
// In ChatView component
const streamingRef = useRef<{
  generator: AsyncGenerator<string>
  messageId: string
  agentId: string
} | null>(null)

// Abort helper — call on channel switch AND unmount
const abortCurrentStream = useCallback(() => {
  if (!streamingRef.current) return

  const { generator, messageId, agentId } = streamingRef.current

  // Stop iterating the generator — this closes the HTTP connection
  generator.return(undefined)
  streamingRef.current = null

  // Preserve partial message as "interrupted"
  dispatch({ type: 'INTERRUPT_STREAMING', agentId, messageId })
}, [dispatch])

// Abort on agent channel switch
useEffect(() => {
  abortCurrentStream()
}, [agent.id]) // agent.id changes on channel switch

// Abort on unmount
useEffect(() => {
  return () => abortCurrentStream()
}, [])
```

### Server-Side: Respecting Client Abort

```typescript
// In the createServerFn handler:
import { getRequest } from '@tanstack/react-start/server'

.handler(async function* ({ data }) {
  const request = getRequest()
  const signal = request.signal  // AbortSignal from incoming HTTP request

  const stream = await chat.sendMessageStream({ message: lastMessage.content })

  for await (const chunk of stream) {
    if (signal.aborted) break  // Stop yielding if client disconnected
    yield chunk.text ?? ''
  }
})
```

When the client calls `generator.return()`, TanStack Start closes the underlying fetch request. The server's `request.signal` fires `abort`, the `signal.aborted` check stops the Gemini stream iteration, and the in-flight API call is abandoned.

**Does the Gemini SDK accept an AbortSignal directly?** The `@google/genai` SDK docs don't show explicit AbortSignal passthrough in `sendMessageStream`. The `signal.aborted` check in the yield loop is the reliable fallback — it stops processing new chunks when the client disconnects. This does NOT cancel the upstream Gemini HTTP request (Google's servers keep processing briefly), but it stops the node process from waiting for more chunks. For MVP this is acceptable.

### Preserving Partial Message as "Interrupted"

The `ChatMessage` type needs an optional `interrupted` flag:

```typescript
export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId: string
  timestamp: number
  isStreaming?: boolean      // true while tokens are arriving
  interrupted?: boolean      // true if stream was cut mid-way
}
```

New `WorkspaceAction` types needed:

```typescript
type WorkspaceAction =
  | { type: 'APPEND_MESSAGE'; agentId: string; message: ChatMessage }
  | { type: 'START_STREAMING'; agentId: string; message: ChatMessage }
  | { type: 'APPEND_STREAM_CHUNK'; agentId: string; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; agentId: string; messageId: string }
  | { type: 'INTERRUPT_STREAMING'; agentId: string; messageId: string }
```

---

## 7. Agent System Prompts

### Company Context

**Company: Lucidly**
Revenue operations (RevOps) intelligence platform for B2B SaaS companies. Helps go-to-market teams close pipeline gaps with AI-powered forecasting, deal health scoring, and CRM hygiene automation.

- **Stage:** Series A — $16M raised, October 2024, led by Andreessen Horowitz
- **Headcount:** 26 employees (Engineering × 11, Sales × 4, CS × 3, Product × 3, G&A × 5)
- **HQ:** New York, NY (remote-first)
- **ARR:** $3.1M as of Jan 2026, 18% MoM growth
- **Customers:** 94 B2B SaaS companies (SMB–mid-market)
- **Burn rate:** ~$290K/month
- **Runway:** ~22 months (targeting Series B in 14 months)
- **Department heads:** CTO Priya Nair, VP Sales Marcus Webb, Head of Customer Success Dana Kim
- **Current priorities (Q1 2026):** SOC 2 Type II certification, mobile app v1 launch, Series B prep deck, hiring (2 AEs, 1 Senior Engineer, 1 Head of Marketing)

---

### Chief of Staff System Prompt

```
You are the Chief of Staff at Lucidly, a Series A RevOps intelligence platform for B2B SaaS companies ($16M raised, Oct 2024 — Andreessen Horowitz). We have 26 employees, $3.1M ARR, ~22 months runway, and are targeting a Series B in about 14 months.

You serve as the operating brain of the company. Your job is to help the founder (Alex, the user) think clearly, move fast, and keep the whole organization aligned.

**Your domain:**
- Weekly and quarterly OKR tracking across all departments
- Cross-functional dependencies and blockers (CTO Priya Nair, VP Sales Marcus Webb, Head of CS Dana Kim)
- Hiring pipeline: 2 AEs, 1 Senior Engineer, 1 Head of Marketing currently open
- Board and investor communication rhythm
- Q1 priorities: SOC 2 Type II cert, mobile v1 launch, Series B prep deck

**Your persona:**
Decisive and big-picture. You cut through noise. You think three steps ahead. You give clear recommendations, not optionality for its own sake. When you're uncertain, you say so and explain why.

**How you communicate:**
- Use markdown: `##` headers for structure, **bold** for key terms, bullet lists for actions and options
- Lead with the answer or recommendation, then the reasoning
- Keep responses tight — no filler, no throat-clearing
- If the user gives you vague input, make reasonable assumptions and state them
- When flagging risks or decisions, structure them as: **Risk/Decision → Context → Recommended action**

You know the company cold. You remember that Q4 2025 was rough on sales cycles, that the SOC 2 audit is with Vanta (due Q3 2026), and that the engineering team is stretched thin until the Senior Engineer hire closes.
```

---

### Designer System Prompt

```
You are the Designer at Lucidly, a Series A RevOps SaaS company (26 people, $3.1M ARR, NYC-based). You own product design, brand identity, and all visual output — from the web app UI to pitch deck slides to marketing assets.

**Your domain:**
- Product UI/UX: the Lucidly web app (React, Figma-based design system called "Clarity")
- Brand: logotype, color system (deep indigo primary, warm off-white background, slate accents), Inter typeface
- Current project: mobile app v1 (launching Q1 2026) — we're in final design polish
- Marketing: website, social assets, sales collateral

**Your persona:**
Opinionated on craft, but not precious. You have strong aesthetic convictions and you defend them with reasoning, not ego. You're concise — a designer who talks too much usually thinks too little. You push back when something will look or feel wrong, and you explain why.

**How you communicate:**
- Use markdown: **bold** for design terms, bullet lists for options or critique points, inline `code` for specific values (hex, spacing tokens, etc.)
- Give concrete direction — not "consider X" but "use X because Y"
- When reviewing work, structure feedback as: what works, what doesn't, specific fix
- Keep visual descriptions precise: specify weights, spacing, alignment, not just "looks off"
- If the user asks for something vague (e.g. "make it look better"), ask one clarifying question

You know the Clarity design system intimately. Primary: `#3A2DBF` (indigo), Background: `#F8F7F4` (warm white), Text: `#1A1A2E` (near-black). Border radius: 8px. Spacing scale: 4px base. You hate gradients unless they're purposeful.
```

---

### Finance System Prompt

```
You are the Finance lead at Lucidly, a Series A RevOps SaaS company. You function as a CFO-level advisor to the founder (Alex). You own all financial modeling, reporting, and fundraising numbers.

**Company financials (as of Jan 2026):**
- ARR: $3.1M | MoM growth: ~18% | Net Revenue Retention: 112%
- Monthly burn: $290K | Runway: ~22 months (~Jun 2027)
- Cash on hand: ~$6.4M (post-Series A)
- Headcount cost: $2.1M annualized (~73% of burn)
- Top cost centers: Payroll, AWS infrastructure (~$28K/mo), Vanta SOC 2 (~$24K/yr)
- Deferred revenue: $840K
- Series B target: $22–28M, targeting raise in ~14 months (Q2 2027)

**Your persona:**
Numbers-first and precise. You don't round when it matters. You flag risks early and frame them as decisions, not just observations. You're not alarmist, but you don't bury bad news. When assumptions drive a model, you state them.

**How you communicate:**
- Use markdown: tables for financial comparisons, **bold** for key metrics, bullet lists for action items
- Lead with the number or trend, then the implication, then the recommendation
- Format monetary values consistently: $X.XM for millions, $XXK for thousands
- When presenting runway or burn scenarios, always show best/base/worst case
- Flag any assumption that materially changes the output
- Never speculate on tax or legal treatment — defer those to the Legal agent

You track MRR weekly. You know the biggest deals in the pipeline (Marcus Webb's team has 3 deals >$50K ACV in late-stage). You are alert to the fact that churn in Q4 2025 hit 2 accounts (~$180K ARR) and you want to understand the pattern before the Series B deck goes out.
```

---

### Legal System Prompt

```
You are the General Counsel at Lucidly, a Series A RevOps SaaS company. You act as in-house legal advisor to the founder (Alex) on contracts, compliance, IP, employment law, and corporate governance. You are not a litigator — you are a practical, business-oriented lawyer who helps the company move fast without taking undue risk.

**Company legal context:**
- Corporate: Delaware C-Corp, standard Series A docs (NVCA forms), clean cap table
- Contracts: SaaS MSA template (last reviewed Dec 2024), NDA template (mutual and one-way), BAA template for healthcare customers
- Active enterprise agreements: 3 MSAs >$40K ACV (DataPipe Inc., Nexova Systems, Clearfield Analytics)
- Compliance: SOC 2 Type II in progress via Vanta — audit window opens Q3 2026. GDPR: limited EU exposure (2 EU-based customers). CCPA: compliant (Privacy Policy updated Jan 2025)
- IP: All employee IP assigned. 2 contractor IP assignments pending (follow up needed)
- Employment: US-only workforce, remote-first. No equity disputes. Option pool: 12% post-Series A
- Pending items: DPA with one enterprise customer (Clearfield) outstanding; reviewing their security addendum

**Your persona:**
Careful, qualifying, and risk-aware — but actionable. You don't hide behind "it depends" without telling them what it depends on. You give the actual answer, with appropriate caveats. You're not here to block deals; you're here to protect the company while enabling growth.

**How you communicate:**
- Use markdown: **bold** for legal terms and risk levels (e.g. **HIGH RISK**, **LOW RISK**), bullet lists for obligations and action items, block quotes for contract language worth noting
- Structure advice as: **Issue → Risk level → Recommendation → Next step**
- Always state when something requires outside counsel (e.g. litigation, M&A, complex tax)
- Flag jurisdiction-specific issues when they apply
- Be concise — a founder's time is limited; give the practical answer first, detail on request

You know the current contracts cold. You know the Clearfield DPA is the most pressing item. You're watching the 2 contractor IP assignments — if either contractor contributes to the core product and the assignment isn't signed, that's a cap table risk.
```

---

## 8. Architecture Sketch

### New Files

```
src/
├── server/
│   └── chat.ts                    # NEW: createServerFn async generator for Gemini streaming
├── components/
│   ├── prompt-kit/
│   │   └── loader.tsx             # NEW: copy from ibelick/prompt-kit GitHub
│   └── workspace/
│       └── error-banner.tsx       # NEW: persistent error banner component
```

### Modified Files

```
src/
├── styles.css                     # ADD: @source for streamdown, @keyframes for Loader animations
├── components/
│   └── workspace/
│       ├── workspace-context.tsx  # ADD: ChatMessage.isStreaming, ChatMessage.interrupted fields
│       │                          #      ADD: START_STREAMING, APPEND_STREAM_CHUNK,
│       │                          #           FINISH_STREAMING, INTERRUPT_STREAMING actions
│       ├── agents.ts              # ADD: systemPrompts record per agent ID
│       └── chat-view.tsx          # REPLACE: mock setTimeout → real streaming loop
│                                  #          ADD: Loader pre-token state
│                                  #          ADD: Streamdown for agent message rendering
│                                  #          ADD: abort on unmount/channel-switch
│                                  #          ADD: error banner wiring
├── routes/
│   └── __root.tsx                 # ADD: import 'streamdown/styles.css'
```

### Data Flow

```
User types → handleSend()
  │
  ├─ dispatch(APPEND_MESSAGE user)      → WorkspaceContext stores user message
  ├─ setIsWaitingForFirstToken(true)    → Loader appears in ChatView
  │
  ├─ streamChatFn({ agentId, messages, systemPrompt })
  │    │  [HTTP POST to TanStack Start server fn]
  │    │
  │    └─ server: GoogleGenAI chat.sendMessageStream()
  │         │  [async generator yields string chunks]
  │         │
  │         └─ for await chunk:
  │              ├─ if first chunk:
  │              │    setIsWaitingForFirstToken(false)   → Loader fades out
  │              │    dispatch(START_STREAMING)           → empty message bubble appears
  │              └─ dispatch(APPEND_STREAM_CHUNK)         → bubble text grows token-by-token
  │
  ├─ dispatch(FINISH_STREAMING)         → isStreaming=false, final render
  │
  └─ [on error] setError(errorType)     → ErrorBanner appears below input

Channel Switch / Unmount:
  └─ generator.return()                 → closes HTTP stream
     dispatch(INTERRUPT_STREAMING)      → marks partial message with interrupted=true
     abortRef.current = null
```

### WorkspaceContext State Shape (after Phase 3)

```typescript
interface WorkspaceState {
  messages: Record<string, ChatMessage[]>
  // No streaming state in context — streaming state lives in ChatView component
  // (isWaitingForFirstToken, currentStreamingMessageId) are local to ChatView
}
```

Streaming state (which message is actively streaming) stays in `ChatView` component state, not in `WorkspaceContext`. The context only stores the final message array. The streaming message is committed to context progressively via `APPEND_STREAM_CHUNK`, so switching channels preserves partial content.

---

## 9. Open Questions / Risks

### Q1: Does `getRequest().signal` reliably fire when client drops async generator?

**What we know:** TanStack Start server functions are fetch calls. When the client calls `generator.return()`, the underlying HTTP connection should close, triggering the server's `request.signal` abort.

**Risk:** LOW — this is standard HTTP streaming behavior. The `signal.aborted` guard in the yield loop is a safety net.

**Recommendation:** Test explicitly during implementation. Add a console log to confirm server-side abort fires on client `generator.return()`.

---

### Q2: Does the Gemini SDK support passing an AbortSignal to `sendMessageStream()`?

**What we know:** The `@google/genai` docs don't explicitly show AbortSignal passthrough in `sendMessageStream`. The `for await` + `signal.aborted` break is the fallback.

**Risk:** LOW for MVP. The server-side loop stops consuming chunks; the actual Gemini HTTP request may run briefly longer on Google's servers.

**Recommendation:** Verify after install with a quick test. If `sendMessageStream` accepts a `signal` option, pass `request.signal` directly for cleaner cancellation.

---

### Q3: streamdown CSS animation keyframes with Tailwind v4

**What we know:** `streamdown` uses Tailwind utility classes and requires `@source "../node_modules/streamdown/dist/*.js"` in CSS. Tailwind v4 source scanning should work with this directive.

**Risk:** MEDIUM — Tailwind v4's `@source` directive differs from v3's `content` array. Verify that streamdown's compiled classes are detected.

**Recommendation:** After install, run `bun run build` (or dev) and visually confirm code block syntax highlighting renders. If classes are missing, adjust the `@source` path.

---

### Q4: prompt-kit Loader animation keyframes

**What we know:** The `typing` variant uses `animate-[typing_1s_infinite]`. `tw-animate-css` is already in `package.json` — it may provide these keyframes. Needs runtime verification.

**Risk:** LOW — if keyframes are missing, they're trivial to add to `styles.css`.

---

### Q5: Gemini API key env var in TanStack Start

**What we know:** `createServerFn` runs server-side only — `process.env.GOOGLE_AI_API_KEY` will never appear in the client bundle. This satisfies **INFRA-01**.

**Risk:** LOW — TanStack Start's build process strips server function implementations from client bundles. Confirm with `bun run build` that no API key references appear in the output.

**Recommendation:** Add `GOOGLE_AI_API_KEY` to a `.env.local` file (gitignored). Document in README.

---

### Q6: Message history alternation requirement

**What we know:** Gemini requires `history` to alternate user/model roles, starting with user. In practice, if a user sends two consecutive messages before the agent replies (due to an interrupted stream), the history may have two consecutive user turns.

**Risk:** MEDIUM — Gemini API will return a 400 error if roles don't alternate correctly.

**Recommendation:** Add a history normalization step before calling Gemini: if two consecutive messages have the same role, merge them or insert a placeholder. For MVP, since `isPending` prevents sending while streaming is active, this shouldn't occur.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/googleapis/js-genai` — streaming, chat API, history format, system instructions
- Context7 `/vercel/streamdown` — component API, props, code plugin, streaming behavior
- Context7 `/stackblitz-labs/use-stick-to-bottom` — scroll context API
- TanStack Start docs (via MCP): streaming-data-from-server-functions, server-functions guides
- npm registry: streamdown v2.2.0 (verified current version Feb 2026)

### Secondary (MEDIUM confidence)
- GitHub: https://github.com/ibelick/prompt-kit/blob/main/components/prompt-kit/loader.tsx — Loader source (fetched directly)

### Tertiary (LOW confidence)
- Inference about `getRequest().signal` abort propagation — based on general HTTP streaming behavior, not documented explicitly in TanStack Start for this exact pattern

---

## Metadata

**Confidence breakdown:**
- Gemini SDK: HIGH — Context7 `/googleapis/js-genai` has 1117 snippets, High reputation
- TanStack Start streaming: HIGH — official docs fetched directly
- streamdown: HIGH — official npm page + Context7 verified
- use-stick-to-bottom: HIGH — already in project, already wired in ChatContainerRoot
- prompt-kit Loader: HIGH — source fetched directly from GitHub
- Abort pattern: MEDIUM — standard HTTP behavior, not explicitly documented for TanStack + Gemini combo
- Agent system prompts: N/A (authored, not researched)

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (30 days — all libraries fairly stable)
