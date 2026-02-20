# Plan 01: Floating Sidebar Visual Treatment

**Phase:** 7 — Floating Sidebar Redesign
**Goal:** Give the sidebar a modern floating appearance — rounded corners, inset padding, and visual separation from the main content area.

---

## Context

The sidebar currently spans the full viewport height (`h-svh`) and is flush to all edges with a `border-r` right border. The redesign wraps it in a padded layout container with a distinct trough background color so the sidebar visually floats above the page.

**Files to change:** 2

**Why a trough color is needed:** In light mode, `--background` is `oklch(1 0 0)` (pure white) and `--sidebar` is `oklch(0.985 ...)` (near-white). Adding padding without a distinct trough color produces no visible separation. Using `bg-muted` (`oklch(0.967 ...)`) on the wrapper creates a subtly darker channel behind the floating sidebar, making separation visible in both light and dark mode.

---

## Tasks

### Task 1 — Update root layout container

**File:** `src/routes/__root.tsx`

In `RootComponent`, update the outer `div` class.

**Current class:**

```
bg-background animate-in fade-in flex h-svh overflow-hidden duration-300
```

**New class:**

```
bg-muted animate-in fade-in flex h-svh overflow-hidden p-3 gap-3 duration-300
```

Changes:

- `bg-background` → `bg-muted` — creates a distinct trough background behind the floating sidebar
- Add `p-3` — 12px inset from all viewport edges
- Add `gap-3` — 12px gap between sidebar and main panel

**Done when:** The root wrapper shows a muted background visible around and between the sidebar and main panel.

---

### Task 2 — Update sidebar `<aside>` classes

**File:** `src/components/workspace/workspace-sidebar.tsx`

In `WorkspaceSidebar`, update the `<aside>` element class.

**Current class:**

```
border-sidebar-border bg-sidebar flex h-svh w-60 shrink-0 flex-col border-r
```

**New class:**

```
bg-sidebar border-sidebar-border flex h-full w-60 shrink-0 flex-col overflow-hidden rounded-xl border shadow-md
```

Changes:

- `h-svh` → `h-full` — fills the padded layout area (parent is `h-svh p-3`, flex stretch fills remaining height)
- Remove `border-r` — replaced with full perimeter `border` since the sidebar is now floating
- Add `rounded-xl` — rounded corners on all sides
- Add `overflow-hidden` — clips child content (header button hover, nav items) to the rounded corners
- `shadow-sm` → `shadow-md` — more prominent drop shadow for clear visual elevation against the trough

**Done when:** Sidebar has visible rounded corners on all four sides, does not touch any viewport edge, and has a perceptible drop shadow.

---

## Verification

Run `bun run dev` and confirm all 5 success criteria:

1. **Sidebar has visible padding/margin from all viewport edges** — muted trough visible on all 4 sides of the sidebar (top, bottom, left, right)
2. **Sidebar container has rounded corners on all sides** — no sharp corners visible at any edge
3. **Sidebar visually appears elevated/detached** — `shadow-md` + `border` + muted trough creates clear depth in light mode; dark mode shows the sidebar as distinctly lighter than the darker muted background
4. **No sidebar functionality is broken** — click each agent, switch conversations, check status badges, test keyboard arrow-key navigation, confirm new chat button works
5. **Design works in both light and dark mode** — toggle dark mode (open DevTools → Elements → add `.dark` class to `<html>`), confirm sidebar still appears floating and separated in both modes

**Fallback if shadow is still insufficient:** Increase to `shadow-lg` or add `ring-1 ring-sidebar-border/50` alongside `shadow-md` for additional definition.
