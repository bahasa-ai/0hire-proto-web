# Phase 10 Plan: Agentic Action Plan UI

## Goal

Replace raw tool call cards (`Tool` component with call IDs, JSON blobs, collapsible output) with a polished `AgentPlanCard` — a vertical list of human-readable step rows with status icons. Switch from live Gemini function calling to client-side keyword detection + mock step animation. Non-task messages continue to stream with no steps shown.

## Pre-conditions (post-Phase 9)

This plan targets the codebase after Phase 9 executes. At that point:

- `workspace-context.tsx` already has flat `messages: Record<agentId, ChatMessage[]>` state with no conversation machinery
- `ChatMessage` still has `toolCalls?: Array<ToolCall>` (Phase 10 replaces this)
- `chat-view.tsx` has no conversation props/dispatch
- `server/chat.ts` still has full Gemini function-calling machinery (Phase 10 strips it)

## Files Changed

| File                                             | Action                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/workspace/tool-calls.ts`         | **CREATE** — Per-agent step libraries + keyword detection                                                                      |
| `src/components/workspace/agent-plan-card.tsx`   | **CREATE** — `AgentPlanCard` + `AgentStepRow` components                                                                       |
| `src/components/workspace/workspace-context.tsx` | Modify — Replace `ToolCall`/`toolCalls` with `AgentStep`/`steps`; swap `APPEND_TOOL_CALL`/`UPDATE_TOOL_CALL` for `UPDATE_STEP` |
| `src/server/chat.ts`                             | Modify — Remove all function-calling machinery; simplify `StreamChunk` to `text` \| `thinking` only                            |
| `src/components/workspace/chat-view.tsx`         | Modify — Keyword detection, step animation, new rendering, refactored `runStream`                                              |

---

## Step 1 — Create `src/components/workspace/tool-calls.ts`

```ts
const TASK_KEYWORDS =
  /\b(create|draft|build|make|generate|write|design|prepare|send|summarize|compile|set up)\b/i

export function isTaskOriented(text: string): boolean {
  return TASK_KEYWORDS.test(text)
}

// Per-agent step libraries — 5 plain-English steps each.
export const AGENT_STEPS: Record<string, Array<string>> = {
  'chief-of-staff': [
    'Reviewing your request',
    'Scanning team priorities',
    'Drafting action plan',
    'Coordinating across departments',
    'Preparing summary',
  ],
  'designer': [
    'Reviewing brand guidelines',
    'Searching design references',
    'Generating initial concepts',
    'Applying design system tokens',
    'Exporting deliverables',
  ],
  'finance': [
    'Pulling financial data',
    'Running scenario analysis',
    'Building the model',
    'Cross-checking against budget',
    'Compiling final report',
  ],
  'legal': [
    'Reviewing applicable regulations',
    'Checking existing templates',
    'Drafting document structure',
    'Applying standard clauses',
    'Flagging items for review',
  ],
}

export function getAgentSteps(agentId: string): Array<string> {
  return AGENT_STEPS[agentId] ?? AGENT_STEPS['chief-of-staff']
}
```

---

## Step 2 — Create `src/components/workspace/agent-plan-card.tsx`

```tsx
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import type { AgentStep } from './workspace-context'

function StepIcon({ status }: { status: AgentStep['status'] }) {
  switch (status) {
    case 'pending':
      return <Circle className="text-muted-foreground/40 size-3.5 shrink-0" />
    case 'running':
      return <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />
    case 'done':
      return <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
    case 'error':
      return <XCircle className="text-destructive size-3.5 shrink-0" />
  }
}

function AgentStepRow({ step }: { step: AgentStep }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <StepIcon status={step.status} />
      <span
        className={cn(
          'text-sm',
          step.status === 'pending'
            ? 'text-muted-foreground/60'
            : 'text-foreground',
        )}
      >
        {step.label}
      </span>
    </div>
  )
}

