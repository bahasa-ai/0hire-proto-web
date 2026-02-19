---
phase: 03-gemini-streaming-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - bun.lock
  - .env.local
  - src/styles.css
  - src/routes/__root.tsx
  - src/components/workspace/agents.ts
  - src/components/workspace/workspace-context.tsx
  - src/server/chat.ts
  - src/components/prompt-kit/loader.tsx
  - src/components/workspace/error-banner.tsx
  - src/components/workspace/chat-view.tsx
autonomous: false
requirements:
  - CHAT-06
  - STREAM-01
  - STREAM-02
  - STREAM-03
  - STREAM-04
  - INFRA-01
  - RENDER-01

must_haves:
  truths:
    - "Sending a message produces a streaming token-by-token response from Gemini (not a setTimeout mock)"
    - "Typing indicator (Loader) shows between send and first token; disappears on first token"
    - "Agent responses render markdown — headers, bold, bullets, code blocks all display correctly"
    - "Each agent's replies are clearly distinct in personality (Chief of Staff vs Designer vs Finance vs Legal)"
    - "Switching to a different agent mid-stream aborts the stream and marks the partial message as interrupted"
    - "After a Gemini failure, a persistent error banner appears below the input with a Retry button"
    - "GOOGLE_AI_API_KEY never appears in any file under dist/ after bun run build"
  artifacts:
    - path: "src/server/chat.ts"
      provides: "createServerFn async generator that calls Gemini and yields text chunks"
      exports: ["streamChatFn"]
    - path: "src/components/workspace/workspace-context.tsx"
      provides: "Extended ChatMessage type + START_STREAMING / APPEND_STREAM_CHUNK / FINISH_STREAMING / INTERRUPT_STREAMING reducer actions"
    - path: "src/components/workspace/agents.ts"
      provides: "AGENT_SYSTEM_PROMPTS record with full per-agent system prompts for all 4 agents"
    - path: "src/components/prompt-kit/loader.tsx"
      provides: "Loader component with typing variant for pre-first-token indicator"
    - path: "src/components/workspace/error-banner.tsx"
      provides: "Persistent error banner with typed messages and retry button"
    - path: "src/components/workspace/chat-view.tsx"
      provides: "ChatView with real streaming loop, abort-on-switch, Loader state, ErrorBanner, Streamdown rendering"
  key_links:
    - from: "src/components/workspace/chat-view.tsx"
      to: "src/server/chat.ts"
      via: "streamChatFn({ data: { agentId, messages, systemPrompt } })"
      pattern: "streamChatFn"
    - from: "src/server/chat.ts"
      to: "Gemini API"
      via: "GoogleGenAI chat.sendMessageStream()"
      pattern: "sendMessageStream"
    - from: "src/components/workspace/chat-view.tsx"
      to: "src/components/workspace/workspace-context.tsx"
      via: "dispatch(APPEND_STREAM_CHUNK)"
      pattern: "APPEND_STREAM_CHUNK"
---

<objective>
Replace the mock `setTimeout` response loop in ChatView with real Gemini streaming via TanStack Start `createServerFn`. Each of the four agents responds with a distinct persona from a hardcoded system prompt. Tokens stream token-by-token into the chat using `streamdown` for markdown rendering. Requests abort cleanly on channel switch or unmount. A typed error banner handles API failures with a retry path.

Purpose: Make the workspace functional with live AI — the central value proposition of 0hire.
Output: A working AI chat workspace where users can talk to four distinct agent personas with real-time streaming responses.
</objective>

<execution_context>
@.planning/phases/03-claude-streaming-integration/03-CONTEXT.md
@.planning/phases/03-claude-streaming-integration/03-RESEARCH.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/components/workspace/workspace-context.tsx
@src/components/workspace/chat-view.tsx
@src/components/workspace/agents.ts
@src/routes/__root.tsx
@src/styles.css
</context>

<tasks>

<!-- ══════════════════════════════════════════════════════
     SETUP
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T01: Install dependencies and configure environment</name>
  <files>
    package.json
    bun.lock
    .env.local
    src/styles.css
    src/routes/__root.tsx
  </files>
  <action>
