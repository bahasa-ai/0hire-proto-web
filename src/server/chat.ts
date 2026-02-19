import type { ChatMessage } from '@/components/workspace/workspace-context'

import { GoogleGenAI } from '@google/genai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

interface ChatStreamInput {
  agentId: string
  messages: Array<ChatMessage>
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
    if (messages.length === 0) return

    const historyMessages = messages.slice(0, -1)
    const lastMessage = messages[messages.length - 1]

    const history = historyMessages.map(msg => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }))

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash-lite',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      history,
    })

    const stream = await chat.sendMessageStream({
      message: lastMessage.content,
    })

    for await (const chunk of stream) {
      if (signal.aborted) break
      const text = chunk.text
      if (text) yield text
    }
  })
