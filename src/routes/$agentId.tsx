import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AGENTS, DEFAULT_AGENT_ID } from '@/components/workspace/agents'

export const Route = createFileRoute('/$agentId')({
  beforeLoad: ({ params }) => {
    if (!AGENTS.some(a => a.id === params.agentId)) {
      throw redirect({
        to: '/$agentId',
        params: { agentId: DEFAULT_AGENT_ID },
      })
    }
  },
  component: () => <Outlet />,
})
