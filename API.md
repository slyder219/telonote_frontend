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

Session state lives in an **httpOnly cookie** the backend sets/reads — the frontend never touches it directly, but must send `credentials: 'include'` on every `/auth/*` request (and on any request that relies on cookie-based session state) since it's cross-origin.

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

### `DELETE /notes/{note_id}`
Soft delete. `204` on success, `404` if not found/not yours/already deleted.

## Not built yet (planned)

- Wiring the transcription/context/embedding pipeline into `POST /notes` (rough transcribe → semantic context lookup → final transcribe)
- Context items CRUD (`/context-items`) - the personal vocabulary list
- Context candidates review queue (`/context-candidates`) - approve/reject auto-extracted terms
- User settings (`/settings`)
- Automatic context-candidate extraction from a note's final transcript
- A way to fetch/play back the stored audio (currently write-only from the API's perspective)