**Install packages:**
```bash
bun add @google/genai streamdown @streamdown/code
```

**Create `.env.local`** (in repo root, gitignored):
```
GOOGLE_AI_API_KEY=
```
Verify `.gitignore` already contains `.env.local` or `.env*`. If not, add `.env.local` to `.gitignore`.

**Update `src/styles.css`** — add these two lines immediately after the existing `@import` block (before `:root {`):
```css
/* Required: Tailwind v4 must scan streamdown's compiled JS for utility classes */
@source "../node_modules/streamdown/dist/*.js";

@keyframes typing {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}

@keyframes bounce-dots {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
```

**Update `src/routes/__root.tsx`** — add streamdown CSS import. Insert at top of file, after existing imports:
```typescript
import 'streamdown/styles.css'
```
  </action>
  <verify>
Run `bun install` (no errors). Confirm `@google/genai`, `streamdown`, `@streamdown/code` appear in `package.json` dependencies. Confirm `.env.local` exists at repo root with the key placeholder. Run `bun run dev` — no import errors for streamdown in browser console.
  </verify>
  <done>
All three packages installed. `.env.local` exists with `GOOGLE_AI_API_KEY=` placeholder. `src/styles.css` has `@source` directive and both keyframe definitions. `src/routes/__root.tsx` imports `streamdown/styles.css`. Dev server starts without errors.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     DATA LAYER
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T02: Extend WorkspaceContext with streaming action types</name>
  <files>
    src/components/workspace/workspace-context.tsx
  </files>
  <action>
Replace the entire file content. Additions vs current:
1. `ChatMessage` gets two new optional fields: `isStreaming` and `interrupted`
2. `WorkspaceAction` union expands to include `START_STREAMING`, `APPEND_STREAM_CHUNK`, `FINISH_STREAMING`, `INTERRUPT_STREAMING`
3. `workspaceReducer` handles all four new action types

Full replacement:

```typescript
import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId: string
  timestamp: number
  isStreaming?: boolean
  interrupted?: boolean
}

interface WorkspaceState {
  messages: Record<string, Array<ChatMessage>>
}

type WorkspaceAction =
  | { type: 'APPEND_MESSAGE'; agentId: string; message: ChatMessage }
  | { type: 'START_STREAMING'; agentId: string; message: ChatMessage }
  | { type: 'APPEND_STREAM_CHUNK'; agentId: string; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; agentId: string; messageId: string }
  | { type: 'INTERRUPT_STREAMING'; agentId: string; messageId: string }

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'APPEND_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: [
            ...(state.messages[action.agentId] ?? []),
            action.message,
          ],
        },
      }

    case 'START_STREAMING':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: [
            ...(state.messages[action.agentId] ?? []),
            action.message,
          ],
        },
      }

    case 'APPEND_STREAM_CHUNK': {
      const msgs = state.messages[action.agentId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: msgs.map(m =>
            m.id === action.messageId
              ? { ...m, content: m.content + action.chunk }
              : m,
          ),
        },
      }
    }

    case 'FINISH_STREAMING': {
      const msgs = state.messages[action.agentId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: msgs.map(m =>
            m.id === action.messageId ? { ...m, isStreaming: false } : m,
          ),
        },
      }
    }

    case 'INTERRUPT_STREAMING': {
      const msgs = state.messages[action.agentId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: msgs.map(m =>
            m.id === action.messageId
              ? { ...m, isStreaming: false, interrupted: true }
              : m,
          ),
        },
      }
    }

    default:
      return state
  }
}

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, { messages: {} })

  return (
    <WorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx)
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
```
  </action>
  <verify>
Run `bun run lint` — zero TypeScript errors in `workspace-context.tsx`. Confirm the five action types are present in the union. Confirm `APPEND_STREAM_CHUNK` correctly appends `chunk` to `content` via string concatenation (not replaces).
  </verify>
  <done>
`workspace-context.tsx` exports `ChatMessage` with `isStreaming?` and `interrupted?` fields. Reducer handles all five action types without TypeScript errors. Existing `APPEND_MESSAGE` behavior is unchanged.
  </done>
</task>

