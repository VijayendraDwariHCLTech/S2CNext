# S2C cloned repository — baseline checkpoint

This is a **read-only application baseline** plus a diagnostic script, not a repaired or deployable application. The original user-provided archive was not modified.

## Run first

```bash
node scripts/baseline-audit.mjs
```

The script intentionally exits nonzero while startup/authentication blockers exist. It does not access external systems or modify data.

## Verified source-level findings

- `package.json` expects `server/_core/index.ts`, which is not present.
- `server/index.ts` exists but only defines `/api/intake/chat` and static serving; it does not mount the tRPC router consumed by the React app. Do **not** switch entrypoints and call that a fix.
- `server/routers.ts` includes unauthenticated generic table writes (`s2c.applyChanges`), demo reset, and AI-provider setting changes. The guard script detects these patterns.
- `server/_core/trpc.ts`, `/cookies.ts`, `/systemRouter.ts`, and context dependencies are not included in the archive, preventing normal typechecking and full startup.
- No SQL migration history was included in `drizzle/`.
- The archived `dist/index.js` is an unverified previously built artifact, not evidence the source is runnable.

## Recommended repair sequence

1. Recover the missing `_core` server runtime files from Replit or reconstruct a minimal Express/tRPC application with explicit context and protected procedures.
2. Replace simulated login as an authorization boundary with validated server-side user sessions and object-level permissions.
3. Remove generic public write/reset procedures from production; introduce individually authorized mutations. Until then, keep the application isolated and do not deploy it publicly.
4. Obtain/validate actual MySQL/TiDB schema and migrations; make any changes through reviewed, reversible migrations.
5. Install lockfile-pinned dependencies, run `npm/pnpm` typecheck and tests, then run a browser smoke test for each critical persona journey.
6. Compare against V7 and port features in small vertical slices after baseline reliability and security gates pass.

**Current status:** Source inventory and static diagnostic executable. Runtime behavior, build, tests, and database connectivity remain unverified.
