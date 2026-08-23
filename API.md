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

**This is synchronous and runs the full pipeline** before responding: rough transcription → semantic context lookup (+ any `always_include` items) → final transcription with that context folded in. Expect this call to take a couple of seconds (typically ~2-3s) - show a loading/processing state, don't treat that latency as a failure.

Audio is always stored first, independent of everything else - if a transcription step fails partway, the note still exists with whatever progress was made (e.g. a rough transcript but no final one) rather than the upload being lost. Audio must be a **compressed** format - reject/re-encode uncompressed recordings (`wav`, `aiff`, `flac`, raw PCM) client-side before uploading if that's how your recorder captures it. Accepted: mp3, m4a/aac, ogg, webm, opus, 3gp, amr, mp4 (by content-type or file extension).

Response `201`:
```json
{
  "id": "uuid",
  "created_at": "2026-08-22T23:37:20Z",
  "duration_ms": null,
  "rough_transcript": "Please schedule a follow-up with Dr. Kowalczyk about the Zafirion protocol next Tuesday.",
  "final_transcript": "Please schedule a follow-up with Dr. Kowalczyk about the Zephyrion protocol next Tuesday.",
  "updated_at": "2026-08-22T23:37:23Z",
  "rough_transcription_model": "gpt-4o-mini-transcribe",
  "final_transcription_model": "gpt-4o-transcribe",
  "rough_transcription_ms": 1197,
  "final_transcription_ms": 562,
  "total_processing_ms": 2681,
  "audio_mime_type": "audio/mpeg",
  "audio_size_bytes": 92544
}
```
Any of the transcript/model/timing fields can come back `null` if that step failed or produced nothing - `final_transcript` in particular can be missing even when `rough_transcript` isn't. Treat a note with a real `final_transcript` as done; anything else as still show it, but don't assume it's final.

The audio itself is stored (as bytes, directly in the database - no object storage yet). It is **not** returned in any response body; there's no `GET` for the raw audio yet either.

Setting a real `final_transcript` here also kicks off **context candidate extraction** in the background (same as `.../retranscribe`, see the Context section) - no separate call needed.

Errors: `400` if the uploaded file is empty, or if it's not a recognized compressed audio format.

### `GET /notes` — list the caller's notes
Query params: `limit` (default 50, max 200), `offset` (default 0). Newest first.
Response `200`: array of note summaries (no `updated_at`/model/timing fields - use `GET /notes/{id}` for full detail):
```json
[{ "id": "uuid", "created_at": "...", "duration_ms": null, "rough_transcript": "...", "final_transcript": "..." }]
```

### `GET /notes/{note_id}` — full detail
Response `200`: same full shape as `POST /notes`'s response. `404` if not found/not yours/already deleted.

### `GET /notes/{note_id}/audio` — fetch the stored recording
Response `200`: the raw audio bytes, `Content-Type` set to the stored `audio_mime_type` (e.g. `audio/mpeg`), `Content-Length` set. `404` if the note doesn't exist/isn't yours/is deleted, or if it has no audio stored.

**Important:** this needs the same `Authorization: Bearer <access_token>` header as everything else - a plain `<audio src="https://.../notes/{id}/audio">` tag will **not** work, since browsers don't attach custom headers to a bare resource load. Fetch it with JS instead and build a blob URL:
```js
const res = await fetch(`${API_BASE}/notes/${id}/audio`, { headers: { Authorization: `Bearer ${accessToken}` } });
const blob = await res.blob();
audioEl.src = URL.createObjectURL(blob); // revoke with URL.revokeObjectURL when done with it
```

### `POST /notes/{note_id}/retranscribe` — re-run transcription on the stored audio
No body. Re-runs the full pipeline (rough → context → final) against this note's already-stored audio and overwrites its transcript/model/timing fields - useful as a "try again" action, or after the user has approved new context items that might now help. Synchronous, same latency profile as `POST /notes`.

Response `200`: full updated note object, same shape as `POST /notes`. `404` if the note doesn't exist/isn't yours/is deleted, or has no audio stored.

Also re-triggers context candidate extraction in the background if a real `final_transcript` resulted, same as `POST /notes`.

### `PATCH /notes/{note_id}` — edit the transcript
Request:
```json
{ "final_transcript": "corrected text" }
```
Response `200`: full note object with the edit applied and `updated_at` bumped. Only `final_transcript` is editable right now. `404` if not found/not yours.

**Does not trigger candidate extraction** - unlike `POST /notes` and `.../retranscribe`, this is a human-authored correction, not a fresh AI transcription of the audio, so it's treated as out of scope for extraction. If a correction surfaces a term worth capturing, add/edit it directly via the context-items or context-candidates endpoints instead.

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
Turns the candidate into a brand-new context item (its aliases come along, and its already-computed embedding carries over too - it's not recomputed). Sets `status="added"`, `context_item_id` to the new item's id.
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
Not a frontend-triggered action - happens automatically in the background whenever a note gets a *fresh AI-generated* `final_transcript` (`POST /notes` and `.../retranscribe`, but deliberately not `PATCH`, which is a human edit). A lightweight LLM (`gpt-5.4-mini`) extracts only terms a generic transcription model would plausibly mis-hear on its own - not just "notable" terms; ordinary vocabulary, common places/names, and everyday words are excluded even if they're technically proper nouns. Zero candidates is a common and expected outcome for an ordinary note.

Each candidate is checked against existing items/aliases/pending candidates (exact match, no embedding cost) first, and only falls through to an embedding-based near-duplicate check against existing item embeddings if it survives that - avoiding wasted embedding calls on obvious repeats.

## Not built yet (planned)

- User settings (`/settings`)
