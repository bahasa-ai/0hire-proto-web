# Phase 8 Plan 01: Pseudo-Tool Calling

**Phase goal:** When a user asks an agent to create a presentation, deck, or slides, the agent shows a real Gemini tool call card in the chat that spins for 5–30 seconds before resolving — then streams the text response. Uses prompt-kit's `tool.tsx` component for rendering.

**Status:** Pending

---

## Context

- Phases 1–7 complete
- `src/server/chat.ts` uses `@google/genai` v1.42+ with `ai.chats.create` + `sendMessageStream`
- Gemini 2.5 Flash Lite supports real function calling via the `tools` / `functionDeclarations` API
- The trigger is **real Gemini function calling** — not client-side keyword detection. Gemini decides when to call the tool based on the user's message intent.
- The tool "executes" with a server-side sleep of 5–30 seconds (the server generator pauses, then yields the result and resumes streaming text)
- prompt-kit's `tool.tsx` is the rendering primitive — it uses shadcn `Collapsible` from `@/components/ui/collapsible`, which needs to be installed
- `reasoning.tsx` pattern (base-ui Collapsible) is **not** used for this component — we install shadcn's `collapsible` instead to match the prompt-kit component 1:1

---

## Deliverables

1. `src/components/prompt-kit/tool.tsx` — prompt-kit Tool component (adapted: semantic tokens, no `"use client"` directive)
2. `src/server/chat.ts` — add tool declarations + function call handling loop + `tool_call_start`/`tool_call_end` stream chunk types
3. `src/components/workspace/workspace-context.tsx` — add `ToolCall` type + `toolCalls` on `ChatMessage` + 2 new reducer actions
4. `src/components/workspace/chat-view.tsx` — handle new chunk types + render `Tool` component inline in agent messages
5. Install shadcn collapsible: `bunx shadcn@latest add collapsible`

---

## Task Breakdown

### Task 1: Install shadcn `collapsible`

Run:

```bash
bunx shadcn@latest add collapsible
```

This adds `src/components/ui/collapsible.tsx` which the prompt-kit `tool.tsx` imports from `@/components/ui/collapsible`.

---

### Task 2: Add `tool.tsx` to prompt-kit

**File:** `src/components/prompt-kit/tool.tsx`

Copy the prompt-kit `Tool` component verbatim with two modifications:

