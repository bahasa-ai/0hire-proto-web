
import { AgentChannelItem } from './agent-channel-item'
import { CURRENT_USER } from './agents'
import type { Agent } from './agents'

interface WorkspaceSidebarProps {
  agents: Array<Agent>
  activeId: string
  onSelect: (id: string) => void
}

export function WorkspaceSidebar({
  agents,
  activeId,
  onSelect,
}: WorkspaceSidebarProps) {
  return (
    <aside className="border-sidebar-border bg-sidebar flex h-svh w-64 shrink-0 flex-col border-r">
      <div className="px-3 py-4">
        <span className="text-sidebar-foreground text-sm font-semibold">
          Zero Hire
        </span>
        <span className="text-muted-foreground block text-xs">Workspace</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <p className="text-muted-foreground/60 mb-1 px-2 text-xs font-medium tracking-wider uppercase">
          Agents
        </p>
        {agents.map(agent => (
          <AgentChannelItem
            key={agent.id}
            agent={agent}
            isActive={agent.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <div className="border-sidebar-border border-t px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {CURRENT_USER.initials}
          </span>
          <div className="min-w-0">
            <p className="text-sidebar-foreground truncate text-sm font-medium">
              {CURRENT_USER.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {CURRENT_USER.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