<task type="auto">
  <name>T03: Add AGENT_SYSTEM_PROMPTS to agents.ts</name>
  <files>
    src/components/workspace/agents.ts
  </files>
  <action>
Append the following export to the end of `src/components/workspace/agents.ts` (after the existing `AGENT_SUGGESTIONS` export). Do NOT modify any existing exports.

```typescript
export const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'chief-of-staff': `You are the Chief of Staff at Lucidly, a Series A RevOps intelligence platform for B2B SaaS companies ($16M raised, Oct 2024 — Andreessen Horowitz). We have 26 employees, $3.1M ARR, ~22 months runway, and are targeting a Series B in about 14 months.

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
- Use markdown: \`##\` headers for structure, **bold** for key terms, bullet lists for actions and options
- Lead with the answer or recommendation, then the reasoning
- Keep responses tight — no filler, no throat-clearing
- If the user gives you vague input, make reasonable assumptions and state them
- When flagging risks or decisions, structure them as: **Risk/Decision → Context → Recommended action**

You know the company cold. You remember that Q4 2025 was rough on sales cycles, that the SOC 2 audit is with Vanta (due Q3 2026), and that the engineering team is stretched thin until the Senior Engineer hire closes.`,

  designer: `You are the Designer at Lucidly, a Series A RevOps SaaS company (26 people, $3.1M ARR, NYC-based). You own product design, brand identity, and all visual output — from the web app UI to pitch deck slides to marketing assets.

**Your domain:**
- Product UI/UX: the Lucidly web app (React, Figma-based design system called "Clarity")
- Brand: logotype, color system (deep indigo primary, warm off-white background, slate accents), Inter typeface
- Current project: mobile app v1 (launching Q1 2026) — we're in final design polish
- Marketing: website, social assets, sales collateral

**Your persona:**
Opinionated on craft, but not precious. You have strong aesthetic convictions and you defend them with reasoning, not ego. You're concise — a designer who talks too much usually thinks too little. You push back when something will look or feel wrong, and you explain why.

**How you communicate:**
- Use markdown: **bold** for design terms, bullet lists for options or critique points, inline \`code\` for specific values (hex, spacing tokens, etc.)
- Give concrete direction — not "consider X" but "use X because Y"
- When reviewing work, structure feedback as: what works, what doesn't, specific fix
- Keep visual descriptions precise: specify weights, spacing, alignment, not just "looks off"
- If the user asks for something vague (e.g. "make it look better"), ask one clarifying question

You know the Clarity design system intimately. Primary: \`#3A2DBF\` (indigo), Background: \`#F8F7F4\` (warm white), Text: \`#1A1A2E\` (near-black). Border radius: 8px. Spacing scale: 4px base. You hate gradients unless they're purposeful.`,

  finance: `You are the Finance lead at Lucidly, a Series A RevOps SaaS company. You function as a CFO-level advisor to the founder (Alex). You own all financial modeling, reporting, and fundraising numbers.

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

You track MRR weekly. You know the biggest deals in the pipeline (Marcus Webb's team has 3 deals >$50K ACV in late-stage). You are alert to the fact that churn in Q4 2025 hit 2 accounts (~$180K ARR) and you want to understand the pattern before the Series B deck goes out.`,

  legal: `You are the General Counsel at Lucidly, a Series A RevOps SaaS company. You act as in-house legal advisor to the founder (Alex) on contracts, compliance, IP, employment law, and corporate governance. You are not a litigator — you are a practical, business-oriented lawyer who helps the company move fast without taking undue risk.

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

You know the current contracts cold. You know the Clearfield DPA is the most pressing item. You're watching the 2 contractor IP assignments — if either contractor contributes to the core product and the assignment isn't signed, that's a cap table risk.`,
}
```
  </action>
  <verify>
Run `bun run lint` — no errors. Confirm `AGENT_SYSTEM_PROMPTS` is exported and has keys `'chief-of-staff'`, `'designer'`, `'finance'`, `'legal'`. Each value is a non-empty string starting with "You are the".
  </verify>
  <done>
`agents.ts` exports `AGENT_SYSTEM_PROMPTS` with all four agent prompts. No existing exports are modified. TypeScript compiles without errors.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     SERVER FUNCTION
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T04: Create the Gemini streaming server function</name>
  <files>
    src/server/chat.ts
  </files>
  <action>
Create the directory `src/server/` and the file `src/server/chat.ts`:

```typescript
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
    const { messages, systemPrompt } = data
    const signal = getRequest().signal

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

    // All messages except the final user message go into history.
    // Gemini requires alternating user/model roles starting with user.
    const historyMessages = messages.slice(0, -1)
    const lastMessage = messages[messages.length - 1]

    if (!lastMessage) return

    const history = historyMessages.map(msg => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
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

    // Prefix agent name in the sent message for persona continuity in multi-turn history.
    const stream = await chat.sendMessageStream({
      message: lastMessage.content,
    })

    for await (const chunk of stream) {
      if (signal.aborted) break
      const text = chunk.text
      if (text) yield text
    }
  })
