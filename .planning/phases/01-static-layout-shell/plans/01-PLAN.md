---
phase: 01-static-layout-shell
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/workspace/agents.ts
  - src/components/workspace/agent-channel-item.tsx
  - src/components/workspace/workspace-sidebar.tsx
  - src/components/workspace/channel-header.tsx
  - src/components/workspace/workspace-main.tsx
  - src/components/workspace/workspace-layout.tsx
  - src/routes/index.tsx
autonomous: true
requirements:
  - LAYOUT-01
  - LAYOUT-02
  - LAYOUT-03
  - LAYOUT-04
  - INFRA-02

must_haves:
  truths:
    - 'Sidebar lists Chief of Staff, Designer, Finance, Legal — each with avatar initials circle and role label'
    - "Clicking an agent channel switches the main panel to that agent's view"
    - 'Active agent is highlighted with sidebar-primary background; inactive items hover to sidebar-accent'
    - 'Channel header shows active agent name (large), role, and full description'
    - 'Workspace loads immediately at / with no login prompt — CURRENT_USER is hardcoded'
  artifacts:
    - path: 'src/components/workspace/agents.ts'
      provides: 'Agent type, AGENTS array (4 agents), DEFAULT_AGENT_ID, CURRENT_USER'
      exports: ['Agent', 'AGENTS', 'DEFAULT_AGENT_ID', 'CURRENT_USER']
    - path: 'src/components/workspace/agent-channel-item.tsx'
      provides: 'Clickable sidebar row for a single agent'
      exports: ['AgentChannelItem']
    - path: 'src/components/workspace/workspace-sidebar.tsx'
      provides: 'Left sidebar with agent list and user footer'
      exports: ['WorkspaceSidebar']
    - path: 'src/components/workspace/channel-header.tsx'
      provides: 'Channel header bar with agent identity'
      exports: ['ChannelHeader']
    - path: 'src/components/workspace/workspace-main.tsx'
      provides: 'Main panel — header + placeholder content area'
      exports: ['WorkspaceMain']
    - path: 'src/components/workspace/workspace-layout.tsx'
      provides: 'Workspace root — owns activeAgentId state, composes sidebar + main'
      exports: ['WorkspaceLayout']
    - path: 'src/routes/index.tsx'
      provides: 'Route renders WorkspaceLayout'
      contains: 'WorkspaceLayout'
  key_links:
    - from: 'agent-channel-item.tsx onSelect'
      to: 'workspace-layout.tsx setActiveAgentId'
      via: 'onSelect prop callback'
      pattern: "onSelect\\(agent\\.id\\)"
    - from: 'workspace-layout.tsx activeAgentId'
      to: 'WorkspaceSidebar + WorkspaceMain'
      via: 'props drilling'
      pattern: "activeId=\\{activeAgentId\\}"
    - from: 'agents.ts AGENTS'
      to: 'workspace-layout.tsx'
      via: 'import + find'
      pattern: "AGENTS\\.find"
---

<objective>
Build the complete static workspace shell — a persistent sidebar listing 4 AI agents, clickable channel switching with active state highlighting, and an identity-rich channel header.

Purpose: Phase 1 makes the product feel real before any API or state infrastructure. Users see a polished, Slack-like workspace that communicates what the product IS.
Output: Full workspace layout at route `/` — sidebar + main panel, no placeholder, no login.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-static-layout-shell/01-RESEARCH.md
@src/styles.css
@src/lib/utils.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Agent Data Layer</name>
  <files>src/components/workspace/agents.ts</files>
  <action>
Create `src/components/workspace/agents.ts` — pure TypeScript, no JSX, no React imports.

Define and export:

```typescript
export interface Agent {
  id: string
  name: string
  role: string
  description: string
  initials: string
  accentColor: string // Tailwind class string, e.g. 'bg-chart-4'
}
```

Export `AGENTS: Agent[]` with all four agents:

