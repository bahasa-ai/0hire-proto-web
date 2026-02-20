---
phase: 04-task-board-agent-status-badges
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/styles.css
  - src/components/workspace/tasks.ts
  - src/components/workspace/task-card.tsx
  - src/components/workspace/task-board.tsx
  - src/components/workspace/workspace-main.tsx
  - src/components/workspace/agent-channel-item.tsx
autonomous: false
requirements:
  - BOARD-01
  - BOARD-02
  - BOARD-03
  - BOARD-04
  - BOARD-05

must_haves:
  truths:
    - 'Clicking the Tasks tab renders the task board for the active agent — not the placeholder div'
    - 'The board groups tasks into sections matching task status; section order is: Needs Input → In Progress → Scheduled → Done → Failed'
    - 'Empty sections are hidden entirely — no empty section headers visible'
    - 'Each agent has 3–5 pre-seeded realistic tasks visible on first load with no user action required'
    - 'Each task card shows: status icon (colored), task title, brief description, and a relative timestamp'
    - "Each sidebar agent entry shows a colored status dot derived from that agent's task state"
    - 'Idle agents (all tasks done) show no dot — the sidebar remains uncluttered'
    - 'The needs-input dot pulses unless that agent is currently active (isActive suppresses animation)'
  artifacts:
    - path: 'src/components/workspace/tasks.ts'
      provides: 'TaskStatus/AgentStatus types, Task interface, AgentTaskMap, AGENT_TASKS data, deriveAgentStatus function, SECTION_ORDER, SECTION_META'
      exports:
        [
          'TaskStatus',
          'AgentStatus',
          'Task',
          'AgentTaskMap',
          'AGENT_TASKS',
          'deriveAgentStatus',
          'SECTION_ORDER',
          'SECTION_META',
        ]
    - path: 'src/components/workspace/task-card.tsx'
      provides: 'TaskCard component rendering status icon, title, description, relative timestamp'
      exports: ['TaskCard']
    - path: 'src/components/workspace/task-board.tsx'
      provides: 'TaskBoard component rendering status-grouped sections with headers and TaskCards'
      exports: ['TaskBoard']
  key_links:
    - from: 'src/components/workspace/workspace-main.tsx'
      to: 'src/components/workspace/task-board.tsx'
      via: '<TaskBoard agent={activeAgent} /> rendered in the tasks tab branch'
      pattern: 'TaskBoard'
    - from: 'src/components/workspace/task-board.tsx'
      to: 'src/components/workspace/tasks.ts'
      via: 'AGENT_TASKS[agent.id] ?? [] to get task list'
      pattern: 'AGENT_TASKS'
    - from: 'src/components/workspace/agent-channel-item.tsx'
      to: 'src/components/workspace/tasks.ts'
      via: 'deriveAgentStatus(AGENT_TASKS[agent.id] ?? []) to compute badge color'
      pattern: 'deriveAgentStatus'
---

<objective>
Build the per-agent task board and sidebar status badges that make every agent's work visible — directly solving the black box problem. A Tasks tab toggle shows status-grouped task cards. The sidebar shows a live-derived colored dot per agent.

Purpose: Users can instantly see what each agent is working on, what needs their attention, and what has failed — without opening a chat.
Output: `tasks.ts` (data + logic), `task-card.tsx`, `task-board.tsx`, updated `workspace-main.tsx` and `agent-channel-item.tsx`.
</objective>

<execution_context>
@.planning/phases/04-task-board-agent-status-badges/04-RESEARCH.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/components/workspace/agents.ts
@src/components/workspace/workspace-main.tsx
@src/components/workspace/agent-channel-item.tsx
@src/styles.css
</context>

<tasks>

<!-- ══════════════════════════════════════════════════════
     TOKENS
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T01: Add --warning color tokens to styles.css</name>
  <files>
    src/styles.css
  </files>
  <action>
Open `src/styles.css`. Make three additions — one per theme section. Do NOT modify any existing lines.

**Inside `:root { }`** — add after the last existing custom property in the root block:

```css
--warning: oklch(0.76 0.15 72);
--warning-foreground: oklch(0.3 0.08 60);
```

**Inside `.dark { }`** — add after the last existing custom property in the dark block:

```css
--warning: oklch(0.72 0.18 60);
--warning-foreground: oklch(0.15 0.04 60);
```

**Inside `@theme inline { }`** — add after the last existing `--color-*` mapping:

```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

These three additions make `bg-warning`, `text-warning`, `bg-warning-foreground`, and `text-warning-foreground` available as Tailwind utility classes throughout the app.
</action>
<verify>
Run `bun run lint` — zero errors. Confirm the three token insertions are present in the correct blocks by reading the file.
</verify>
<done>
`src/styles.css` contains `--warning` and `--warning-foreground` in `:root {}` and `.dark {}`, and `--color-warning` / `--color-warning-foreground` mappings in `@theme inline {}`. The classes `bg-warning` and `text-warning` resolve correctly at compile time.
</done>
</task>

<!-- ══════════════════════════════════════════════════════
     DATA LAYER
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T02: Create src/components/workspace/tasks.ts</name>
  <files>
    src/components/workspace/tasks.ts
  </files>
  <action>
Create the file `src/components/workspace/tasks.ts` with the following exact content. This is a pure data module — no React imports, no side effects.

```typescript
export type TaskStatus =
  | 'scheduled'
  | 'in-progress'
  | 'needs-input'
  | 'done'
  | 'failed'
export type AgentStatus = 'idle' | 'working' | 'needs-input' | 'failed'