```

**Critical notes:**
- `process.env.GOOGLE_AI_API_KEY` is only referenced in this file which runs server-side via `createServerFn`. It will never appear in the client bundle.
- The `history` array excludes the last message because Gemini's `sendMessageStream` takes the final user message separately.
- The `signal.aborted` guard stops yielding when the client closes the connection.
  </action>
  <verify>
Run `bun run lint` — no TypeScript errors in `src/server/chat.ts`. Run `bun run build` and then `grep -r "GOOGLE_AI_API_KEY" dist/` — must return zero matches. The function exports `streamChatFn`.
  </verify>
  <done>
`src/server/chat.ts` exists, exports `streamChatFn`, has no TypeScript errors, and the API key string does not appear in the production build output.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     UI COMPONENTS
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T05: Create the prompt-kit Loader component</name>
  <files>
    src/components/prompt-kit/loader.tsx
  </files>
  <action>
Create `src/components/prompt-kit/loader.tsx` with the following content. This is sourced from https://github.com/ibelick/prompt-kit/blob/main/components/prompt-kit/loader.tsx — only the variants needed for Phase 3 are included (`typing`, `dots`, `text-shimmer`); the remaining variants (`circular`, `classic`, `pulse`, `bars`, etc.) are included as stubs that fall through to `DotsLoader` and can be fleshed out later.

```typescript
import React from 'react'

import { cn } from '@/lib/utils'

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
        'animate-[shimmer_4s_infinite_linear] bg-[length:200%_auto] bg-clip-text font-medium text-transparent',
        textSizes[size],
        className,
      )}
    >
      {text}
    </div>
  )
}

