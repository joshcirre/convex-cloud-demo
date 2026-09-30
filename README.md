# Convex Cloud demo

A small TanStack Start app for trying [self-hosted Convex on Laravel Cloud](https://github.com/joshcirre/convex-on-laravel-cloud). Add a number in one browser window and watch it appear in another. A second page demonstrates a Convex action.

**[Try the live demo](https://convex-demo.laravel.cloud)** — open it in two browser windows, add a number, and watch both update in real time. The shared demo may take a moment to wake after inactivity.

This is a standalone adaptation of [Convex's official TanStack Start template](https://github.com/get-convex/templates/tree/800bd6c8d23e2b03bade4058f0879e9f59dbcb11/template-tanstack-start). It has its own backend functions and no dependency on Lawn or a Laravel auth API. The upstream Apache-2.0 [license](LICENSE) is preserved.

**This is an anonymous, shared demo.** Anyone who can reach the backend can read and add numbers. Use a dedicated demo backend and non-sensitive data; add authentication, authorization, and abuse controls before using it as a real application.

## Deploy with an agent

Copy this prompt:

```text
Help me deploy https://github.com/joshcirre/convex-cloud-demo on Laravel Cloud.
Read its README and the infrastructure agent guide:
https://github.com/joshcirre/convex-on-laravel-cloud/blob/main/docs/agents/README.md

Guide me through Cloud signup and authorization if needed. Use the Cloud CLI
where supported and explain the documented browser handoffs. Use the low-cost demo profile: separate 1 GB Convex backend, smallest private
MySQL and a bucket, and this frontend on 512 MB. Enable five-minute scale-to-zero
where supported and explain its limitations. Keep the dashboard local unless
I ask to host it. Discover current cheaper size IDs and reuse existing CLI/GitHub
access. Ask for missing organization, region, and names together; a numerical
budget is optional when I have already asked for the cheapest demo.
Do not use Lawn's resources. Deploy the functions before the frontend. Keep the
admin key local and out of the frontend environment. Verify updates across two
browser windows and persistence after a backend redeploy.
```

The [infrastructure agent guide](https://github.com/joshcirre/convex-on-laravel-cloud/blob/main/docs/agents/README.md) covers installing the Cloud CLI, creating an account, connecting GitHub, provisioning resources, and the remaining browser steps.

For costs and size IDs, see the [low-cost deployment guide](https://github.com/joshcirre/convex-on-laravel-cloud/blob/main/docs/costs.md). Running this frontend locally avoids an extra Cloud compute charge.

## 1. Deploy the backend first

Use the [Convex backend starter](https://github.com/joshcirre/convex-on-laravel-cloud). Save its public HTTPS URL and generate an admin key as described there. Give this demo its own backend, MySQL database, bucket, and instance identity.

The backend, optional dashboard, and this frontend are **separate Cloud applications**. Only the backend gets MySQL and object storage. The frontend talks to Convex through its public URL and needs neither database credentials nor an admin key.

## 2. Install and configure the demo

Use Node.js 22.13 or newer within the 22.x release line, then:

```sh
git clone https://github.com/joshcirre/convex-cloud-demo.git
cd convex-cloud-demo
npm ci
cp .env.example .env.local
cp .env.self-hosted.example .env.self-hosted
chmod 600 .env.self-hosted
```

Edit `.env.local`:

```dotenv
VITE_CONVEX_URL=https://YOUR-BACKEND.laravel.cloud
```

Edit `.env.self-hosted` locally, without sharing its contents:

```dotenv
CONVEX_SELF_HOSTED_URL=https://YOUR-BACKEND.laravel.cloud
CONVEX_SELF_HOSTED_ADMIN_KEY=YOUR_ADMIN_KEY
```

Both files are ignored by Git. The URLs must identify the same backend, with no trailing slash. Do not use the dashboard URL or the backend's `/http` URL. `VITE_CONVEX_URL` is public and is embedded during the frontend build. The admin key is only for the Convex CLI.

This demo pins `convex@1.41.0` to match the infrastructure starter's tested backend. Keep the backend, dashboard, and CLI versions compatible when upgrading. The lockfile also patches Convex's transitive `ws` dependency through an override.

## 3. Deploy the functions and run locally

```sh
npm run convex:deploy
npm run dev
```

The first command pushes `convex/schema.ts` and `convex/myFunctions.ts` to your self-hosted backend. It does not deploy the frontend or create a hosted Convex account. This example needs no additional function environment variables.

Open `http://localhost:3000` in two windows. Click **Add a random number** and confirm both windows update. Visit **another page** to exercise the action.

`npm run dev` runs only the frontend. To continuously push function changes to a **separate development backend**, configure `.env.self-hosted` for that backend and run `npm run convex:dev` in another terminal. Do not run bare `npx convex dev`, which can start hosted-service onboarding.

## 4. Deploy the frontend on Laravel Cloud

Connect this repository as a new Cloud application:

| Setting | Value |
| --- | --- |
| Root directory | Repository root (`/` in the UI; omit the CLI root-directory flag) |
| Runtime | Node.js 22 |
| Build commands | `npm ci && npm run build` |
| Deploy commands | Leave empty |
| Start command | `npm start` |
| Environment variable | `VITE_CONVEX_URL=https://YOUR-BACKEND.laravel.cloud` |
| Attached databases/buckets | None |

Configure `VITE_CONVEX_URL` before building. Changing it requires rebuilding the frontend. Cloud supplies `PORT`; `npm start` binds Nitro to `::` for Cloud's IPv6 ingress.

The [TanStack hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) describes the Nitro adapter used here. The pinned Nitro plugin produces `.output/server/index.mjs`; `npm start` runs that production server.

Use the [CLI-first infrastructure guide](https://github.com/joshcirre/convex-on-laravel-cloud/blob/main/docs/agents/README.md) for application creation, environment configuration, and monitoring. Use **this repo and the commands in this table** for the frontend. Do not copy the backend's Bash commands to this application.

Deploy and monitor using the frontend app ID and chosen environment name:

```sh
cloud deploy FRONTEND_APP_ID production -n
cloud deploy:monitor FRONTEND_APP_ID production -n
```

Push functions from your local checkout before deploying the frontend. The frontend's build does not push functions and does not require admin credentials. Do not set `CONVEX_SELF_HOSTED_ADMIN_KEY`, `INSTANCE_SECRET`, or any `VITE_*` admin key on the frontend.

## Let the backend sleep

An open Convex tab holds a WebSocket to the backend, and Cloud counts that connection as traffic. One forgotten tab, including a background tab, can keep a scale-to-zero backend awake for hours. Convex's own work (table-summary checkpoints and its outbound usage beacon) does not keep it awake. On the live demo, every long awake period from September 28–30, 2026 lined up with a browser tab holding a sync socket.

[`src/idleDisconnect.ts`](src/idleDisconnect.ts) closes the socket when nobody is using the page, and reopens it on the next pointer, keyboard, scroll, focus, or tab-visible event:

| Page state | Socket closes after | Override (seconds, set before building) |
| --- | --- | --- |
| Visible, no interaction | 5 minutes | `VITE_CONVEX_IDLE_SECONDS` |
| Hidden tab | 1 minute | `VITE_CONVEX_HIDDEN_SECONDS` |

On reconnect, Convex resubscribes to every active query and sends any queued mutations, so the page catches up without a reload. If the backend fell asleep in the meantime, the first request pays one cold start. An idle window stops receiving other people's updates until the user interacts with it again. With five-minute Cloud hibernation, an abandoned tab keeps the backend awake for at most about 10 minutes (6 if it is hidden).

Convex 1.41 has no public pause API, so this helper calls the same stop/restart socket methods that Convex's auth refresh uses. If a Convex upgrade removes them, the helper logs a warning and leaves the socket open; recheck it when you change the pinned `convex` version. Copy the file and the one-line `disconnectWhenIdle(...)` call in [`src/router.tsx`](src/router.tsx) into your own app to get the same behavior. For an always-on backend, remove that call.

## Verification

```sh
npm run build
npm run lint
PORT=3000 npm start
```

Then verify the deployed app in two browser windows, inspect the `numbers` table in the optional dashboard, and confirm the numbers survive a backend redeploy. A frontend HTTP 200 alone does not prove subscriptions or persistence work.

If the page reports a missing function, run `npm run convex:deploy` against the intended backend first. If it cannot connect, check that both local URL variables match and the public backend `/version` responds. For WebSocket failures, inspect the backend proxy and deployment logs using the infrastructure guide.

## Upstream and changes

Imported `template-tanstack-start` from `get-convex/templates` at commit `800bd6c8d23e2b03bade4058f0879e9f59dbcb11`. This is an extracted template, not a GitHub fork of the entire templates monorepo.

Changes: explicit self-hosted Convex scripts and environment examples, backend-compatible Convex version, Node/Nitro production hosting, idle WebSocket disconnect for scale-to-zero, Cloud documentation, and demo copy. The initial import remains a separate commit for comparison. Upstream agent guidelines may describe newer Convex features; check the pinned SDK before using them.

**Local checks (2026-09-28):** Node 22.23.3 clean `npm ci`, typecheck, lint, and production build passed. The production server served static assets over IPv6 and a missing route over IPv4. `npm audit` reported zero known vulnerabilities at that time. The build emits dependency `use client` directive warnings from Nitro/Rolldown.

**Live checks (2026-09-28):** This standalone demo was deployed on a 512 MB Cloud instance against its own 1 GB self-hosted backend, with private MySQL/object storage and a separate dashboard. Hosted two-tab realtime updates and the action page passed. Data and functions survived a backend redeploy. Five-minute hibernation is configured, but actual sleep/wake timing, load limits, uploaded-file persistence, and backup recovery remain untested.
