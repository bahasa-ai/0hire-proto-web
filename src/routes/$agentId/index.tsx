import { createFileRoute, useParams } from '@tanstack/react-router'
import { AGENTS } from '@/components/workspace/agents'
import { ChatView } from '@/components/workspace/chat-view'

export const Route = createFileRoute('/$agentId/')({
  component: AgentRoute,
})

function AgentRoute() {
  const { agentId } = useParams({ from: '/$agentId/' })
  const agent = AGENTS.find(a => a.id === agentId) ?? AGENTS[0]
  return <ChatView agent={agent} />
}
