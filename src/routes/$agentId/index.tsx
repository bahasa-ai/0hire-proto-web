import { useCallback, useEffect } from 'react'

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'

import { AGENTS } from '@/components/workspace/agents'
import { ChatView } from '@/components/workspace/chat-view'
import { useWorkspace } from '@/components/workspace/workspace-context'

export const Route = createFileRoute('/$agentId/')({
  component: NewChatRoute,
})

function NewChatRoute() {
  const { agentId } = useParams({ from: '/$agentId/' })
  const agent = AGENTS.find(a => a.id === agentId) ?? AGENTS[0]
  const navigate = useNavigate()
  const { state, dispatch } = useWorkspace()

  // Clear active conversation so ChatView shows empty state
  useEffect(() => {
    if (state.activeConversationId[agentId]) {
      dispatch({ type: 'CLEAR_ACTIVE_CONVERSATION', agentId })
    }
  }, [agentId, dispatch, state.activeConversationId])

  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      void navigate({
        to: '/$agentId/$conversationId',
        params: { agentId, conversationId },
        replace: true,
      })
    },
    [agentId, navigate],
  )

  return (
    <ChatView agent={agent} onConversationCreated={handleConversationCreated} />
  )
}
