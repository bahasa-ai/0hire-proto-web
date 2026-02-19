# Codebase Concerns

**Analysis Date:** 2026-02-19

## Tech Debt

**Stale page title from starter template:**
- Issue: `<title>` is set to `'TanStack Start Starter'` — the scaffolded default
- Files: `src/routes/__root.tsx` (line 18)
- Why: Project bootstrapped from starter and not yet customized
- Impact: Wrong browser tab title; affects SEO and brand identity for any eventual deployment
- Fix approach: Update `head()` in `src/routes/__root.tsx` to `'0hire'` or appropriate product name

**Entire UI is a component scaffold, not product UI:**
- Issue: `src/routes/index.tsx` renders `ComponentExample` which is a shadcn component showcase — not hiring/recruiting UI
- Files: `src/routes/index.tsx`, `src/components/component-example.tsx`, `src/components/example.tsx`
- Why: Project is at prototype inception; no actual dashboard screens have been built yet
- Impact: No shippable product UI exists; the entire `src/components/example.tsx` and `src/components/component-example.tsx` are disposable scaffolding
- Fix approach: Build actual route/page components in `src/routes/` and `src/components/`; delete `component-example.tsx` and `example.tsx` once real screens exist

**`"use client"` directive in non-Next.js project:**
- Issue: Several files include `"use client"` at the top, which is a Next.js App Router directive and has no effect in TanStack Start
- Files: `src/components/ui/alert-dialog.tsx`, `src/components/ui/field.tsx`, `src/components/ui/separator.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/component-example.tsx`
- Why: shadcn components were generated with the `rsc: false` config flag in `components.json` but still emit the directive from the registry
- Impact: No runtime error, but the directives are noise/misleading in a TanStack Start codebase; could cause confusion when adding SSR logic
- Fix approach: Remove `"use client"` lines from all affected files; they are inert in this framework

**`shadcn` listed as a production dependency:**
- Issue: `shadcn` (the CLI scaffolding tool) is in `dependencies` instead of `devDependencies`
- Files: `package.json` (line 30)
- Why: Likely added automatically by `bunx shadcn@latest add` and not moved
- Impact: The CLI tool gets bundled/deployed unnecessarily; increases production footprint
- Fix approach: Move `shadcn` to `devDependencies` in `package.json`

**`nitro` pinned to `latest` version:**
- Issue: `"nitro": "latest"` in production dependencies uses a floating version reference
- Files: `package.json` (line 27)
- Why: Likely carried over from initial TanStack Start scaffold
- Impact: `bun install` in CI or a fresh clone may silently resolve to a different (potentially breaking) major version
- Fix approach: Pin to a specific semver (e.g., `"nitro": "^2.10.0"`) and commit `bun.lock` regularly

**Hardcoded external image URL in component scaffold:**
- Issue: `src/components/component-example.tsx` embeds a direct Unsplash CDN URL with embedded API credentials in query params
- Files: `src/components/component-example.tsx` (line 85)
- Why: Demo/showcase content copied from shadcn registry examples
- Impact: If Unsplash changes the URL, the image breaks silently; external dependency for a UI element
- Fix approach: Replace with a local asset in `public/` when building real UI; this file should be deleted when the scaffold is replaced

**Quote style inconsistency in routes:**
- Issue: `src/routes/index.tsx` uses double quotes for imports (e.g., `"@tanstack/react-router"`) while the rest of the codebase and Prettier config enforces single quotes
- Files: `src/routes/index.tsx` (all import lines)
- Why: Auto-generated or not run through Prettier after editing
- Impact: Style inconsistency; will cause Prettier diffs on every `bun run check`
- Fix approach: Run `bun run check` to auto-fix; this is enforced by `.prettierrc`

