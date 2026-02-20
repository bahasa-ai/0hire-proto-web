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
import {
  WorkspaceProvider,
  useWorkspace,
} from '@/components/workspace/workspace-context'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'


export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Zero Hire' },
      { name: 'description', content: 'Your AI team workspace' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
})

function ChatTitleBar() {
  const matches = useMatches()
  const { state } = useWorkspace()

  const convoMatch = matches.find(
    m => m.routeId === '/$agentId/$conversationId',
  )
  if (!convoMatch) return null

  const { agentId, conversationId } = convoMatch.params as {
    agentId: string
    conversationId: string
  }
  const title = state.conversations[agentId]?.[conversationId]?.title // eslint-disable-line @typescript-eslint/no-unnecessary-condition

  return (
    <div className="flex h-13.5 shrink-0 items-center border-b px-4">
      <span className="text-foreground truncate text-sm font-medium">
        {title || 'New conversation'}
      </span>
    </div>
  )
}

function RootComponent() {
  return (
    <WorkspaceProvider>
      <div className="animate-in fade-in flex h-svh overflow-hidden p-3 duration-300">
        <WorkspaceSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ChatTitleBar />
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
