# Security Audit (Frontend + Backend)

## Scope
- `frontend/` (React client)
- `server/` (Express + PostgreSQL API)
- `backend/` (Hono + Supabase worker API)

## SQL Injection Review
- **Express API (`server/`)**: No direct SQL injection found in route handlers reviewed. Queries consistently use parameterized placeholders (`$1`, `$2`, etc.) with bound parameters.
- **Worker API (`backend/`)**: Uses Supabase query builder; no raw SQL string execution observed.

## Security Issues Found and Addressed
1. **Weak JWT secret fallback** in both APIs (`supersecretkeyshouldbechanged`).
   - Fixed by requiring `JWT_SECRET` and returning/configuring error when missing.
2. **Overly permissive CORS** (`*`/all origins).
   - Fixed by requiring explicit origin controls via env (`CORS_ORIGIN`) in both APIs.
3. **Unrestricted file upload** in Express visitor creation.
   - Added image-only MIME filter and 5MB upload limit.
4. **CSV Formula Injection risk** in report export.
   - Added sanitization for cells beginning with `=`, `+`, `-`, `@`.

## Frontend Observations
- Auth token is stored in `localStorage`, which is vulnerable to exfiltration if XSS occurs.
  - Recommendation: migrate to `httpOnly` secure cookies if architecture permits.

## Recommended Follow-ups
- Add centralized input validation (e.g., Zod/Joi) for all request payloads.
- Add rate limiting for login and sensitive endpoints.
- Add automated security tests for upload constraints and CSV injection edge cases.
