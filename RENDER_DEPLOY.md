# Render deployment playbook — S2CNext

This repository is configured for a Docker-based Render web service. Render builds the root `Dockerfile`, starts the image using its existing `CMD`, sends traffic to the port supplied in `PORT`, and checks `/health` before activating a deployment.

## Recommended deployment path

1. In the Render Dashboard, choose **New > Blueprint** and connect the GitHub repository `VijayendraDwariHCLTech/S2CNext`, branch `main`.
2. Render detects the root `render.yaml` and proposes the `s2cnext-web` web service. Apply the Blueprint.
3. If using **New > Web Service** instead, select the repository, choose **Docker** as the runtime, leave the Dockerfile path as `./Dockerfile`, set the health check path to `/health`, and enable automatic deploys from `main`.
4. In the service environment variables, provide `DATABASE_URL` as a MySQL/TiDB connection string. Do not commit it to GitHub. The Blueprint generates `JWT_SECRET` and sets `NODE_ENV=production`.
5. Add `FOUNDRY_APP_KEY` and `FOUNDRY_APP_SECRET` only when the corresponding integration is authorized and required.
6. Create the service. Render should build the image and start the server automatically.

## Database

The application uses MySQL-compatible Drizzle configuration. Use a disposable MySQL/TiDB database for initial validation. Render can host MySQL as a separate private Docker service with a persistent disk, or the application can connect to an approved external MySQL/TiDB provider. Keep the database private and pass only its connection URL through `DATABASE_URL`.

The application does not automatically initialize the database. Do not run `db:push` blindly and do not import `generated/s2c_demo_seed.sql` into an existing or production database. First reconcile the schema, then apply a reviewed migration and seed plan to an isolated staging database. Load only synthetic demo data until authentication and row-level access controls have been validated.

## Verify the deployment

After the first deploy, open the Render service URL and check:

```text
https://<service>.onrender.com/health
```

Expected response:

```json
{"status":"ok","server":"s2c"}
```

Render automatically deploys new commits pushed to the connected `main` branch. The service must remain linked to the GitHub repository and have automatic deploys enabled.

## Current application limitations

This checkpoint is not production-certified. It does not include an SSO/OIDC callback or trusted session issuance, and the protected application screens expect an existing signed S2C JWT session resolved against `enterprise_user_master`. Database migrations, end-to-end browser flows, and least-privilege row-level filtering remain unfinished. Keep the service restricted and use synthetic data only until those controls are implemented.
