import { useMemo, useState } from 'react'
import { useWorkspace } from './workspace-context'
import type { ToolCall } from './workspace-context'
import { cn } from '@/lib/utils'

// Sonner-inspired stack constants
const CARD_H = 36
const COLLAPSED_OFFSET = 7
const SCALE_STEP = 0.04
const EXPANDED_GAP = 6
const MAX_VISIBLE = 3
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

function restingY(count: number) {
  if (count <= 1) return 0
  if (count === 2) return -8
  return -12
}

const STATUS_DOT: Record<ToolCall['status'], string> = {
  running: 'bg-primary animate-pulse',
  done: 'bg-emerald-500',
  error: 'bg-destructive',
}

const STATUS_LABEL: Record<ToolCall['status'], string> = {
  running: 'Running...',
  done: 'Complete',
  error: 'Failed',
}

const PRIORITY: Record<ToolCall['status'], number> = {
  running: 0,
  error: 1,
  done: 2,
}

function humanize(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface TaskStackProps {
  agentId: string
}

export function TaskStack({ agentId }: TaskStackProps) {
  const [expanded, setExpanded] = useState(false)
  const { state } = useWorkspace()

  const toolCalls = useMemo(() => {
    const messages = state.messages[agentId] ?? []
    const calls: Array<ToolCall> = []
    for (const msg of messages) {
      if (msg.role === 'agent' && msg.toolCalls) {
        calls.push(...msg.toolCalls)
      }
    }
    return calls.sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status])
  }, [state.messages, agentId])

  if (toolCalls.length === 0) return null

  const count = toolCalls.length
  const visible = Math.min(count, MAX_VISIBLE)

  const stackHeight = expanded
    ? CARD_H * count + EXPANDED_GAP * (count - 1)
    : CARD_H + (visible - 1) * COLLAPSED_OFFSET + restingY(count)

  return (
    <div className="relative ml-auto h-9 w-[260px] shrink-0">
      <div
        className="absolute inset-x-0 top-0 z-20"
        style={{
          height: stackHeight,
          transition: `height 400ms ${EASING}`,
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {toolCalls.map((tc, index) => {
          const y = expanded
            ? index * (CARD_H + EXPANDED_GAP)
            : index * COLLAPSED_OFFSET + restingY(count)

          const scale = expanded ? 1 : 1 - index * SCALE_STEP

          const opacity = expanded
            ? 1
            : index >= MAX_VISIBLE
              ? 0
              : 1 - index * 0.15

          return (
            <div
              key={tc.id}
              className="absolute inset-x-0 top-0"
              style={{
                zIndex: count - index,
                transform: `translateY(${y}px) scale(${scale})`,
                opacity,
                transition: `transform 400ms ${EASING}, opacity 400ms ${EASING}`,
                transformOrigin: 'top center',
              }}
            >
              <div
                className={cn(
                  'bg-card flex h-9 cursor-default items-center gap-2 rounded-lg border px-3 shadow-sm',
                  tc.status === 'error' && 'border-destructive/30',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    STATUS_DOT[tc.status],
                  )}
                />
                <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
                  {humanize(tc.name)}
                </span>
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {STATUS_LABEL[tc.status]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
