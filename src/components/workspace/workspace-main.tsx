import type { Agent } from './agents'

import { ChatView } from './chat-view'

interface WorkspaceMainProps {
  activeAgent: Agent
}

export function WorkspaceMain({ activeAgent }: WorkspaceMainProps) {
  return (
    <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4">
        <ChatView agent={activeAgent} />
      </div>
    </main>
  )
}
