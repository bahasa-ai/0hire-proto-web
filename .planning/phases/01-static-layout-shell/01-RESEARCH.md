# Phase 1: Static Layout Shell — Research

**Researched:** 2026-02-19  
**Domain:** TanStack Start, React 19, workspace UI architecture  
**Purpose:** What to know to plan Phase 1 well

---

## 1. Architecture Decision: Channel Switching

Three options for storing which agent channel is active:

| Approach | How it works | Pros | Cons |
|----------|--------------|-----|-----|
| **React state** | `useState(agentId)` in nearest common ancestor | Simple, no URL coupling, minimal code | No deep links, no back/forward, state lost on refresh |
| **URL search params** | `?agent=chief-of-staff` via TanStack Router `validateSearch` + `useSearch` | Deep links, shareable URLs, back/forward works | More setup, URL coupling from day one |
| **URL path params** | `/agent/chief-of-staff` via dynamic route segment | Clean URLs, true routing | Requires layout route restructure, more files |

**Recommendation for Phase 1: React state (`useState`)**

- Phase 1 success criteria do not require shareable URLs or back/forward.
- Keeping state in `WorkspaceLayout` is the simplest correct approach.
- Migration to URL state in Phase 2 is a small change: replace `useState` with `useSearch` + `navigate({ search })` in one file.

**Phase 2 migration path:** If URL state is needed later, use search params (`?agent=id`) first — no layout restructure. Switch to path params (`/agent/$agentId`) only if clean URLs are required.

---

## 2. Component Architecture

### Component hierarchy

```
src/routes/index.tsx                    (thin route wrapper)
└── WorkspaceLayout                     (owns state + data)
    ├── WorkspaceSidebar                (agents list)
    │   └── AgentChannelItem           (single clickable row)
    └── WorkspaceMain                  (right panel)
        └── ChannelHeader              (active agent header)
```

### Files to create / modify

| File | Export | Responsibility |
|------|--------|----------------|
| `src/components/workspace/agents.ts` | `AGENTS`, `Agent`, `DEFAULT_AGENT_ID`, `CURRENT_USER` | Hardcoded data, pure TS |
| `src/components/workspace/workspace-layout.tsx` | `WorkspaceLayout` | Owns `activeAgentId` state, composes sidebar + main |
| `src/components/workspace/workspace-sidebar.tsx` | `WorkspaceSidebar` | Props: `agents`, `activeId`, `onSelect` |
| `src/components/workspace/agent-channel-item.tsx` | `AgentChannelItem` | Props: `agent`, `isActive`, `onSelect` |
| `src/components/workspace/workspace-main.tsx` | `WorkspaceMain` | Props: `activeAgent` |
| `src/components/workspace/channel-header.tsx` | `ChannelHeader` | Props: `agent` |
| `src/routes/index.tsx` | (modified) | Render `<WorkspaceLayout />` instead of placeholder |

### Data flow

- `WorkspaceLayout` holds `activeAgentId` and derives `activeAgent` from `AGENTS`.
- Sidebar receives `agents`, `activeId`, `onSelect`; calls `onSelect(agent.id)` on click.
- Main receives `activeAgent`; passes it to `ChannelHeader`.
- No context, no global state — props only.

---

## 3. Sidebar Design Patterns

Best practices from Slack, Linear, Notion:

- **Persistent drawer:** Sidebar always visible on desktop; fixed width (e.g. 256px).
- **Clear active state:** Current channel must be visually distinct (background, text color).
- **Grouping:** Use section labels (e.g. "Agents") to structure items.
- **User identity footer:** Show current user at bottom; reinforces "who is using this."
- **Sticky + scroll:** Sidebar header and footer fixed; middle list scrolls independently.
- **Avoid:** No active indicator, too many items without grouping, hidden nav on desktop.

For Phase 1: 4 agents under an "Agents" label, user footer with initials + name + role. Use semantic sidebar tokens (`sidebar`, `sidebar-primary`, `sidebar-accent`, etc.).

---

## 4. Avatar Design

**Approach:** Initials in a circle with per-agent background color.

- No images or external libraries.
- Use `chart-2` through `chart-5` for agent avatars (semantic, distinct, good contrast).
- Text: `text-primary-foreground` (near-white) for contrast on chart backgrounds.

**Sizing:**

- Sidebar: `size-8` (32px)
- Channel header: `size-9` (36px)
- User footer: `size-7` (28px)

