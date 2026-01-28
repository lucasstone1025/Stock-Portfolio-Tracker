# Security Overview

This document summarizes security measures implemented in TrendTracker and recommendations for deployment.

## Implemented Measures

### Authentication & Session
- **Session cookie**: `httpOnly`, `sameSite: lax`, `secure` in production. Prevents XSS from reading session tokens.
- **Password hashing**: bcrypt with salt rounds 10.
- **Rate limiting (auth)**: Login and register limited to 10 attempts per 15 minutes per IP (failed requests only).

### Headers & CORS
- **Helmet**: CSP, X-Frame-Options, and other secure headers. CSP allows `self`, Plaid, Finnhub, and required inline styles/scripts.
- **CORS**: Restricted to allowlisted origins (localhost, trendtracker.co). Credentials enabled. Set `FRONTEND_URL` in env if using another origin.

### Rate Limiting
- **General API**: 100 requests/minute per IP (skipped for localhost in development).
- **Auth**: 10 failed attempts per 15 minutes per IP (failed requests only).
- **Plaid**: 20 requests/minute per IP.
- **Sync**: 3 syncs per day per IP (per-account sync and sync-all).
- **Phone verification (SMS)**: 5 codes per 15 minutes per IP.

### Input Validation
- **Register**: Email (valid format), password (8–128 chars), first name (1–100 chars), optional phone (max 20).
- **Watchlist add/delete**: Symbol validated (alphanumeric, 1–10 chars). Numeric fields validated.
- **Alerts create**: Symbol, direction (`up`/`down`), target price (positive), alert method (`email`/`sms`/`both`).
- **Alerts delete**: Alert ID required, integer.
- **Chart / Analytics / Stock / News**: Symbol validated (pattern `[A-Za-z0-9.\\-]{1,10}`). Period allowlisted.
- **Watchlist filters**: `filter` and `capFilter` restricted to allowlisted values.
- **Search suggest**: Query length limited (max 100 chars).
- **Transactions**: Filters, manual create, category updates, and bulk updates use express-validator.

### Output & Errors
- **Chart/Analytics Python errors**: Generic messages returned to client; details logged server-side only.
- **Validation errors**: First validation message returned as `error`; full `details` array for debugging.

### Client-Side
- **Credentials**: `axios.defaults.withCredentials = true` so cookies are sent with API requests.
- **News links/images**: `safeExternalUrl` and `safeImageUrl` ensure only `http://` / `https://` URLs are used for links and images from API data.

### Other
- **SQL**: Parameterized queries throughout; no string concatenation for user input.
- **Email**: Price-alert and budget-alert “from” use `EMAIL_USER` from env (no hardcoded address).

## Checklist for Production

- [ ] Set `NODE_ENV=production`.
- [ ] Use strong `SESSION_SECRET` (random, 32+ chars).
- [ ] Ensure `EMAIL_USER`, `API_KEY` (Finnhub), and Twilio env vars are set and not committed.
- [ ] Restrict DB user permissions (e.g. least privilege).
- [ ] Use HTTPS only; ensure `secure` cookie is applied (already gated by `NODE_ENV`).
- [ ] Verify Plaid webhook signature in production (see Plaid docs). Currently the webhook handler does not verify signatures.
- [ ] Add `FRONTEND_URL` to env if the frontend is served from a different origin than the API.

## Reporting Issues

If you discover a security vulnerability, please report it responsibly (e.g. via a private channel to the maintainers rather than a public issue).
