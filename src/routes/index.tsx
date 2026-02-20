import { createFileRoute, redirect } from '@tanstack/react-router'

import { DEFAULT_AGENT_ID } from '@/components/workspace/agents'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$agentId', params: { agentId: DEFAULT_AGENT_ID } })
  },
})
