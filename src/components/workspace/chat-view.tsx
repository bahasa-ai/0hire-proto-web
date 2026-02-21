import { code } from '@streamdown/code'
import {
  ArrowUp,
  Copy,
  Paperclip,
  Pencil,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Streamdown } from 'streamdown'
import { AgentPlanCard } from './agent-plan-card'
import { AGENT_SYSTEM_PROMPTS } from './agents'
import { EmptyChat } from './empty-chat'
import { getActiveMessages, useWorkspace } from './workspace-context'
import type { StreamChunk } from '@/server/chat'
import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/prompt-kit/chat-container'
import { TextShimmerLoader } from '@/components/prompt-kit/loader'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@/components/prompt-kit/message'
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
import { streamChatFn } from '@/server/chat'
// eslint-disable-next-line import/order -- prettier conflicts with ESLint type-import grouping
import type { Agent } from './agents'
// eslint-disable-next-line import/order -- prettier conflicts with ESLint type-import grouping
import type { AgentStep, ChatMessage } from './workspace-context'

type ChatErrorType = 'rate-limited' | 'network' | 'timeout' | 'generic' | null

const ERROR_MESSAGES: Record<NonNullable<ChatErrorType>, string> = {
  'rate-limited': 'Rate limited — wait a moment before trying again.',
  'network': 'Connection lost — check your network and retry.',
  'timeout': 'Response timed out — try again.',
  'generic': 'Something went wrong. Try again.',
}

const STEP_STAGGER_MS = 600

interface ChatViewProps {
  agent: Agent
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function makeMessage(
  role: ChatMessage['role'],
  content: string,
  agentId: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id: generateId(),
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

interface MessageBubbleProps {
  msg: ChatMessage
}

function UserBubble({ msg }: MessageBubbleProps) {
  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col items-end px-2 py-1">
      <div className="group flex max-w-[65%] flex-col items-end gap-1">
        <p className="text-muted-foreground text-[11px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {formatTime(msg.timestamp)}
        </p>
        <MessageContent className="bg-muted text-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
          {msg.content}
        </MessageContent>
        <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <MessageAction tooltip="Edit" delayDuration={100}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Pencil />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Delete" delayDuration={100}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Trash />
            </Button>
          </MessageAction>
          <MessageAction tooltip="Copy" delayDuration={100}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Copy />
            </Button>
          </MessageAction>
        </MessageActions>
      </div>
    </Message>
  )
}

function AgentBubble({ msg }: MessageBubbleProps) {
  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col px-2 py-1.5">
      <div className="group min-w-0">
        <div className="mb-0.5 flex items-baseline gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
                  <span className="text-muted-foreground text-xs">
                    Thought for a moment
                  </span>
                )}
              </ReasoningTrigger>
              <ReasoningContent markdown>{msg.thinking}</ReasoningContent>
            </Reasoning>
          </div>
        )}
        {msg.steps && msg.steps.length > 0 && (
          <AgentPlanCard steps={msg.steps} title={msg.taskTitle} />
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
          <MessageActions className="-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <MessageAction tooltip="Copy" delayDuration={100}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Copy />
              </Button>
            </MessageAction>
            <MessageAction tooltip="Upvote" delayDuration={100}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ThumbsUp />
              </Button>
            </MessageAction>
            <MessageAction tooltip="Downvote" delayDuration={100}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ThumbsDown />
              </Button>
            </MessageAction>
          </MessageActions>
        )}
      </div>
    </Message>
  )
}

