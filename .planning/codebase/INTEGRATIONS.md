# External Integrations

**Analysis Date:** 2026-02-19

## APIs & External Services

None. This is a UI-only prototype with all data hardcoded. No external API calls exist in the codebase.

## Data Storage

**Databases:**
- None. No database client, ORM, or connection configuration present.

**File Storage:**
- None. No file storage service integrated.

**Caching:**
- None.

## Authentication & Identity

**Auth Provider:**
- None. No authentication system implemented. The prototype has no login, sessions, or protected routes.

## Monitoring & Observability

**Error Tracking:**
- None.

**Analytics:**
- None.

**Logs:**
- Browser console only (no logging library).

## CI/CD & Deployment

**Hosting:**
- Not configured. TanStack Start + Nitro supports Vercel, Netlify, Cloudflare Workers, and Node.js, but no deployment target is set.

**CI Pipeline:**
- None. No `.github/workflows/` directory present.

## Environment Configuration

**Development:**
- No required env vars. The app runs with `bun run dev` without any environment configuration.
- No `.env` files present (they are gitignored but none created).

**Staging:**
- Not applicable (no staging environment configured).

**Production:**
- Not applicable (no production deployment configured).

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

## Notes

This is a prototype-stage UI mockup. When backend services are added, expect to integrate:
- An auth provider (e.g., Supabase Auth, Clerk)
- A database (e.g., Supabase PostgreSQL, PlanetScale)
- Deployment hosting (Vercel is the natural fit for TanStack Start)

TanStack Router SSR Query (`@tanstack/react-router-ssr-query`) is already installed as a dependency, indicating server data fetching patterns are planned.

---

*Integration audit: 2026-02-19*
*Update when adding/removing external services*
