import { Search, Settings2 } from 'lucide-react'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface ChannelHeaderProps {
  agent: Agent
}

export function ChannelHeader({ agent }: ChannelHeaderProps) {
  return (
    <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
      {/* Agent avatar */}
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-base',
          agent.accentColor,
        )}
      >
        {agent.emoji}
      </span>

      {/* Agent identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground text-sm leading-tight font-semibold">
            {agent.name}
          </p>
          <span className="border-border bg-background text-muted-foreground inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium">
            <span className="inline-block size-1.5 rounded-full bg-green-500" />
            Online
          </span>
        </div>
        <p className="text-muted-foreground truncate text-xs">{agent.role}</p>
      </div>

      {/* Divider */}
      <div className="border-border h-4 border-l" />

      {/* Action bar */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title="Search in conversation"
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-2 transition-colors"
        >
          <Search className="size-4" />
        </button>
        <button
          type="button"
          title="Agent settings"
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-md p-2 transition-colors"
        >
          <Settings2 className="size-4" />
        </button>
      </div>
    </header>
  )
}
