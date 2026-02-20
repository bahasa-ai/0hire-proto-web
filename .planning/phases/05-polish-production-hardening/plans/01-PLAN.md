# Phase 5 Plan: Polish + Production Hardening

**Phase goal:** The workspace is demo-ready — smooth UX, resilient error handling, accessible, and bundle-clean.

**Depends on:** Phase 4 complete ✅

---

## Pre-flight: What's Already Done

Several Phase 5 success criteria were completed in earlier phases:

| Criterion                                                         | Status  | Where                    |
| ----------------------------------------------------------------- | ------- | ------------------------ |
| Thinking indicator appears immediately, disappears on first token | ✅ Done | `chat-view.tsx` Phase 3  |
| Hung streams time out after 10s with retry button                 | ✅ Done | `chat-view.tsx` Phase 3  |
| Empty agent channels show discovery cards                         | ✅ Done | `empty-chat.tsx` Phase 2 |
| API key never in browser bundle                                   | ✅ Done | `server/chat.ts` Phase 3 |

**Remaining work:** scroll preservation, auto-focus, keyboard navigation, page title, devtools guard, workspace animation, code quality.

---

## Tasks

### T01 — Always-mount agent panels (scroll + state preservation)

**File:** `src/components/workspace/workspace-main.tsx`

**Problem:** `ChatView` is conditionally rendered based on `activeAgent`. Switching agents creates a new `StickToBottom` scroll container, resetting scroll position.

**Fix:** Render all 4 agent panels simultaneously. Show only the active panel via CSS. Each agent's `StickToBottom` instance stays mounted, preserving its scroll position naturally.

**Also:** Move `activeTab` from a single `'chat' | 'tasks'` to `Record<string, 'chat' | 'tasks'>` so each agent preserves its own Chat/Tasks selection.

```tsx
// Before
const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')
// ...conditionally renders single ChatView or TaskBoard

// After
const [activeTabs, setActiveTabs] = useState<Record<string, 'chat' | 'tasks'>>(
  {},
)

// Render all agents, hide inactive with `hidden` class
{
  AGENTS.map(agent => {
    const tab = activeTabs[agent.id] ?? 'chat'
    const isActive = agent.id === activeAgent.id
    return (
      <div
        key={agent.id}
        className={cn('flex min-h-0 flex-1 flex-col', !isActive && 'hidden')}
      >
        {/* tab bar + ChatView/TaskBoard */}
      </div>
    )
  })
}
```

**Side effect:** Since each ChatView is permanently mounted with its own fixed `agent` prop, the `useEffect(() => { abortCurrentStream() }, [agent.id])` in `chat-view.tsx` never fires. Remove that effect — streams complete naturally in the background when switching agents (acceptable for MVP).

**Files changed:** `workspace-main.tsx`, `chat-view.tsx`

---

### T02 — Auto-focus textarea on channel switch

**File:** `src/components/workspace/chat-view.tsx`

**Problem:** Switching agents leaves focus on the sidebar button — the user must click or Tab to start typing.

**Fix:** Add `isActive: boolean` prop to `ChatView`. When `isActive` becomes `true`, focus the textarea via a DOM query on the `PromptInput` wrapper ref.

```tsx
// ChatView receives isActive prop
interface ChatViewProps {
  agent: Agent
  isActive: boolean
}

// Ref on the PromptInput wrapper div
const promptContainerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!isActive) return
  // Short delay to allow CSS visibility to apply before focus
  const id = setTimeout(() => {
    promptContainerRef.current?.querySelector('textarea')?.focus()
  }, 50)
  return () => clearTimeout(id)
}, [isActive])

// Attach ref to outer wrapper div in return JSX
<div ref={promptContainerRef} className={cn(error ? 'pt-2' : 'pt-3')}>
  <PromptInput ...>
```

**Files changed:** `chat-view.tsx`, `workspace-main.tsx` (pass `isActive` prop)

---

### T03 — Sidebar arrow key navigation

**File:** `src/components/workspace/workspace-sidebar.tsx`

**Problem:** Users can Tab to agent buttons but cannot navigate between them with arrow keys (WCAG 2.1 Pattern: Navigation with arrow keys for list/menu composites).

