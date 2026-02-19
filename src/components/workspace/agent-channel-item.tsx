import type { Agent } from './agents'

import { cn } from '@/lib/utils'

interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
  onSelect: (id: string) => void
}

export function AgentChannelItem({
  agent,
  isActive,
  onSelect,
}: AgentChannelItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className={cn(
        'focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <span
        className={cn(
          'text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          agent.accentColor,
        )}
      >
        {agent.initials}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{agent.name}</p>
        <p
          className={cn(
            'text-xs',
            isActive ? 'opacity-60' : 'text-muted-foreground',
          )}
        >
          {agent.role}
        </p>
      </div>
    </button>
  )
}
