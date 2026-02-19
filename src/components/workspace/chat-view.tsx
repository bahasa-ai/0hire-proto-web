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

  // Convert bg-chart-X to border-chart-X for left accent border
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

  // Abort when switching to a different agent channel.
  // abortCurrentStream excluded from deps — stable via useCallback([dispatch]).
  useEffect(() => {
    abortCurrentStream()
    setIsWaitingForFirstToken(false)
    setError(null)
  }, [agent.id])

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortCurrentStream()
    }
  }, [])

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isPending) return

      setError(null)

      const userMessage = makeMessage('user', trimmed, agent.id)
      dispatch({ type: 'APPEND_MESSAGE', agentId: agent.id, message: userMessage })
      setInput('')
      setIsWaitingForFirstToken(true)

      // 10s timeout — fires if no first token arrives within the window
      timeoutRef.current = setTimeout(() => {
        abortCurrentStream()
        setIsWaitingForFirstToken(false)
        setError('timeout')
      }, 10_000)

      const systemPrompt =
        AGENT_SYSTEM_PROMPTS[agent.id] ??
        `You are ${agent.name}, an AI assistant.`

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

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abort callback may null this ref
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
    // Re-stream using existing history — no new user message dispatch.
    const allMessages = state.messages[agent.id] ?? []
    if (!allMessages.length) return

    const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return

    setError(null)
    setIsWaitingForFirstToken(true)

    const systemPrompt =
      AGENT_SYSTEM_PROMPTS[agent.id] ?? `You are ${agent.name}, an AI assistant.`

    void (async () => {
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

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- abort callback may null this ref
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
          <div className="px-0 pb-1 pt-3">
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
