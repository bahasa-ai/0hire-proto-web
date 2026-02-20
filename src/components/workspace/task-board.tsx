import { AlertTriangle, Bell, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { TaskCard } from './task-card'
import { AGENT_TASKS, SECTION_ORDER } from './tasks'
import type { Agent } from './agents'
import type { TaskStatus } from './tasks'
import type { LucideIcon } from 'lucide-react'


import { cn } from '@/lib/utils'


const SECTION_META: Record<
  TaskStatus,
  { icon: LucideIcon; label: string; iconClass: string }
> = {
  'needs-input': {
    icon: Bell,
    label: 'Needs input',
    iconClass: 'text-warning',
  },
  'in-progress': {
    icon: Loader2,
    label: 'In progress',
    iconClass: 'text-primary',
  },
  'scheduled': {
    icon: Clock,
    label: 'Scheduled',
    iconClass: 'text-muted-foreground',
  },
  'done': {
    icon: CheckCircle2,
    label: 'Done',
    iconClass: 'text-primary opacity-60',
  },
  'failed': {
    icon: AlertTriangle,
    label: 'Failed',
    iconClass: 'text-destructive',
  },
}

interface TaskBoardProps {
  agent: Agent
}

export function TaskBoard({ agent }: TaskBoardProps) {
  const tasks = AGENT_TASKS[agent.id] ?? []

  const sections = SECTION_ORDER.map(status => ({
    status,
    tasks: tasks.filter(t => t.status === status),
  })).filter(s => s.tasks.length > 0)

  if (sections.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        No tasks yet
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
      {sections.map(({ status, tasks: sectionTasks }, i) => {
        const { icon: Icon, label, iconClass } = SECTION_META[status]

        return (
          <div key={status} className={cn(i > 0 && 'mt-7')}>
            {/* Section header */}
            <div className="mb-3 flex items-center gap-2">
              <Icon className={cn('size-3.5 shrink-0', iconClass)} />
              <span className="text-foreground text-xs font-semibold tracking-widest uppercase">
                {label}
              </span>
              <span className="bg-muted text-muted-foreground ml-auto rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums">
                {sectionTasks.length}
              </span>
            </div>

            {/* Task cards */}
            <div className="flex flex-col gap-2">
              {sectionTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
