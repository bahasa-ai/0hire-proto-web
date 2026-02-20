import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'


export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  status: 'running' | 'done' | 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId: string
  timestamp: number
  isStreaming?: boolean
  interrupted?: boolean
  feedback?: 'helpful' | 'not-helpful'
  thinking?: string
  isThinking?: boolean
  toolCalls?: Array<ToolCall>
}

export interface Conversation {
  id: string
  title: string
  messages: Array<ChatMessage>
  createdAt: number
}

interface WorkspaceState {
  conversations: Record<string, Record<string, Conversation>>
  activeConversationId: Record<string, string | null>
}

type WorkspaceAction =
  | { type: 'APPEND_MESSAGE'; agentId: string; message: ChatMessage }
  | { type: 'START_STREAMING'; agentId: string; message: ChatMessage }
  | {
      type: 'APPEND_STREAM_CHUNK'
      agentId: string
      messageId: string
      chunk: string
    }
  | { type: 'FINISH_STREAMING'; agentId: string; messageId: string }
  | { type: 'INTERRUPT_STREAMING'; agentId: string; messageId: string }
  | {
      type: 'APPEND_THINKING_CHUNK'
      agentId: string
      messageId: string
      chunk: string
    }
  | {
      type: 'SET_FEEDBACK'
      agentId: string
      messageId: string
      feedback: 'helpful' | 'not-helpful'
    }
  | { type: 'CREATE_CONVERSATION'; agentId: string; conversationId?: string }
  | {
      type: 'SWITCH_CONVERSATION'
      agentId: string
      conversationId: string
    }
  | { type: 'CLEAR_ACTIVE_CONVERSATION'; agentId: string }
  | {
      type: 'RENAME_CONVERSATION'
      agentId: string
      conversationId: string
      title: string
    }
  | {
      type: 'DELETE_CONVERSATION'
      agentId: string
      conversationId: string
    }
  | {
      type: 'APPEND_TOOL_CALL'
      agentId: string
      messageId: string
      toolCall: ToolCall
    }
  | {
      type: 'UPDATE_TOOL_CALL'
      agentId: string
      messageId: string
      toolCallId: string
      update: Partial<ToolCall>
    }

// -- Helpers to reduce nested spread boilerplate --

export function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function makeConversation(id?: string): Conversation {
  return {
    id: id ?? generateId(),
    title: '',
    messages: [],
    createdAt: Date.now(),
  }
}

/** Replace or add a single conversation for an agent. */
function setConversation(
  state: WorkspaceState,
  agentId: string,
  convo: Conversation,
): WorkspaceState {
  return {
    ...state,
    conversations: {
      ...state.conversations,
      [agentId]: { ...state.conversations[agentId], [convo.id]: convo },
    },
  }
}

/** Update the active conversation pointer for an agent. */
function setActiveConvo(
  state: WorkspaceState,
  agentId: string,
  convoId: string | null,
): WorkspaceState {
  return {
    ...state,
    activeConversationId: {
      ...state.activeConversationId,
      [agentId]: convoId,
    },
  }
}

/**
 * Ensure an active conversation exists for an agent.
 * Returns the (possibly updated) state and the active conversation ID.
 */
function ensureConversation(
  state: WorkspaceState,
  agentId: string,
): { state: WorkspaceState; convoId: string } {
  const activeId = state.activeConversationId[agentId]
  if (activeId) return { state, convoId: activeId }

  const convo = makeConversation()
  return {
    state: setActiveConvo(
      setConversation(state, agentId, convo),
      agentId,
      convo.id,
    ),
    convoId: convo.id,
  }
}

/** Append a message to the active conversation, auto-creating one if needed. */
function appendToChannel(
  state: WorkspaceState,
  agentId: string,
  message: ChatMessage,
): WorkspaceState {
  const { state: s, convoId } = ensureConversation(state, agentId)
  const convo = s.conversations[agentId][convoId]
  const isFirstUserMessage =
    message.role === 'user' &&
    !convo.title &&
    !convo.messages.some(m => m.role === 'user')

  return setConversation(s, agentId, {
    ...convo,
    title: isFirstUserMessage ? message.content.slice(0, 50) : convo.title,
    messages: [...convo.messages, message],
  })
}