- `{ id: 'chief-of-staff', name: 'Chief of Staff', role: 'Executive Operations', description: 'Coordinates priorities, tracks deadlines, and keeps your business running smoothly across every department.', initials: 'CS', accentColor: 'bg-chart-2' }`
- `{ id: 'designer', name: 'Designer', role: 'Brand & Visual', description: 'Creates visual assets, refines brand identity, and ensures every customer touchpoint looks intentional.', initials: 'DE', accentColor: 'bg-chart-3' }`
- `{ id: 'finance', name: 'Finance', role: 'Financial Operations', description: 'Monitors cash flow, prepares reports, and flags financial risks before they become problems.', initials: 'FI', accentColor: 'bg-chart-4' }`
- `{ id: 'legal', name: 'Legal', role: 'Legal & Compliance', description: 'Reviews contracts, tracks regulatory requirements, and ensures the business stays protected.', initials: 'LE', accentColor: 'bg-chart-5' }`

Export constants:

```typescript
export const DEFAULT_AGENT_ID = 'chief-of-staff'

export const CURRENT_USER = {
  name: 'Alex Rivera',
  role: 'Business Owner',
  initials: 'AR',
} as const
```

  </action>
  <verify>TypeScript compiles with no errors: `bun run build` or check no TS errors in file</verify>
  <done>`AGENTS` exports 4 agents with all required fields; `DEFAULT_AGENT_ID` and `CURRENT_USER` exported correctly; no TypeScript errors</done>
</task>

<task type="auto">
  <name>Task 2: Sidebar Components</name>
  <files>
    src/components/workspace/agent-channel-item.tsx
    src/components/workspace/workspace-sidebar.tsx
  </files>
  <action>
**`src/components/workspace/agent-channel-item.tsx`**

Props: `{ agent: Agent; isActive: boolean; onSelect: (id: string) => void }`

Render a `<button>` that fills sidebar width. On click: `onSelect(agent.id)`.

Structure inside the button:

```
[Avatar circle] [Name + role]
```

Avatar: `<span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground', agent.accentColor)}>{agent.initials}</span>`

Name: `text-sm font-medium` — agent.name
Role label: `text-xs text-muted-foreground` (inactive) or `text-xs opacity-70` (active, inherits foreground) — agent.role

Button className via `cn()`:

```
'flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
```

Active: `'bg-sidebar-primary text-sidebar-primary-foreground'`
Inactive: `'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'`

When active, the role label should be `text-xs opacity-60` (not text-muted-foreground, because the active state changes the inherited color).

---

**`src/components/workspace/workspace-sidebar.tsx`**

Props: `{ agents: Agent[]; activeId: string; onSelect: (id: string) => void }`

Render an `<aside>` with:

- `className="flex h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"`

**Header section** (`<div className="px-3 py-4">`):

- App name: `<span className="text-sm font-semibold text-sidebar-foreground">Zero Hire</span>`
- Sub-label: `<span className="text-xs text-muted-foreground">Workspace</span>`

**Nav section** (`<nav className="flex-1 overflow-y-auto px-2 py-2">`):

- Section label: `<p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Agents</p>`
- Map `agents` → `<AgentChannelItem key={agent.id} agent={agent} isActive={agent.id === activeId} onSelect={onSelect} />`

**User footer** (`<div className="border-t border-sidebar-border px-3 py-3">`):

```tsx
<div className="flex items-center gap-2">
  <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
    {CURRENT_USER.initials}
  </span>
  <div className="min-w-0">
    <p className="text-sidebar-foreground truncate text-sm font-medium">
      {CURRENT_USER.name}
    </p>
    <p className="text-muted-foreground truncate text-xs">
      {CURRENT_USER.role}
    </p>
  </div>
</div>
```

Import `CURRENT_USER` from `./agents`.
</action>
<verify>Dev server renders sidebar with 4 agent items; clicking each item calls onSelect (verify by wiring in Task 3)</verify>
<done>Sidebar renders with header, 4 AgentChannelItems, and user footer; active/hover states apply correctly via className; no TypeScript errors</done>
</task>

