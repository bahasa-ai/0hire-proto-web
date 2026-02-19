---
phase: 02-chat-ui-state
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workspace/agents.ts
  - src/components/workspace/workspace-context.tsx
  - src/components/workspace/chat-view.tsx
  - src/components/workspace/empty-chat.tsx
  - src/components/workspace/workspace-main.tsx
  - src/components/workspace/workspace-layout.tsx
autonomous: true
requirements:
  - CHAT-01
  - CHAT-02
  - CHAT-03
  - CHAT-04
  - CHAT-05
  - RENDER-02
  - RENDER-03

must_haves:
  truths:
    - 'Scrollable conversation history per agent using ChatContainerRoot + ChatContainerContent'
    - 'PromptInput composer with PromptInputTextarea — Enter sends, Shift+Enter inserts newline'
    - 'Per-agent messages survive channel switching — stored in WorkspaceContext keyed by agentId'
    - 'Empty channel shows 4 role-specific PromptSuggestion items; clicking one sends that message'
    - 'User messages are right-aligned compact pills; agent replies are borderless text with left accent border — memo style, not bubble style'
    - 'Mock agent response appears after ~1s delay — no API call'
  artifacts:
    - path: 'src/components/workspace/agents.ts'
      provides: 'Extended with MOCK_RESPONSES and AGENT_SUGGESTIONS exports'
      exports:
        [
          'Agent',
          'AGENTS',
          'DEFAULT_AGENT_ID',
          'CURRENT_USER',
          'MOCK_RESPONSES',
          'AGENT_SUGGESTIONS',
        ]
    - path: 'src/components/workspace/workspace-context.tsx'
      provides: 'WorkspaceContext, WorkspaceProvider, useWorkspace hook — useReducer state for per-agent messages'
      exports: ['WorkspaceProvider', 'useWorkspace', 'ChatMessage']
    - path: 'src/components/workspace/chat-view.tsx'
      provides: 'Full chat panel for one agent — message list + PromptInput composer'
      exports: ['ChatView']
    - path: 'src/components/workspace/empty-chat.tsx'
      provides: 'Empty state with 4 text-forward suggestion items specific to agent role'
      exports: ['EmptyChat']
    - path: 'src/components/workspace/workspace-main.tsx'
      provides: 'Main panel — channel header + underline tab toggle (Chat/Tasks) + ChatView or placeholder'
      exports: ['WorkspaceMain']
    - path: 'src/components/workspace/workspace-layout.tsx'
      provides: 'Root orchestrator wrapped in WorkspaceProvider'
      exports: ['WorkspaceLayout']
  key_links:
    - from: 'workspace-layout.tsx'
      to: 'WorkspaceProvider'
      via: 'wraps return JSX'
      pattern: '<WorkspaceProvider>'
    - from: 'chat-view.tsx useWorkspace'
      to: 'WorkspaceContext messages + dispatch'
      via: 'useWorkspace() hook'
      pattern: "useWorkspace\\(\\)"
    - from: 'empty-chat.tsx suggestion onClick'
      to: 'chat-view.tsx handleSend'
      via: 'onSuggestionClick prop callback'
      pattern: "onSuggestionClick\\("
---

<objective>
Build a fully functional mock chat interface — per-agent message history, a polished PromptInput composer, and role-specific empty states — so users can have mock conversations with each of the 4 AI agents.

Purpose: Phase 2 makes the product feel alive. The design intent is "quiet authority" — a business owner delegating to a trusted AI team, not using a consumer chat app. Agent replies render as memo-style briefings (borderless text with a hairline accent border), not rounded bubbles. This distinguishes Zero Hire from generic AI chat UIs.

Output: Working chat UI at route `/` — each agent channel has independent conversation history, empty states with discovery prompts, and a mock response delay.
</objective>

<execution_context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-chat-ui-state/02-RESEARCH.md
@src/styles.css
@src/lib/utils.ts
</execution_context>

<context>
@src/components/workspace/agents.ts
@src/components/workspace/workspace-layout.tsx
@src/components/workspace/workspace-main.tsx
@src/components/workspace/channel-header.tsx
</context>

<design_intent>
**Product world:** Delegation — handing work to a trusted AI team. Mental model: executive office, not chat app.

**Feel:** Quiet authority. Purposeful and minimal. Like communicating with a capable team, not texting.

