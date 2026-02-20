import { useEffect } from 'react'

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'

import { AGENTS, DEFAULT_AGENT_ID } from '@/components/workspace/agents'
import { ChatView } from '@/components/workspace/chat-view'
import { useWorkspace } from '@/components/workspace/workspace-context'

export const Route = createFileRoute('/$agentId/$conversationId')({
  component: ConversationRoute,
})

function ConversationRoute() {
  const { agentId, conversationId } = useParams({
    from: '/$agentId/$conversationId',
  })
  const agent = AGENTS.find(a => a.id === agentId) ?? AGENTS[0]
  const { state, dispatch } = useWorkspace()
  const navigate = useNavigate()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record type masks runtime absence
  const convoExists = !!state.conversations[agentId]?.[conversationId]

  // Redirect to new chat if conversation doesn't exist
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard
    if (!convoExists) {
      void navigate({
        to: '/$agentId',
        params: { agentId: DEFAULT_AGENT_ID },
        replace: true,
      })
    }
  }, [convoExists, navigate])

  // Sync URL param → workspace state
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard
    if (convoExists && state.activeConversationId[agentId] !== conversationId) {
      dispatch({ type: 'SWITCH_CONVERSATION', agentId, conversationId })
    }
  }, [
    agentId,
    conversationId,
    convoExists,
    dispatch,
    state.activeConversationId,
  ])

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard
  if (!convoExists) return null

  return <ChatView agent={agent} conversationId={conversationId} />
}