**Inconsistent React import style:**
- Issue: Most files use `import * as React from "react"` (namespace import) but `src/components/ui/field.tsx` uses named import `import { useMemo } from "react"`
- Files: `src/components/ui/field.tsx` (line 3) vs. `src/components/ui/combobox.tsx` (line 1) and others
- Why: Mixed coding style from shadcn registry generation
- Impact: Minor inconsistency; not a runtime issue but creates noise in code review
- Fix approach: Standardize on `import * as React from 'react'` across all UI components, or switch all to named imports

## Known Bugs

**Form has no submit handler:**
- Symptoms: Submitting the form in `FormExample` causes a full page reload (default browser behavior)
- Trigger: Click "Submit" button in the form card on the index page
- Files: `src/components/component-example.tsx` (line 431 — `<form>` with no `onSubmit`)
- Workaround: Prototype-only concern; no real data loss since all data is hardcoded state
- Root cause: Scaffolded form component was never wired to a submit handler
- Fix: Add `onSubmit` handler to the form element (or replace with a real form when building product UI)

**Loose equality check in error deduplication:**
- Symptoms: Error message count check uses `==` instead of `===`
- Trigger: Any rendering of `FieldError` component with errors array
- Files: `src/components/ui/field.tsx` (line 186: `uniqueErrors?.length == 1`)
- Workaround: Functionally works due to JavaScript coercion in this specific context (comparing number to number)
- Root cause: Minor style/linting issue from registry generation
- Fix: Replace `==` with `===`

## Security Considerations

**No authentication, authorization, or input validation:**
- Risk: Project is a prototype with zero backend security — no auth, no API endpoints, no server actions
- Current mitigation: No backend exists to attack; pure static UI
- Recommendations: Before connecting any real backend, establish auth using a provider (e.g., Clerk, Supabase Auth), add server-side input validation in TanStack Start server functions, and never expose raw database access to client components

**External image loaded from Unsplash CDN without integrity check:**
- Risk: The Unsplash URL in the card example contains API key-like query parameters (`ixlib`, `ixid`); if this pattern persists into product code, leaking internal API identifiers is possible
- Files: `src/components/component-example.tsx` (line 85)
- Current mitigation: The parameters are read-only CDN params, not secret credentials
- Recommendations: Use local/self-hosted images in production; avoid embedding third-party CDN URLs with tracking parameters in committed source code

## Performance Bottlenecks

**Extremely long single-line Tailwind class strings in UI components:**
- Problem: Several shadcn UI components have single `className` strings exceeding 500 characters on one line
- Files: `src/components/ui/combobox.tsx` (line 111), `src/components/ui/select.tsx` (line 84), `src/components/ui/dropdown-menu.tsx` (line 44), `src/components/ui/button.tsx` (line 7)
- Cause: Registry-generated shadcn components are not reformatted by Prettier for line length (Prettier does not wrap Tailwind class strings)
- Improvement path: No runtime impact; readability concern only. When modifying these components, extract variant maps using CVA or split into descriptive variables

**No lazy loading or code splitting configured:**
- Problem: Single route tree, all components loaded eagerly
- Files: `src/router.tsx`, `src/routes/index.tsx`
- Cause: Prototype with only one route; not yet a concern
- Improvement path: Use TanStack Router's `lazy()` for routes as more pages are added; TanStack Start handles code splitting automatically per route file

## Fragile Areas

**`src/routeTree.gen.ts` — auto-generated file committed to git:**
- Why fragile: This file is auto-generated by `@tanstack/router-plugin` during dev/build. It must stay in sync with the route files in `src/routes/`. Manual edits are overwritten. The file contains `@ts-nocheck` and is intentionally excluded from linting.
- Common failures: Adding a new route file without running `bun run dev` leaves `routeTree.gen.ts` stale, causing type errors and broken navigation
- Safe modification: Never edit directly; add routes as new files in `src/routes/` and run `bun run dev` to regenerate
- Test coverage: Not tested

