import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getAgentTasks, useWorkspace } from './workspace-context'
import type { Task } from './tasks'
import type { AgentStep } from './workspace-context'
import { cn } from '@/lib/utils'

const CARD_H = 36
const COLLAPSED_OFFSET = 7
const SCALE_STEP = 0.04
const EXPANDED_GAP = 6
const STEP_ROW_H = 26
const STEP_BOTTOM_PAD = 8
const MAX_VISIBLE = 3
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

const RESTING_Y: Record<number, number> = { 1: 0, 2: -8 }
function restingY(count: number): number {
  return RESTING_Y[count] ?? -12
}

function collapsedOpacity(index: number): number {
  if (index >= MAX_VISIBLE) return 0
  return 1 - index * 0.15
}

// Top card height when expanded with steps
function expandedTopHeight(steps: Array<AgentStep>): number {
  if (steps.length === 0) return CARD_H
  return CARD_H + steps.length * STEP_ROW_H + STEP_BOTTOM_PAD
}

// Y position for a card in the expanded stack
function expandedY(index: number, topH: number): number {
  if (index === 0) return 0
  return topH + EXPANDED_GAP + (index - 1) * (CARD_H + EXPANDED_GAP)
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

function StepIcon({ status }: { status: AgentStep['status'] }) {
  switch (status) {
    case 'pending':
      return <Circle className="text-muted-foreground/40 size-3 shrink-0" />
    case 'running':
      return <Loader2 className="text-primary size-3 shrink-0 animate-spin" />
    case 'done':
      return <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
    case 'error':
      return <XCircle className="text-destructive size-3 shrink-0" />
  }
}

interface TaskCardProps {
  task: Task
  steps: Array<AgentStep>
  showSteps: boolean
  style: React.CSSProperties
}

function TaskCard({ task, steps, showSteps, style }: TaskCardProps) {
  const status = toStackStatus(task)
  const hasSteps = steps.length > 0
  const cardHeight = showSteps && hasSteps ? expandedTopHeight(steps) : CARD_H

  // Progress hint for running tasks: "2 / 4"
  const doneCount = steps.filter(s => s.status === 'done').length
  const statusText =
    status === 'running' && hasSteps && !showSteps
      ? `${doneCount} / ${steps.length}`
      : STATUS_LABEL[status]

  return (
    <div className="absolute inset-x-0 top-0" style={style}>
      <div
        className={cn(
          'bg-card cursor-default overflow-hidden rounded-lg border shadow-sm',
          status === 'error' && 'border-destructive/30',
        )}
        style={{
          height: cardHeight,
          transition: `height 400ms ${EASING}`,
        }}
      >
        {/* Header row */}
        <div className="flex h-9 shrink-0 items-center gap-2 px-3">
          <span
            className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[status])}
          />
          <span className="text-foreground min-w-0 flex-1 truncate text-xs font-medium">
            {task.title}
          </span>
          <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
            {statusText}
          </span>
        </div>

        {/* Step list — only rendered for the top card */}
        {hasSteps && (
          <div
            className="px-3"
            style={{
              paddingBottom: STEP_BOTTOM_PAD,
              opacity: showSteps ? 1 : 0,
              transition: `opacity 180ms ${showSteps ? '160ms' : '0ms'} ease`,
            }}
          >
            <div className="border-border/30 border-t pt-1.5">
              {steps.map(step => (
                <div
                  key={step.id}
                  className="flex items-center gap-2"
                  style={{ height: STEP_ROW_H }}
                >
                  <StepIcon status={step.status} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[11px]',
                      step.status === 'pending'
                        ? 'text-muted-foreground/50'
                        : 'text-foreground/80',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
  const topTask = tasks[0]

  // Resolve steps for the top task via its linked message
  const agentMessages = state.messages[agentId] ?? []
  const topSteps: Array<AgentStep> = topTask.messageId
    ? (agentMessages.find(m => m.id === topTask.messageId)?.steps ?? [])
    : []

  const topH = expanded ? expandedTopHeight(topSteps) : CARD_H

  const containerHeight = expanded
    ? topH +
      (count > 1 ? EXPANDED_GAP + (count - 1) * (CARD_H + EXPANDED_GAP) : 0)
    : CARD_H + (visible - 1) * COLLAPSED_OFFSET + restingY(count)

  return (
    <div className="relative ml-auto h-9 w-[268px] shrink-0">
      <div
        className="absolute inset-x-0 top-0 z-20"
        style={{
          height: containerHeight,
          transition: `height 400ms ${EASING}`,
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {tasks.map((task, index) => {
          const y = expanded
            ? expandedY(index, topH)
            : index * COLLAPSED_OFFSET + restingY(count)
          const scale = expanded ? 1 : 1 - index * SCALE_STEP
          const opacity = expanded ? 1 : collapsedOpacity(index)

          // Only the top card shows steps
          const steps = index === 0 ? topSteps : []

          return (
            <TaskCard
              key={task.id}
              task={task}
              steps={steps}
              showSteps={expanded && index === 0}
              style={{
                zIndex: count - index,
                transform: `translateY(${y}px) scale(${scale})`,
                opacity,
                transition: `transform 400ms ${EASING}, opacity 400ms ${EASING}`,
                transformOrigin: 'top center',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