export function ChatView({ agent }: ChatViewProps) {
  const { state, dispatch } = useWorkspace()
  const [input, setInput] = useState('')
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false)
  const [error, setError] = useState<ChatErrorType>(null)
  const [files, setFiles] = useState<Array<File>>([])
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const streamingRef = useRef<{
    generator: AsyncGenerator<StreamChunk>
    messageId: string
    agentId: string
  } | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepAnimationRef = useRef<{
    timers: Array<ReturnType<typeof setTimeout>>
    messageId: string
    cancelled: boolean
  } | null>(null)

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

    if (stepAnimationRef.current && !stepAnimationRef.current.cancelled) {
      stepAnimationRef.current.timers.forEach(clearTimeout)
      stepAnimationRef.current.cancelled = true
      dispatch({
        type: 'INTERRUPT_STREAMING',
        agentId: agent.id,
        messageId: stepAnimationRef.current.messageId,
      })
    }
    stepAnimationRef.current = null

    if (!streamingRef.current) return
    const { generator, messageId, agentId } = streamingRef.current
    generator.return(undefined)
    streamingRef.current = null
    dispatch({ type: 'INTERRUPT_STREAMING', agentId, messageId })
  }, [dispatch, clearStreamTimeout, agent.id])

  useEffect(() => {
    abortCurrentStream()
    setIsWaitingForFirstToken(false)
    setError(null)
  }, [agent.id])

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
      }, 30_000)

      try {
        const generator = await streamChatFn({
          data: { messages: allMessages, systemPrompt },
        })

        const agentMessageId = generateId()
        let messageShellCreated = false

        streamingRef.current = {
          generator,
          messageId: agentMessageId,
          agentId: agent.id,
        }

        function createShell(isThinking = false, initialContent = '') {
          if (messageShellCreated) return
          messageShellCreated = true
          clearStreamTimeout()
          setIsWaitingForFirstToken(false)
          dispatch({
            type: 'START_STREAMING',
            agentId: agent.id,
            message: makeMessage('agent', initialContent, agent.id, {
              id: agentMessageId,
              isStreaming: true,
              isThinking: isThinking || undefined,
            }),
          })
        }

        function parsePlan(
          buf: string,
        ): {
          title: string
          steps: Array<AgentStep>
          remainder: string
        } | null {
          const closeIdx = buf.indexOf('</plan>')
          if (closeIdx === -1 || !buf.startsWith('<plan>')) return null
          const lines = buf
            .slice('<plan>'.length, closeIdx)
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
          if (lines.length < 2) return null
          const [title, ...stepLabels] = lines
          const steps: Array<AgentStep> = stepLabels.map((label, i) => ({
            id: `step-${i}`,
            label,
            status: 'pending' as const,
          }))
          const remainder = buf
            .slice(closeIdx + '</plan>'.length)
            .replace(/^\n+/, '')
          return { title, steps, remainder }
        }

        function startStepAnimation(title: string, steps: Array<AgentStep>) {
          dispatch({
            type: 'SET_STEPS',
            agentId: agent.id,
            messageId: agentMessageId,
            steps,
            taskTitle: title,
          })

          const taskId = generateId()
          const now = new Date().toISOString()
          dispatch({
            type: 'ADD_TASK',
            task: {
              id: taskId,
              agentId: agent.id,
              title,
              description: 'Requested via chat',
              status: 'in-progress',
              createdAt: now,
              updatedAt: now,
              chatCreated: true,
            },
          })

          const animState = {
            timers: [] as Array<ReturnType<typeof setTimeout>>,
            messageId: agentMessageId,
            cancelled: false,
          }
          stepAnimationRef.current = animState

          dispatch({
            type: 'UPDATE_STEP',
            agentId: agent.id,
            messageId: agentMessageId,
            stepId: steps[0].id,
            status: 'running',
          })

          for (const [i, step] of steps.entries()) {
            const timer = setTimeout(
              () => {
                if (animState.cancelled) return
                dispatch({
                  type: 'UPDATE_STEP',
                  agentId: agent.id,
                  messageId: agentMessageId,
                  stepId: step.id,
                  status: 'done',
                })
                if (i + 1 < steps.length) {
                  dispatch({
                    type: 'UPDATE_STEP',
                    agentId: agent.id,
                    messageId: agentMessageId,
                    stepId: steps[i + 1].id,
                    status: 'running',
                  })
                } else {
                  dispatch({
                    type: 'UPDATE_TASK_STATUS',
                    agentId: agent.id,
                    taskId,
                    status: 'done',
                  })
                  stepAnimationRef.current = null
                }
              },
              STEP_STAGGER_MS * (i + 1),
            )
            animState.timers.push(timer)
          }
        }

        let parseState: 'buffering' | 'passthrough' = 'buffering'
        let streamBuffer = ''

        for await (const chunk of generator) {
          if (chunk.type === 'thinking') {
            createShell(true)
            dispatch({
              type: 'APPEND_THINKING_CHUNK',
              agentId: agent.id,
              messageId: agentMessageId,
              chunk: chunk.content,
            })
            continue
          }

          if (parseState === 'passthrough') {
            dispatch({
              type: 'APPEND_STREAM_CHUNK',
              agentId: agent.id,
              messageId: agentMessageId,
              chunk: chunk.content,
            })
            continue
          }

          streamBuffer += chunk.content
          const plan = parsePlan(streamBuffer)

          if (plan) {
            parseState = 'passthrough'
            createShell()
            startStepAnimation(plan.title, plan.steps)
            if (plan.remainder) {
              dispatch({
                type: 'APPEND_STREAM_CHUNK',
                agentId: agent.id,
                messageId: agentMessageId,
                chunk: plan.remainder,
              })
            }
          } else if (
            // Give up on plan detection: not starting with '<' after a few chars,
            // or buffer exceeds the max length for a plan block
            (streamBuffer.length > 5 && !streamBuffer.startsWith('<')) ||
            streamBuffer.length > 300
          ) {
            parseState = 'passthrough'
            createShell(false, streamBuffer)
          }
        }

        // Flush buffer if stream ended before plan detection resolved
        if (parseState === 'buffering' && streamBuffer) {
          createShell(false, streamBuffer)
        }

        // Ref may be cleared by abortCurrentStream() during async iteration
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

      await runStream([...getActiveMessages(state, agent.id), userMessage])
    },
    [agent.id, dispatch, isPending, state, runStream],
  )

  const handleRetry = useCallback(async () => {
    const allMessages = getActiveMessages(state, agent.id)
    if (!allMessages.some(m => m.role === 'user')) return
    await runStream(allMessages)
  }, [agent.id, state, runStream])

  const handleSubmit = useCallback(() => handleSend(input), [input, handleSend])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const added = event.target.files
    if (!added) return
    setFiles(prev => [...prev, ...Array.from(added)])
  }

  function handleRemoveFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isEmpty ? (
        <div
          style={{ viewTransitionName: 'agent-content' }}
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4"
        >
          <EmptyChat agent={agent} onSuggestionClick={handleSend} />
        </div>
      ) : (
        <ChatContainerRoot
          style={{ viewTransitionName: 'agent-content' }}
          className="relative min-h-0 flex-1"
        >
          <ChatContainerContent className="px-2 pt-20 pb-4">
            {messages.map(msg =>
              msg.role === 'user' ? (
                <UserBubble key={msg.id} msg={msg} />
              ) : (
                <AgentBubble key={msg.id} msg={msg} />
              ),
            )}

            {isWaitingForFirstToken && (
              <div className="mx-auto flex w-full max-w-3xl px-2 py-1.5">
                <TextShimmerLoader text="Thinking" size="md" />
              </div>
            )}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <ScrollButton />
          </div>
        </ChatContainerRoot>
      )}

      <div style={{ viewTransitionName: 'chat-input' }} className="relative">
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
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    onClick={e => e.stopPropagation()}
                  >
                    <Paperclip className="size-4" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="hover:bg-secondary/50 rounded-full p-1"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <PromptInputTextarea placeholder={`Message ${agent.name}…`} />
            <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
              <PromptInputAction tooltip="Attach files">
                <label
                  htmlFor="file-upload"
                  className="hover:bg-secondary-foreground/10 flex size-8 cursor-pointer items-center justify-center rounded-2xl"
                >
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Paperclip className="text-muted-foreground size-5" />
                </label>
              </PromptInputAction>
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
                    disabled={!input.trim() && files.length === 0}
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