<task type="auto">
  <name>Task 3: Main Panel, Layout Orchestrator, and Route Wiring</name>
  <files>
    src/components/workspace/channel-header.tsx
    src/components/workspace/workspace-main.tsx
    src/components/workspace/workspace-layout.tsx
    src/routes/index.tsx
  </files>
  <action>
**`src/components/workspace/channel-header.tsx`**

Props: `{ agent: Agent }`

Render `<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-6">`:

- Avatar: `<span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground', agent.accentColor)}>{agent.initials}</span>`
- Text block:
  ```tsx
  <div className="min-w-0">
    <p className="text-foreground text-sm font-semibold">{agent.name}</p>
    <p className="text-muted-foreground truncate text-xs">
      {agent.role} · {agent.description}
    </p>
  </div>
  ```

---

**`src/components/workspace/workspace-main.tsx`**

Props: `{ activeAgent: Agent }`

Render:

```tsx
<main className="bg-background flex min-w-0 flex-1 flex-col">
  <ChannelHeader agent={activeAgent} />
  <div className="flex-1" />
</main>
```

The `flex-1` empty div holds space for Phase 2 chat content.

---

**`src/components/workspace/workspace-layout.tsx`**

No props.

```tsx
export function WorkspaceLayout() {
  const [activeAgentId, setActiveAgentId] = useState(DEFAULT_AGENT_ID)
  const activeAgent = AGENTS.find(a => a.id === activeAgentId) ?? AGENTS[0]

  return (
    <div className="bg-background flex min-h-svh">
      <WorkspaceSidebar
        agents={AGENTS}
        activeId={activeAgentId}
        onSelect={setActiveAgentId}
      />
      <WorkspaceMain activeAgent={activeAgent} />
    </div>
  )
}
```

Import: `useState` from react; `Agent`, `AGENTS`, `DEFAULT_AGENT_ID` from `./agents`; sidebar and main components from their files.

---

**`src/routes/index.tsx`**

Replace current content entirely:

```tsx
import { WorkspaceLayout } from '@/components/workspace/workspace-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: WorkspaceLayout })
```

No wrapper function needed — WorkspaceLayout IS the page component.
</action>
<verify>

1. Run `bun run dev` — dev server starts on port 3000
2. Visit http://localhost:3000 — workspace renders with dark sidebar and main panel
3. All 4 agents appear in sidebar
4. Click each agent — main panel header updates to that agent's name/role/description
5. Active agent highlighted in sidebar; previously active item returns to default state
6. No TypeScript errors, no console errors
   </verify>
   <done>

- Workspace renders at / with no login, no placeholder
- Channel switching works: clicking agent updates header and active state
- `bun run check` passes (no lint/format errors)
  </done>
  </task>

</tasks>

<verification>
After all tasks complete, verify all 5 Phase 1 success criteria:

1. **LAYOUT-01:** Sidebar shows Chief of Staff, Designer, Finance, Legal — each with initials avatar and role label
2. **LAYOUT-02:** Clicking each agent item visibly changes the channel header to that agent
3. **LAYOUT-03:** Active agent item has `bg-sidebar-primary` background; others do not
4. **LAYOUT-04:** Channel header shows agent name, role, and full description
5. **INFRA-02:** Page loads immediately — no auth prompt, no redirect, `CURRENT_USER` visible in sidebar footer

Run `bun run check` — must pass with no errors.
</verification>

<success_criteria>

- `bun run dev` starts without errors
- All 5 phase success criteria verified by human visual inspection
- `bun run check` (lint + format) exits 0
- No hardcoded hex/rgb/oklch color values in any new component file
- All new files use single quotes, no semicolons (Prettier enforced)
  </success_criteria>

<output>
After completion, create `.planning/phases/01-static-layout-shell/01-static-layout-shell-01-SUMMARY.md` with:
- What was built (components, files)
- Key implementation decisions made
- Any deviations from the plan and why
- Patterns established for Phase 2 (Agent type structure, state location, token usage)
</output>
