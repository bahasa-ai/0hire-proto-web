
import { useState } from 'react'


import { ChannelHeader } from './channel-header'
import { ChatView } from './chat-view'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface WorkspaceMainProps {
  activeAgent: Agent
}

export function WorkspaceMain({ activeAgent }: WorkspaceMainProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')

  return (
    <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
      <ChannelHeader agent={activeAgent} />

      {/* Underline tab toggle — quiet, typographic */}
      <div className="border-border flex shrink-0 items-end gap-0 border-b px-6">
        {(['chat', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              '-mb-px border-b-2 px-1 pt-2 pb-2.5 text-sm capitalize transition-colors focus-visible:outline-none',
              tab !== 'chat' && 'ml-5',
              activeTab === tab
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <ChatView agent={activeAgent} />
      ) : (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Task board coming in Phase 4
        </div>
      )}
    </main>
  )
}
