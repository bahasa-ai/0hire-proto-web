import { Link } from '@tanstack/react-router'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
}

export function AgentChannelItem({ agent, isActive }: AgentChannelItemProps) {
  return (
    <div
      className={cn('rounded-xl p-1', isActive && 'bg-muted inset-shadow-sm')}
    >
      <Link
        to="/$agentId"
        params={{ agentId: agent.id }}
        data-agent-item
        className={cn(
          'group/agent focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
          isActive
            ? 'relative z-10 bg-blue-50 bg-linear-to-b from-blue-200 to-blue-100 text-blue-900 shadow-xs ring-1 inset-shadow-2xs ring-blue-200 inset-shadow-white/50'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full',
            isActive ? 'bg-blue-300' : 'bg-border',
          )}
        >
          <img
            src={agent.avatar}
            alt={agent.name}
            className="size-full object-cover"
          />
        </span>
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
      </Link>
    </div>
  )
}
