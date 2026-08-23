# Telonote Backend API

Reference for the frontend. Keep this current as endpoints are added/changed.

## Base

- All endpoints are JSON in/out except `POST /notes`, which is `multipart/form-data`.
- All endpoints except `/health`, `/auth/signup`, and `/auth/signin` require authentication.
- CORS: any `http://localhost:<port>` / `http://127.0.0.1:<port>` origin is always allowed. Production origin(s) are allow-listed separately (currently `https://telonote.com`).
- Every error response (4xx/5xx) has this shape, regardless of endpoint:
  ```json
  { "error": true, "status_code": 401, "detail": "human-readable message" }
  ```
  422 validation errors additionally include a `fields` array (pydantic's per-field error list).

## Authentication

Session state lives in an **httpOnly cookie** the backend sets/reads — the frontend never touches it directly, but must send `credentials: 'include'` on every `/auth/*` request (and on any request that relies on cookie-based session state). This is a genuine cross-site cookie (telonote.com and the backend are different registrable domains), so the cookie is set with `SameSite=None; Secure; Partitioned` — the last one (CHIPS) matters because modern browsers block third-party cookies by default even with `SameSite=None; Secure` unless they're partitioned. Nothing the frontend needs to configure for this - just always use `credentials: 'include'` on these calls.

Everything else (all `/notes/*` etc.) is authenticated via a **bearer access token** the frontend holds in memory/state and sends as:
```
Authorization: Bearer <access_token>
```
The access token is a short-lived JWT (~15 min, check `expires_in` in the response — don't hardcode it). When it's close to expiring, call `POST /auth/refresh` to get a new one using the still-valid session cookie. No need to hold onto anything else.

### `POST /auth/signup`
No auth required. `credentials: 'include'`.

Request:
```json
{ "email": "user@example.com", "password": "min 8 chars", "name": "Display Name" }
```
Response `200`:
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "email_verified": false, "role": "user", "banned": false },
  "access_token": "eyJ...",
  "expires_in": 899
}
```
Also sets the session cookie. Errors: `400` (e.g. weak password / untrusted origin - backend issue, not frontend), `422` (bad email format).

### `POST /auth/signin`
No auth required. `credentials: 'include'`. Same request/response shape as signup.
Errors: `401` `INVALID_EMAIL_OR_PASSWORD`-style message on bad credentials (see `detail`).

### `POST /auth/refresh`
`credentials: 'include'`, no body. Returns the same `{user, access_token, expires_in}` shape using the existing session cookie.
Errors: `401` if there's no valid session (cookie missing/expired) - frontend should treat this as "logged out" and route to sign-in.

### `POST /auth/signout`
`credentials: 'include'`, no body. `204` on success, clears the cookie. Frontend should also discard its in-memory access token.

### `GET /auth/me`
`Authorization: Bearer <access_token>` header. No cookie needed.
Response `200`:
```json
{ "id": "uuid", "email": "...", "name": "...", "email_verified": false, "role": "user", "banned": false }
```
Use this to rehydrate user state on app load if you still have a valid access token; otherwise call `/auth/refresh` first.

## Notes

All require `Authorization: Bearer <access_token>`. A note belongs to exactly one user - trying to read/edit/delete someone else's note returns `404` (not `403`), same as it not existing.

### `POST /notes` — upload a new voice note
`multipart/form-data` with one field: `audio` (the audio file).

**Current scope is deliberately minimal:** this stores the audio and returns immediately with no transcript yet - it does **not** run transcription/context/embeddings (that pipeline exists in `app/ai/` and is tested, just not wired into this endpoint yet). Treat every note right now as "recorded, not yet processed."

Audio must be a **compressed** format - reject/re-encode uncompressed recordings (`wav`, `aiff`, `flac`, raw PCM) client-side before uploading if that's how your recorder captures it. Accepted: mp3, m4a/aac, ogg, webm, opus, 3gp, amr, mp4 (by content-type or file extension).

Response `201` — a note object with null transcript/model/timing fields:
```json
{
  "id": "uuid",
  "created_at": "2026-08-22T23:37:20Z",
  "duration_ms": null,
  "rough_transcript": null,
  "final_transcript": null,
  "updated_at": "2026-08-22T23:37:20Z",
  "rough_transcription_model": null,
  "final_transcription_model": null,
  "rough_transcription_ms": null,
  "final_transcription_ms": null,
  "total_processing_ms": null,
  "audio_mime_type": "audio/mpeg",
  "audio_size_bytes": 92544
}
```
The audio itself is stored (as bytes, directly in the database - no object storage yet). It is **not** returned in any response body; there's no `GET` for the raw audio yet either.
Errors: `400` if the uploaded file is empty, or if it's not a recognized compressed audio format.

### `GET /notes` — list the caller's notes
Query params: `limit` (default 50, max 200), `offset` (default 0). Newest first.
Response `200`: array of note summaries (no `updated_at`/model/timing fields - use `GET /notes/{id}` for full detail):
```json
[{ "id": "uuid", "created_at": "...", "duration_ms": null, "rough_transcript": "...", "final_transcript": "..." }]
```

### `GET /notes/{note_id}` — full detail
Response `200`: same full shape as `POST /notes`'s response. `404` if not found/not yours/already deleted.

### `PATCH /notes/{note_id}` — edit the transcript
Request:
```json
{ "final_transcript": "corrected text" }
```
Response `200`: full note object with the edit applied and `updated_at` bumped. Only `final_transcript` is editable right now. `404` if not found/not yours.

Setting `final_transcript` here also kicks off **context candidate extraction** in the background (not part of this request's latency) - see the Context section below. This is the current stand-in trigger point until the real transcription pipeline is wired into `POST /notes`; extraction will run from there too once that lands, without any frontend change needed.

### `DELETE /notes/{note_id}`
Soft delete. `204` on success, `404` if not found/not yours/already deleted.

## Context

Two related concepts:
- **Context items** (`tn.context_items`) — the user's committed, trusted vocabulary (people, companies, acronyms, jargon, etc.) used later to improve transcription accuracy. Each has zero or more **aliases** (alternate spellings/forms).
- **Context candidates** — AI-proposed additions awaiting the user's review. Nothing an extraction model produces ever lands in context items automatically; a candidate only becomes a real item via an explicit commit/merge action below. A candidate can also have aliases.

All endpoints require `Authorization: Bearer <access_token>`. Not-found/not-yours both return `404`.

### `GET /context/items` — the user's committed context
Response `200`, array, each with its aliases inlined:
```json
[{
  "id": "uuid", "term": "Aetherworks Logistics", "description": "...", "category": "companies/organizations",
  "always_include": false, "is_active": true, "source_type": "extracted",
  "created_at": "...", "updated_at": "...",
  "aliases": ["Aether Works Logistics", "Etherworks Logistics"]
}]
```
`source_type` is `"manual"` (user-added) or `"extracted"` (came from a committed/merged candidate). Use this list as the picker when the user chooses a merge target (see candidate merge below).

### `POST /context/items` — manually add one
Request: `{ "term": "...", "description": "...", "category": "...", "always_include": false }` (only `term` required).
Response `201`: the created item (empty `aliases`). `always_include` items are always fed into transcription context regardless of relevance to a given note - use sparingly.

### `PATCH /context/items/{item_id}`
Request: any subset of `{ term, description, category, always_include, is_active }`. Set `is_active: false` to deactivate without deleting.
Response `200`: updated item.

### `DELETE /context/items/{item_id}`
Soft delete. `204` on success.

### `GET /context/candidates` — the review queue
Query param `status` (default `pending`; pass `added` / `merged` / `ignored` / omit-with-empty-string for all). This is what the frontend shows the user to approve/reject, aliases included:
```json
[{
  "id": "uuid", "note_id": "uuid", "proposed_term": "KSMS",
  "proposed_description": "...", "proposed_category": "acronyms",
  "status": "pending", "context_item_id": null,
  "created_at": "...", "resolved_at": null,
  "aliases": ["K S M S", "KSMS"]
}]
```

### `PATCH /context/candidates/{id}` — edit before resolving
The user can correct the AI's proposal before approving it. Request: any subset of `{ proposed_term, proposed_description, proposed_category, aliases }` - `aliases`, if present, **replaces** the whole list (send the full desired list, not a delta). Only works while `status = "pending"`; `404` otherwise (candidate already resolved is treated as not-found-for-editing).
Response `200`: updated candidate.

### `POST /context/candidates/{id}/commit`
Turns the candidate into a brand-new context item (its aliases come along). Sets `status="added"`, `context_item_id` to the new item's id.
Response `200`: the resolved candidate. `409` if already resolved, or if a context item with that exact term already exists (use merge instead in that case).

### `POST /context/candidates/{id}/merge`
Request: `{ "context_item_id": "uuid" }` (an existing item from `GET /context/items` - the frontend needs to let the user pick one, e.g. because the AI proposed a near-duplicate under slightly different wording). Adds the candidate's aliases (plus its own proposed term, as an alias) onto that existing item. Sets `status="merged"`.
Response `200`: the resolved candidate. `404` if the target item doesn't exist/isn't yours, `409` if already resolved.

### `POST /context/candidates/{id}/ignore`
Discards it, no effect on committed context. Sets `status="ignored"`.
Response `200`: the resolved candidate. `409` if already resolved.

### `POST /context/candidates/bulk` — approve/reject many at once
Request: `{ "ids": ["uuid", ...], "action": "commit" | "ignore" }` (bulk merge isn't supported - merge needs a distinct target per candidate, so do those one at a time).
Response `200`, one result per id, so partial failures are visible instead of the whole batch failing:
```json
[{ "id": "uuid", "ok": true, "detail": "committed" }, { "id": "uuid", "ok": false, "detail": "Candidate not found" }]
```

### How candidates get created
Not a frontend-triggered action - happens automatically in the background whenever a note's `final_transcript` is set (currently: `PATCH /notes/{id}`; will also happen from `POST /notes` once the real transcription pipeline is wired in). A lightweight LLM (`gpt-5.4-mini`) extracts only genuinely-useful terms (people, companies, acronyms, jargon, unusual places - never ordinary vocabulary), each is checked against existing items/aliases/pending candidates (exact match) and existing item embeddings (semantic near-duplicate) to avoid obvious dupes, and survivors are inserted as `pending` candidates. A note can produce zero candidates - that's expected and common for a mundane note.

## Not built yet (planned)

- Wiring the transcription/context/embedding pipeline into `POST /notes` (rough transcribe → semantic context lookup → final transcribe) - candidate extraction is ready and will plug into that same point
- User settings (`/settings`)
- A way to fetch/play back the stored audio (currently write-only from the API's perspective)
