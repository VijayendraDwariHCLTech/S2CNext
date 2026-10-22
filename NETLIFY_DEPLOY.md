# Netlify deployment

This repository supports Netlify as an additive deployment target. The existing Railway Docker configuration and Vercel configuration remain unchanged.

## What Netlify runs

Netlify builds the Vite frontend into `public/` and publishes that directory. The Express backend is bundled into the Netlify Function `api` and exposed through these rewrites:

- `GET /health` → the bundled Express health route
- `/api/*` → the bundled Express/tRPC backend
- all other browser routes → `public/index.html` for SPA navigation

The function bundle is generated from `scripts/netlify-function-entry.ts` by the `netlify.toml` build command. `serverless-http` adapts the Express app to Netlify’s function runtime.

## Git-connected deployment

1. In Netlify, choose **Add new project** → **Import an existing project**.
2. Select GitHub and choose `VijayendraDwariHCLTech/S2CNext`.
3. Use the `main` branch. Netlify will read `netlify.toml` from the repository.
4. Deploy the site. Future pushes to `main` will trigger automatic production deploys.

## Required environment variables

Set these in the Netlify project under **Project configuration → Environment variables**. Include the **Functions** scope for values used by the backend:

- `DATABASE_URL` — MySQL/TiDB-compatible connection string
- `JWT_SECRET` — secure random secret of at least 32 bytes
- `NODE_ENV=production`
- Optional: `FOUNDRY_APP_KEY` and `FOUNDRY_APP_SECRET`

Do not commit these values to the repository. Netlify environment-variable changes require a new deploy before the Function receives updated values.

## Verification

After deployment, open `/health`. The expected response is:

```json
{"status":"ok","server":"s2c"}
```

The anonymous-session check is available at `/api/trpc/auth.me`; it should return a JSON response with `null` until the trusted SSO/JWT session integration is configured.
