import { AGENT_TASKS, deriveAgentStatus } from './tasks'
import type { Agent } from './agents'
import type { AgentStatus } from './tasks'

import { cn } from '@/lib/utils'


interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
  onSelect: (id: string) => void
}

function statusDotClass(status: AgentStatus, isActive: boolean): string | null {
  switch (status) {
    case 'working':
      return 'bg-primary'
    case 'needs-input':
      // Suppress pulse when the channel is active — animation is distracting mid-conversation
      return 'bg-warning'
    case 'failed':
      return 'bg-destructive'
    default:
      return null
  }
}

export function AgentChannelItem({
  agent,
  isActive,
  onSelect,
}: AgentChannelItemProps) {
  const agentStatus = deriveAgentStatus(AGENT_TASKS[agent.id] ?? [])
  const dotClass = statusDotClass(agentStatus, isActive)

  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className={cn(
        'focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      {/* Avatar with status dot */}
      <span
        className={cn(
          'text-primary-foreground relative flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
          agent.accentColor,
        )}
      >
        {agent.initials}
        {dotClass && (
          <span
            className={cn(
              'absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-1',
              isActive ? 'ring-sidebar-primary' : 'ring-sidebar',
              dotClass,
            )}
          />
        )}
      </span>

      {/* Name + role */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight font-medium">
          {agent.name}
        </p>
        <p
          className={cn(
            'truncate text-xs leading-tight',
            isActive ? 'opacity-60' : 'text-muted-foreground',
          )}
        >
          {agent.role}
        </p>
      </div>
    </button>
  )
}
