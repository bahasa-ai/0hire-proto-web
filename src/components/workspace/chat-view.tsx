import { useCallback, useEffect, useRef, useState } from 'react'
import { code } from '@streamdown/code'
import { ArrowUp } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { AGENT_SYSTEM_PROMPTS } from './agents'
import { EmptyChat } from './empty-chat'
import { ErrorBanner } from './error-banner'
import { useWorkspace } from './workspace-context'
import type { Agent } from './agents'
import type { ChatErrorType } from './error-banner'
import type { ChatMessage } from './workspace-context'



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
import { streamChatFn } from '@/server/chat'


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

function classifyError(err: unknown): ChatErrorType {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('rate') || msg.includes('429')) return 'rate-limited'
  if (msg.includes('network') || msg.includes('fetch')) return 'network'
  return 'generic'
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
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

  const clearStreamTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const abortCurrentStream = useCallback(() => {
    clearStreamTimeout()
    if (!streamingRef.current) return
    const { generator, messageId, agentId } = streamingRef.current
    generator.return(undefined)
    streamingRef.current = null
    dispatch({ type: 'INTERRUPT_STREAMING', agentId, messageId })
  }, [dispatch, clearStreamTimeout])

  // Abort when switching to a different agent channel.
  // abortCurrentStream is intentionally excluded from deps — stable via useCallback([dispatch]).
  useEffect(() => {
    abortCurrentStream()
    setIsWaitingForFirstToken(false)
    setError(null)
  }, [agent.id])

  useEffect(() => {
    return () => {
      abortCurrentStream()
    }
  }, [])

  const runStream = useCallback(
    async (allMessages: Array<ChatMessage>) => {
      const systemPrompt =
        AGENT_SYSTEM_PROMPTS[agent.id] ??
        `You are ${agent.name}, an AI assistant.`

      setError(null)
      setIsWaitingForFirstToken(true)

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

        streamingRef.current = {
          generator,
          messageId: agentMessageId,
          agentId: agent.id,
        }

        for await (const chunk of generator) {
          if (!chunk) continue

          if (isFirstToken) {
            isFirstToken = false
            clearStreamTimeout()
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
        clearStreamTimeout()
        setIsWaitingForFirstToken(false)
        setError(classifyError(err))
      }
    },
    [agent.id, agent.name, dispatch, abortCurrentStream, clearStreamTimeout],
  )

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

      await runStream([...(state.messages[agent.id] ?? []), userMessage])
    },
    [agent.id, dispatch, isPending, state.messages, runStream],
  )

  const handleRetry = useCallback(async () => {
    const allMessages = state.messages[agent.id] ?? []
    if (!allMessages.some(m => m.role === 'user')) return
    await runStream(allMessages)
  }, [agent.id, state.messages, runStream])

  const handleSubmit = useCallback(() => handleSend(input), [input, handleSend])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <EmptyChat agent={agent} onSuggestionClick={handleSend} />
      ) : (
        <ChatContainerRoot className="min-h-0 flex-1">
          <ChatContainerContent className="px-2 py-4">
            {messages.map(msg =>
              msg.role === 'user' ? (
                /* User message — right-aligned bubble */
                <Message key={msg.id} className="flex justify-end px-2 py-1">
                  <div className="max-w-[65%]">
                    <p className="text-muted-foreground mb-1 text-right text-[11px]">
                      {formatTime(msg.timestamp)}
                    </p>
                    <MessageContent className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                      {msg.content}
                    </MessageContent>
                  </div>
                </Message>
              ) : (
                /* Agent message — Slack-style avatar + name + content */
                <Message
                  key={msg.id}
                  className="hover:bg-accent/40 flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors"
                >
                  <span
                    className={cn(
                      'text-primary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                      agent.accentColor,
                    )}
                  >
                    {agent.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="text-foreground text-sm font-semibold">
                        {agent.name}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.interrupted && (
                        <span className="text-muted-foreground/50 text-[11px]">
                          · interrupted
                        </span>
                      )}
                    </div>
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

            {/* Typing indicator — same layout as agent messages */}
            {isWaitingForFirstToken && (
              <div className="flex items-start gap-3 px-2 py-1.5">
                <span
                  className={cn(
                    'text-primary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    agent.accentColor,
                  )}
                >
                  {agent.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-foreground text-sm font-semibold">
                      {agent.name}
                    </span>
                  </div>
                  <Loader variant="typing" size="sm" />
                </div>
              </div>
            )}
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      {/* Input area */}
      <div className="border-border bg-background border-t px-4 pb-4">
        {error && (
          <div className="pt-3 pb-1">
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
