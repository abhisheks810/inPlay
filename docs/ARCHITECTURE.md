# Streamline architecture

## System shape

Streamline is a modular monolith: a single Vinext/Cloudflare Worker deployment with internal domain modules. The architecture favors one operational unit for launch while keeping business logic out of route handlers so a module can be extracted later without rewriting its domain contract.

## Module index

| Module | Responsibility | Durable dependency |
| --- | --- | --- |
| `app/` | React UI, authentication adapter, HTTP route adapters | Calls internal modules |
| `modules/videos/` | Video types, validation helpers, metadata reads/writes | D1 through `db/` |
| `modules/storage/` | Object-key construction and uploaded-byte operations | R2 `BUCKET` |
| `modules/engagement/` | Event contract, client capture, event writes, aggregate metrics | D1 through `db/` |
| `db/` | Cloudflare binding access and Drizzle schema | D1 `DB` |
| `drizzle/` | Immutable schema migrations | Applied locally and by Sites |

## Storage separation and linkage

D1 is the source of truth for structured records:

- video title, creator, category, ownership, content type, size, status, and object key
- append-only engagement events keyed by video and browser session

R2 is the source of truth for uploaded file bytes. An R2 object does not duplicate video metadata. `videos.object_key` is the stable link from a D1 video row to its R2 object.

Local development uses Miniflare-backed D1 and R2 persisted under `.wrangler/state/`. Hosted Sites uses separately provisioned D1 and R2 resources with the same logical bindings, so application modules do not change between environments.

## Main flows

### Catalog and playback

1. The React client requests `GET /api/videos`.
2. The video repository reads published D1 rows and distinct play sessions.
3. Selecting an uploaded video requests `/api/videos/:id/stream`.
4. The video repository resolves the R2 object key from D1.
5. The storage module returns the R2 object body to the browser.

### Upload publication

1. The route requires ChatGPT identity headers.
2. The route validates title, content type, and the 250 MB limit.
3. The storage module writes bytes to R2.
4. The video repository inserts the published D1 metadata row.
5. If the metadata write fails, the route attempts to delete the R2 object.

### Engagement capture

1. The client creates a random device-local session identifier.
2. Play, milestone, completion, like/save, and upload events are sent to `POST /api/engagement`.
3. The engagement repository writes an append-only D1 event with optional signed-in user ID but no email.
4. Aggregates calculate distinct play sessions and maximum watched seconds per session.

## Launch constraints

- The first release remains one deployable Worker; no distributed service boundary is introduced.
- Local and hosted storage are intentionally separate.
- Production migration history is append-only.
- Engagement events need a retention decision before long-term production operation.
- Content moderation, abuse reporting, and upload rate limits remain launch-readiness work.
