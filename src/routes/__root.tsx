import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useMatches,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import 'streamdown/styles.css'
import { AGENTS } from '@/components/workspace/agents'
import { TaskStack } from '@/components/workspace/task-stack'
import {
  getActiveMessages,
  WorkspaceProvider,
  useWorkspace,
} from '@/components/workspace/workspace-context'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { cn } from '@/lib/utils'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Øhire' },
      { name: 'description', content: 'Your AI team workspace' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
})

function AgentTitleBar() {
  const matches = useMatches()

  const agentMatch = matches.find(m => m.routeId === '/$agentId/')
  if (!agentMatch) return null

  const { agentId } = agentMatch.params as { agentId: string }
  const agent = AGENTS.find(a => a.id === agentId)
  const { state } = useWorkspace()
  const hasMessages = getActiveMessages(state, agentId).length > 0

  if (!hasMessages) return null

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-13.5 shrink-0 items-center gap-3 px-4">
      {agent && (
        <div className="z-10 flex items-center gap-2.5">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-sm',
              agent.accentColor,
            )}
          >
            {agent.emoji}
          </span>
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-semibold">
              {agent.name}
            </span>
            <span className="text-muted-foreground text-xs">{agent.role}</span>
          </div>
        </div>
      )}
      <div className="flex-1" />
      <TaskStack agentId={agentId} />
      <div
        className="pointer-events-none absolute top-0 left-0 h-20 w-full select-none"
        style={{
          background:
            'linear-gradient(to bottom, var(--background), transparent)',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />
    </div>
  )
}

function RootComponent() {
  return (
    <WorkspaceProvider>
      <div className="animate-in fade-in flex h-svh p-3 duration-300">
        <WorkspaceSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <AgentTitleBar />
          <Outlet />
        </main>
      </div>
    </WorkspaceProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
