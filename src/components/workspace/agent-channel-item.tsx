
import { useRef, useState } from 'react'

import { Link } from '@tanstack/react-router'
import { MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ScrollArea } from '../ui/scroll-area'
import { AGENT_TASKS, deriveAgentStatus } from './tasks'
import { getConversationList, useWorkspace } from './workspace-context'
import type { AgentStatus } from './tasks'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
  activeConversationId: string | null
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

function HistoryLink({
  agentId,
  convo,
  isActiveConvo,
}: {
  agentId: string
  convo: { id: string; title: string }
  isActiveConvo: boolean
}) {
  const title = convo.title || 'New chat'

  return (
    <Link
      to="/$agentId/$conversationId"
      params={{ agentId, conversationId: convo.id }}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
        isActiveConvo
          ? 'text-primary font-semibold'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <MessageSquare
        className={cn(
          'size-3.5 shrink-0',
          isActiveConvo ? 'fill-current' : 'opacity-50',
        )}
      />
      <span className="truncate">{title}</span>
    </Link>
  )
}

export function AgentChannelItem({
  agent,
  isActive,
  activeConversationId,
}: AgentChannelItemProps) {
  const { state, dispatch } = useWorkspace()
  const agentStatus = deriveAgentStatus(AGENT_TASKS[agent.id] ?? [])
  const dotClass = statusDotClass(agentStatus)

  const conversations = getConversationList(state, agent.id)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  function handleRenameStart(convoId: string, currentTitle: string) {
    setEditingId(convoId)
    setEditValue(currentTitle)
    requestAnimationFrame(() => editInputRef.current?.focus())
  }

  function handleRenameCommit(convoId: string) {
    const trimmed = editValue.trim()
    if (
      trimmed &&
      trimmed !== conversations.find(c => c.id === convoId)?.title
    ) {
      dispatch({
        type: 'RENAME_CONVERSATION',
        agentId: agent.id,
        conversationId: convoId,
        title: trimmed,
      })
    }
    setEditingId(null)
  }

  function handleDelete(convoId: string) {
    dispatch({
      type: 'DELETE_CONVERSATION',
      agentId: agent.id,
      conversationId: convoId,
    })
  }

  return (
    <motion.div
      layout="position"
      transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
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
            {isActive ? (
              <>
                <span className="group-hover/agent:hidden">{agent.role}</span>
                <span className="hidden group-hover/agent:inline">
                  Start new chat
                </span>
              </>
            ) : (
              agent.role
            )}
          </p>
        </div>
      </Link>
      <AnimatePresence initial={false}>
        {isActive && conversations.length > 0 && (
          <motion.div
            key="history"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="isolate overflow-hidden"
          >
            <ScrollArea
              className={conversations.length > 4 ? 'h-48' : undefined}
              maskHeight={16}
              maskClassName="before:from-muted after:from-muted"
            >
              <div className="mt-1 flex flex-col gap-0.5 px-0.5">
                {conversations.map(convo => (
                  <div key={convo.id} className="group/hist">
                    {editingId === convo.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameCommit(convo.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => handleRenameCommit(convo.id)}
                        className="text-foreground mx-0.5 my-0.5 min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm outline-none"
                      />
                    ) : (
                      <div className="flex items-center">
                        <HistoryLink
                          agentId={agent.id}
                          convo={convo}
                          isActiveConvo={convo.id === activeConversationId}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              'mr-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded transition-opacity',
                              'opacity-0 group-hover/hist:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100',
                              'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                            )}
                            onClick={e => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem
                              onClick={() =>
                                handleRenameStart(
                                  convo.id,
                                  convo.title || 'New chat',
                                )
                              }
                            >
                              <Pencil className="size-3.5" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(convo.id)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
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
