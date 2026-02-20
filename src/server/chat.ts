import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import type { FunctionDeclaration } from '@google/genai'
import type { ChatMessage } from '@/components/workspace/workspace-context'

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

interface ChatStreamInput {
  agentId: string
  messages: Array<ChatMessage>
  systemPrompt: string
}

// Per-agent tool declarations — each agent gets one function relevant to their role.
// Gemini decides when to call the tool based on intent; client-side keyword detection is not used.
const AGENT_TOOLS: Record<string, Array<FunctionDeclaration>> = {
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
          parties: {
            type: 'string',
            description: 'Relevant parties involved',
          },
        },
        required: ['document_type', 'title'],
      },
    },
  ],
}

// Fake tool results returned after the simulated execution delay.
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

interface FunctionCallPart {
  id: string
  name: string
  args: Record<string, unknown>
}

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

    const agentTools = AGENT_TOOLS[agentId]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- AGENT_TOOLS indexed by agentId may be undefined at runtime
    const hasTools = agentTools?.length > 0
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-lite',
      config: {
        // Encourage parallel tool calls when the user requests multiple artifacts.
        systemInstruction: hasTools
          ? `${systemPrompt}\n\nYou have tools available. When the user requests multiple artifacts (e.g. "create 3 presentations"), call the tool multiple times in parallel — once per artifact, each with distinct parameters. Only invoke tools when the user explicitly asks to create or generate a specific artifact. For all other questions and conversations — including research, advice, opinions, and general discussion — respond normally using your expertise. Never refuse a request just because it doesn't involve the tools.`
          : systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: -1, includeThoughts: true },
        ...(hasTools
          ? {
              tools: [{ functionDeclarations: agentTools }],
              toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
            }
          : undefined),
      },
      history,
    })

    // First turn: collect all function calls or stream plain text.
    const stream1 = await chat.sendMessageStream({
      message: lastMessage.content,
    })

    const functionCallParts: Array<FunctionCallPart> = []

    for await (const chunk of stream1) {
      if (signal.aborted) return
      const parts = chunk.candidates?.[0]?.content?.parts
      if (!parts) continue

      for (const part of parts) {
        if (part.functionCall) {
          functionCallParts.push({
            id: `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: part.functionCall.name ?? '',
            args: part.functionCall.args ?? {},
          })
        } else if (part.text && functionCallParts.length === 0) {
          // Only stream text when no function calls have been seen in this turn
          yield {
            type: part.thought ? 'thinking' : 'text',
            content: part.text,
          } satisfies StreamChunk
        }
      }
    }

    // If Gemini didn't call any tools, we're done.
    if (functionCallParts.length === 0 || signal.aborted) return

    // Signal all tool execution starts to the client before any timers begin.
    for (const fc of functionCallParts) {
      yield {
        type: 'tool_call_start',
        id: fc.id,
        name: fc.name,
        input: fc.args,
      } satisfies StreamChunk
    }

    // Run all tool simulations in parallel; yield each end chunk as it completes
    // so the UI updates each card independently rather than all at once.
    type SettledCall = { fc: FunctionCallPart; result: Record<string, unknown> }

    const pending = functionCallParts.map(
      fc =>
        new Promise<SettledCall>(resolve => {
          const duration = 5_000 + Math.random() * 25_000
          const timer = setTimeout(() => {
            resolve({
              fc,
              result: FAKE_TOOL_RESULTS[fc.name] ?? { status: 'completed' },
            })
          }, duration)
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer)
              resolve({ fc, result: {} })
            },
            { once: true },
          )
        }),
    )

    // Yield tool_call_end chunks as each parallel task finishes.
    const remaining = new Set(pending)
    while (remaining.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted can change across await boundaries
      if (signal.aborted) return

      const winner = await Promise.race(
        [...remaining].map(p => p.then(r => ({ p, r }))),
      )
      remaining.delete(winner.p)

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted can change across await boundaries
      if (signal.aborted) return

      yield {
        type: 'tool_call_end',
        id: winner.r.fc.id,
        output: winner.r.result,
      } satisfies StreamChunk
    }

    // Second turn: send all function responses at once and stream the final reply.
    const stream2 = await chat.sendMessageStream({
      message: functionCallParts.map(fc => ({
        functionResponse: {
          name: fc.name,
          response: FAKE_TOOL_RESULTS[fc.name] ?? { status: 'completed' },
        },
      })),
    })

    for await (const chunk of stream2) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted can change across await boundaries
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
