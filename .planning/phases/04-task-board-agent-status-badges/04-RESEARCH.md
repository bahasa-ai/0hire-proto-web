# Phase 4: Task Board & Agent Status Badges — Research

**Researched:** 2026-02-19  
**Domain:** Static mock task data architecture, task board layout, sidebar status badges  
**Confidence:** HIGH (all findings based on direct codebase inspection + framework knowledge)

---

## Summary

Phase 4 adds the task board panel and sidebar status badges that make agent work visible. The implementation is entirely frontend — no new API calls, no new backend routes. All task data is static mock data seeded at module load time, derived status is computed from that data, and the sidebar badges read computed status directly.

The highest-risk design decision is the color scheme for `needs-input` status: the current OKLCH theme contains no amber/warning token. The color palette is entirely indigo-based (`chart-1` through `chart-5` all hue ~252–266°). Adding a single `--warning` custom property to `src/styles.css` (amber OKLCH) is the clean path that preserves the project's semantic-token-only convention while giving `needs-input` a visually distinct signal.

The architecture is intentionally flat. Task data lives in a new `src/components/workspace/tasks.ts` file as static `const` arrays. The `AgentChannelItem` component imports derived status directly from that module — no prop drilling, no context needed. This is appropriate because tasks are read-only in Phase 4.

