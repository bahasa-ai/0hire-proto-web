import { Link } from '@tanstack/react-router'
import { AGENT_TASKS, deriveAgentStatus } from './tasks'
import type { Agent } from './agents'
import type { AgentStatus } from './tasks'
import { cn } from '@/lib/utils'

interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
}

function statusDotClass(status: AgentStatus): string | null {
  switch (status) {
    case 'working':
      return 'bg-primary'
    case 'needs-input':
      return 'bg-warning'
    case 'failed':
      return 'bg-destructive'
    default:
      return null
  }
}

export function AgentChannelItem({ agent, isActive }: AgentChannelItemProps) {
  const agentStatus = deriveAgentStatus(AGENT_TASKS[agent.id] ?? [])
  const dotClass = statusDotClass(agentStatus)

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
            'relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs',
            isActive ? 'bg-blue-300' : 'bg-border',
          )}
        >
          {agent.emoji}
          {dotClass && (
            <span
              className={cn(
                'absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-1',
                'ring-sidebar',
                dotClass,
              )}
            />
          )}
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
