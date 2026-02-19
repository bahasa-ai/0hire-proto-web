
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'


import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ScrollArea } from '../ui/scroll-area'
import { AGENT_TASKS, deriveAgentStatus } from './tasks'
import type { AgentStatus } from './tasks'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
  onSelect: (id: string) => void
}

function statusDotClass(status: AgentStatus): string | null {
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
  const dotClass = statusDotClass(agentStatus)

  const historyItems = [
    'History item 1',
    'History item 2',
    'History item 3',
    'History item 4',
    'History item 5',
  ]

  return (
    <motion.div
      layout
      transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
      className={cn(
        'rounded-xl p-1',
        isActive && 'bg-gray-100 inset-shadow-sm',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(agent.id)}
        className={cn(
          'focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
          isActive
            ? 'relative z-10 bg-blue-50 bg-linear-to-b from-blue-200 to-blue-100 text-blue-900 shadow-xs ring-1 inset-shadow-2xs ring-blue-200 inset-shadow-white/50'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        {/* Avatar with status dot */}
        <span
          className={cn(
            'relative flex size-7 shrink-0 items-center justify-center rounded-full text-sm',
            agent.accentColor,
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
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            key="history"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="isolate overflow-hidden"
          >
            <ScrollArea
              className={historyItems.length > 4 ? 'h-48' : undefined}
              maskHeight={16}
              maskClassName="before:from-gray-100 after:from-gray-100"
            >
              <div className="flex flex-col">
                {historyItems.map(item => (
                  <div key={item} className="group/hist flex items-center">
                    <Button
                      variant="ghost"
                      className="text-muted-foreground min-w-0 flex-1 justify-start py-5 text-sm font-normal hover:bg-transparent"
                    >
                      <span className="truncate">{item}</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          'mr-2.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded transition-opacity',
                          'opacity-0 group-hover/hist:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100',
                          'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                        )}
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem>
                          <Pencil className="size-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
