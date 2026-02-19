# Technology Stack

**Analysis Date:** 2026-02-19

## Languages

**Primary:**
- TypeScript 5.7 - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- JavaScript - Config files (`eslint.config.js`)
- CSS - Global styles and theme tokens (`src/styles.css`)

## Runtime

**Environment:**
- Bun 1.3.9 - Primary runtime and package manager

**Package Manager:**
- Bun 1.3.9 (`bun` — never `npm`/`yarn`/`pnpm`)
- Lockfile: `bun.lock` present

## Frameworks

**Core:**
- React 19.2 - UI rendering
- TanStack Start 1.132 - Full-stack React meta-framework (SSR, file-based routing)
- TanStack Router 1.132 - Type-safe file-based routing (`src/routes/`)
- Nitro (latest) - Server engine powering TanStack Start

**Testing:**
- Vitest 3.0 - Unit test runner (`bun run test`)
- @testing-library/react 16.2 - React component testing utilities
- jsdom 27 - Browser environment simulation for tests

**Build/Dev:**
- Vite 7.1 - Dev server and bundler
- @tanstack/router-plugin 1.132 - Route tree generation (`src/routeTree.gen.ts`)
- @tailwindcss/vite 4.0 - Tailwind CSS integration via Vite plugin
- vite-tsconfig-paths 5.1 - Path alias resolution (`@/*` → `src/*`)
- TypeScript 5.7 - Type checking (strict mode, no emit)

## Key Dependencies

**Critical:**
- `@base-ui/react` ^1.2 - Headless UI primitives wrapped by shadcn components (`@base-ui/react/button`, `@base-ui/react/menu`, `@base-ui/react/select`, etc.)
- `tailwindcss` ^4.0 - Utility-first CSS (v4, configured via `src/styles.css` `@import`)
- `class-variance-authority` ^0.7 - Component variant definitions using CVA
- `clsx` + `tailwind-merge` - Class merging via `cn()` helper in `src/lib/utils.ts`
- `lucide-react` ^0.574 - Icon library (sole icon source)

**Infrastructure:**
- `@fontsource-variable/inter` ^5.2 - Inter variable font (self-hosted)
- `tw-animate-css` ^1.4 - Tailwind-compatible animation utilities
- `shadcn` ^3.8 - CLI tool for adding components (`bunx shadcn@latest add <component>`)

## Configuration

**Environment:**
- `.env` files gitignored; no env vars required for UI-only prototype
- No backend services or API keys needed at this stage

**Build:**
- `vite.config.ts` - Vite plugins: devtools, nitro, viteTsConfigPaths, tailwindcss, tanstackStart, viteReact
- `tsconfig.json` - TypeScript strict mode, ES2022 target, bundler module resolution, `@/*` path alias
- `.prettierrc` - Single quotes, no semicolons, no arrow parens, import sort, Tailwind class sort
- `eslint.config.js` - Extends `@tanstack/eslint-config`
- `components.json` - shadcn config: `base-nova` style, `gray` base color, CSS variables enabled

## Platform Requirements

**Development:**
- macOS/Linux/Windows with Bun 1.3+ installed
- Run `bun install` then `bun run dev` (serves on port 3000)

**Production:**
- TanStack Start with Nitro supports deployment to Vercel, Netlify, Cloudflare Workers, Node.js
- No deployment target configured yet (prototype stage)
- Build output: `bun run build`

---

*Stack analysis: 2026-02-19*
*Update after major dependency changes*