1. Remove the `"use client"` directive (TanStack Start doesn't use Next.js directives)
2. Replace hardcoded color classes with semantic tokens where possible (keep blue/green/red/orange for status — these are intentional status semantics, not brand colors, so they're acceptable as-is per the existing codebase pattern in `task-board.tsx`)

```tsx
import { useState } from 'react'

import {
  CheckCircle,
  ChevronDown,
  Loader2,
  Settings,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export type ToolPart = {
  type: string
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId?: string
  errorText?: string
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
  className?: string
}

export function Tool({ toolPart, defaultOpen = false, className }: ToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { state, input, output, toolCallId } = toolPart

  const getStateIcon = () => {
    switch (state) {
      case 'input-streaming':
        return <Loader2 className="size-4 animate-spin text-blue-500" />
      case 'input-available':
        return <Settings className="size-4 text-orange-500" />
      case 'output-available':
        return <CheckCircle className="size-4 text-green-500" />
      case 'output-error':
        return <XCircle className="size-4 text-red-500" />
    }
  }

  const getStateBadge = () => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium'
    switch (state) {
      case 'input-streaming':
        return (
          <span
            className={cn(
              base,
              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            )}
          >
            Processing
          </span>
        )
      case 'input-available':
        return (
          <span
            className={cn(
              base,
              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            )}
          >
            Ready
          </span>
        )
      case 'output-available':
        return (
          <span
            className={cn(
              base,
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            )}
          >
            Completed
          </span>
        )
      case 'output-error':
        return (
          <span
            className={cn(
              base,
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            )}
          >
            Error
          </span>
        )
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return String(value)
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }

  return (
    <div
      className={cn(
        'border-border mt-3 overflow-hidden rounded-lg border',
        className,
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="bg-background h-auto w-full justify-between rounded-b-none px-3 py-2 font-normal"
          >
            <div className="flex items-center gap-2">
              {getStateIcon()}
              <span className="font-mono text-sm font-medium">
                {toolPart.type}
              </span>
              {getStateBadge()}
            </div>
            <ChevronDown className={cn('size-4', isOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-border data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden border-t">
          <div className="bg-background space-y-3 p-3">
            {input && Object.keys(input).length > 0 && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Input
                </h4>
                <div className="bg-muted rounded border p-2 font-mono text-sm">
                  {Object.entries(input).map(([key, value]) => (
                    <div key={key} className="mb-1">
                      <span className="text-muted-foreground">{key}:</span>{' '}
                      <span>{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {output && (
              <div>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  Output
                </h4>
                <div className="bg-muted max-h-60 overflow-auto rounded border p-2 font-mono text-sm">
                  <pre className="whitespace-pre-wrap">
                    {formatValue(output)}
                  </pre>
                </div>
              </div>
            )}
            {state === 'output-error' && toolPart.errorText && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-red-500">Error</h4>
                <div className="bg-background rounded border border-red-200 p-2 text-sm dark:border-red-950">
                  {toolPart.errorText}
                </div>
              </div>
            )}
            {state === 'input-streaming' && (
              <div className="text-muted-foreground text-sm">
                Processing tool call…
              </div>
            )}
            {toolCallId && (
              <div className="text-muted-foreground border-t pt-2 text-xs">
                <span className="font-mono">Call ID: {toolCallId}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

---

### Task 3: Add new `StreamChunk` types + tool declarations to `src/server/chat.ts`

**A. Extend `StreamChunk`:**

```ts
export type StreamChunk =
  | { type: 'thinking'; content: string }
  | { type: 'text'; content: string }
  | {
      type: 'tool_call_start'
      id: string
      name: string
      input: Record<string, unknown>
    }
  | { type: 'tool_call_end'; id: string; output: Record<string, unknown> }
```

**B. Define per-agent function declarations:**

Each agent gets one tool declaration — something realistic for their role that would be used when creating a document/presentation:

```ts
import type { FunctionDeclaration } from '@google/genai'

const AGENT_TOOLS: Record<string, FunctionDeclaration[]> = {
  'chief-of-staff': [
    {
      name: 'create_presentation',
      description:
        'Create a business presentation or slide deck on a given topic. Use this whenever the user asks to create, draft, build, or generate a presentation, deck, slides, or similar document.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The presentation title' },
          slides: { type: 'number', description: 'Estimated number of slides' },
          audience: {
            type: 'string',
            description: 'Target audience for the presentation',
          },
        },
        required: ['title'],
      },
    },
  ],
  'designer': [
    {
      name: 'generate_deck_design',
      description:
        'Generate a visual slide deck design or presentation template. Use when the user asks to design, create, or build a presentation, pitch deck, or slide deck.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The deck title or theme' },
          style: {
            type: 'string',
            description: 'Visual style (e.g. minimal, bold, corporate)',
          },
          slides: { type: 'number', description: 'Number of slides' },
        },
        required: ['title'],
      },
    },
  ],
  'finance': [
    {
      name: 'build_financial_model',
      description:
        'Build a financial model, report, spreadsheet, or slide deck with financial data. Use when the user asks to create, build, or generate a financial report, model, presentation, or deck.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The model or report title' },
          period: {
            type: 'string',
            description: 'Time period covered (e.g. Q1 2026, FY2025)',
          },
          scenarios: {
            type: 'number',
            description: 'Number of scenarios (base/bull/bear)',
          },
        },
        required: ['title'],
      },
    },
  ],
  'legal': [
    {
      name: 'draft_document',
      description:
        'Draft a legal document, contract, memo, or presentation. Use when the user asks to create, draft, write, or build a contract, agreement, legal memo, or presentation.',
      parameters: {
        type: 'object',
        properties: {
          document_type: {
            type: 'string',
            description: 'Type of document (e.g. NDA, memo, presentation)',
          },
          title: { type: 'string', description: 'Document title' },
          parties: { type: 'string', description: 'Relevant parties involved' },
        },
        required: ['document_type', 'title'],
      },
    },
  ],
}
```

**C. Fake tool results per function name:**

```ts
const FAKE_TOOL_RESULTS: Record<string, Record<string, unknown>> = {
  create_presentation: {
    status: 'completed',
    slides_generated: 12,
    format: 'Google Slides',
    url: 'https://slides.google.com/d/example-id',
    sections: [
      'Executive Summary',
      'Market Opportunity',
      'Financial Overview',
      'Q&A',
    ],
  },
  generate_deck_design: {
    status: 'completed',
    slides: 10,
    theme: 'Clarity Design System',
    export_format: 'Figma + PDF',
    url: 'https://figma.com/file/example-id',
  },
  build_financial_model: {
    status: 'completed',
    workbook_url: 'https://sheets.google.com/d/example-id',
    scenarios: ['Base', 'Bull', 'Bear'],
    tabs: ['Summary', 'Revenue Model', 'Burn Analysis', 'Runway'],
  },
  draft_document: {
    status: 'completed',
    pages: 4,
    format: 'Google Docs',
    url: 'https://docs.google.com/d/example-id',
    review_required: true,
  },
}
```

**D. Rewrite the handler to support the function call loop:**

The key challenge: `ai.chats.create` + `sendMessageStream` returns a stream. When Gemini wants to call a function, it returns a `functionCall` part in the stream. We must:

1. Collect the stream, check for `functionCall` parts
2. If found: yield `tool_call_start`, sleep 5–30s, yield `tool_call_end`
3. Send the function result back via a second `sendMessageStream` call
4. Stream the final text response

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

    const tools = AGENT_TOOLS[agentId]
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-lite',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: -1, includeThoughts: true },
        ...(tools?.length ? { tools: [{ functionDeclarations: tools }] } : {}),
      },
      history,
    })

    // --- First turn: may contain a function call ---
    const stream1 = await chat.sendMessageStream({
      message: lastMessage.content,
    })

    let functionCallPart: {
      name: string
      args?: Record<string, unknown>
    } | null = null

    for await (const chunk of stream1) {
      if (signal.aborted) return
      const parts = chunk.candidates?.[0]?.content?.parts
      if (!parts) continue

      for (const part of parts) {
        if (part.functionCall) {
          // Gemini wants to call a tool — capture it (don't yield text yet)
          functionCallPart = {
            name: part.functionCall.name ?? '',
            args: (part.functionCall.args ?? {}) as Record<string, unknown>,
          }
        } else if (part.text && !functionCallPart) {
          // Only yield text if no function call has been seen
          yield {
            type: part.thought ? 'thinking' : 'text',
            content: part.text,
          } satisfies StreamChunk
        }
      }
    }

    if (!functionCallPart || signal.aborted) return

    // --- Tool call phase ---
    const toolCallId = `tc-${Date.now()}`
    yield {
      type: 'tool_call_start',
      id: toolCallId,
      name: functionCallPart.name,
      input: functionCallPart.args ?? {},
    } satisfies StreamChunk

    // Simulate tool execution: 5–30 seconds
    const duration = 5_000 + Math.random() * 25_000
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, duration)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    })

    if (signal.aborted) return

    const fakeResult = FAKE_TOOL_RESULTS[functionCallPart.name] ?? {
      status: 'completed',
    }

    yield {
      type: 'tool_call_end',
      id: toolCallId,
      output: fakeResult,
    } satisfies StreamChunk

    // --- Second turn: send function result, stream text response ---
    const stream2 = await chat.sendMessageStream({
      message: [
        {
          functionResponse: {
            name: functionCallPart.name,
            response: fakeResult,
          },
        },
      ],
    })

    for await (const chunk of stream2) {
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

**Note on `sendMessageStream` message format for function responses:** The `@google/genai` chat's `sendMessage`/`sendMessageStream` accepts a `message` that can be a string, a `Part`, or an array of `Part`s. A `Part` with `functionResponse` field sends the tool result back. Verify the exact type signature from `types.SendMessageParameters` — if it doesn't accept `Part[]`, send it as a `Content` object: `{ role: 'user', parts: [{ functionResponse: { name, response } }] }`.

---

### Task 4: Extend `workspace-context.tsx`

**A. Add `ToolCall` type:**

```ts
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  status: 'running' | 'done' | 'error'
}
```

**B. Add `toolCalls` to `ChatMessage`:**

```ts
export interface ChatMessage {
  // ... all existing fields unchanged ...
  toolCalls?: ToolCall[]
}
```

**C. Add two new `WorkspaceAction` types:**

```ts
| {
    type: 'APPEND_TOOL_CALL'
    agentId: string
    messageId: string
    toolCall: ToolCall
  }
