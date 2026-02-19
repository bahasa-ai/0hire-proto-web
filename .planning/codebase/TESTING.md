# Testing Patterns

**Analysis Date:** 2026-02-19

## Test Framework

**Runner:**
- Vitest ^3.0.5
- No config file present — Vitest runs with default settings inferred from `vite.config.ts`

**Assertion Library:**
- Vitest built-in (`expect`, `describe`, `it`, `test`)

**Component Testing:**
- `@testing-library/react` ^16.2.0
- `@testing-library/dom` ^10.4.0
- `jsdom` ^27.0.0 (DOM environment)

**Run Commands:**
```bash
bun run test       # Run all tests (vitest run)
```

No watch mode or coverage script is defined in `package.json`.

## Test File Organization

**Status:** No test files exist in the repository.

The testing infrastructure is installed (`vitest`, `@testing-library/react`, `jsdom`) but no test files have been written yet.

**Expected naming conventions (based on installed tooling):**
- Co-located: `src/components/ui/button.test.tsx` alongside `src/components/ui/button.tsx`
- Or in a `__tests__` directory: `src/__tests__/button.test.tsx`

**Expected structure:**
```
src/
├── components/
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx     # co-located unit tests
├── routes/
│   └── index.tsx
└── __tests__/                  # integration/page tests (if created)
```

## Test Structure

**Recommended suite pattern** (no existing tests to derive from):
```typescript
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

## Mocking

**Framework:** Vitest built-in (`vi.fn()`, `vi.mock()`, `vi.spyOn()`)

No mocking patterns are established — no existing tests or mock files found.

**What to mock when tests are added:**
- External HTTP calls (none currently, project has no backend)
- TanStack Router context when testing route components
- Browser APIs unavailable in jsdom (`ResizeObserver`, `matchMedia`)

**What NOT to mock:**
- `cn()` utility — it is pure and fast, test with real output
- `@base-ui/react` primitives — test rendered output, not the primitive internals
- React state — use `@testing-library/react` user interaction helpers

## Fixtures and Factories

No fixtures or test factories exist. When tests are added:

**Recommended location:** `src/__tests__/fixtures/` or co-located `*.fixtures.ts` files.

**Pattern to follow (based on codebase data patterns):**
```typescript
// src/__tests__/fixtures/button.ts
export const buttonProps = {
  default: { variant: 'default' as const, size: 'default' as const },
  destructive: { variant: 'destructive' as const },
}
```

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**View Coverage:**
```bash
bunx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Not yet written
- Intended scope: individual UI components in `src/components/ui/`
- Use `@testing-library/react` render + `screen` queries

**Integration Tests:**
- Not yet written
- Intended scope: route-level page components (`src/routes/index.tsx`)
- Would require wrapping with TanStack Router provider

**E2E Tests:**
- Not configured. No Playwright or Cypress dependency present.

## Environment

**jsdom** is available as the DOM implementation for unit/integration tests. Since no Vitest config file exists, tests will need to declare the environment via file-level docblock or a `vitest.config.ts` must be created:

```typescript
// vitest.config.ts (does not exist yet — create if needed)
import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [viteTsConfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

Without this config, `@testing-library/react` tests will fail because jsdom is not the default Vitest environment.

## Key Gap

The `bun run test` script runs `vitest run` but **no tests exist and no `vitest.config.ts` is present**. Before writing tests, a config file must be created to enable jsdom and path aliases (`@/*`). See the environment section above.

---

*Testing analysis: 2026-02-19*
