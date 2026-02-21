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
  useWorkspace,
  WorkspaceProvider,
} from '@/components/workspace/workspace-context'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { cn } from '@/lib/utils'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '0hire' },
      { name: 'description', content: 'Your AI team workspace' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/0hire-black-icon.svg' },
    ],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
})

function AgentTitleBar() {
  const matches = useMatches()
  const { state } = useWorkspace()

  const agentMatch = matches.find(m => m.routeId === '/$agentId/')
  if (!agentMatch) return null

  const { agentId } = agentMatch.params as { agentId: string }
  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent) return null

  const hasMessages = getActiveMessages(state, agentId).length > 0
  if (!hasMessages) return null

  return (
    <div
      style={{ viewTransitionName: 'agent-title' }}
      className="absolute inset-x-0 top-0 z-10 flex h-13.5 shrink-0 items-center gap-3 px-4"
    >
      <div className="z-10 flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full',
            agent.accentColor,
          )}
        >
          <img
            src={agent.avatar}
            alt={agent.name}
            className="size-full object-cover"
          />
        </span>
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-semibold">
            {agent.name}
          </span>
          <span className="text-muted-foreground text-xs">{agent.role}</span>
        </div>
      </div>
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
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 bg-[url(/bg-pattern.svg)] mask-linear-340 mask-linear-from-30% bg-size-[400px] bg-center bg-repeat opacity-[0.04] dark:opacity-[0.04] dark:invert"
        />
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
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#030712"
          media="(prefers-color-scheme: dark)"
        />
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
