import { AlertTriangle, Bell, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import type { Task, TaskStatus } from './tasks'
import type { LucideIcon } from 'lucide-react'


import { cn } from '@/lib/utils'

// Relative timestamp — lives here since tasks.ts is a pure data module
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

interface StatusConfig {
  label: string
  icon: LucideIcon
  badgeClass: string
}

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  'scheduled': {
    label: 'Scheduled',
    icon: Clock,
    badgeClass: 'bg-muted text-muted-foreground',
  },
  'in-progress': {
    label: 'In progress',
    icon: Loader2,
    badgeClass: 'bg-primary/10 text-primary',
  },
  'needs-input': {
    label: 'Needs input',
    icon: Bell,
    badgeClass: 'bg-warning/15 text-warning-foreground',
  },
  'done': {
    label: 'Done',
    icon: CheckCircle2,
    badgeClass: 'bg-primary/10 text-primary/60',
  },
  'failed': {
    label: 'Failed',
    icon: AlertTriangle,
    badgeClass: 'bg-destructive/10 text-destructive',
  },
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const { label, icon: Icon, badgeClass } = STATUS_CONFIG[task.status]

  return (
    <div className="bg-card border-border hover:border-border/60 rounded-lg border px-4 py-3 transition-colors">
      {/* Header row: title + status badge */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-foreground min-w-0 flex-1 text-sm leading-snug font-semibold">
          {task.title}
        </p>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            badgeClass,
          )}
        >
          <Icon className="size-3" />
          {label}
        </span>
      </div>

      {/* Description */}
      <p className="text-muted-foreground mb-3 line-clamp-2 text-xs leading-relaxed">
        {task.description}
      </p>

      {/* Footer: timestamp */}
      <p className="text-muted-foreground/50 text-[11px]">
        Updated {relativeTime(task.updatedAt)}
      </p>
    </div>
  )
}
