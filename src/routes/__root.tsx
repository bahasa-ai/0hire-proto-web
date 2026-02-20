import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useMatches,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import 'streamdown/styles.css'
import appCss from '../styles.css?url'
import { TaskStack } from '@/components/workspace/task-stack'
import { WorkspaceProvider } from '@/components/workspace/workspace-context'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'

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

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-13.5 shrink-0 items-center border-b px-4">
      <TaskStack agentId={agentId} />
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
