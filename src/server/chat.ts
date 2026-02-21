import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import type { ChatMessage } from '@/components/workspace/workspace-context'

export type StreamChunk =
  | { type: 'thinking'; content: string }
  | { type: 'text'; content: string }

interface ChatStreamInput {
  messages: Array<ChatMessage>
  systemPrompt: string
}

export const streamChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChatStreamInput) => data)
  .handler(async function* ({ data }) {
    const { messages, systemPrompt } = data
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