**Fix:** Add `role="listbox"` to `<nav>` and `onKeyDown` that handles `ArrowUp`/`ArrowDown` to move focus between agent `<button>` elements.

```tsx
const handleNavKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  e.preventDefault()
  const buttons = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement>(
      'button[data-agent-item]',
    ),
  )
  const focused = document.activeElement
  const idx = buttons.indexOf(focused as HTMLButtonElement)
  if (idx === -1) return
  const next =
    e.key === 'ArrowDown'
      ? (idx + 1) % buttons.length
      : (idx - 1 + buttons.length) % buttons.length
  buttons[next]?.focus()
}
```

Add `data-agent-item` attribute to the `<button>` in `AgentChannelItem`.

**Files changed:** `workspace-sidebar.tsx`, `agent-channel-item.tsx`

---

### T04 — Update page title and remove devtools from production

**File:** `src/routes/__root.tsx`

**Two changes in one file:**

1. **Page title:** Change `'TanStack Start Starter'` → `'Zero Hire'`. Add a meta description.

2. **Devtools guard:** Wrap `TanStackDevtools` render in a dev-only check so it is tree-shaken from production bundles.

```tsx
// Title update
{ title: 'Zero Hire' },
{ name: 'description', content: 'Your AI team workspace' },

// Devtools guard
{import.meta.env.DEV && (
  <TanStackDevtools ... />
)}
```

**Files changed:** `src/routes/__root.tsx`

---

### T05 — Workspace entry animation

**File:** `src/components/workspace/workspace-layout.tsx`

Add a subtle `animate-in fade-in duration-300` Tailwind class to the outermost workspace div for a smooth initial mount.

```tsx
<div className="bg-background flex min-h-svh animate-in fade-in duration-300">
```

**Note:** The project uses `tw-animate-css` (imported in `styles.css` as `@import 'tw-animate-css'`), which provides identical `animate-in`/`fade-in` utilities. Already active — no extra config needed.

**Files changed:** `workspace-layout.tsx`

---

### T06 — Code quality: `bun run check` clean pass

Run `bun run check` and fix any format/lint errors introduced across all phases.

```bash
bun run check
```

Common issues to look for:

- Unused imports in workspace components
- Missing `type` keyword on type-only imports
- Trailing whitespace / semicolons added by quick edits
- Import ordering violations

**Files changed:** as needed across `src/`

---

### T07 — Bundle audit

After a clean production build, verify no secrets are in `dist/`:

```bash
bun run build
grep -r "GOOGLE" dist/   # should return zero matches
grep -r "AIza" dist/     # Google API key prefix
```

This is a verification step, not a code change. Document result in the phase SUMMARY.

---

## Execution Order

```
T01 (always-mount) → T02 (auto-focus, depends on isActive prop) → T03 (keyboard nav) → T04 (title + devtools) → T05 (animation) → T06 (bun check) → T07 (bundle audit)
```

T01–T05 can be executed in one pass since they touch different files (except T02 depends on T01 for the `isActive` prop).

---

## Files Touched

| File                                              | Tasks    |
| ------------------------------------------------- | -------- |
| `src/components/workspace/workspace-main.tsx`     | T01, T02 |
| `src/components/workspace/chat-view.tsx`          | T01, T02 |
| `src/components/workspace/workspace-sidebar.tsx`  | T03      |
| `src/components/workspace/agent-channel-item.tsx` | T03      |
| `src/routes/__root.tsx`                           | T04      |
| `src/components/workspace/workspace-layout.tsx`   | T05      |
| Various `src/` files                              | T06      |

---

## Success Criteria Mapping

| Criterion                                                | Covered by   |
| -------------------------------------------------------- | ------------ |
| 1. Thinking indicator appears immediately → first token  | ✅ Pre-done  |
| 2. Hung streams timeout after 10s with retry button      | ✅ Pre-done  |
| 3. Each agent preserves scroll position on switch        | T01          |
| 4. Empty channels show discovery cards, not blank screen | ✅ Pre-done  |
| 5. `grep -r "ANTHROPIC" dist/` returns zero matches      | T07 (verify) |

All 5 criteria satisfied after execution.