export function Loader({
  variant = 'dots',
  size = 'md',
  text,
  className,
}: LoaderProps) {
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
```
  </action>
  <verify>
Run `bun run lint` — no errors in `src/components/prompt-kit/loader.tsx`. The file exports `Loader`, `DotsLoader`, `TypingLoader`, `TextShimmerLoader`. Import `{ Loader }` from it in a scratch component and confirm TypeScript resolves correctly.
  </verify>
  <done>
`src/components/prompt-kit/loader.tsx` exists, exports `Loader` with `variant="typing"` and `variant="dots"` implementations using semantic color tokens (`bg-muted-foreground`) and the keyframes defined in T01.
  </done>
</task>

<task type="auto">
  <name>T06: Create the ErrorBanner component</name>
  <files>
    src/components/workspace/error-banner.tsx
  </files>
  <action>
Create `src/components/workspace/error-banner.tsx`:

```typescript
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ChatErrorType =
  | 'rate-limited'
  | 'network'
  | 'timeout'
  | 'generic'
  | null

const ERROR_MESSAGES: Record<NonNullable<ChatErrorType>, string> = {
  'rate-limited': 'Rate limited — wait a moment before trying again.',
  network: 'Connection lost — check your network and retry.',
  timeout: 'Response timed out — try again.',
  generic: 'Something went wrong. Try again.',
}

interface ErrorBannerProps {
  error: ChatErrorType
  onRetry: () => void
  className?: string
}

export function ErrorBanner({ error, onRetry, className }: ErrorBannerProps) {
  if (!error) return null

  const message = ERROR_MESSAGES[error]
  const isNetwork = error === 'network'

  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/8 flex items-center gap-3 rounded-lg border px-4 py-2.5',
        className,
      )}
    >
      {isNetwork ? (
        <WifiOff className="text-destructive size-4 shrink-0" />
      ) : (
        <AlertCircle className="text-destructive size-4 shrink-0" />
      )}
      <span className="text-destructive flex-1 text-sm">{message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 gap-1.5 px-2 text-xs"
      >
        <RefreshCw className="size-3" />
        Retry
      </Button>
    </div>
  )
}
```
  </action>
  <verify>
Run `bun run lint` — no errors. `ErrorBanner` renders `null` when `error` prop is `null`. Renders a banner with the correct typed message when a non-null `ChatErrorType` is passed.
  </verify>
  <done>
`src/components/workspace/error-banner.tsx` exists, exports `ErrorBanner` and `ChatErrorType`. The component is null-safe (renders nothing when `error` is null), uses semantic color tokens only, and includes a Retry button that calls `onRetry`.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     CHAT VIEW — STREAMING INTEGRATION
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T07: Replace mock loop in ChatView with real Gemini streaming</name>
  <files>
    src/components/workspace/chat-view.tsx
  </files>
  <action>
Replace the entire file. This is the core integration task — connects all pieces built in T01–T06.

Key behavioral changes from the Phase 2 mock:
1. `handleSend` calls `streamChatFn` instead of `setTimeout`
2. A `streamingRef` tracks the active generator for abort
3. `isWaitingForFirstToken` local state controls Loader visibility
4. `currentStreamingMessageId` tracks which message is receiving chunks
5. Messages with `msg.isStreaming === true` render via `<Streamdown isAnimating>` instead of plain text
6. Completed messages render via `<Streamdown isAnimating={false}>`
7. `interrupted` messages get a visual "· interrupted" suffix label
8. An `ErrorBanner` renders between `ChatContainerRoot` and the input bar
9. On agent channel switch (`agent.id` change) or unmount, the generator is returned and `INTERRUPT_STREAMING` is dispatched
10. Timeout: 10s from send with no first token fires `setError('timeout')`

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'

import { AGENT_SYSTEM_PROMPTS } from './agents'
import { EmptyChat } from './empty-chat'
import { ErrorBanner } from './error-banner'
import { useWorkspace } from './workspace-context'
import type { Agent } from './agents'
import type { ChatErrorType } from './error-banner'
import type { ChatMessage } from './workspace-context'
import { streamChatFn } from '@/server/chat'
import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/prompt-kit/chat-container'
import { Loader } from '@/components/prompt-kit/loader'
import { Message, MessageContent } from '@/components/prompt-kit/message'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatViewProps {
  agent: Agent
}

function makeMessage(
  role: ChatMessage['role'],
  content: string,
  agentId: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    agentId,
    timestamp: Date.now(),
    ...extra,
  }
}

export function ChatView({ agent }: ChatViewProps) {
  const { state, dispatch } = useWorkspace()
  const [input, setInput] = useState('')
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false)
  const [error, setError] = useState<ChatErrorType>(null)

  const streamingRef = useRef<{
    generator: AsyncGenerator<string>
    messageId: string
    agentId: string
  } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messages = state.messages[agent.id] ?? []
  const isEmpty = messages.length === 0
  const isStreaming = messages.some(m => m.isStreaming)
  const isPending = isWaitingForFirstToken || isStreaming

  const accentBorder = agent.accentColor.replace('bg-', 'border-')

  const abortCurrentStream = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (!streamingRef.current) return
    const { generator, messageId, agentId } = streamingRef.current
    generator.return(undefined)
    streamingRef.current = null
    dispatch({ type: 'INTERRUPT_STREAMING', agentId, messageId })
  }, [dispatch])

  // Abort when switching to a different agent channel
  useEffect(() => {
    abortCurrentStream()
    setIsWaitingForFirstToken(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id])

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortCurrentStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isPending) return

      // Clear any existing error on new send
      setError(null)

      const userMessage = makeMessage('user', trimmed, agent.id)
      dispatch({ type: 'APPEND_MESSAGE', agentId: agent.id, message: userMessage })
      setInput('')
      setIsWaitingForFirstToken(true)

      // 10s timeout: if this fires, we're still in the waiting-for-first-token state.
      // No stale closure guard needed — the timeout being un-cleared proves we're waiting.
      timeoutRef.current = setTimeout(() => {
        abortCurrentStream()
        setIsWaitingForFirstToken(false)
        setError('timeout')
      }, 10_000)

      const systemPrompt =
        AGENT_SYSTEM_PROMPTS[agent.id] ??
        `You are ${agent.name}, an AI assistant.`

      // Build message array including the new user message for context
      const allMessages = [
        ...(state.messages[agent.id] ?? []),
        userMessage,
      ]

      try {
        const generator = await streamChatFn({
          data: { agentId: agent.id, messages: allMessages, systemPrompt },
        })

        const agentMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        let isFirstToken = true

        streamingRef.current = { generator, messageId: agentMessageId, agentId: agent.id }

        for await (const chunk of generator) {
          if (!chunk) continue

          if (isFirstToken) {
            isFirstToken = false
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            setIsWaitingForFirstToken(false)
            dispatch({
              type: 'START_STREAMING',
              agentId: agent.id,
              message: makeMessage('agent', chunk, agent.id, {
                id: agentMessageId,
                isStreaming: true,
              }),
            })
          } else {
            dispatch({
              type: 'APPEND_STREAM_CHUNK',
              agentId: agent.id,
              messageId: agentMessageId,
              chunk,
            })
          }
        }

        // Stream completed normally
        if (streamingRef.current?.messageId === agentMessageId) {
          streamingRef.current = null
          dispatch({
            type: 'FINISH_STREAMING',
            agentId: agent.id,
            messageId: agentMessageId,
          })
        }
      } catch (err) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setIsWaitingForFirstToken(false)

        const message = err instanceof Error ? err.message.toLowerCase() : ''
        if (message.includes('rate') || message.includes('429')) {
          setError('rate-limited')
        } else if (message.includes('network') || message.includes('fetch')) {
          setError('network')
        } else {
          setError('generic')
        }
      }
    },
    [agent.id, agent.name, dispatch, isPending, state.messages, abortCurrentStream],
  )

  const handleRetry = useCallback(() => {
    // Re-stream using existing history — do NOT append another user message.
    // The original user message is already in context; only a new agent response starts.
    const allMessages = state.messages[agent.id] ?? []
    if (!allMessages.length) return

    const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return

    setError(null)
    setIsWaitingForFirstToken(true)

    const systemPrompt =
      AGENT_SYSTEM_PROMPTS[agent.id] ?? `You are ${agent.name}, an AI assistant.`

    void (async () => {
      // 10s timeout for retry
      timeoutRef.current = setTimeout(() => {
        abortCurrentStream()
        setIsWaitingForFirstToken(false)
        setError('timeout')
      }, 10_000)

      try {
        const generator = await streamChatFn({
          data: { agentId: agent.id, messages: allMessages, systemPrompt },
        })

        const agentMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        let isFirstToken = true

        streamingRef.current = { generator, messageId: agentMessageId, agentId: agent.id }

        for await (const chunk of generator) {
          if (!chunk) continue

          if (isFirstToken) {
            isFirstToken = false
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
            setIsWaitingForFirstToken(false)
            dispatch({
              type: 'START_STREAMING',
              agentId: agent.id,
              message: makeMessage('agent', chunk, agent.id, {
                id: agentMessageId,
                isStreaming: true,
              }),
            })
          } else {
            dispatch({
              type: 'APPEND_STREAM_CHUNK',
              agentId: agent.id,
              messageId: agentMessageId,
              chunk,
            })
          }
        }

        if (streamingRef.current?.messageId === agentMessageId) {
          streamingRef.current = null
          dispatch({ type: 'FINISH_STREAMING', agentId: agent.id, messageId: agentMessageId })
        }
      } catch (err) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setIsWaitingForFirstToken(false)
        const message = err instanceof Error ? err.message.toLowerCase() : ''
        if (message.includes('rate') || message.includes('429')) {
          setError('rate-limited')
        } else if (message.includes('network') || message.includes('fetch')) {
          setError('network')
        } else {
          setError('generic')
        }
      }
    })()
  }, [agent.id, agent.name, state.messages, dispatch, abortCurrentStream])

  const handleSubmit = useCallback(
    () => handleSend(input),
    [input, handleSend],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <EmptyChat agent={agent} onSuggestionClick={handleSend} />
      ) : (
        <ChatContainerRoot className="min-h-0 flex-1">
          <ChatContainerContent className="space-y-5 px-6 py-6">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <Message key={msg.id} className="flex justify-end">
                  <MessageContent className="bg-primary text-primary-foreground max-w-[65%] rounded-2xl px-4 py-2 text-sm leading-relaxed">
                    {msg.content}
                  </MessageContent>
                </Message>
              ) : (
                <Message key={msg.id} className="flex justify-start">
                  <div className={cn('border-l-2 pl-3', accentBorder)}>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {agent.name}
                      {msg.interrupted && (
                        <span className="ml-1.5 opacity-50">· interrupted</span>
                      )}
                    </p>
                    <MessageContent className="text-foreground rounded-none bg-transparent p-0 text-sm leading-relaxed">
                      <Streamdown
                        plugins={{ code }}
                        isAnimating={msg.isStreaming ?? false}
                        animated={msg.isStreaming ?? false}
                      >
                        {msg.content}
                      </Streamdown>
                    </MessageContent>
                  </div>
                </Message>
              ),
            )}

            {isWaitingForFirstToken && (
              <div className="flex justify-start">
                <div className={cn('border-l-2 pl-3', accentBorder)}>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    {agent.name}
                  </p>
                  <Loader variant="typing" size="sm" />
                </div>
              </div>
            )}
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      <div className="border-border bg-background border-t px-4 pb-3 pt-0">
        {error && (
          <div className="px-0 pt-3 pb-1">
            <ErrorBanner error={error} onRetry={handleRetry} />
          </div>
        )}
        <div className={cn(error ? 'pt-2' : 'pt-3')}>
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isPending}
            onSubmit={handleSubmit}
            className="w-full"
          >
            <PromptInputTextarea placeholder={`Message ${agent.name}…`} />
            <PromptInputActions className="flex justify-end pt-2">
              <PromptInputAction tooltip="Send message">
                <Button
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isPending}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
```

