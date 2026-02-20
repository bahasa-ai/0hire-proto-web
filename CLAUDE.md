# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Lookup

- **TanStack (Router, Start, Query, Table, Form):** Use `mcp__tanstack__tanstack_search_docs` or `mcp__tanstack__tanstack_doc` — prefer this over context7 for anything TanStack-related
- **All other libraries:** Use `mcp__context7__resolve-library-id` first, then `mcp__context7__query-docs`

## UI Component Generation (Magic MCP)

Use the `user-Magic MCP` server for generating and refining UI components:

- **New component:** `21st_magic_component_builder` — triggered by `/ui`, `/21`, `/21st`, or any request for a button, input, dialog, card, form, etc. Returns a snippet; integrate it into the codebase after.
- **Refine/redesign:** `21st_magic_component_refiner` — use when asked to improve or redesign an existing React component or molecule (not full pages).
- **Logo search:** `logo_search` — find brand/company logos.
- **Inspiration:** `21st_magic_component_inspiration` — browse component inspiration from 21st.dev.

---

## Project Overview

0hire prototype — a hiring/recruiting dashboard UI. Currently a UI mockup (no backend, all data is hardcoded).

## Tech Stack

- **Framework:** TanStack Start + React 19 + TypeScript (strict)
- **Routing:** TanStack Router (file-based routes in `src/routes/`)
- **Styling:** Tailwind CSS v4 (OKLCH theme tokens in `src/styles.css`)
- **Components:** shadcn `base-nova` style wrapping `@base-ui/react` primitives
- **Icons:** `lucide-react`
- **Package manager:** Bun — always use `bun` instead of `npm`/`yarn`/`pnpm`
- **UI components:** shadcn — always use `bunx shadcn@latest add <component>` to add new components

## Commands

```bash
bun run dev      # Dev server (port 3000)
bun run build    # Production build
bun run lint     # ESLint
bun run check    # Format + lint fix
bun install      # Install dependencies (never npm install)
bunx shadcn@latest add <component>   # Add shadcn component
```

No test framework is configured.

## Path Aliases

`@/*` maps to `src/` (e.g., `@/components/ui/button`, `@/lib/utils`).

## Architecture

- `src/routes/__root.tsx` — Root layout
- `src/routes/index.tsx` — Main page
- `src/components/ui/` — shadcn Base UI components
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/styles.css` — Global styles, Tailwind imports, and OKLCH theme tokens

## Component Conventions

- shadcn `base-nova` style — components wrap `@base-ui/react` primitives with Tailwind styling
- Use `cn()` from `@/lib/utils` for conditional class merging
- Use `class-variance-authority` (CVA) for component variants
- Add new shadcn components via: `bunx shadcn@latest add <component>`

## Styling

- **Always use semantic color tokens** — never use hardcoded hex/rgb/oklch values in components. All colors are defined as CSS custom properties in `src/styles.css` with light and dark mode variants.
- Available semantic colors (use as Tailwind classes like `bg-primary`, `text-muted-foreground`, `border-border`):
  - `background` / `foreground` — page base
  - `card` / `card-foreground` — card surfaces
  - `popover` / `popover-foreground` — popover/dropdown surfaces
  - `primary` / `primary-foreground` — primary actions and emphasis
  - `secondary` / `secondary-foreground` — secondary actions
  - `muted` / `muted-foreground` — subdued backgrounds and text
  - `accent` / `accent-foreground` — hover/focus highlights
  - `destructive` — destructive actions
  - `border`, `input`, `ring` — borders, inputs, focus rings
  - `chart-1` through `chart-5` — data visualization
  - `sidebar-*` variants — sidebar-specific tokens
- Border radius base: `--radius: 0.625rem` (use `rounded-sm`, `rounded-md`, `rounded-lg`, etc.)
- Prettier enforces Tailwind class sorting and import ordering (see `.prettierrc`)

## Fonts

| Variable      | Font           | Source                       |
| ------------- | -------------- | ---------------------------- |
| `--font-sans` | Inter Variable | `@fontsource-variable/inter` |

## GSD + Design Skills

When executing or planning any GSD phase that touches UI or frontend files, automatically invoke the following skills as part of the workflow:

- `frontend-design` — for component and page-level design quality
- `interface-design` — for design system consistency (spacing, depth, color, patterns)
- `vercel-react-best-practices` — for React/TanStack performance patterns
- `web-design-guidelines` — for accessibility and UX compliance

Apply these proactively during `gsd:plan-phase`, `gsd:execute-phase`, `gsd:verify-work`, and any task that writes or modifies `.tsx`, `.ts`, or `.css` files under `src/`.

---

## Code Style

- Prettier: single quotes, no semicolons, avoid arrow parens
- Import order enforced by `@ianvs/prettier-plugin-sort-imports`
- File naming: kebab-case for files, PascalCase for component exports
