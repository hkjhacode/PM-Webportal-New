# Traceability Matrix — HierarchyFlow (SRS -> Implementation)

This document maps SRS requirements to code artifacts to maintain traceability.

## Functional Requirements

- FR-01 (Authentication: Login/JWT)
  - API: `src/app/api/auth/route.ts` (POST login)
  - Helpers: `src/lib/auth.ts`
  - Model: `src/models/user.ts`
  - UI: `src/hooks/use-auth.tsx`

- FR-02 (RBAC enforcement)
  - Helpers: `src/lib/auth.ts` (`authenticateRequest`, `requireRoles`), `src/lib/roles.ts`
  - Usage: All protected API routes (workflows/templates/forms/merge/notifications)

- FR-03 (Logout/Blacklist/Refresh)
  - API: `src/app/api/auth/route.ts` (POST logout, refresh stub)
  - Helpers: `src/lib/auth.ts` (`blacklistToken`)

- FR-04 (Create Request)
  - API: `src/app/api/workflows/route.ts` (POST)
  - Model: `src/models/request.ts`
  - Validation: `src/lib/validation.ts` (`CreateRequestSchema`)

- FR-05 (Propagation on approval)
  - API: `src/app/api/workflows/route.ts` (PATCH approve/reject)
  - Model: `src/models/request.ts` (history/status)

- FR-06 (Role views/filters)
  - API: `src/app/api/workflows/route.ts` (GET with filters)

- FR-07 (Approval notes & rejection alerts)
  - API: `src/app/api/workflows/route.ts` (PATCH)

- FR-08 (Form submission with templates)
  - API: `src/app/api/forms/route.ts`
  - Models: `src/models/form.ts`, `src/models/template.ts`
  - Validator: `src/lib/templateEngine.ts`

- FR-09 (Custom template creation)
  - API: `src/app/api/templates/route.ts` (POST)

- FR-10 (Document generation)
  - API: `src/app/api/docs/route.ts`
  - Helper: `src/lib/docGen.ts`
  - Model: `src/models/doc.ts`

- FR-11 (Merge/Consolidation)
  - API: `src/app/api/merge/route.ts`
  - Helper: `src/lib/mergeEngine.ts`

- FR-12, FR-13, FR-14 (Deadlines/Alerts/Escalation)
  - API: `src/app/api/notifications/route.ts`
  - Helper: `src/lib/notifications.ts`

- FR-15, FR-16 (AI features)
  - API: `src/app/api/ai/route.ts` (Gemini integration via `GEMINI_API_KEY`)
  - Helpers: RBAC via `src/lib/auth.ts` (`authenticateRequest`, `requireRoles`)
  - Status: Implemented — GET/POST support with external call to Gemini 1.5

- FR-17, FR-18 (Dashboards & Exports)
  - API: `src/app/api/analytics/route.ts`
  - UI: `src/components/dashboard/*`

## Non-Functional Requirements

- Performance & SSR: Next.js App Router (`src/app/*`), dashboards SSR-ready.
- Security: JWT with HTTP-only cookies; RBAC checks in API.
- Version Control: Git with tags aligned to SRS version entries.
- Testing: SRS testing procedures documented; unit/integration tests to be added under `/tests`.

## Notes

- GridFS: For MVP, documents are stored directly in DB; Production should move to MongoDB GridFS as per SRS.
- Dev Utilities: Demo seed endpoint added — `POST /api/dev/seed` (dev-only, Admin roles) creates default templates, a sample request, and a sample form to populate dashboards.
- Redis: Token blacklist is in-memory fallback; production should configure Redis via `REDIS_URL`.
