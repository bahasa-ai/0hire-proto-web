import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId: string
  timestamp: number
  isStreaming?: boolean
  interrupted?: boolean
}

interface WorkspaceState {
  messages: Record<string, Array<ChatMessage>>
}

type WorkspaceAction =
  | { type: 'APPEND_MESSAGE'; agentId: string; message: ChatMessage }
  | { type: 'START_STREAMING'; agentId: string; message: ChatMessage }
  | { type: 'APPEND_STREAM_CHUNK'; agentId: string; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; agentId: string; messageId: string }
  | { type: 'INTERRUPT_STREAMING'; agentId: string; messageId: string }

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'APPEND_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: [
            ...(state.messages[action.agentId] ?? []),
            action.message,
          ],
        },
      }

    case 'START_STREAMING':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: [
            ...(state.messages[action.agentId] ?? []),
            action.message,
          ],
        },
      }

    case 'APPEND_STREAM_CHUNK': {
      const msgs = state.messages[action.agentId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: msgs.map(m =>
            m.id === action.messageId
              ? { ...m, content: m.content + action.chunk }
              : m,
          ),
        },
      }
    }

    case 'FINISH_STREAMING': {
      const msgs = state.messages[action.agentId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: msgs.map(m =>
            m.id === action.messageId ? { ...m, isStreaming: false } : m,
          ),
        },
      }
    }

    case 'INTERRUPT_STREAMING': {
      const msgs = state.messages[action.agentId] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.agentId]: msgs.map(m =>
            m.id === action.messageId
              ? { ...m, isStreaming: false, interrupted: true }
              : m,
          ),
        },
      }
    }

    default:
      return state
  }
}

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, { messages: {} })

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
