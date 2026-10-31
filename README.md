# Streamline

Streamline is a modular-monolith video application built with Vinext, React, Cloudflare Workers, D1, and R2. It supports public discovery and playback, ChatGPT-authenticated uploads, and first-party engagement events.

## Architecture

The application ships as one Worker deployment while keeping domain responsibilities separate:

- `app/` — pages and thin HTTP route adapters
- `modules/videos/` — video domain types and D1 metadata repository
- `modules/storage/` — uploaded-object storage behind the R2 binding
- `modules/engagement/` — event validation, client capture, persistence, and metrics
- `db/` and `drizzle/` — schema and immutable D1 migrations
- `docs/ARCHITECTURE.md` — module boundaries, storage links, and request flows

D1 stores metadata and engagement events. R2 stores uploaded bytes. The two stores remain independently manageable and are linked only by `videos.object_key`.

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm run install:ci
npm run db:migrate:local
npm run dev
```

Local D1 and R2 data are persisted under the ignored `.wrangler/state/` directory. They are isolated from hosted production data.

## Verification

```bash
npm run lint
npm run build
```

## Engagement metrics

`POST /api/engagement` records privacy-limited events using a random browser session identifier. No email address is written to engagement rows. Supported events include plays, progress milestones, completions, likes, saves, and successful uploads.

`GET /api/engagement?videoId=<id>` returns aggregate plays, completions, likes, saves, and watch seconds for one video.

## Hosting

`.openai/hosting.json` binds the Worker to D1 as `DB` and R2 as `BUCKET`. Sites applies tracked migrations during publication. Production deployments should be created only from a verified, pushed source commit.
