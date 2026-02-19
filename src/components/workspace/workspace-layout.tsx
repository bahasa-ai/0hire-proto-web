import { useState } from 'react'

import { AGENTS, DEFAULT_AGENT_ID } from './agents'
import { WorkspaceProvider } from './workspace-context'
import { WorkspaceMain } from './workspace-main'
import { WorkspaceSidebar } from './workspace-sidebar'

export function WorkspaceLayout() {
  const [activeAgentId, setActiveAgentId] = useState(DEFAULT_AGENT_ID)
  const activeAgent = AGENTS.find(a => a.id === activeAgentId) ?? AGENTS[0]

  return (
    <WorkspaceProvider>
      <div className="bg-background flex min-h-svh">
        <WorkspaceSidebar
          agents={AGENTS}
          activeId={activeAgentId}
          onSelect={setActiveAgentId}
        />
        <WorkspaceMain activeAgent={activeAgent} />
      </div>
    </WorkspaceProvider>
  )
}
