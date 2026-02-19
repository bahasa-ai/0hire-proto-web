import type { Agent } from './agents'

import { cn } from '@/lib/utils'

interface ChannelHeaderProps {
  agent: Agent
}

export function ChannelHeader({ agent }: ChannelHeaderProps) {
  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-6">
      <span
        className={cn(
          'text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          agent.accentColor,
        )}
      >
        {agent.initials}
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{agent.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {agent.role} · {agent.description}
        </p>
      </div>
    </header>
  )
}