/** Update a specific message within the active conversation. */
function updateMessage(
  state: WorkspaceState,
  agentId: string,
  messageId: string,
  update: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
): WorkspaceState {
  const convoId = state.activeConversationId[agentId]
  if (!convoId) return state
  const convo = state.conversations[agentId][convoId]

  return setConversation(state, agentId, {
    ...convo,
    messages: convo.messages.map(m => {
      if (m.id !== messageId) return m
      return typeof update === 'function' ? update(m) : { ...m, ...update }
    }),
  })
}

// -- Reducer --

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'APPEND_MESSAGE':
    case 'START_STREAMING':
      return appendToChannel(state, action.agentId, action.message)

    case 'APPEND_STREAM_CHUNK':
      return updateMessage(state, action.agentId, action.messageId, m => ({
        ...m,
        content: m.content + action.chunk,
        isThinking: false,
      }))

    case 'FINISH_STREAMING':
      return updateMessage(state, action.agentId, action.messageId, {
        isStreaming: false,
      })

    case 'APPEND_THINKING_CHUNK':
      return updateMessage(state, action.agentId, action.messageId, m => ({
        ...m,
        thinking: (m.thinking ?? '') + action.chunk,
      }))

    case 'INTERRUPT_STREAMING':
      return updateMessage(state, action.agentId, action.messageId, {
        isStreaming: false,
        interrupted: true,
        isThinking: false,
      })

    case 'SET_FEEDBACK':
      return updateMessage(state, action.agentId, action.messageId, {
        feedback: action.feedback,
      })

    case 'CREATE_CONVERSATION': {
      const convo = makeConversation(action.conversationId)
      return setActiveConvo(
        setConversation(state, action.agentId, convo),
        action.agentId,
        convo.id,
      )
    }

    case 'SWITCH_CONVERSATION':
      return setActiveConvo(state, action.agentId, action.conversationId)

    case 'CLEAR_ACTIVE_CONVERSATION':
      return setActiveConvo(state, action.agentId, null)

    case 'RENAME_CONVERSATION': {
      const convo = state.conversations[action.agentId][action.conversationId]
      return setConversation(state, action.agentId, {
        ...convo,
        title: action.title,
      })
    }

    case 'DELETE_CONVERSATION': {
      const { [action.conversationId]: _, ...remaining } =
        state.conversations[action.agentId]

      const wasActive =
        state.activeConversationId[action.agentId] === action.conversationId
      const nextActiveId = wasActive
        ? (Object.values(remaining).sort((a, b) => b.createdAt - a.createdAt)[0]
            ?.id ?? null)
        : state.activeConversationId[action.agentId]

      return {
        ...state,
        conversations: { ...state.conversations, [action.agentId]: remaining },
        activeConversationId: {
          ...state.activeConversationId,
          [action.agentId]: nextActiveId,
        },
      }
    }

    case 'APPEND_TOOL_CALL':
      return updateMessage(state, action.agentId, action.messageId, m => ({
        ...m,
        toolCalls: [...(m.toolCalls ?? []), action.toolCall],
      }))

    case 'UPDATE_TOOL_CALL':
      return updateMessage(state, action.agentId, action.messageId, m => ({
        ...m,
        toolCalls: m.toolCalls?.map(tc =>
          tc.id === action.toolCallId ? { ...tc, ...action.update } : tc,
        ),
      }))

    default:
      return state
  }
}

// -- Selectors --

export function getActiveMessages(
  state: WorkspaceState,
  agentId: string,
): Array<ChatMessage> {
  const convoId = state.activeConversationId[agentId]
  if (!convoId) return []
  return state.conversations[agentId][convoId].messages
}

export function getConversationList(
  state: WorkspaceState,
  agentId: string,
): Array<{ id: string; title: string; createdAt: number }> {
  return Object.values(state.conversations[agentId] ?? {})
    .map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

// -- Context --

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const INITIAL_STATE: WorkspaceState = {
  conversations: {},
  activeConversationId: {},
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, INITIAL_STATE)

  return (
    <WorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx)
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