export function AgentPlanCard({ steps }: { steps: Array<AgentStep> }) {
  return (
    <div className="border-border/60 bg-muted/20 mb-3 rounded-xl border px-3.5 py-2">
      <div className="divide-border/30 divide-y">
        {steps.map(step => (
          <AgentStepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  )
}
```

---

## Step 3 — Update `workspace-context.tsx`

### 3a — Replace `ToolCall` with `AgentStep`

```ts
// Remove entirely:
export interface ToolCall { ... }

// Add:
export interface AgentStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}
```

### 3b — Update `ChatMessage`

```ts
// Remove: toolCalls?: Array<ToolCall>
// Add:    steps?: Array<AgentStep>
```

### 3c — Update `WorkspaceAction` union

```ts
// Remove:
| { type: 'APPEND_TOOL_CALL'; agentId: string; messageId: string; toolCall: ToolCall }
| { type: 'UPDATE_TOOL_CALL'; agentId: string; messageId: string; toolCallId: string; update: Partial<ToolCall> }

// Add:
| {
    type: 'UPDATE_STEP'
    agentId: string
    messageId: string
    stepId: string
    update: Partial<Pick<AgentStep, 'status'>>
  }
```

### 3d — Update reducer

```ts
// Remove: case 'APPEND_TOOL_CALL', case 'UPDATE_TOOL_CALL'

// Add:
case 'UPDATE_STEP':
  return updateMessage(state, action.agentId, action.messageId, m => ({
    ...m,
    steps: m.steps?.map(s =>
      s.id === action.stepId ? { ...s, ...action.update } : s,
    ),
  }))
```

---

## Step 4 — Simplify `server/chat.ts`

### Remove entirely:

- `AGENT_TOOLS` constant (per-agent `FunctionDeclaration` arrays)
- `FAKE_TOOL_RESULTS` constant
- `FunctionCallPart` interface
- All function-call detection logic in the handler (first-turn loop accumulating `functionCallParts`, the two-turn structure, parallel tool timers)
- `tool_call_start` and `tool_call_end` from `StreamChunk`

### Updated `StreamChunk`:

```ts
export type StreamChunk =
  | { type: 'thinking'; content: string }
  | { type: 'text'; content: string }
```

### Simplified handler (single turn, text + thinking only):

```ts
export const streamChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChatStreamInput) => data)
  .handler(async function* ({ data }) {
    const { agentId, messages, systemPrompt } = data
    const signal = getRequest().signal

    if (messages.length === 0) return

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
    const lastMessage = messages[messages.length - 1]
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }))

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-lite',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: -1, includeThoughts: true },
      },
      history,
    })

    const stream = await chat.sendMessageStream({
      message: lastMessage.content,
    })

    for await (const chunk of stream) {
      if (signal.aborted) return
      const parts = chunk.candidates?.[0]?.content?.parts
      if (!parts) continue
      for (const part of parts) {
        if (!part.text) continue
        yield {
          type: part.thought ? 'thinking' : 'text',
          content: part.text,
        } satisfies StreamChunk
      }
    }
  })
```

**Remove `agentId` from `ChatStreamInput`** if it's only used for tool selection (no longer needed). If still needed for other purposes, keep it.

---

## Step 5 — Refactor `chat-view.tsx`

### 5a — Remove imports

```ts
// Add:
import type { ToolPart } from '@/components/prompt-kit/tool'
import { Tool } from '@/components/prompt-kit/tool'
import { AgentPlanCard } from './agent-plan-card'
import { getAgentSteps, isTaskOriented } from './tool-calls'