export interface Task {
  id: string
  agentId: string
  title: string
  description: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export type AgentTaskMap = Record<string, Array<Task>>

export function deriveAgentStatus(tasks: Array<Task>): AgentStatus {
  if (tasks.some(t => t.status === 'failed')) return 'failed'
  if (tasks.some(t => t.status === 'needs-input')) return 'needs-input'
  if (tasks.some(t => t.status === 'in-progress')) return 'working'
  if (tasks.some(t => t.status === 'scheduled')) return 'working'
  return 'idle'
}

export const SECTION_ORDER: Array<TaskStatus> = [
  'needs-input',
  'in-progress',
  'scheduled',
  'done',
  'failed',
]

export const SECTION_META: Record<
  TaskStatus,
  { label: string; iconName: string }
> = {
  'needs-input': { label: 'Needs input', iconName: 'Bell' },
  'in-progress': { label: 'In progress', iconName: 'Loader2' },
  'scheduled': { label: 'Scheduled', iconName: 'Clock' },
  'done': { label: 'Done', iconName: 'CheckCircle2' },
  'failed': { label: 'Failed', iconName: 'AlertTriangle' },
}

export const AGENT_TASKS: AgentTaskMap = {
  'chief-of-staff': [
    {
      id: 'cs-01',
      agentId: 'chief-of-staff',
      title: 'Prepare Q1 Board Update Deck',
      description:
        'Compile OKR progress, hiring pipeline status, and SOC 2 timeline for the upcoming board call.',
      status: 'in-progress',
      createdAt: '2026-02-17T09:00:00Z',
      updatedAt: '2026-02-19T08:30:00Z',
    },
    {
      id: 'cs-02',
      agentId: 'chief-of-staff',
      title: 'Coordinate Senior Engineer Interview Loop',
      description:
        'Schedule panel interviews with Priya, Marcus, and two senior ICs for the open Senior Engineer role.',
      status: 'in-progress',
      createdAt: '2026-02-14T10:00:00Z',
      updatedAt: '2026-02-18T16:00:00Z',
    },
    {
      id: 'cs-03',
      agentId: 'chief-of-staff',
      title: 'Draft Series B Narrative Outline',
      description:
        'Create a first-pass narrative arc for the Series B deck — growth story, market timing, team.',
      status: 'scheduled',
      createdAt: '2026-02-19T08:00:00Z',
      updatedAt: '2026-02-19T08:00:00Z',
    },
    {
      id: 'cs-04',
      agentId: 'chief-of-staff',
      title: 'Q4 2025 OKR Retrospective',
      description:
        'Summarize Q4 OKR outcomes across Sales, Engineering, and CS for the all-hands recap.',
      status: 'done',
      createdAt: '2026-01-28T09:00:00Z',
      updatedAt: '2026-02-05T17:00:00Z',
    },
    {
      id: 'cs-05',
      agentId: 'chief-of-staff',
      title: 'Head of Marketing Job Description',
      description:
        'Draft and circulate the Head of Marketing JD for Alex and Marcus to review before posting.',
      status: 'done',
      createdAt: '2026-02-10T09:00:00Z',
      updatedAt: '2026-02-13T15:00:00Z',
    },
  ],

  'designer': [
    {
      id: 'de-01',
      agentId: 'designer',
      title: 'Mobile App v1 Final Polish Pass',
      description:
        'Apply final spacing, icon refinements, and dark mode fixes before the Q1 2026 mobile launch.',
      status: 'needs-input',
      createdAt: '2026-02-18T11:00:00Z',
      updatedAt: '2026-02-19T09:15:00Z',
    },
    {
      id: 'de-02',
      agentId: 'designer',
      title: 'Series B Pitch Deck Slide Design',
      description:
        'Design the visual layout and data viz slides for the Series B fundraising deck.',
      status: 'in-progress',
      createdAt: '2026-02-17T10:00:00Z',
      updatedAt: '2026-02-19T08:00:00Z',
    },
    {
      id: 'de-03',
      agentId: 'designer',
      title: 'Clarity Design System Token Audit',
      description:
        'Audit the Clarity Figma token library against the shipped product to surface any drift.',
      status: 'scheduled',
      createdAt: '2026-02-19T09:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'de-04',
      agentId: 'designer',
      title: 'Website Homepage Refresh',
      description:
        'Update hero copy and hero illustration to reflect the Series A announcement messaging.',
      status: 'done',
      createdAt: '2026-01-20T10:00:00Z',
      updatedAt: '2026-02-01T16:00:00Z',
    },
  ],

  'finance': [
    {
      id: 'fi-01',
      agentId: 'finance',
      title: 'January 2026 MRR Reconciliation',
      description:
        'Reconcile Stripe MRR against the financial model — flag any discrepancies before the board call.',
      status: 'in-progress',
      createdAt: '2026-02-03T09:00:00Z',
      updatedAt: '2026-02-19T08:00:00Z',
    },
    {
      id: 'fi-02',
      agentId: 'finance',
      title: 'Q4 2025 Churn Analysis',
      description:
        'Model the 2 churned accounts (~$180K ARR) to identify whether it was price, product, or support.',
      status: 'in-progress',
      createdAt: '2026-02-10T10:00:00Z',
      updatedAt: '2026-02-18T14:00:00Z',
    },
    {
      id: 'fi-03',
      agentId: 'finance',
      title: 'Series B Financial Model — Base/Bull/Bear',
      description:
        'Build three-scenario ARR and burn model to anchor the $22–28M raise target with defensible math.',
      status: 'scheduled',
      createdAt: '2026-02-19T09:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'fi-04',
      agentId: 'finance',
      title: 'AWS Cost Optimization Review',
      description:
        'Audit $28K/mo AWS spend — identify Reserved Instance or Savings Plan opportunities.',
      status: 'scheduled',
      createdAt: '2026-02-17T09:00:00Z',
      updatedAt: '2026-02-17T09:00:00Z',
    },
    {
      id: 'fi-05',
      agentId: 'finance',
      title: 'Series A Post-Close Cap Table Update',
      description:
        'Finalize cap table in Carta reflecting all Series A conversions and new option grants.',
      status: 'done',
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: '2026-01-22T17:00:00Z',
    },
  ],

  'legal': [
    {
      id: 'le-01',
      agentId: 'legal',
      title: 'Clearfield Analytics DPA & Security Addendum',
      description:
        "Review Clearfield's security addendum and finalize the outstanding DPA to unblock their renewal.",
      status: 'needs-input',
      createdAt: '2026-02-12T10:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'le-02',
      agentId: 'legal',
      title: 'Contractor IP Assignment Follow-Up',
      description:
        '2 outstanding contractor IP assignment agreements need signatures before further core product contribution.',
      status: 'in-progress',
      createdAt: '2026-02-15T09:00:00Z',
      updatedAt: '2026-02-18T11:00:00Z',
    },
    {
      id: 'le-03',
      agentId: 'legal',
      title: 'SOC 2 Type II Audit Preparation',
      description:
        'Review Vanta controls checklist and flag any gaps before the audit window opens in Q3 2026.',
      status: 'scheduled',
      createdAt: '2026-02-19T09:00:00Z',
      updatedAt: '2026-02-19T09:00:00Z',
    },
    {
      id: 'le-04',
      agentId: 'legal',
      title: 'SaaS MSA Template Refresh',
      description:
        'Update the MSA template (last reviewed Dec 2024) to reflect current data processing and AI provisions.',
      status: 'scheduled',
      createdAt: '2026-02-17T10:00:00Z',
      updatedAt: '2026-02-17T10:00:00Z',
    },
    {
      id: 'le-05',
      agentId: 'legal',
      title: 'CCPA Privacy Policy Annual Review',
      description:
        'Confirm the Jan 2025 Privacy Policy remains current — flag any required updates for 2026.',
      status: 'done',
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-01-28T16:00:00Z',
    },
  ],
}
```

  </action>
  <verify>
Run `bun run lint` — zero TypeScript errors in `tasks.ts`. Confirm the following exports are present: `TaskStatus`, `AgentStatus`, `Task`, `AgentTaskMap`, `deriveAgentStatus`, `SECTION_ORDER`, `SECTION_META`, `AGENT_TASKS`. Spot-check: `deriveAgentStatus(AGENT_TASKS['designer'])` would return `'needs-input'` (has a `needs-input` task). `deriveAgentStatus(AGENT_TASKS['chief-of-staff'])` would return `'working'` (no `needs-input`, has `in-progress`).
  </verify>
  <done>
`src/components/workspace/tasks.ts` exists. All 4 agent task arrays are present with correct data. `deriveAgentStatus` logic returns the expected status for each agent. No React imports — purely a data module. Zero TypeScript errors.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     TASK CARD COMPONENT
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T03: Create src/components/workspace/task-card.tsx</name>
  <files>
    src/components/workspace/task-card.tsx
  </files>
  <action>
Create the file `src/components/workspace/task-card.tsx` with the following exact content:

```typescript
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'

import type { Task, TaskStatus } from './tasks'
import { cn } from '@/lib/utils'

// Relative timestamp helper — lives here since tasks.ts is a pure data module
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

interface StatusIconProps {
  status: TaskStatus
  className?: string
}

function StatusIcon({ status, className }: StatusIconProps) {
  const base = 'size-3.5 shrink-0'
  switch (status) {
    case 'scheduled':
      return <Clock className={cn(base, 'text-muted-foreground', className)} />
    case 'in-progress':
      // No animate-spin on cards — too visually noisy
      return <Loader2 className={cn(base, 'text-primary', className)} />
    case 'needs-input':
      return <Bell className={cn(base, 'text-warning', className)} />
    case 'done':
      return <CheckCircle2 className={cn(base, 'text-primary opacity-60', className)} />
    case 'failed':
      return <AlertTriangle className={cn(base, 'text-destructive', className)} />
  }
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="bg-card border-border rounded-md border px-3 py-2.5">
      <div className="mb-1 flex items-start gap-2">
        <StatusIcon status={task.status} className="mt-0.5" />
        <p className="text-foreground min-w-0 flex-1 text-sm font-medium leading-snug">
          {task.title}
        </p>
      </div>
      <p className="text-muted-foreground line-clamp-2 pl-5 text-xs leading-relaxed">
        {task.description}
      </p>
      <p className="text-muted-foreground mt-1.5 pl-5 text-right text-xs">
        {relativeTime(task.updatedAt)}
      </p>
    </div>
  )
}
```

  </action>
  <verify>
Run `bun run lint` — zero errors. Confirm `TaskCard` is the default named export. Confirm `StatusIcon` uses no hardcoded color values — only semantic tokens (`text-muted-foreground`, `text-primary`, `text-warning`, `text-destructive`). Confirm `relativeTime` is defined in this file and not imported from `tasks.ts`.
  </verify>
  <done>
`src/components/workspace/task-card.tsx` exists and exports `TaskCard`. The component renders the status icon (colored with semantic tokens), title, description (`line-clamp-2`), and relative timestamp. No hardcoded color values. No `animate-spin` on `Loader2`. Zero TypeScript errors.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     TASK BOARD COMPONENT
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T04: Create src/components/workspace/task-board.tsx</name>
  <files>
    src/components/workspace/task-board.tsx
  </files>
  <action>
Create the file `src/components/workspace/task-board.tsx` with the following exact content. The board renders section headers with a matching icon, a task count, and `TaskCard` children. Empty sections are not rendered. Section order is Needs Input → In Progress → Scheduled → Done → Failed.

```typescript
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { TaskCard } from './task-card'
import { AGENT_TASKS, SECTION_ORDER } from './tasks'
import type { Agent } from './agents'
import type { TaskStatus } from './tasks'