| {
    type: 'UPDATE_TOOL_CALL'
    agentId: string
    messageId: string
    toolCallId: string
    update: Partial<ToolCall>
  }
```

**D. Add reducer cases in `workspaceReducer`:**

```ts
case 'APPEND_TOOL_CALL':
  return updateMessage(state, action.agentId, action.messageId, m => ({
    ...m,
    toolCalls: [...(m.toolCalls ?? []), action.toolCall],
  }))

case 'UPDATE_TOOL_CALL':
  return updateMessage(state, action.agentId, action.messageId, m => ({
    ...m,
    toolCalls: m.toolCalls?.map(tc =>
      tc.id === action.toolCallId ? { ...tc, ...action.update } : tc,
    ),
  }))
```

---

### Task 5: Wire into `chat-view.tsx`

**A. Handle new chunk types in `runStream`:**

The `runStream` generator now yields `tool_call_start` and `tool_call_end` chunks. Add handling in the `for await (const chunk of generator)` loop:

```ts
// Inside runStream, in the for-await loop, alongside the existing chunk handling:
if (chunk.type === 'tool_call_start') {
  // If this is the very first event, we need a shell agent message to attach to
  if (isFirstChunk) {
    isFirstChunk = false
    clearStreamTimeout()
    setIsWaitingForFirstToken(false)

    dispatch({
      type: 'START_STREAMING',
      agentId: agent.id,
      message: makeMessage('agent', '', agent.id, {
        id: agentMessageId,
        isStreaming: true,
        toolCalls: [],
      }),
    })
  }

  dispatch({
    type: 'APPEND_TOOL_CALL',
    agentId: agent.id,
    messageId: agentMessageId,
    toolCall: {
      id: chunk.id,
      name: chunk.name,
      input: chunk.input,
      status: 'running',
    },
  })
} else if (chunk.type === 'tool_call_end') {
  dispatch({
    type: 'UPDATE_TOOL_CALL',
    agentId: agent.id,
    messageId: agentMessageId,
    toolCallId: chunk.id,
    update: { status: 'done', output: chunk.output },
  })
} else if (chunk.type === 'text' || chunk.type === 'thinking') {
  // existing handling — but must handle isFirstChunk for the text-only path too
  if (isFirstChunk) {
    isFirstChunk = false
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
  } else if (chunk.type === 'thinking') {
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
```

**Key insight:** The `tool_call_start` chunk now acts as the "first event" that creates the agent message shell — no separate pre-send shell needed. `handleSend` remains unchanged; `runStream` handles everything.

**B. Update the `StreamChunk` import:**

`chat-view.tsx` imports `StreamChunk` from `@/server/chat`. The type union is extended — no import change needed since it's a single imported type. The generator type `AsyncGenerator<StreamChunk>` in `streamingRef` automatically covers the new variants.

**C. Render `toolCalls` in the agent message JSX:**

In the agent message render block (`msg.role === 'agent'` branch), above `<MessageContent>`, add:

```tsx
import type { ToolPart } from '@/components/prompt-kit/tool'

import { Tool } from '@/components/prompt-kit/tool'

// In the JSX, above <MessageContent>:
{
  msg.toolCalls && msg.toolCalls.length > 0 && (
    <div className="mb-2">
      {msg.toolCalls.map(tc => {
        const toolPart: ToolPart = {
          type: tc.name,
          state:
            tc.status === 'running'
              ? 'input-streaming'
              : tc.status === 'done'
                ? 'output-available'
                : 'output-error',
          input: tc.input,
          output: tc.output,
          toolCallId: tc.id,
        }
        return <Tool key={tc.id} toolPart={toolPart} />
      })}
    </div>
  )
}
```

---

## Success Criteria Checklist

1. - [ ] Asking any agent "create a presentation on X" triggers a tool call card before the text reply
2. - [ ] The tool card shows a spinner and "Processing" badge while running (5–30 seconds)
3. - [ ] After resolution, the card transitions to a green checkmark and "Completed" badge
4. - [ ] Clicking the card expands to show Input (title, etc.) and Output (url, slides, etc.)
5. - [ ] Different agents show different tool names (Designer: `generate_deck_design`, Finance: `build_financial_model`)
6. - [ ] Non-presentation messages ("what's your name?") show no tool call card — just a streamed text reply
7. - [ ] `bun run check` passes clean after all changes

---

## Implementation Notes

- **Server sleep is abort-aware:** The `setTimeout` is wrapped with `signal.addEventListener('abort', ...)` so it resolves immediately on cancel — no orphaned 30-second waits.
- **`sendMessageStream` function response format:** Use `message: [{ functionResponse: { name, response } }]` — the SDK's `SendMessageParameters.message` accepts `Part | Part[] | string`. If TypeScript rejects this shape, fall back to passing a full `Content` object: `{ role: 'user' as const, parts: [{ functionResponse: { name, response } }] }`.
- **Tool calling only for tool-enabled agents:** The `tools` config is only added to the chat when `AGENT_TOOLS[agentId]` is defined and non-empty. All 4 agents have tools defined, so all 4 support this.
- **No `existingMessageId` complexity:** By treating `tool_call_start` as the "first chunk" trigger for `START_STREAMING`, the approach stays within the existing `runStream` pattern — no separate shell message pre-creation, no `existingMessageId` parameter.
- **Timeout:** The existing 10s timeout in `runStream` fires before the tool call would complete. **Remove or extend the timeout when tools are active.** One option: reset the timeout on `tool_call_start` receipt. Simplest: increase to 60s for the initial `isWaitingForFirstToken` phase (Gemini must respond with a function call within 10s, which is fine — only the sleep is long).
- **Thinking chunks during tool-call path:** If `isFirstChunk` is true and the first event is `tool_call_start`, the shell message is created with `isThinking: false`. Any subsequent `thinking` chunks after `tool_call_end` and before text will need to be handled — but Gemini typically doesn't emit thinking chunks in the function-call response turn. Acceptable edge case for MVP.
- **No new dependencies** beyond `shadcn collapsible` (already in the shadcn ecosystem, zero new npm packages).
- **`bun run check`** must pass after all changes.