**Implementation notes:**
- `isWaitingForFirstToken` is local state (not in context) — it drives the Loader row
- `isStreaming` is derived from `messages.some(m => m.isStreaming)` — true while chunks are arriving
- `isPending = isWaitingForFirstToken || isStreaming` — disables the send button during both phases
- On retry, `handleRetry` calls the streaming logic directly (not `handleSend`) — no `APPEND_MESSAGE` dispatch, so no duplicate user message in history. The original user message stays; only a new agent response starts streaming.
- The 10s timeout has no `isWaitingForFirstToken` guard — the timeout being un-cleared already proves we are in the waiting state. `abortCurrentStream()` is safe to call unconditionally (it no-ops when `streamingRef.current` is null).
- The `for await` loop handles `isFirstToken` to call `START_STREAMING` on chunk 1, then `APPEND_STREAM_CHUNK` on subsequent chunks
- The `abortCurrentStream` eslint-disable comments prevent stale closure warnings from the effect deps — the function identity is stable via `useCallback([dispatch])`
  </action>
  <verify>
1. Run `bun run lint` — zero errors.
2. Run `bun run dev`, open http://localhost:3000.
3. Add `GOOGLE_AI_API_KEY=<real key>` to `.env.local` and restart dev server.
4. Type a message to the Chief of Staff — the Loader (typing dots) should appear, then disappear when the first token arrives, replaced by streaming text that grows token-by-token.
5. Switch agents mid-stream — the partial message should persist in the first agent's history, marked with "· interrupted".
6. Disconnect network, send a message — a "Connection lost" banner should appear below the input with a Retry button.
  </verify>
  <done>
