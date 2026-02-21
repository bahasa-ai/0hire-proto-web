import { createContext, useContext, useReducer } from 'react'
import { AGENT_TASKS } from './tasks'
import type { Dispatch, ReactNode } from 'react'
import type { AgentTaskMap, Task, TaskStatus } from './tasks'

export interface AgentStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
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
  steps?: Array<AgentStep>
  taskTitle?: string
}

interface WorkspaceState {
  messages: Record<string, Array<ChatMessage>>
  tasks: AgentTaskMap
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
  | {
      type: 'UPDATE_STEP'
      agentId: string
      messageId: string
      stepId: string
      status: AgentStep['status']
    }
  | { type: 'ADD_TASK'; task: Task }
  | {
      type: 'UPDATE_TASK_STATUS'
      agentId: string
      taskId: string
      status: TaskStatus
    }
  | {
      type: 'SET_STEPS'
      agentId: string
      messageId: string
      steps: Array<AgentStep>
      taskTitle?: string
    }

// -- Helpers --

function appendMessage(
  state: WorkspaceState,
  agentId: string,
  message: ChatMessage,
): WorkspaceState {
  return {
    ...state,
    messages: {
      ...state.messages,
      [agentId]: [...(state.messages[agentId] ?? []), message],
    },
  }
}

function updateMessage(
  state: WorkspaceState,
  agentId: string,
  messageId: string,
  update: Partial<ChatMessage> | ((m: ChatMessage) => ChatMessage),
): WorkspaceState {
  const msgs = state.messages[agentId] ?? []
  return {
    ...state,
    messages: {
      ...state.messages,
      [agentId]: msgs.map(m => {
        if (m.id !== messageId) return m
        return typeof update === 'function' ? update(m) : { ...m, ...update }
      }),
    },
  }
}

// -- Reducer --

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'APPEND_MESSAGE':
    case 'START_STREAMING':
      return appendMessage(state, action.agentId, action.message)

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

    case 'UPDATE_STEP':
      return updateMessage(state, action.agentId, action.messageId, m => ({
        ...m,
        steps: m.steps?.map(s =>
          s.id === action.stepId ? { ...s, status: action.status } : s,
        ),
      }))

    case 'SET_STEPS':
      return updateMessage(state, action.agentId, action.messageId, {
        steps: action.steps,
        taskTitle: action.taskTitle,
      })

    case 'ADD_TASK':
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.task.agentId]: [
            action.task,
            ...(state.tasks[action.task.agentId] ?? []),
          ],
        },
      }

    case 'UPDATE_TASK_STATUS': {
      const agentTasks = state.tasks[action.agentId] ?? []
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.agentId]: agentTasks.map(t =>
            t.id === action.taskId
              ? {
                  ...t,
                  status: action.status,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        },
      }
    }

    default:
      return state
  }
}

// -- Selectors --

export function getActiveMessages(
  state: WorkspaceState,
  agentId: string,
): Array<ChatMessage> {
  return state.messages[agentId] ?? []
}

export function getAgentTasks(
  state: WorkspaceState,
  agentId: string,
): Array<Task> {
  return state.tasks[agentId] ?? []
}

// -- Context --

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: Dispatch<WorkspaceAction>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const INITIAL_STATE: WorkspaceState = { messages: {}, tasks: AGENT_TASKS }

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
