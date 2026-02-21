import { useMemo, useState } from 'react'
import { getAgentTasks, useWorkspace } from './workspace-context'
import type { Task } from './tasks'
import { cn } from '@/lib/utils'

const CARD_H = 36
const COLLAPSED_OFFSET = 7
const SCALE_STEP = 0.04
const EXPANDED_GAP = 6
const MAX_VISIBLE = 3
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

// Vertical nudge for the collapsed stack based on total card count
const RESTING_Y: Record<number, number> = { 1: 0, 2: -8 }
function restingY(count: number): number {
  return RESTING_Y[count] ?? -12
}

type StackStatus = 'running' | 'done' | 'error'

function toStackStatus(task: Task): StackStatus {
  if (task.status === 'failed') return 'error'
  if (task.status === 'done') return 'done'
  return 'running'
}

const STATUS_DOT: Record<StackStatus, string> = {
  running: 'bg-primary animate-pulse',
  done: 'bg-emerald-500',
  error: 'bg-destructive',
}

const STATUS_LABEL: Record<StackStatus, string> = {
  running: 'Running…',
  done: 'Complete',
  error: 'Failed',
}

const PRIORITY: Record<StackStatus, number> = {
  running: 0,
  error: 1,
  done: 2,
}

function collapsedOpacity(index: number): number {
  if (index >= MAX_VISIBLE) return 0
  return 1 - index * 0.15
}

interface TaskStackProps {
  agentId: string
}

export function TaskStack({ agentId }: TaskStackProps) {
  const [expanded, setExpanded] = useState(false)
  const { state } = useWorkspace()

  const tasks = useMemo(() => {
    return getAgentTasks(state, agentId)
      .filter(t => t.chatCreated)
      .sort((a, b) => PRIORITY[toStackStatus(a)] - PRIORITY[toStackStatus(b)])
  }, [state, agentId])

  if (tasks.length === 0) return null

  const count = tasks.length
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
        {tasks.map((task, index) => {
          const status = toStackStatus(task)
          const y = expanded
            ? index * (CARD_H + EXPANDED_GAP)
            : index * COLLAPSED_OFFSET + restingY(count)
          const scale = expanded ? 1 : 1 - index * SCALE_STEP
          const opacity = expanded ? 1 : collapsedOpacity(index)

          return (
            <div
              key={task.id}
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
                  status === 'error' && 'border-destructive/30',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    STATUS_DOT[status],
                  )}
                />
                <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
                  {task.title}
                </span>
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {STATUS_LABEL[status]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
