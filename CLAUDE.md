# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

| Variable | Font | Source |
|---|---|---|
| `--font-sans` | Inter Variable | `@fontsource-variable/inter` |

## Code Style

- Prettier: single quotes, no semicolons, avoid arrow parens
- Import order enforced by `@ianvs/prettier-plugin-sort-imports`
- File naming: kebab-case for files, PascalCase for component exports