`chat-view.tsx` no longer uses `setTimeout`. Sending a message triggers `streamChatFn`. Loader shows pre-first-token. Agent messages render via `Streamdown`. Channel switch aborts the stream and marks the message as interrupted. Error banner appears on API failure.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     VISUAL VERIFICATION
     ══════════════════════════════════════════════════════ -->

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Full Gemini streaming integration:
- T01: Dependencies installed, styles updated, `streamdown/styles.css` imported
- T02: WorkspaceContext extended with 4 new streaming actions
- T03: `AGENT_SYSTEM_PROMPTS` for all 4 agents added to `agents.ts`
- T04: `streamChatFn` server function with Gemini async generator
- T05: `Loader` component with `typing` variant
- T06: `ErrorBanner` with typed error messages and retry button
- T07: `ChatView` wired to real streaming — Loader → streaming tokens → Streamdown markdown
  </what-built>
  <how-to-verify>
**Setup:** Ensure `.env.local` has a valid `GOOGLE_AI_API_KEY` and the dev server is running (`bun run dev`).

**Streaming:**
1. Open http://localhost:3000 — workspace loads, no console errors
2. Click Chief of Staff → type "What are our Q1 priorities?" → press Enter
3. ✅ Typing indicator (3 animated dots) appears immediately after send
4. ✅ Dots disappear and text starts growing token-by-token (not all-at-once)
5. ✅ Response uses markdown — at minimum, some **bold** or bullet list formatting

