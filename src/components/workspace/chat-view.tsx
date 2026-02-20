import { useCallback, useEffect, useRef, useState } from 'react'
import { code } from '@streamdown/code'
import { ArrowUp, Square } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { AGENT_SYSTEM_PROMPTS } from './agents'
import { EmptyChat } from './empty-chat'
import {
  generateId,
  getActiveMessages,
  useWorkspace,
} from './workspace-context'
import type { Agent } from './agents'
import type { ChatMessage } from './workspace-context'
import type { StreamChunk } from '@/server/chat'



import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/prompt-kit/chat-container'
import { FeedbackBar } from '@/components/prompt-kit/feedback-bar'
import { Message, MessageContent } from '@/components/prompt-kit/message'
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/prompt-kit/reasoning'
import { ScrollButton } from '@/components/prompt-kit/scroll-button'
import { SystemMessage } from '@/components/prompt-kit/system-message'
import { TextShimmer } from '@/components/prompt-kit/text-shimmer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { streamChatFn } from '@/server/chat'


type ChatErrorType = 'rate-limited' | 'network' | 'timeout' | 'generic' | null

const ERROR_MESSAGES: Record<NonNullable<ChatErrorType>, string> = {
  'rate-limited': 'Rate limited — wait a moment before trying again.',
  'network': 'Connection lost — check your network and retry.',
  'timeout': 'Response timed out — try again.',
  'generic': 'Something went wrong. Try again.',
}

interface ChatViewProps {
  agent: Agent
  conversationId?: string
  onConversationCreated?: (conversationId: string) => void
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

function AgentAvatar({ agent }: { agent: Agent }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm',
        agent.accentColor,
      )}
    >
      {agent.emoji}
    </span>
  )
}

export function ChatView({
  agent,
  conversationId,
  onConversationCreated,
}: ChatViewProps) {
  const { state, dispatch } = useWorkspace()
  const [input, setInput] = useState('')
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false)
  const [error, setError] = useState<ChatErrorType>(null)

  const streamingRef = useRef<{
    generator: AsyncGenerator<StreamChunk>
    messageId: string
    agentId: string
  } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messages = getActiveMessages(state, agent.id)
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

  const activeConvoId = state.activeConversationId[agent.id] ?? null

  // Reset streaming state on agent or conversation switch
  useEffect(() => {
    abortCurrentStream()
    setIsWaitingForFirstToken(false)
    setError(null)
  }, [agent.id, activeConvoId])

  useEffect(() => () => abortCurrentStream(), [])

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
        let isFirstChunk = true

        streamingRef.current = {
          generator,
          messageId: agentMessageId,
          agentId: agent.id,
        }

        for await (const chunk of generator) {
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
                  thinking:
                    chunk.type === 'thinking' ? chunk.content : undefined,
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

      // New-chat: create conversation with a deterministic ID, then navigate
      if (!conversationId && !state.activeConversationId[agent.id]) {
        const newConvoId = generateId()
        dispatch({
          type: 'CREATE_CONVERSATION',
          agentId: agent.id,
          conversationId: newConvoId,
        })
        onConversationCreated?.(newConvoId)
      }

      const userMessage = makeMessage('user', trimmed, agent.id)
      dispatch({
        type: 'APPEND_MESSAGE',
        agentId: agent.id,
        message: userMessage,
      })
      setInput('')

      await runStream([...getActiveMessages(state, agent.id), userMessage])
    },
    [
      agent.id,
      conversationId,
      dispatch,
      isPending,
      onConversationCreated,
      state,
      runStream,
    ],
  )

  const handleRetry = useCallback(async () => {
    const allMessages = getActiveMessages(state, agent.id)
    if (!allMessages.some(m => m.role === 'user')) return
    await runStream(allMessages)
  }, [agent.id, state, runStream])

  const handleSubmit = useCallback(() => handleSend(input), [input, handleSend])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
          <EmptyChat agent={agent} onSuggestionClick={handleSend} />
        </div>
      ) : (
        <ChatContainerRoot className="relative min-h-0 flex-1">
          <ChatContainerContent className="px-2 py-4">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <Message
                  key={msg.id}
                  className="mx-auto flex w-full max-w-3xl justify-end px-2 py-1"
                >
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
                <Message
                  key={msg.id}
                  className="hover:bg-accent/40 mx-auto flex w-full max-w-3xl items-start gap-3 rounded-md px-2 py-1.5 transition-colors"
                >
                  <AgentAvatar agent={agent} />
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
                    {msg.thinking && (
                      <div className="mb-2">
                        <Reasoning>
                          <ReasoningTrigger>
                            {msg.isThinking ? (
                              <TextShimmer className="text-sm font-medium">
                                Thinking
                              </TextShimmer>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Thought for a moment
                              </span>
                            )}
                          </ReasoningTrigger>
                          <ReasoningContent markdown>
                            {msg.thinking}
                          </ReasoningContent>
                        </Reasoning>
                      </div>
                    )}
                    <MessageContent className="text-foreground rounded-none bg-transparent p-0 text-sm leading-relaxed">
                      <Streamdown
                        plugins={{ code }}
                        isAnimating={msg.isStreaming ?? false}
                        animated={msg.isStreaming ?? false}
                      >
                        {msg.content}
                      </Streamdown>
                    </MessageContent>
                    {!msg.isStreaming && !msg.interrupted && (
                      <div className="mt-1">
                        <FeedbackBar
                          onHelpful={() =>
                            dispatch({
                              type: 'SET_FEEDBACK',
                              agentId: agent.id,
                              messageId: msg.id,
                              feedback: 'helpful',
                            })
                          }
                          onNotHelpful={() =>
                            dispatch({
                              type: 'SET_FEEDBACK',
                              agentId: agent.id,
                              messageId: msg.id,
                              feedback: 'not-helpful',
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </Message>
              ),
            )}

            {isWaitingForFirstToken && (
              <div className="mx-auto flex w-full max-w-3xl items-start gap-3 px-2 py-1.5">
                <AgentAvatar agent={agent} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-foreground text-sm font-semibold">
                      {agent.name}
                    </span>
                  </div>
                  <TextShimmer className="text-sm font-medium">
                    Thinking
                  </TextShimmer>
                </div>
              </div>
            )}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <ScrollButton />
          </div>
        </ChatContainerRoot>
      )}

      <div className="relative">
        <div className="mx-auto w-full max-w-[810px] pb-4">
          {error && (
            <div className="absolute right-4 bottom-full left-4 pb-2">
              <div className="mx-auto max-w-3xl">
                <SystemMessage
                  variant="error"
                  fill
                  cta={{ label: 'Retry', onClick: handleRetry }}
                >
                  {ERROR_MESSAGES[error]}
                </SystemMessage>
              </div>
            </div>
          )}
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isPending}
            onSubmit={handleSubmit}
            className="w-full"
          >
            <PromptInputTextarea placeholder={`Message ${agent.name}…`} />
            <PromptInputActions className="flex justify-end pt-2">
              {isPending ? (
                <PromptInputAction tooltip="Stop generating">
                  <Button
                    size="icon"
                    variant="destructive"
                    className="size-8 rounded-full"
                    onClick={abortCurrentStream}
                  >
                    <Square className="size-3.5" />
                  </Button>
                </PromptInputAction>
              ) : (
                <PromptInputAction tooltip="Send message">
                  <Button
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </PromptInputAction>
              )}
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