**Signature:** Agent messages are NOT bubbles. They render as borderless text with a hairline `border-l-2` in the agent's accent color. This signals "considered briefing from your team," not "AI chatbot response."

**Defaults rejected:**

- ❌ Both sides as rounded filled bubbles → ✅ User: compact `bg-primary` pill. Agent: accent left border, no background.
- ❌ Empty state as flex-wrap chip grid → ✅ Centered agent hero + vertically stacked text suggestion list
- ❌ Filled `bg-accent` tab toggle → ✅ Underline tabs: hairline `border-b-2 border-primary` on active, no background

**Subtle layering rule:** The chat area should be barely different from the `bg-background` surface. No card borders around the message area. No dividers that scream. Structure whispers.
</design_intent>

<tasks>

<task type="auto">
  <name>Task 1: Install prompt-kit Components</name>
  <files>
    src/components/prompt-kit/ (created by CLI)
  </files>
  <action>
Install the four required prompt-kit components using the shadcn CLI. Run each command sequentially:

```bash
bunx shadcn@latest add "https://prompt-kit.com/c/chat-container.json"
bunx shadcn@latest add "https://prompt-kit.com/c/message.json"
bunx shadcn@latest add "https://prompt-kit.com/c/prompt-input.json"
bunx shadcn@latest add "https://prompt-kit.com/c/prompt-suggestion.json"
```

Accept any prompts (overwrite existing files if asked). After installation, verify the following files exist in `src/components/prompt-kit/`:

- `chat-container.tsx`
- `message.tsx`
- `prompt-input.tsx`
- `prompt-suggestion.tsx`
  </action>
  <verify>All 4 files exist in `src/components/prompt-kit/`; no TypeScript errors in those files</verify>
  <done>4 prompt-kit component files present under `src/components/prompt-kit/`; type check shows no errors from these files</done>
  </task>

<task type="auto">
  <name>Task 2: Extend Agent Data Layer</name>
  <files>src/components/workspace/agents.ts</files>
  <action>
Append two new exports to `src/components/workspace/agents.ts` after the existing `CURRENT_USER` export.

**`MOCK_RESPONSES`** — one fixed reply string per agentId, written in the agent's voice (expert, concise, delegating back a next question):

```typescript
export const MOCK_RESPONSES: Record<string, string> = {
  'chief-of-staff':
    "Got it — I've added that to your priority list and flagged it across departments. What's the deadline I should be tracking against?",
  'designer':
    "Understood. I'll put together a few visual directions for you to react to. Do you have existing brand guidelines, or are we starting from scratch?",
  'finance':
    "Noted. I'll pull the relevant figures and prepare a summary report. Would you prefer a monthly or quarterly breakdown?",
  'legal':
    "Received. I'll review the applicable requirements and flag anything that needs your attention. Is there a specific jurisdiction or contract type I should focus on first?",
}
```

**`AGENT_SUGGESTIONS`** — 4 discovery prompts per agentId, phrased as natural delegation requests (not questions):

```typescript
export const AGENT_SUGGESTIONS: Record<string, string[]> = {
  'chief-of-staff': [
    "What's on my agenda this week?",
    'Summarize priorities across all departments',
    'Draft a project status update',
    'Which deadlines are coming up in the next 7 days?',
  ],
  'designer': [
    'Create a logo concept for my brand',
    'Suggest a color palette for my website',
    'Review my landing page and flag anything off-brand',
    'Generate copy for a social media banner',
  ],
  'finance': [
    "Summarize this month's cash flow",
    'Identify our top 3 cost centers',
    'Prepare a Q1 financial report draft',
    'Flag any budget risks I should know about',
  ],
  'legal': [
    'Review this contract for red flags',
    'What compliance requirements apply to my business?',
    'Draft a simple NDA template',
    'What liabilities should I be aware of?',
  ],
}
```

  </action>
  <verify>TypeScript compiles with no errors; both exports accessible via named imports from `./agents`</verify>
  <done>`MOCK_RESPONSES` and `AGENT_SUGGESTIONS` exported from `agents.ts`; all 4 agentIds covered; no TypeScript errors</done>
</task>

<task type="auto">
  <name>Task 3: Workspace Context — Per-Agent Message State</name>
  <files>src/components/workspace/workspace-context.tsx</files>
  <action>
Create `src/components/workspace/workspace-context.tsx`.

This module owns all chat message state for the workspace. `useReducer` is used so Phase 3 can add `APPEND_STREAM_TOKEN` / `FINALIZE_STREAM` actions without restructuring.

