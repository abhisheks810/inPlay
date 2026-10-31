# Streamline

Streamline is a modular-monolith video application built with Vinext, React, Cloudflare Workers, D1, and R2. It supports public discovery and playback, federated-account uploads, and first-party engagement events.

## Architecture

The application ships as one Worker deployment while keeping domain responsibilities separate:

- `app/` — pages and thin HTTP route adapters
- `modules/videos/` — video domain types and D1 metadata repository
- `modules/storage/` — uploaded-object storage behind the R2 binding
- `modules/engagement/` — event validation, client capture, persistence, and metrics
- `modules/identity/` — Apple, Google, and Zoho OpenID Connect, account linkage, and sessions
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

## Identity providers

Copy the variable names in `.env.example` into your local runtime or Sites secrets. Never commit credential values. Register these exact hosted callback URLs with each provider:

- `https://<your-host>/api/auth/apple/callback`
- `https://<your-host>/api/auth/google/callback`
- `https://<your-host>/api/auth/zoho/callback`

Apple additionally requires an Apple Developer App ID, Services ID, Team ID, Key ID, and private signing key. Its web callback must use a registered public HTTPS domain; Apple does not allow localhost or IP callback hosts. Set `ZOHO_ACCOUNTS_ORIGIN` to the account domain for the app's Zoho data center.

The implementation verifies signed OpenID ID tokens, issuer, audience, nonce, OAuth state, and a provider-verified email claim. Session tokens are random, stored only as SHA-256 hashes in D1, sent in `HttpOnly; SameSite=Lax` cookies, and expire after 30 days. This is provider-account verification, not government-ID verification.

## Verification

```bash
npm run lint
npm run build
npm test
```

## Engagement metrics

`POST /api/engagement` records privacy-limited events using a random browser session identifier. No email address is written to engagement rows. Supported events include plays, progress milestones, completions, likes, saves, and successful uploads.

`GET /api/engagement?videoId=<id>` returns aggregate plays, completions, likes, saves, and watch seconds for one video.

## Hosting

`.openai/hosting.json` binds the Worker to D1 as `DB` and R2 as `BUCKET`. Sites applies tracked migrations during publication. Production deployments should be created only from a verified, pushed source commit.