**`src/components/example.tsx` — complex Tailwind selector targeting child slots:**
- Why fragile: Line 46 uses the selector `*:[div:not([class*='w-'])]:w-full` — a deeply nested Tailwind JIT arbitrary selector targeting children
- Files: `src/components/example.tsx` (line 46)
- Common failures: Adding a child component without a width class causes unexpected full-width behavior; selector behavior may change with Tailwind v5 upgrades
- Safe modification: When this component is replaced with real layout code, do not carry this pattern forward; use explicit width utilities on children instead
- Test coverage: Not tested

**Theme dark mode activation requires `.dark` class, not `prefers-color-scheme`:**
- Why fragile: `src/styles.css` defines dark mode using `@custom-variant dark (&:is(.dark *))` — the `.dark` class must be applied to a parent element manually
- Files: `src/styles.css` (line 6), `src/routes/__root.tsx`
- Common failures: No theme-switching logic exists; dark mode will never activate without adding `.dark` to `<html>` or `<body>` in `__root.tsx`; OS-level dark mode preference is currently ignored
- Safe modification: Add a `useTheme` hook or store that applies `.dark` to `<html>`; do not change the CSS variant selector without updating all dark mode class pairs

## Scaling Limits

**Single-route prototype:**
- Current capacity: One route (`/`), one component tree, all hardcoded state
- Limit: This architecture does not scale beyond the prototype; no data layer, no routing, no server functions
- Scaling path: Add routes in `src/routes/`, server functions via TanStack Start's `createServerFn`, and a data layer (e.g., Drizzle + SQLite/Postgres)

## Dependencies at Risk

**`@base-ui/react` at `^1.2.0` (pre-stable):**
- Risk: Base UI is still pre-1.0 stable by semantic standards; API surface changes between minor versions are common
- Impact: All 11 UI components in `src/components/ui/` are tightly coupled to Base UI primitives; breaking API changes require refactoring all component wrappers
- Migration plan: Pin to exact version during active development; subscribe to Base UI changelog; run `bun run lint` after upgrades to catch type errors early

**`@tanstack/react-start` at `^1.132.0`:**
- Risk: TanStack Start is in active development with frequent releases; minor version bumps occasionally contain breaking changes in SSR configuration and plugin API
- Impact: `vite.config.ts`, `src/router.tsx`, and `src/routeTree.gen.ts` are all framework-dependent
- Migration plan: Review TanStack Start changelogs before upgrading; test `bun run build` after version bumps

## Missing Critical Features

**No data layer:**
- Problem: All data is hardcoded in component state or inline constants in `src/components/component-example.tsx`
- Current workaround: Prototype uses fake static data (e.g., `frameworks`, `roleItems`)
- Blocks: Cannot build any real hiring dashboard functionality without a data source
- Implementation complexity: Medium — add TanStack Query + a backend (TanStack Start server functions + database)

**No routing structure for the application:**
- Problem: Only a single route (`/`) exists; a hiring dashboard requires multiple pages (candidates, jobs, pipeline, settings)
- Current workaround: Everything rendered in one component
- Blocks: Any multi-page product work
- Implementation complexity: Low — add route files in `src/routes/`; TanStack Router auto-generates the tree

**No theme toggle:**
- Problem: Dark mode CSS variables exist in `src/styles.css` but no mechanism exists to toggle them; `<html>` never receives the `.dark` class
- Current workaround: Dark mode is permanently disabled
- Blocks: Delivering dark mode support to users
- Implementation complexity: Low — add a `useTheme` hook that toggles `.dark` on `document.documentElement` and persists to `localStorage`

## Test Coverage Gaps

**Zero test coverage:**
- What's not tested: All UI components, routing, theme behavior, form state
- Risk: Any code change can break existing functionality without detection
- Priority: Low for prototype phase; High before shipping to users
- Difficulty to test: Vitest + `@testing-library/react` are already installed in `devDependencies`; no test files exist yet. Configuration requires a `vitest.config.ts` with `jsdom` environment. A `test` script is defined in `package.json` (`vitest run`) but no tests exist to run.

---

*Concerns audit: 2026-02-19*
*Update as issues are fixed or new ones discovered*