**Implementation:**

```tsx
<span
  className={cn(
    'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground',
    agent.accentColor  // e.g. 'bg-chart-4'
  )}
>
  {agent.initials}
</span>
```

Store `accentColor` as a Tailwind class string in the agent data (e.g. `'bg-chart-4'`).

---

## 5. Active State Styling

Use sidebar semantic tokens:

| State | Background | Text |
|-------|------------|------|
| Active | `bg-sidebar-primary` | `text-sidebar-primary-foreground` |
| Inactive hover | `bg-sidebar-accent` | `text-sidebar-accent-foreground` |
| Inactive default | (transparent) | `text-sidebar-foreground` |

**Implementation with `cn()`:**

```tsx
className={cn(
  'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
  isActive
    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
)}
```

Add `transition-colors` for smooth hover/active changes.

---

## 6. Layout Architecture

**Outer shell:** Full-viewport flex row

```tsx
<div className="flex min-h-svh bg-background">
  <WorkspaceSidebar ... />
  <WorkspaceMain ... />
</div>
```

**Sidebar:**

- `w-64` (256px), `h-svh`, `sticky top-0`
- `flex-col`: header → scrollable nav → user footer
- `border-r border-sidebar-border`
- Apply `dark` class on the sidebar `<aside>` only for dark sidebar on light page (if desired)

**Main panel:**

- `flex-1 flex-col min-w-0` — takes remaining width, prevents overflow
- `ChannelHeader` at top (`h-14`, `border-b`)
- Content area below (placeholder for Phase 1)

**Important:** `min-w-0` on the main panel prevents flex overflow when content is wide.

---

## 7. Hardcoded Data Structure

**Agent type:**

```typescript
export interface Agent {
  id: string
  name: string
  role: string
  description: string
  initials: string
  accentColor: string  // Tailwind class, e.g. 'bg-chart-4'
}
```

**Agents array:** Chief of Staff, Designer, Finance, Legal — each with `id`, `name`, `role`, `description`, `initials`, `accentColor`.

**Constants:**

```typescript
export const DEFAULT_AGENT_ID = 'chief-of-staff'

export const CURRENT_USER = {
  name: 'Alex Rivera',
  role: 'Business Owner',
  initials: 'AR',
}
```

Keep `agents.ts` as pure TypeScript — no JSX, no React imports.

---

## 8. TanStack Router Integration

**Phase 1:** No Router integration for channel state. Single route `/` renders `WorkspaceLayout`; state lives in React.

**Phase 2 (search params):** If moving to URL state:

1. Add `validateSearch` to the route:

```tsx
const searchSchema = z.object({
  agent: z.enum(['chief-of-staff', 'designer', 'finance', 'legal']).catch('chief-of-staff'),
})

export const Route = createFileRoute('/')({
  validateSearch: zodValidator(searchSchema),
  component: WorkspacePage,
})
```

2. Read with `Route.useSearch()`:

```tsx
const { agent } = Route.useSearch()
const activeAgent = AGENTS.find(a => a.id === agent) ?? AGENTS[0]
```

3. Update with `useNavigate`:

```tsx
const navigate = useNavigate()
// On agent click:
navigate({ search: (prev) => ({ ...prev, agent: agentId }) })
```

**Phase 2 (path params):** Use `src/routes/agent.$agentId.tsx` and a layout route for `/agent/:agentId`. Requires moving sidebar into a layout component.

---

## 9. Design Direction Recommendation

**Domain:** Hiring/recruiting AI workspace — Slack-like channels, each channel is an agent.

**Aesthetic:** Professional, modern, premium — not playful. Dark theme with subtle depth. Productivity tool feel (Linear, Notion, refined Slack).

**Specific choices:**

- **Depth:** Borders-only for structure — no heavy shadows.
- **Sidebar:** Dark (`sidebar` tokens) for contrast; main panel uses `background` / `foreground`.
- **Typography:** Inter Variable (existing); keep hierarchy clear (semibold for names, muted for roles).
- **Color:** Chart tokens for avatar accents; one primary accent for actions.
- **Spacing:** Consistent base unit; `h-14` for headers, `px-2 py-2` for sidebar rows.
- **Motion:** `transition-colors` for hover/active; no bouncy animations.

**Avoid:** Harsh borders, multiple accent colors, decorative gradients, playful tone.

---

## RESEARCH COMPLETE
