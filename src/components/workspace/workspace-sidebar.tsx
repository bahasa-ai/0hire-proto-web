import { Link, useParams } from '@tanstack/react-router'
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react'
import { LayoutGroup } from 'motion/react'


import { AgentChannelItem } from './agent-channel-item'
import { AGENTS, CURRENT_USER, DEFAULT_AGENT_ID } from './agents'
import { cn } from '@/lib/utils'

export function WorkspaceSidebar() {
  const { agentId, conversationId } = useParams({ strict: false })
  const activeId = agentId ?? DEFAULT_AGENT_ID
  const activeConversationId = conversationId ?? null

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col overflow-hidden rounded-xl border shadow-2xl shadow-gray-200">
      <button
        type="button"
        className={cn(
          'focus-visible:ring-sidebar-ring flex w-full items-center gap-2.5 px-3 py-3.5 text-left',
          'transition-colors focus-visible:ring-2 focus-visible:outline-none',
          'hover:bg-sidebar-accent',
        )}
      >
        <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-wide">
          ZH
        </div>
        <span className="text-sidebar-foreground flex-1 truncate text-sm font-semibold">
          Zero Hire
        </span>
        <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
      </button>

      <div className="border-sidebar-border border-t" />

      <nav
        role="listbox"
        aria-label="Agent channels"
        className="flex flex-1 flex-col overflow-y-auto px-2 py-3"
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
          e.preventDefault()
          const buttons = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[data-agent-item]',
            ),
          )
          const idx = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          )
          if (idx === -1) return
          const next =
            e.key === 'ArrowDown'
              ? (idx + 1) % buttons.length
              : (idx - 1 + buttons.length) % buttons.length
          buttons[next]?.focus()
        }}
      >
        <div className="mb-1 flex items-center px-2">
          <p className="text-muted-foreground/70 flex-1 text-[11px] font-semibold tracking-widest uppercase">
            Agents
          </p>
          <Link
            to="/$agentId"
            params={{ agentId: activeId }}
            title="New chat"
            className="text-muted-foreground hover:text-sidebar-foreground -mr-0.5 rounded p-0.5 transition-colors"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>

        <LayoutGroup id="agent-channels">
          {AGENTS.map(agent => (
            <AgentChannelItem
              key={agent.id}
              agent={agent}
              isActive={agent.id === activeId}
              activeConversationId={
                agent.id === activeId ? activeConversationId : null
              }
            />
          ))}
        </LayoutGroup>
      </nav>

      <div className="border-sidebar-border border-t px-2 py-2">
        <div className="hover:bg-sidebar-accent flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors">
          <div className="relative shrink-0">
            <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
              {CURRENT_USER.initials}
            </span>
            <span className="ring-sidebar absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-green-500 ring-2" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground truncate text-sm font-medium">
              {CURRENT_USER.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {CURRENT_USER.role}
            </p>
          </div>
          <button
            type="button"
            title="Account options"
            className="text-muted-foreground hover:text-sidebar-foreground -mr-0.5 shrink-0 rounded p-0.5 transition-colors"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