**Primary recommendation:** Static module import pattern (Option B from the user's notes). `AgentChannelItem` calls `deriveAgentStatus(AGENT_TASKS[agent.id])` inline. Add `--warning` token to styles.css for `needs-input` color.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOARD-01 | Per-agent task board accessible via tab toggle alongside chat | Tab toggle already exists in `workspace-main.tsx` — replace placeholder div with `<TaskBoard agent={activeAgent} />` |
| BOARD-02 | Task board shows 5 status groups: Scheduled, In Progress, Needs Input, Done, Failed | Vertical section layout; each section is a labeled group with a header and cards; empty sections hidden |
| BOARD-03 | Each agent has pre-seeded realistic mock tasks visible on first load | Static `AGENT_TASKS` const in `tasks.ts`, keyed by agent ID; no runtime state required |
| BOARD-04 | Task cards show task name, brief description, and status icon | Card anatomy spec documented below; uses lucide-react icons per status |
| BOARD-05 | Sidebar agent entries show a status badge (idle / working / needs-input / failed) derived from task state | `deriveAgentStatus()` imported into `AgentChannelItem`; colored dot + optional pulse animation |
</phase_requirements>

---

## TypeScript Types

All types live in `src/components/workspace/tasks.ts` alongside the mock data.

```typescript
// All valid task states — drives both board grouping and status derivation
export type TaskStatus = 'scheduled' | 'in-progress' | 'needs-input' | 'done' | 'failed'

// The 4 sidebar badge states — derived from task state, not stored separately
export type AgentStatus = 'idle' | 'working' | 'needs-input' | 'failed'

export interface Task {
  id: string
  agentId: string
  title: string           // short, bold — max ~50 chars
  description: string     // one sentence, muted — max ~100 chars
  status: TaskStatus
  createdAt: string       // ISO 8601, used for relative timestamp display
  updatedAt: string       // ISO 8601, reflects last status change
}

// Map from agentId → tasks array — the shape of the exported AGENT_TASKS const
export type AgentTaskMap = Record<string, Array<Task>>
```

---

## Status Derivation Logic

Priority order (highest priority wins): **failed > needs-input > in-progress > scheduled → working > idle**

```typescript
export function deriveAgentStatus(tasks: Array<Task>): AgentStatus {
  if (tasks.some(t => t.status === 'failed')) return 'failed'
  if (tasks.some(t => t.status === 'needs-input')) return 'needs-input'
  if (tasks.some(t => t.status === 'in-progress')) return 'working'
  if (tasks.some(t => t.status === 'scheduled')) return 'working'
  return 'idle'
}
```

Rationale for "scheduled → working": a scheduled task means the agent has queued work, which is more accurate than "idle" from a UX perspective.

---

## Mock Task Data

### Design Constraints
- 3–5 tasks per agent; aim for variety across all 5 statuses collectively
- Each agent has at least 1 task in the status that drives their derived sidebar state
- Tasks are grounded in the Lucidly company context from `AGENT_SYSTEM_PROMPTS`
- `createdAt` / `updatedAt` use realistic recent timestamps (Jan–Feb 2026)

### Chief of Staff → derives `working`
Required: at least 1 `in-progress` task.

```typescript
// chief-of-staff tasks
[
  {
    id: 'cs-01',
    agentId: 'chief-of-staff',
    title: 'Prepare Q1 Board Update Deck',
    description: 'Compile OKR progress, hiring pipeline status, and SOC 2 timeline for the upcoming board call.',
    status: 'in-progress',
    createdAt: '2026-02-17T09:00:00Z',
    updatedAt: '2026-02-19T08:30:00Z',
  },
  {
    id: 'cs-02',
    agentId: 'chief-of-staff',
    title: 'Coordinate Senior Engineer Interview Loop',
    description: 'Schedule panel interviews with Priya, Marcus, and two senior ICs for the open Senior Engineer role.',
    status: 'in-progress',
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-18T16:00:00Z',
  },
  {
    id: 'cs-03',
    agentId: 'chief-of-staff',
    title: 'Draft Series B Narrative Outline',
    description: 'Create a first-pass narrative arc for the Series B deck — growth story, market timing, team.',
    status: 'scheduled',
    createdAt: '2026-02-19T08:00:00Z',
    updatedAt: '2026-02-19T08:00:00Z',
  },
  {
    id: 'cs-04',
    agentId: 'chief-of-staff',
    title: 'Q4 2025 OKR Retrospective',
    description: 'Summarize Q4 OKR outcomes across Sales, Engineering, and CS for the all-hands recap.',
    status: 'done',
    createdAt: '2026-01-28T09:00:00Z',
    updatedAt: '2026-02-05T17:00:00Z',
  },
  {
    id: 'cs-05',
    agentId: 'chief-of-staff',
    title: 'Head of Marketing Job Description',
    description: 'Draft and circulate the Head of Marketing JD for Alex and Marcus to review before posting.',
    status: 'done',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-13T15:00:00Z',
  },
]
```

### Designer → derives `needs-input`
Required: at least 1 `needs-input` task.

```typescript
// designer tasks
[
  {
    id: 'de-01',
    agentId: 'designer',
    title: 'Mobile App v1 Final Polish Pass',
    description: 'Apply final spacing, icon refinements, and dark mode fixes before the Q1 2026 mobile launch.',
    status: 'needs-input',
    createdAt: '2026-02-18T11:00:00Z',
    updatedAt: '2026-02-19T09:15:00Z',
  },
  {
    id: 'de-02',
    agentId: 'designer',
    title: 'Series B Pitch Deck Slide Design',
    description: 'Design the visual layout and data viz slides for the Series B fundraising deck.',
    status: 'in-progress',
    createdAt: '2026-02-17T10:00:00Z',
    updatedAt: '2026-02-19T08:00:00Z',
  },
  {
    id: 'de-03',
    agentId: 'designer',
    title: 'Clarity Design System Token Audit',
    description: 'Audit the Clarity Figma token library against the shipped product to surface any drift.',
    status: 'scheduled',
    createdAt: '2026-02-19T09:00:00Z',
    updatedAt: '2026-02-19T09:00:00Z',
  },
  {
    id: 'de-04',
    agentId: 'designer',
    title: 'Website Homepage Refresh',
    description: 'Update hero copy and hero illustration to reflect the Series A announcement messaging.',
    status: 'done',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-02-01T16:00:00Z',
  },
]
```

### Finance → derives `working`
Required: at least 1 `in-progress` task.

```typescript
// finance tasks
[
  {
    id: 'fi-01',
    agentId: 'finance',
    title: 'January 2026 MRR Reconciliation',
    description: 'Reconcile Stripe MRR against the financial model — flag any discrepancies before the board call.',
    status: 'in-progress',
    createdAt: '2026-02-03T09:00:00Z',
    updatedAt: '2026-02-19T08:00:00Z',
  },
  {
    id: 'fi-02',
    agentId: 'finance',
    title: 'Q4 2025 Churn Analysis',
    description: 'Model the 2 churned accounts (~$180K ARR) to identify whether it was price, product, or support.',
    status: 'in-progress',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-18T14:00:00Z',
  },
  {
    id: 'fi-03',
    agentId: 'finance',
    title: 'Series B Financial Model — Base/Bull/Bear',
    description: 'Build three-scenario ARR and burn model to anchor the $22–28M raise target with defensible math.',
    status: 'scheduled',
    createdAt: '2026-02-19T09:00:00Z',
    updatedAt: '2026-02-19T09:00:00Z',
  },
  {
    id: 'fi-04',
    agentId: 'finance',
    title: 'AWS Cost Optimization Review',
    description: 'Audit $28K/mo AWS spend — identify Reserved Instance or Savings Plan opportunities.',
    status: 'scheduled',
    createdAt: '2026-02-17T09:00:00Z',
    updatedAt: '2026-02-17T09:00:00Z',
  },
  {
    id: 'fi-05',
    agentId: 'finance',
    title: 'Series A Post-Close Cap Table Update',
    description: 'Finalize cap table in Carta reflecting all Series A conversions and new option grants.',
    status: 'done',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-22T17:00:00Z',
  },
]
```

### Legal → derives `needs-input`
Required: at least 1 `needs-input` task (the Clearfield DPA is the canonical choice from the system prompt).

```typescript
// legal tasks
[
  {
    id: 'le-01',
    agentId: 'legal',
    title: 'Clearfield Analytics DPA & Security Addendum',
    description: 'Review Clearfield\'s security addendum and finalize the outstanding DPA to unblock their renewal.',
    status: 'needs-input',
    createdAt: '2026-02-12T10:00:00Z',
    updatedAt: '2026-02-19T09:00:00Z',
  },
  {
    id: 'le-02',
    agentId: 'legal',
    title: 'Contractor IP Assignment Follow-Up',
    description: 'Chase the 2 outstanding contractor IP assignment agreements before they contribute further to core product.',
    status: 'in-progress',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-18T11:00:00Z',
  },
  {
    id: 'le-03',
    agentId: 'legal',
    title: 'SOC 2 Type II Audit Preparation',
    description: 'Review Vanta controls checklist and flag any gaps before the audit window opens in Q3 2026.',
    status: 'scheduled',
    createdAt: '2026-02-19T09:00:00Z',
    updatedAt: '2026-02-19T09:00:00Z',
  },
  {
    id: 'le-04',
    agentId: 'legal',
    title: 'SaaS MSA Template Refresh',
    description: 'Update the MSA template (last reviewed Dec 2024) to reflect current data processing and AI provisions.',
    status: 'scheduled',
    createdAt: '2026-02-17T10:00:00Z',
    updatedAt: '2026-02-17T10:00:00Z',
  },
  {
    id: 'le-05',
    agentId: 'legal',
    title: 'CCPA Privacy Policy Annual Review',
    description: 'Confirm the Jan 2025 Privacy Policy remains current — flag any required updates for 2026.',
    status: 'done',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-28T16:00:00Z',
  },
]
```

### Derived Status Summary
| Agent | Derived Status | Driving Task |
|-------|---------------|--------------|
| chief-of-staff | `working` | cs-01 (`in-progress`) |
| designer | `needs-input` | de-01 (`needs-input`) |
| finance | `working` | fi-01 (`in-progress`) |
| legal | `needs-input` | le-01 (`needs-input`) |

---

## Color Gap: No Warning Token

**Finding (HIGH confidence):** The current OKLCH theme in `src/styles.css` has no amber/orange/yellow semantic token. The entire palette is indigo-based (hue ~252–266°). This makes it impossible to give `needs-input` a visually distinct "attention" color using semantic tokens alone.

**Options:**

| Option | Approach | Verdict |
|--------|----------|---------|
| A | Use `text-chart-1` (light periwinkle) for needs-input, `text-primary` for working | Confusing — both are blue |
| B | Use `text-destructive` for both needs-input and failed | Misleads — implies failure for needs-input |
| C | Add `--warning` CSS custom property to `src/styles.css` | **Recommended** — preserves semantic-token convention |
| D | Use Tailwind default `text-amber-500` directly in component | Works but breaks the semantic-token rule |

**Recommended: Option C** — Add the following to `src/styles.css`:

```css
/* In :root { } */
--warning: oklch(0.76 0.15 72);        /* amber, light mode */
--warning-foreground: oklch(0.3 0.08 60);

/* In .dark { } */
--warning: oklch(0.72 0.18 60);        /* amber, dark mode — slightly more saturated */
--warning-foreground: oklch(0.15 0.04 60);
```

And register in `@theme inline { }`:
```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

Then use `text-warning` in components. This is a one-time 6-line addition that unblocks a clear `needs-input` visual.

---

## Status Badge Design — Sidebar

### Visual Spec

The badge appears in the top-right corner of the agent avatar circle in `AgentChannelItem`. It is a small dot (8×8px `size-2`) with a colored ring to contrast against the avatar background.

```
Avatar circle (size-8, colored with accentColor)
  └── Status dot: absolute bottom-0 right-0
                  size-2 (8px)
                  rounded-full
                  ring-1 ring-sidebar (or ring-sidebar-primary when active)
                  colored per status
```

### Status → Visual Mapping

| AgentStatus | Dot Color Class | Lucide Icon | Label | Animation |
|-------------|-----------------|-------------|-------|-----------|
| `idle` | `bg-muted-foreground/50` | `Minus` (16px) | Idle | none |
| `working` | `bg-primary` | `Loader2` (16px) | Working | `animate-spin` on icon (not dot) |
| `needs-input` | `bg-warning` | `Bell` (16px) | Needs input | `animate-pulse` on dot |
| `failed` | `bg-destructive` | `AlertTriangle` (16px) | Failed | none |

The icon is NOT shown in the sidebar badge (too small). Only the colored dot indicator is used in the sidebar. Icons are used in task cards on the board.

**Active row conflict:** When `isActive`, the `AgentChannelItem` background is `bg-sidebar-primary`. The ring on the dot should switch to `ring-sidebar-primary` to avoid showing the ring color.

```tsx
// Dot positioning inside AgentChannelItem
<span className="relative ...">  {/* the avatar span already exists */}
  {/* existing initials */}
  <span
    className={cn(
      'absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-1',
      isActive ? 'ring-sidebar-primary' : 'ring-sidebar',
      status === 'idle' && 'bg-muted-foreground/50',
      status === 'working' && 'bg-primary',
      status === 'needs-input' && 'bg-warning animate-pulse',
      status === 'failed' && 'bg-destructive',
    )}
  />
</span>
```

---

## Task Board Layout Spec

### Section Order (matches BOARD-02, visual priority top-to-bottom)
1. Needs Input ← highest urgency, shown first
2. In Progress
3. Scheduled
4. Done
5. Failed ← least likely to be many; kept at bottom

### Section Headers

Each section has a header row:
```
[icon] Section Label   (count badge)
```

- Icon: 14px lucide icon, `text-muted-foreground`
- Label: `text-sm font-medium text-foreground`
- Count: `text-xs text-muted-foreground` in parentheses, e.g. `(2)`
- No visual separator between sections — vertical spacing (`gap-4` between sections, `gap-2` between cards) does the work

### Empty Section Behavior
**Hide empty sections entirely** — rationale: 5 sections with most empty creates a sparse, confusing board. An agent with only done tasks shouldn't have 4 empty placeholders. This matches how tools like Linear and GitHub Projects handle empty status groups.

Exception: show an empty "In Progress" section with a ghost card only if ALL sections would otherwise be empty (degenerate edge case; won't occur with pre-seeded data).

### Card Anatomy (BOARD-04)

```
┌──────────────────────────────────────────┐
│ [status-icon]  Task Title                │  ← icon 14px, title text-sm font-medium
│                Brief description here.  │  ← text-xs text-muted-foreground, line-clamp-2
│                                          │
│                             2 days ago   │  ← text-xs text-muted-foreground text-right
└──────────────────────────────────────────┘
```

- Container: `bg-card border border-border rounded-md px-3 py-2.5`
- Status icon: 14px, colored per status (see icon mapping above)
- Title: `text-sm font-medium text-foreground`
- Description: `text-xs text-muted-foreground line-clamp-2`
- Timestamp: `text-xs text-muted-foreground` — format with relative time (e.g. "2 days ago") using a simple helper; no heavy date library needed for static data

### Status Icon Mapping (for task cards)
| TaskStatus | Icon | Color |
|------------|------|-------|
| `scheduled` | `Clock` | `text-muted-foreground` |
| `in-progress` | `Loader2` | `text-primary` |
| `needs-input` | `Bell` | `text-warning` |
| `done` | `CheckCircle2` | `text-primary` (dimmed: `opacity-60`) |
| `failed` | `AlertTriangle` | `text-destructive` |

### Board Container Layout

```
TaskBoard outer: flex-1 overflow-y-auto px-6 py-5
  └── sections: flex flex-col gap-5
       └── per section: flex flex-col gap-2
            └── section header row
            └── task cards (gap-2 between)
```

---

## Component Inventory

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/workspace/tasks.ts` | `TaskStatus`, `AgentStatus`, `Task`, `AGENT_TASKS`, `deriveAgentStatus()` |
| `src/components/workspace/task-board.tsx` | `TaskBoard` component — renders all sections for an agent |
| `src/components/workspace/task-card.tsx` | `TaskCard` component — renders a single task card |

### Files to Modify

| File | Change |
|------|--------|
| `src/styles.css` | Add `--warning` and `--warning-foreground` tokens (`:root`, `.dark`, `@theme inline`) |
| `src/components/workspace/workspace-main.tsx` | Replace placeholder div with `<TaskBoard agent={activeAgent} />` |
| `src/components/workspace/agent-channel-item.tsx` | Import `deriveAgentStatus` + `AGENT_TASKS`, render status dot on avatar |

### No Changes Needed

| File | Reason |
|------|--------|
| `workspace-context.tsx` | Tasks are static; no context changes needed |
| `workspace-sidebar.tsx` | Badge is inside `AgentChannelItem`, sidebar itself needs no changes |
| `workspace-layout.tsx` | No new props to thread through |
| `agents.ts` | No changes; `Agent` type is complete as-is |

---

## Integration Architecture Decision

**Decision: Option B — Direct static import in `AgentChannelItem`**

```typescript
// Inside agent-channel-item.tsx
import { AGENT_TASKS, deriveAgentStatus } from './tasks'

// In component body (not JSX):
const status = deriveAgentStatus(AGENT_TASKS[agent.id] ?? [])
```

**Rationale:**
- Task data is static and read-only in Phase 4 — no state updates, no subscriptions needed
- Avoids adding props to `WorkspaceSidebarProps`, `WorkspaceLayout`, or `AgentChannelItemProps`
- No performance concern: `deriveAgentStatus` is a simple array scan, runs synchronously in < 0.1ms
- If Phase 5 makes tasks dynamic, this is the right seam to refactor into context at that point

**Option A (prop drilling) deferred** because it adds 3 component signatures with no benefit while tasks remain static.

---

## Architecture Patterns

### Grouping Tasks by Status

Use a `Map` (preserves insertion order) or sort into a predefined section order array:

```typescript
const SECTION_ORDER: Array<TaskStatus> = [
  'needs-input',
  'in-progress',
  'scheduled',
  'done',
  'failed',
]

// In TaskBoard component
const grouped = tasks.reduce<Partial<Record<TaskStatus, Array<Task>>>>((acc, task) => {
  const key = task.status
  acc[key] = acc[key] ? [...acc[key]!, task] : [task]
  return acc
}, {})

const sections = SECTION_ORDER
  .map(status => ({ status, tasks: grouped[status] ?? [] }))
  .filter(s => s.tasks.length > 0)
```

### Relative Timestamp Helper

No `date-fns` needed for static data. A simple helper suffices:

```typescript
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
```

---

## Common Pitfalls

### Pitfall 1: `isActive` dot ring color mismatch
**What goes wrong:** The avatar background changes to `bg-sidebar-primary` when active. If the dot ring is always `ring-sidebar`, it shows the default sidebar background color creating a visible ring gap of the wrong color.  
**Fix:** Conditionally apply `ring-sidebar-primary` when `isActive`.

### Pitfall 2: `animate-pulse` on `needs-input` dot conflicts with active row
**What goes wrong:** Pulsing creates a flicker against the `bg-sidebar-primary` active background.  
**Fix:** Conditionally disable `animate-pulse` when `isActive` — no need to pulse when you're already viewing the agent.

### Pitfall 3: `Loader2 animate-spin` in task cards — too aggressive
**What goes wrong:** Spinning icons in every `in-progress` task card create visual chaos.  
**Fix:** `animate-spin` on the sidebar dot is fine (one at a time, 8px). On task cards, use a static `Loader2` icon — no spin.

### Pitfall 4: `AGENT_TASKS[agent.id]` may be `undefined`
**What goes wrong:** TypeScript strict mode will flag `AGENT_TASKS[agent.id]` access on `Record<string, Array<Task>>`.  
**Fix:** Use `AGENT_TASKS[agent.id] ?? []` defensively; type `AGENT_TASKS` as `Record<string, Array<Task>>`.

### Pitfall 5: Hardcoded OKLCH colors in status dot
**What goes wrong:** Developer uses `bg-[oklch(0.76_0.15_72)]` instead of `bg-warning`.  
**Fix:** The `--warning` token must be added to `styles.css` first. Do this before writing component JSX.

---

## Open Questions

1. **`Loader2 animate-spin` on working dot in sidebar**
   - What we know: `Loader2` is the standard lucide-react spinner icon; `animate-spin` from Tailwind is available
   - What's unclear: Whether a spinning 8px dot looks right vs. just a static pulsing dot
   - Recommendation: Make the `working` dot static (no animation) and the `needs-input` dot animate-pulse. Animation on tiny elements is distracting.

2. **Section label naming convention**
   - "In Progress" vs "In progress" vs "IN PROGRESS" — all are plausible
   - Recommendation: Sentence case ("In progress", "Needs input") consistent with the rest of the UI's tab labels which use lowercase ("chat", "tasks").

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/components/workspace/agents.ts`, `workspace-main.tsx`, `agent-channel-item.tsx`, `workspace-sidebar.tsx`, `workspace-context.tsx`
- `src/styles.css` — confirmed token inventory: no amber/warning token exists

### Secondary (MEDIUM confidence)
- Lucide React icon names verified against [lucide.dev](https://lucide.dev): `Clock`, `Loader2`, `Bell`, `CheckCircle2`, `AlertTriangle` all confirmed present
- Tailwind CSS v4 `animate-pulse` and `animate-spin` confirmed as built-in utilities

---

## Metadata

**Confidence breakdown:**
- Task data types: HIGH — authored from scratch, no external dependency
- Mock task content: HIGH — grounded directly in AGENT_SYSTEM_PROMPTS text
- Color gap / warning token: HIGH — verified by reading styles.css; no amber token exists
- Status badge design: HIGH — follows existing patterns in agent-channel-item.tsx
- Task board layout: HIGH — standard UI pattern, no novel tech
- Integration approach: HIGH — direct module import for static data is unambiguous best practice

**Research date:** 2026-02-19  
**Valid until:** Stable — this is purely internal architecture with no external dependencies