```typescript
import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId: string
  timestamp: number
}

interface WorkspaceState {
  messages: Record<string, ChatMessage[]>
}

type WorkspaceAction =
  | { type: 'APPEND_MESSAGE'; agentId: string; message: ChatMessage }

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
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
```

  </action>
  <verify>`useWorkspace()` throws if called outside provider; `APPEND_MESSAGE` appends to the correct agentId array without mutating other agents; no TypeScript errors</verify>
  <done>File created with `WorkspaceProvider`, `useWorkspace`, `ChatMessage` type exported; no TypeScript errors</done>
</task>

<task type="auto">
  <name>Task 4: EmptyChat Component</name>
  <files>src/components/workspace/empty-chat.tsx</files>
  <action>
Create `src/components/workspace/empty-chat.tsx`.

**Design intent:** This is not a grid of chips. It's a centered, quiet moment — the agent's identity displayed prominently, then a vertical list of text-forward delegation prompts. Each suggestion is a plain button that looks like a list item, not a pill/card. Uses `PromptSuggestion` from prompt-kit for the click behavior, but styled to match the text-forward aesthetic.

```tsx
import type { Agent } from './agents'

import { PromptSuggestion } from '@/components/prompt-kit/prompt-suggestion'

import { AGENT_SUGGESTIONS } from './agents'

interface EmptyChatProps {
  agent: Agent
  onSuggestionClick: (text: string) => void
}

export function EmptyChat({ agent, onSuggestionClick }: EmptyChatProps) {
  const suggestions = AGENT_SUGGESTIONS[agent.id] ?? []

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <div className="mb-8 text-center">
        <div
          className={`text-primary-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-full text-base font-semibold tracking-wide ${agent.accentColor}`}
        >
          {agent.initials}
        </div>
        <h2 className="text-foreground text-base font-semibold">
          {agent.name}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {agent.description}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-1">
        {suggestions.map(suggestion => (
          <PromptSuggestion
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="text-foreground/70 hover:text-foreground hover:bg-accent w-full justify-start rounded-md px-3 py-2 text-sm transition-colors"
          >
            {suggestion}
          </PromptSuggestion>
        ))}
      </div>
    </div>
  )
}
```

Note: If `PromptSuggestion` does not accept `className` or `justify-start`, fall back to plain `<button>` elements styled directly, and just use `PromptSuggestion` for its click behavior if applicable — or replace entirely with `<button>` elements since the custom styling is the point here.
</action>
<verify>Empty state renders vertically stacked suggestion list (not a chip grid); clicking any item calls `onSuggestionClick` with correct text; agent avatar and description display correctly</verify>
<done>`EmptyChat` renders text-forward vertical suggestion list; `onSuggestionClick` fires on click; no TypeScript errors</done>
</task>

<task type="auto">
  <name>Task 5: ChatView Component</name>
  <files>src/components/workspace/chat-view.tsx</files>
  <action>
Create `src/components/workspace/chat-view.tsx`.

**Design intent — message rendering:**

- **User messages:** Compact pill — `bg-primary text-primary-foreground rounded-2xl px-4 py-2 text-sm` — right-aligned. Clean, contained. The user's words are their own.
- **Agent messages:** NO background, NO rounded card. Hairline `border-l-2` in the agent's accent color (convert `bg-chart-X` → `border-chart-X`), with `pl-3` left padding. The agent's name appears above in `text-xs font-medium text-muted-foreground`. Reads like a memo.
- **Thinking indicator:** A single `…` in `text-muted-foreground` with a gentle CSS `animate-pulse`, preceded by the agent's accent left border — same style as real messages, so the transition from "thinking" to "replied" feels continuous.

**PromptInput composer:**

- Minimal container: `border-t border-border bg-background px-4 py-3`
- No extra card/shadow around the input — just the top border separating it from the message area

**Accent border mapping** — `accentColor` is a `bg-*` class (e.g. `bg-chart-2`). To use as a border, replace `bg-` with `border-` in the class string:

```typescript
const accentBorder = agent.accentColor.replace('bg-', 'border-')
```