const SECTION_ICONS: Record<TaskStatus, LucideIcon> = {
  'needs-input': Bell,
  'in-progress': Loader2,
  scheduled: Clock,
  done: CheckCircle2,
  failed: AlertTriangle,
}

const SECTION_LABELS: Record<TaskStatus, string> = {
  'needs-input': 'Needs input',
  'in-progress': 'In progress',
  scheduled: 'Scheduled',
  done: 'Done',
  failed: 'Failed',
}

const SECTION_ICON_CLASS: Record<TaskStatus, string> = {
  'needs-input': 'text-warning',
  'in-progress': 'text-primary',
  scheduled: 'text-muted-foreground',
  done: 'text-primary opacity-60',
  failed: 'text-destructive',
}

interface TaskBoardProps {
  agent: Agent
}

export function TaskBoard({ agent }: TaskBoardProps) {
  const tasks = AGENT_TASKS[agent.id] ?? []

  // Group tasks by status, preserving SECTION_ORDER, dropping empty groups
  const sections = SECTION_ORDER.map(status => ({
    status,
    tasks: tasks.filter(t => t.status === status),
  })).filter(s => s.tasks.length > 0)

  if (sections.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        No tasks yet
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="flex flex-col gap-5">
        {sections.map(({ status, tasks: sectionTasks }) => {
          const Icon = SECTION_ICONS[status]
          const label = SECTION_LABELS[status]
          const iconClass = SECTION_ICON_CLASS[status]

          return (
            <div key={status}>
              {/* Section header */}
              <div className="mb-2 flex items-center gap-1.5">
                <Icon className={`size-3.5 shrink-0 ${iconClass}`} />
                <span className="text-foreground text-sm font-medium">{label}</span>
                <span className="text-muted-foreground text-xs">{sectionTasks.length}</span>
              </div>
              {/* Task cards */}
              <div className="flex flex-col gap-2">
                {sectionTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

  </action>
  <verify>
Run `bun run lint` — zero errors. Confirm `TaskBoard` accepts `{ agent: Agent }` props. Confirm sections are derived from `SECTION_ORDER` (not hardcoded status strings inline). Confirm empty-section filtering: `.filter(s => s.tasks.length > 0)`. Confirm the empty-board fallback renders when `sections.length === 0`.
  </verify>
  <done>
`src/components/workspace/task-board.tsx` exists and exports `TaskBoard`. The board renders only non-empty sections. Section headers show the correct icon, label, and count. Each section renders `TaskCard` per task. Zero TypeScript errors.
  </done>
</task>

<!-- ══════════════════════════════════════════════════════
     WIRE-UP
     ══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>T05: Wire TaskBoard into workspace-main.tsx and add status badge to agent-channel-item.tsx</name>
  <files>
    src/components/workspace/workspace-main.tsx
    src/components/workspace/agent-channel-item.tsx
  </files>
  <action>
**Part A — workspace-main.tsx**

Replace the entire file content. The only changes vs the existing file are:

1. Import `TaskBoard` from `./task-board`
2. Replace the placeholder `<div>Task board coming in Phase 4</div>` with `<TaskBoard agent={activeAgent} />`

```typescript
import { useState } from 'react'

import { ChannelHeader } from './channel-header'
import { ChatView } from './chat-view'
import { TaskBoard } from './task-board'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface WorkspaceMainProps {
  activeAgent: Agent
}

export function WorkspaceMain({ activeAgent }: WorkspaceMainProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')

  return (
    <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
      <ChannelHeader agent={activeAgent} />

      {/* Underline tab toggle — quiet, typographic */}
      <div className="border-border flex shrink-0 items-end gap-0 border-b px-6">
        {(['chat', 'tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              '-mb-px border-b-2 px-1 pt-2 pb-2.5 text-sm capitalize transition-colors focus-visible:outline-none',
              tab !== 'chat' && 'ml-5',
              activeTab === tab
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <ChatView agent={activeAgent} />
      ) : (
        <TaskBoard agent={activeAgent} />
      )}
    </main>
  )
}
```

**Part B — agent-channel-item.tsx**

Replace the entire file content. Changes vs the existing file:

1. Import `AGENT_TASKS` and `deriveAgentStatus` from `./tasks`
2. Add `relative` to the avatar `<span>` to position the dot
3. Compute `agentStatus` via `deriveAgentStatus`
4. Render the status dot — hidden when `idle`, pulse suppressed when `isActive`

```typescript
import { AGENT_TASKS, deriveAgentStatus } from './tasks'
import type { Agent } from './agents'
import { cn } from '@/lib/utils'

interface AgentChannelItemProps {
  agent: Agent
  isActive: boolean
  onSelect: (id: string) => void
}

export function AgentChannelItem({
  agent,
  isActive,
  onSelect,
}: AgentChannelItemProps) {
  const agentStatus = deriveAgentStatus(AGENT_TASKS[agent.id] ?? [])

  const dotClass = (() => {
    switch (agentStatus) {
      case 'working':
        return 'bg-primary'
      case 'needs-input':
        // Suppress pulse when the channel is active — animation is distracting mid-conversation
        return cn('bg-warning', !isActive && 'animate-pulse')
      case 'failed':
        return 'bg-destructive'
      default:
        return null
    }
  })()

  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className={cn(
        'focus-visible:ring-sidebar-ring flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <span
        className={cn(
          'text-primary-foreground relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          agent.accentColor,
        )}
      >
        {agent.initials}
        {dotClass && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-2 rounded-full',
              isActive ? 'ring-sidebar-primary' : 'ring-sidebar',
              'ring-1',
              dotClass,
            )}
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{agent.name}</p>
        <p
          className={cn(
            'text-xs',
            isActive ? 'opacity-60' : 'text-muted-foreground',
          )}
        >
          {agent.role}
        </p>
      </div>
    </button>
  )
}
```

**Notes:**

- `dotClass` returns `null` for `idle` — the dot element is not rendered at all for idle agents
- `ring-sidebar` (inactive) / `ring-sidebar-primary` (active) ensures the dot ring contrasts against whatever background the avatar sits on
- `animate-pulse` is only applied when `agentStatus === 'needs-input'` AND `!isActive`
  </action>
  <verify>
  Run `bun run lint` — zero errors in both files. Run `bun run dev`, open http://localhost:3000.

1. Click the Tasks tab for any agent — confirm the task board renders with grouped sections (not the old placeholder text).
2. In the sidebar, confirm colored dots appear next to agents that are working or need input.
3. Confirm the Designer and Legal agents show a pulsing amber dot when not active.
4. Click the Designer agent to make it active — confirm the pulse animation stops while it's active.
5. Confirm no dot appears next to an agent whose all tasks are done (idle).
   </verify>
   <done>
   `workspace-main.tsx` renders `<TaskBoard agent={activeAgent} />` in the tasks tab branch. `agent-channel-item.tsx` renders a colored status dot derived from `AGENT_TASKS` — visible for `working`, `needs-input`, and `failed` statuses; absent for `idle`. Pulse suppressed when `isActive`. Zero TypeScript errors.
   </done>
   </task>

<!-- ══════════════════════════════════════════════════════
     VISUAL VERIFICATION
     ══════════════════════════════════════════════════════ -->

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Full task board and sidebar status badge implementation:
- T01: `--warning` / `--warning-foreground` tokens added to styles.css (`:root`, `.dark`, `@theme inline`)
- T02: `tasks.ts` — TypeScript types, `AGENT_TASKS` with 19 total pre-seeded tasks across 4 agents, `deriveAgentStatus`, `SECTION_ORDER`, `SECTION_META`
- T03: `task-card.tsx` — `TaskCard` component with status icon, title, description, relative timestamp
- T04: `task-board.tsx` — `TaskBoard` component with status-grouped sections, empty-section filtering, empty-board fallback
- T05: `workspace-main.tsx` wired to `TaskBoard`; `agent-channel-item.tsx` shows derived status dot
  </what-built>
  <how-to-verify>
Run `bun run dev`, open http://localhost:3000.

**Tab toggle and board rendering (BOARD-01):**

1. Click any agent in the sidebar
2. Click the "tasks" tab — ✅ task board renders (no placeholder text)
3. Click the "chat" tab — ✅ chat view is back
4. Switch to a different agent, click "tasks" again — ✅ that agent's tasks appear

**Status grouping and section order (BOARD-02):** 5. Open the Chief of Staff tasks tab 6. ✅ Sections visible: "In progress" and "Scheduled" (no "Needs input" — Chief of Staff has none) 7. ✅ "Done" section is present at the bottom with 2 completed tasks 8. ✅ Empty sections are NOT rendered — no empty section headers visible 9. Open the Designer tasks tab 10. ✅ "Needs input" section appears FIRST (before "In progress") — section order is correct

**Pre-seeded realistic tasks (BOARD-03):** 11. Verify Chief of Staff has 5 tasks total (2 in-progress, 1 scheduled, 2 done) 12. Verify Designer has 4 tasks (1 needs-input, 1 in-progress, 1 scheduled, 1 done) 13. Verify Finance has 5 tasks (2 in-progress, 2 scheduled, 1 done) 14. Verify Legal has 5 tasks (1 needs-input, 1 in-progress, 2 scheduled, 1 done) 15. ✅ Tasks have realistic hiring/business titles and descriptions — not lorem ipsum

**Task card anatomy (BOARD-04):** 16. Each card shows: colored status icon + task title on row 1 17. ✅ Description text below, capped to 2 lines (long descriptions truncate with ellipsis) 18. ✅ Relative timestamp in bottom-right (e.g. "today", "yesterday", "14 days ago") 19. ✅ "Needs input" tasks show an amber Bell icon (`text-warning`) 20. ✅ "In progress" tasks show a blue Loader2 icon (`text-primary`) — NOT spinning 21. ✅ "Done" tasks show a muted CheckCircle2 icon

**Sidebar status badges (BOARD-05):** 22. In the sidebar, check each agent: - Chief of Staff → ✅ blue dot (working — has in-progress tasks) - Designer → ✅ amber pulsing dot (needs-input) - Finance → ✅ blue dot (working) - Legal → ✅ amber pulsing dot (needs-input) 23. Click the Designer agent to select it 24. ✅ The amber dot is still visible but the pulse animation stops while Designer is active 25. Click a different agent — ✅ Designer's dot resumes pulsing in the background

**Lint check:** 26. Run `bun run lint` in terminal — ✅ zero errors
</how-to-verify>
<resume-signal>
Type "approved" if all checks pass. Describe any issues (e.g. "sections not in correct order", "dot not showing", "lint error in task-card.tsx") and the executor will diagnose and fix before proceeding.
</resume-signal>
</task>

</tasks>

<verification>
After T05 completes and the checkpoint is approved:

```bash
bun run lint   # Zero errors across all 6 modified files
```

Manual smoke test against the checkpoint checklist above — all 26 verification points must pass.
</verification>

<success_criteria>
All five BOARD requirements must be TRUE:

1. **BOARD-01:** Per-agent task board is accessible via the Tasks tab toggle alongside chat — switching tabs works for all 4 agents
2. **BOARD-02:** Task board groups tasks into the 5 status sections (Needs Input → In Progress → Scheduled → Done → Failed) with empty sections hidden
3. **BOARD-03:** Each of the 4 agents has pre-seeded realistic mock tasks (19 total) visible on first load with no user action required
4. **BOARD-04:** Every task card shows: status icon (semantically colored), task title, description (line-clamped), and a relative timestamp
5. **BOARD-05:** Every sidebar agent entry shows a status badge dot (idle = no dot, working = blue, needs-input = amber pulse, failed = red) derived from that agent's task state; pulse suppressed when agent is active
   </success_criteria>

<output>
After the checkpoint is approved, create `.planning/phases/04-task-board-agent-status-badges/04-task-board-01-SUMMARY.md` with:
- Files created/modified (with brief description of each)
- Key implementation decisions made
- Any deviations from this plan and why
- Confirmation that all 5 BOARD requirements are met
</output>