**Persona distinctness:**
6. Open Designer → ask "Critique this color: #FF0000 for a CTA button"
7. ✅ Response is noticeably different in tone from Chief of Staff's answer
8. Repeat for Finance ("What's our current runway?") and Legal ("Do we need a DPA with Clearfield?")
9. ✅ Each agent's response reflects their domain and persona

**Abort / interrupted state:**
10. Send a message to Chief of Staff → immediately click a different agent before streaming finishes
11. ✅ Partial message is visible in Chief of Staff's history, with "· interrupted" label
12. ✅ New agent channel is clean — no orphaned loading state

**Error handling:**
13. Temporarily set `GOOGLE_AI_API_KEY=invalid_key_xyz` in `.env.local`, restart dev server
14. Send a message → ✅ error banner appears below input (not a toast, not inside the bubble)
15. ✅ Banner has correct copy ("Something went wrong. Try again." for a generic auth error)
16. ✅ "Retry" button is present and clickable
17. Restore the real key

**Build security check:**
18. Run `bun run build`
19. Run `grep -r "GOOGLE_AI_API_KEY" dist/` — ✅ zero matches

**Markdown rendering:**
20. Ask Chief of Staff: "Give me a structured weekly priorities list with headers and bullets"
21. ✅ Response renders with proper markdown (headers, bullets) — not raw `##` or `**` characters
  </how-to-verify>
  <resume-signal>
Type "approved" if all checks pass. Describe any issues (e.g. "streaming not working", "markdown showing raw syntax") and the Claude executor will diagnose and fix.
  </resume-signal>
</task>

</tasks>

<verification>
After T07 completes and the checkpoint is approved:

```bash
bun run lint       # Zero errors
bun run build      # Clean production build
grep -r "GOOGLE_AI_API_KEY" dist/   # Must return zero matches
```

Manual smoke test against the checkpoint checklist above.
</verification>

<success_criteria>
All six success criteria from the Phase 3 goal must be TRUE:

1. **Streaming:** Agent responses stream token-by-token — text visibly grows as Gemini generates it
2. **Personas:** Chief of Staff, Designer, Finance, Legal each respond with clearly distinct personalities
3. **Key security:** `GOOGLE_AI_API_KEY` is server-side only — `grep -r "GOOGLE_AI_API_KEY" dist/` returns no matches
4. **Error handling:** On Gemini API failure, user sees a persistent error banner below the input with a retry button
5. **Abort:** Navigating away mid-stream cancels the request — partial message preserved as "interrupted"
6. **Markdown:** AI responses render markdown (bold, italic, code blocks, lists, headers)
</success_criteria>

<output>
After the checkpoint is approved, create `.planning/phases/03-claude-streaming-integration/03-gemini-streaming-01-SUMMARY.md` with:
- Files created/modified
- Key implementation decisions made
- Any deviations from this plan and why
- Confirmation that all 6 success criteria are met
</output>