```tsx
import type { Agent } from './agents'
import type { ChatMessage } from './workspace-context'

import { useCallback, useState } from 'react'

import { ArrowUp } from 'lucide-react'

import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/prompt-kit/chat-container'
import { Message, MessageContent } from '@/components/prompt-kit/message'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { MOCK_RESPONSES } from './agents'
import { EmptyChat } from './empty-chat'
import { useWorkspace } from './workspace-context'

interface ChatViewProps {
  agent: Agent
}

function makeMessage(
  role: ChatMessage['role'],
  content: string,
  agentId: string,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    agentId,
    timestamp: Date.now(),
  }
}

export function ChatView({ agent }: ChatViewProps) {
  const { state, dispatch } = useWorkspace()
  const [input, setInput] = useState('')
  const [isPending, setIsPending] = useState(false)

  const messages = state.messages[agent.id] ?? []
  const isEmpty = messages.length === 0

  // Convert bg-chart-X to border-chart-X for left accent border
  const accentBorder = agent.accentColor.replace('bg-', 'border-')

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isPending) return

      dispatch({
        type: 'APPEND_MESSAGE',
        agentId: agent.id,
        message: makeMessage('user', trimmed, agent.id),
      })
      setInput('')
      setIsPending(true)

      setTimeout(() => {
        dispatch({
          type: 'APPEND_MESSAGE',
          agentId: agent.id,
          message: makeMessage(
            'agent',
            MOCK_RESPONSES[agent.id] ?? 'Understood.',
            agent.id,
          ),
        })
        setIsPending(false)
      }, 1000)
    },
    [agent.id, dispatch, isPending],
  )

  const handleSubmit = useCallback(() => handleSend(input), [input, handleSend])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <EmptyChat agent={agent} onSuggestionClick={handleSend} />
      ) : (
        <ChatContainerRoot className="min-h-0 flex-1">
          <ChatContainerContent className="space-y-5 px-6 py-6">
            {messages.map(msg =>
              msg.role === 'user' ? (
                // User message — right-aligned compact pill
                <Message key={msg.id} className="flex justify-end">
                  <MessageContent className="bg-primary text-primary-foreground max-w-[65%] rounded-2xl px-4 py-2 text-sm leading-relaxed">
                    {msg.content}
                  </MessageContent>
                </Message>
              ) : (
                // Agent message — memo style: left accent border, no background
                <Message key={msg.id} className="flex justify-start">
                  <div className={cn('border-l-2 pl-3', accentBorder)}>
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      {agent.name}
                    </p>
                    <MessageContent className="text-foreground text-sm leading-relaxed">
                      {msg.content}
                    </MessageContent>
                  </div>
                </Message>
              ),
            )}

            {isPending && (
              // Thinking indicator — same memo structure, pulsing ellipsis
              <div className={cn('flex justify-start')}>
                <div className={cn('border-l-2 pl-3', accentBorder)}>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    {agent.name}
                  </p>
                  <span className="text-muted-foreground animate-pulse text-sm">
                    …
                  </span>
                </div>
              </div>
            )}
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      <div className="border-border bg-background border-t px-4 py-3">
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isPending}
          onSubmit={handleSubmit}
          className="w-full"
        >
          <PromptInputTextarea
            placeholder={`Message ${agent.name}…`}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
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
  )
}
```

  </action>
  <verify>
1. User messages: right-aligned `bg-primary` pills
2. Agent messages: left-aligned, NO background, hairline `border-l-2` in agent accent color, agent name above in muted text
3. Thinking indicator: same memo structure, pulsing `…`
4. Enter sends; Shift+Enter inserts newline
5. Send button disabled when input is empty or pending
  </verify>
  <done>
- Memo-style agent messages render with accent left border — no rounded bubble
- User messages render as compact right-aligned pills
- Thinking indicator is consistent with agent message style
- No TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 6: Update WorkspaceMain — Underline Tab Toggle + ChatView</name>
  <files>src/components/workspace/workspace-main.tsx</files>
  <action>
Replace `src/components/workspace/workspace-main.tsx` entirely.

**Design intent — tab toggle:** Underline-style tabs. Active tab gets a `border-b-2 border-primary` indicator, no background fill. This is quieter than a filled button and reads as part of the page's typographic system, not a separate widget.