// Remove:
```

### 5b — Remove `toolCallState()` helper

Delete the `toolCallState` function entirely — no longer used.

### 5c — Add `stepAnimationRef`

```ts
const stepAnimationRef = useRef<{
  timers: Array<ReturnType<typeof setTimeout>>
  messageId: string
  cancelled: boolean
} | null>(null)
```

### 5d — Update `abortCurrentStream` to cancel step animation

```ts
const abortCurrentStream = useCallback(() => {
  clearStreamTimeout()

  // Cancel any in-progress step animation
  if (stepAnimationRef.current) {
    const {
      timers,
      messageId,
      cancelled: alreadyCancelled,
    } = stepAnimationRef.current
    if (!alreadyCancelled) {
      timers.forEach(clearTimeout)
      stepAnimationRef.current.cancelled = true
      dispatch({ type: 'INTERRUPT_STREAMING', agentId: agent.id, messageId })
    }
    stepAnimationRef.current = null
  }

  if (!streamingRef.current) return
  const { generator, messageId, agentId } = streamingRef.current
  generator.return(undefined)
  streamingRef.current = null
  dispatch({ type: 'INTERRUPT_STREAMING', agentId, messageId })
}, [dispatch, clearStreamTimeout, agent.id])
```

### 5e — Refactor `runStream` — accept optional `existingMessageId`

```ts
const runStream = useCallback(
  async (allMessages: Array<ChatMessage>, existingMessageId?: string) => {
    const systemPrompt =
      AGENT_SYSTEM_PROMPTS[agent.id] ??
      `You are ${agent.name}, an AI assistant.`

    setError(null)

    // Only show the "Thinking" shimmer when creating a new message (no existing shell).
    if (!existingMessageId) {
      setIsWaitingForFirstToken(true)
    }

    timeoutRef.current = setTimeout(() => {
      abortCurrentStream()
      setIsWaitingForFirstToken(false)
      setError('timeout')
    }, 30_000)

    try {
      const generator = await streamChatFn({
        data: { agentId: agent.id, messages: allMessages, systemPrompt },
      })

      const agentMessageId =
        existingMessageId ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`

      // When existingMessageId is given, the message shell is already dispatched.
      // Skip the START_STREAMING dispatch on first chunk; go straight to appending.
      let messageShellCreated = !!existingMessageId

      streamingRef.current = {
        generator,
        messageId: agentMessageId,
        agentId: agent.id,
      }

      for await (const chunk of generator) {
        if (!messageShellCreated) {
          // First chunk — create the agent message shell
          messageShellCreated = true
          clearStreamTimeout()
          setIsWaitingForFirstToken(false)

          dispatch({
            type: 'START_STREAMING',
            agentId: agent.id,
            message: makeMessage(
              'agent',
              chunk.type === 'text' ? chunk.content : '',
              agent.id,
              {
                id: agentMessageId,
                isStreaming: true,
                isThinking: chunk.type === 'thinking',
                thinking: chunk.type === 'thinking' ? chunk.content : undefined,
              },
            ),
          })
        } else {
          // Subsequent chunks — append to existing message
          if (chunk.type === 'thinking') {
            dispatch({
              type: 'APPEND_THINKING_CHUNK',
              agentId: agent.id,
              messageId: agentMessageId,
              chunk: chunk.content,
            })
          } else {
            dispatch({
              type: 'APPEND_STREAM_CHUNK',
              agentId: agent.id,
              messageId: agentMessageId,
              chunk: chunk.content,
            })
          }
        }
      }

      if (streamingRef.current?.messageId === agentMessageId) {
        streamingRef.current = null
        dispatch({
          type: 'FINISH_STREAMING',
          agentId: agent.id,
          messageId: agentMessageId,
        })
      }
    } catch (err) {
      clearStreamTimeout()
      setIsWaitingForFirstToken(false)
      setError(classifyError(err))
    }
  },
  [agent.id, agent.name, dispatch, abortCurrentStream, clearStreamTimeout],
)
```

> Note: When `existingMessageId` is given, `clearStreamTimeout()` and `setIsWaitingForFirstToken(false)` are NOT called on the first chunk (they were already handled during step animation). The `messageShellCreated = true` path skips `START_STREAMING` and goes directly to `APPEND_STREAM_CHUNK`. However, we should still call `clearStreamTimeout()` on the first chunk to reset the 30s timeout. Revise: always call `clearStreamTimeout()` on the first chunk regardless of path.

**Revised first-chunk handling when `existingMessageId` is given:**

```ts
} else {
  // First chunk for existing message
  messageShellCreated = true
  clearStreamTimeout() // ← always clear timeout on first chunk
  // No need to call setIsWaitingForFirstToken(false) — already false from animation

  if (chunk.type === 'thinking') {
    dispatch({ type: 'APPEND_THINKING_CHUNK', ... })
  } else {
    dispatch({ type: 'APPEND_STREAM_CHUNK', ... })
  }
}
```

Wait — `messageShellCreated` starts `true` when `existingMessageId` is given. So the first chunk will always fall into the `else` branch (append), which is correct. The note above is already handled by the logic structure. Keep as-is.

### 5f — Update `handleSend` with keyword detection + step animation

```ts
const handleSend = useCallback(
  async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return

    const userMessage = makeMessage('user', trimmed, agent.id)
    dispatch({
      type: 'APPEND_MESSAGE',
      agentId: agent.id,
      message: userMessage,
    })
    setInput('')

    const allMessages = [...getActiveMessages(state, agent.id), userMessage]

    if (isTaskOriented(trimmed)) {
      const agentMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const stepLabels = getAgentSteps(agent.id)
      const steps: Array<AgentStep> = stepLabels.map((label, i) => ({
        id: `step-${i}`,
        label,
        status: 'pending',
      }))

      // Dispatch agent message shell with all steps in 'pending' state.
      dispatch({
        type: 'START_STREAMING',
        agentId: agent.id,
        message: makeMessage('agent', '', agent.id, {
          id: agentMessageId,
          isStreaming: true,
          steps,
        }),
      })

      // Register animation state for abort/cleanup.
      const animState = {
        timers: [] as Array<ReturnType<typeof setTimeout>>,
        messageId: agentMessageId,
        cancelled: false,
      }
      stepAnimationRef.current = animState

      const STAGGER_MS = 600

      // Mark first step 'running' immediately.
      dispatch({
        type: 'UPDATE_STEP',
        agentId: agent.id,
        messageId: agentMessageId,
        stepId: steps[0].id,
        update: { status: 'running' },
      })

      // Staggered step completion: each step goes 'done', next goes 'running'.
      steps.forEach((step, i) => {
        const timer = setTimeout(
          () => {
            if (animState.cancelled) return
            dispatch({
              type: 'UPDATE_STEP',
              agentId: agent.id,
              messageId: agentMessageId,
              stepId: step.id,
              update: { status: 'done' },
            })
            if (i + 1 < steps.length) {
              dispatch({
                type: 'UPDATE_STEP',
                agentId: agent.id,
                messageId: agentMessageId,
                stepId: steps[i + 1].id,
                update: { status: 'running' },
              })
            }
          },
          STAGGER_MS * (i + 1),
        )
        animState.timers.push(timer)
      })

      // Start streaming after all steps complete.
      const totalMs = STAGGER_MS * steps.length
      const streamTimer = setTimeout(() => {
        if (animState.cancelled) return
        stepAnimationRef.current = null
        runStream(allMessages, agentMessageId)
      }, totalMs + 100)
      animState.timers.push(streamTimer)
    } else {
      await runStream(allMessages)
    }
  },
  [agent.id, dispatch, isPending, state, runStream],
)
```

> Add `AgentStep` to imports from `workspace-context`: `import { getActiveMessages, useWorkspace, type AgentStep, type ChatMessage } from './workspace-context'`

### 5g — Update `AgentBubble` rendering

```tsx
// Remove:
{msg.toolCalls && msg.toolCalls.length > 0 && (
  <div className="mb-2">
    {msg.toolCalls.map(tc => (
      <Tool key={tc.id} toolPart={{ ... }} />
    ))}
  </div>
)}

// Add:
{msg.steps && msg.steps.length > 0 && (
  <AgentPlanCard steps={msg.steps} />
)}
```

---

## Verification

After all changes, run:

```bash
bun run check
```

All must pass. Also confirm manually:

1. Sending "create a presentation" to any agent shows `AgentPlanCard` with 5 step rows above the text reply
2. Steps animate sequentially: first goes running → done, next goes running → done, etc. (~600ms each)
3. After all steps complete, the agent's text reply streams in below the plan card
4. Step rows show only a status icon + plain English label — no call ID, no JSON visible
5. Sending "what's your name?" (no task keyword) shows no plan card — just a streamed text reply
6. Different agents show different step labels (Chief of Staff vs Designer vs Finance vs Legal)
7. Clicking Stop during step animation halts the animation and marks the message interrupted
8. Clicking Stop during text streaming works as before (aborts generator)
9. No TypeScript errors from removed `ToolCall` type or dead `APPEND_TOOL_CALL`/`UPDATE_TOOL_CALL` references
