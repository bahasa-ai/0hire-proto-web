# Architecture

**Analysis Date:** 2026-02-19

## Pattern Overview

**Overall:** Component-driven SPA with SSR via TanStack Start

**Key Characteristics:**
- File-based routing: route files in `src/routes/` map directly to URL paths
- No backend or API layer — all data is hardcoded in component files (UI mockup stage)
- Three-tier component model: primitives (`@base-ui/react`) → styled wrappers (`src/components/ui/`) → page-level feature components (`src/components/`)
- SSR registration is declared in `src/routeTree.gen.ts` via the `@tanstack/react-start` `Register` interface; router is instantiated in `src/router.tsx`

## Layers

**Route Layer:**
- Purpose: Define URL paths and render top-level page components
- Location: `src/routes/`
- Contains: One file per route; exports a `Route` constant created with `createFileRoute`
- Depends on: Feature components from `src/components/`
- Used by: TanStack Router (auto-discovered via code generation)

**Root Shell:**
- Purpose: Provides the HTML document wrapper, stylesheet injection, and devtools panels
- Location: `src/routes/__root.tsx`
- Contains: `createRootRoute` with `head()` config and `RootDocument` shell component
- Depends on: `src/styles.css` (imported as URL for `<link>` injection)
- Used by: All routes as the implicit parent

**Feature Components:**
- Purpose: Page-level UI compositions assembled from UI primitives
- Location: `src/components/` (non-`ui/` files)
- Contains: `component-example.tsx` (demo showcase), `example.tsx` (layout scaffold)
- Depends on: `src/components/ui/`, `src/lib/utils`
- Used by: Route components

**UI Primitive Wrappers:**
- Purpose: Design-system components — thin Tailwind-styled wrappers around `@base-ui/react` primitives using CVA for variants
- Location: `src/components/ui/`
- Contains: `button`, `card`, `badge`, `input`, `textarea`, `select`, `combobox`, `dropdown-menu`, `alert-dialog`, `field`, `label`, `separator`, `input-group`
- Depends on: `@base-ui/react`, `class-variance-authority`, `src/lib/utils`
- Used by: Feature components; components may compose other UI primitives (e.g., `alert-dialog` uses `button`, `field` uses `label` and `separator`)

**Utilities:**
- Purpose: Shared helpers consumed across all component layers
- Location: `src/lib/`
- Contains: `utils.ts` — exports `cn()` (clsx + tailwind-merge)
- Depends on: `clsx`, `tailwind-merge`
- Used by: Every component that constructs conditional class strings

**Styles:**
- Purpose: Global CSS, Tailwind v4 config, OKLCH design tokens, font imports
- Location: `src/styles.css`
- Contains: CSS custom properties for all semantic color tokens (light + dark), radius scale, font variable, Tailwind `@theme inline` block
- Depends on: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`, `@fontsource-variable/inter`
- Used by: `src/routes/__root.tsx` (injected as `<link>` stylesheet)

## Data Flow

**Page Render:**
1. TanStack Router matches URL to route file in `src/routes/`
2. Route component renders, importing feature components from `src/components/`
3. Feature components compose UI primitives from `src/components/ui/`
4. UI primitives apply Tailwind classes via `cn()` from `src/lib/utils`
5. CSS tokens defined in `src/styles.css` resolve color and spacing values at paint time

**State Management:**
- Local React `useState` only — no global store, no context providers, no TanStack Query
- All data is hardcoded inline in component files (prototype stage)

## Key Abstractions

**shadcn `base-nova` UI Component:**
- Purpose: Reusable, themeable UI element that wraps a `@base-ui/react` primitive
- Examples: `src/components/ui/button.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/select.tsx`
- Pattern: Import primitive namespace, define CVA variants or plain Tailwind class string, export named function components with `data-slot` attribute for CSS targeting

**`cn()` Utility:**
- Purpose: Merge conditional Tailwind class lists safely (resolves Tailwind conflicts)
- Location: `src/lib/utils.ts`
- Pattern: `cn(staticClasses, conditionalClasses, className)` — always pass `className` prop last so consumers can override

**`data-slot` Attribute Convention:**
- Purpose: CSS hooks for parent-child styling relationships without JS
- Pattern: Every UI component sets `data-slot="component-name"` on its root element; parent components target `*:data-[slot=...]` or `has-data-[slot=...]` Tailwind selectors

**Route Definition:**
- Purpose: Declare a page and its component
- Pattern:
  ```typescript
  export const Route = createFileRoute('/')({ component: PageComponent })
  function PageComponent() { return <FeatureComponent /> }
  ```

## Entry Points

**Root Route Shell:**
- Location: `src/routes/__root.tsx`
- Triggers: Every page load — wraps all routes
- Responsibilities: HTML skeleton, stylesheet link injection, TanStack devtools mounting

**Index Route:**
- Location: `src/routes/index.tsx`
- Triggers: Request to `/`
- Responsibilities: Renders `<ComponentExample />` — the current UI mockup

**Router Factory:**
- Location: `src/router.tsx`
- Triggers: SSR bootstrap and client hydration
- Responsibilities: Creates router instance from the generated `routeTree`, configures `scrollRestoration` and `defaultPreloadStaleTime`

**Generated Route Tree:**
- Location: `src/routeTree.gen.ts`
- Triggers: Auto-generated by `@tanstack/router-plugin` on file save / build
- Responsibilities: Type-safe route manifest; registers SSR mode via `@tanstack/react-start` module augmentation

## Error Handling

**Strategy:** None implemented — prototype stage with no async data fetching or error boundaries.

**Patterns:**
- No `errorComponent` defined on any route
- No try/catch in component code
- TypeScript strict mode catches type errors at compile time

## Cross-Cutting Concerns

**Logging:** None — no logging utility present.
**Validation:** None — form inputs use native HTML `required` attribute only; no schema validation library.
**Authentication:** Not applicable — UI mockup with no auth layer.
**Dark Mode:** Class-based via `.dark` selector — defined in `src/styles.css` with `@custom-variant dark (&:is(.dark *))`. No toggle mechanism implemented yet.

---

*Architecture analysis: 2026-02-19*