```tsx
import type { Agent } from './agents'

import { useState } from 'react'

import { cn } from '@/lib/utils'

import { ChannelHeader } from './channel-header'
import { ChatView } from './chat-view'

interface WorkspaceMainProps {
  activeAgent: Agent
}

export function WorkspaceMain({ activeAgent }: WorkspaceMainProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')

  return (
    <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
      <ChannelHeader agent={activeAgent} />

      {/* Underline tab toggle — quiet, typographic */}
      <div className="border-border flex shrink-0 items-end gap-0 border-b px-6">
        {(['chat', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              '-mb-px border-b-2 px-1 pt-2 pb-2.5 text-sm capitalize transition-colors focus-visible:outline-none',
              tab !== 'chat' && 'ml-5',
              activeTab === tab
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <ChatView agent={activeAgent} />
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Task board coming in Phase 4
        </div>
      )}
    </main>
  )
}
```

Note: `activeTab` is intentionally local — tab resets to Chat on agent switch, which is the desired behavior.
</action>
<verify>

1. Tabs render flush with the channel header bottom border — underline-style, no background fill
2. Active tab has `border-primary` underline indicator; inactive tab is muted with hover state
3. Chat tab renders `ChatView`; Tasks tab renders placeholder text
4. Switching agents resets to Chat tab
   </verify>
   <done>

- Underline tab toggle renders correctly — no filled backgrounds
- `ChatView` renders in the Chat tab
- No TypeScript errors
  </done>
  </task>

<task type="auto">
  <name>Task 7: Wrap WorkspaceLayout with WorkspaceProvider</name>
  <files>src/components/workspace/workspace-layout.tsx</files>
  <action>
Update `src/components/workspace/workspace-layout.tsx` to wrap the return JSX in `WorkspaceProvider`.

```tsx
import { useState } from 'react'

import { AGENTS, DEFAULT_AGENT_ID } from './agents'
import { WorkspaceProvider } from './workspace-context'
import { WorkspaceMain } from './workspace-main'
import { WorkspaceSidebar } from './workspace-sidebar'

export function WorkspaceLayout() {
  const [activeAgentId, setActiveAgentId] = useState(DEFAULT_AGENT_ID)
  const activeAgent = AGENTS.find(a => a.id === activeAgentId) ?? AGENTS[0]

  return (
    <WorkspaceProvider>
      <div className="bg-background flex min-h-svh">
        <WorkspaceSidebar
          agents={AGENTS}
          activeId={activeAgentId}
          onSelect={setActiveAgentId}
        />
        <WorkspaceMain activeAgent={activeAgent} />
      </div>
    </WorkspaceProvider>
  )
}
```

  </action>
  <verify>No "useWorkspace must be used within WorkspaceProvider" console error; switching agents preserves each agent's message history</verify>
  <done>`WorkspaceLayout` wraps with `WorkspaceProvider`; all existing functionality intact; no TypeScript errors</done>
</task>

</tasks>

<verification>
After all tasks complete, verify all 6 Phase 2 success criteria:

1. **CHAT-01:** Scroll area renders with `ChatContainerRoot`; add multiple messages; list is scrollable
2. **CHAT-02 + CHAT-03:** Type and press Enter → message sends. Shift+Enter → newline inserted (not sent)
3. **RENDER-02:** User messages are right-aligned `bg-primary` compact pills — no left-side elements
4. **RENDER-03:** Agent replies have NO background bubble — just `border-l-2` accent border, agent name label above, plain text
5. **CHAT-04:** Send to Chief of Staff → switch to Designer → switch back → Chief of Staff history preserved
6. **CHAT-05:** Fresh channel shows agent avatar + description + 4 vertical text suggestion prompts. Clicking one sends it as a message.

**Design checks:**

- Squint test: hierarchy is perceivable (user right / agent left) but nothing jumps harshly
- Swap test: agent message style is distinct — not interchangeable with any other chat UI
- Subtle layering: chat area is `bg-background` with no card borders around it

Run `bun run check` — must pass with no errors.
</verification>

<success_criteria>

- `bun run dev` starts without errors
- All 6 phase success criteria verified by human visual inspection
- Design checks pass (squint test, swap test, subtle layering)
- `bun run check` (lint + format) exits 0
- No hardcoded hex/rgb/oklch color values in any new component file
- All new files use single quotes, no semicolons (Prettier enforced)
  </success_criteria>

<output>
After completion, create `.planning/phases/02-chat-ui-state/02-chat-ui-state-01-SUMMARY.md` with:
- What was built (components, files)
- Key implementation decisions made
- Design decisions: why memo-style agent messages, why underline tabs, why vertical suggestion list
- Any deviations from the plan and why
- Patterns established for Phase 3 (streaming state extensions, context shape, abort controller hooks)
</output>
