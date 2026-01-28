# TrendTracker Backend

Express API for authentication, stocks, watchlist, alerts, Plaid banking, budgets, and transactions.

---

## Stack

- **Express 5** – REST API
- **PostgreSQL** (pg) – DB; **Passport** (local + Google OAuth), **bcrypt**, **express-session** (pg store)
- **Security** – Helmet, CORS, express-rate-limit, express-validator
- **External** – Axios, Plaid, Twilio, Nodemailer; **Python** (yfinance/pandas) for charts and analytics

---

## Setup

```bash
npm install
pip install -r requirements.txt
```

Create `server/.env` (see [Environment variables](#environment-variables)).

```bash
createdb trendtracker
node scripts/migrate_sms.js
node scripts/migrate_budget.js
```

---

## Environment variables

```env
NODE_ENV=development
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=trendtracker
DB_PASSWORD=***
DB_PORT=5432
SESSION_SECRET=***          # 32+ chars
API_KEY=***                 # Finnhub
PLAID_CLIENT_ID=***
PLAID_SECRET=***
PLAID_ENV=sandbox           # sandbox | development | production
ENCRYPTION_KEY=***          # 64-char hex (crypto.randomBytes(32).toString('hex'))
EMAIL_USER=***
EMAIL_PASS=***              # Gmail app password
TWILIO_ACCOUNT_SID=***
TWILIO_AUTH_TOKEN=***
TWILIO_PHONE_NUMBER=+1...
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
PYTHON_PATH=python3
```

Optional: `SCRIPT_PATH`, `ANALYTICS_SCRIPT_PATH` (Docker/production). `FRONTEND_URL` for CORS.

---

## API routes

### Auth
- `POST /api/register` – Register (rate limited)
- `POST /api/login` – Login (rate limited)
- `POST /api/logout` – Logout
- `GET /api/user` – Current user
- `GET /auth/google`, `GET /auth/google/callback` – Google OAuth

### Stocks
- `GET /api/watchlist` – Watchlist (`?filter=def|alpha|asc|desc`, `?capFilter=Small Cap|Mid Cap|Large Cap`)
- `POST /api/watchlist/add` – Add stock (body: symbol, price, dayhigh, daylow, companyname, marketcap, sector)
- `POST /api/watchlist/delete` – Remove stock (body: symbol)
- `GET /api/stock/:symbol` – Stock details
- `GET /api/search/suggest?q=` – Search by ticker or company name (Finnhub symbol lookup)
- `GET /api/chart/:symbol?period=1w` – Chart data (1h, 1d, 1w, 1m, 3m, 6m)
- `GET /api/analytics/:symbol?period=1w` – Technical analytics (RSI, MACD, Bollinger Bands, volatility)
- `GET /api/news`, `GET /api/news/:symbol` – News
- `GET /api/market/overview` – Market overview

### Alerts
- `GET /api/alerts` – List alerts
- `POST /api/alerts/create` – Create (body: symbol, direction, target_price, alert_method)
- `POST /api/alerts/delete` – Delete (body: alert_id)
- `POST /api/alerts/check` – Manual check

### Settings
- `GET /api/settings` – User settings
- `POST /api/settings/phone/send-code` – Send SMS code (rate limited)
- `POST /api/settings/phone/verify` – Verify code

### Plaid / banking
- `POST /api/plaid/create-link-token` – Link token (rate limited)
- `POST /api/plaid/exchange-public-token` – Exchange token (rate limited)
- `GET /api/plaid/accounts` – Connected accounts
- `POST /api/plaid/accounts/:id/disconnect` – Disconnect
- `POST /api/plaid/accounts/:id/sync`, `POST /api/plaid/sync-all` – Sync (rate limited)
- `POST /api/plaid/webhook` – Plaid webhook (no auth)

### Transactions, budgets, categories
- `GET /api/transactions` – List (filters: startDate, endDate, categoryId, accountId, search, limit, offset)
- `POST /api/transactions/manual` – Create manual transaction
- `PUT /api/transactions/bulk/category` – Bulk category update (transactionIds, categoryId)
- `PUT /api/transactions/:id/category`, `PUT /api/transactions/:id/notes`, `DELETE /api/transactions/:id`
- `GET/POST/PUT/DELETE /api/budgets`, `GET /api/budgets/summary`
- `GET/POST/PUT/DELETE /api/budget-goals`, `GET /api/budget-goals/progress`
- `GET /api/categories`, `GET /api/categories/system`, `POST/PUT/DELETE /api/categories`
- `GET /api/spending/by-category`, `GET /api/spending/trends`, `GET /api/budget/alerts`

---

## Middleware (`middleware/security.js`)

### Helmet
- CSP, X-Frame-Options, etc. Plaid-friendly (COEP off, COOP same-origin-allow-popups).

### Rate limiters
| Limiter | Window | Max | Used on |
|--------|--------|-----|--------|
| generalLimiter | 1 min | 100 | All API (skip localhost in dev) |
| authLimiter | 15 min | 10 (failed only) | `/api/login`, `/api/register` |
| plaidLimiter | 1 min | 20 | Plaid endpoints |
| syncLimiter | 1 day | 3 | `/api/plaid/accounts/:id/sync`, `/api/plaid/sync-all` |
| phoneVerifyLimiter | 15 min | 5 | `/api/settings/phone/send-code` |

### CORS
- Allowlisted origins (localhost, trendtracker.co, `FRONTEND_URL`). Credentials enabled.

### Validation (express-validator)
- **register** – email, password (8–128), first_name, optional phone
- **watchlistAdd** – symbol, price, dayhigh, daylow; optional companyname, marketcap, sector
- **watchlistDelete**, **alertCreate**, **alertDelete** – symbol / alert_id
- **searchSuggest** – `q` length
- **transactionFilters** – startDate, endDate, categoryId, accountId, search, limit, offset
- **createTransaction**, **updateTransactionCategory**, **idParam**
- **createBudget**, **updateBudget**, **createGoal**, **createCategory**, **bulkCategory**

Symbol for chart/analytics/stock/news: validated server-side (pattern, length). Period allowlisted.

### Authorization
- `createAuthorizationMiddleware(db)` – resource ownership checks (accounts, transactions, budgets, goals, categories).
- `isAuthenticated` – Passport session check on protected routes.

---

## Security

- **Session** – HTTP-only, sameSite lax, secure in production.
- **SQL** – Parameterized queries only.
- **Errors** – Chart/analytics Python errors not exposed to client; generic messages returned.
- **Safe URLs** – Not applicable server-side; client sanitizes news links/images.

See [SECURITY.md](../SECURITY.md) for full overview.

---

## Services

- **plaidService** – Link token, exchange, accounts, transactions, encrypt/decrypt tokens, remove item.
- **transactionSyncService** – Sync by account/user/all, get transactions (filters), add manual, categorize.
- **budgetCalculationService** – Budget summary, spending by category, trends, budget alerts, goal progress.
- **auditLogService** – Log bank connect/disconnect, sync, auth failure, webhook.

---

## Scripts

- `node scripts/migrate_sms.js` – Phone/SMS fields, alerts.alert_method.
- `node scripts/migrate_budget.js` – Budget tables.
- `python3 scripts/get-json-stock-data.py <SYMBOL> <PERIOD>` – Chart data (used by API).
- `python3 scripts/stock_analytics.py <SYMBOL> <PERIOD>` – Analytics (used by API).

Periods: `1h`, `1d`, `1w`, `1m`, `3m`, `6m`.

---

## Cron jobs

- **Stock refresh** – Every 10 min when market open.
- **Price alerts** – Every 5 min.
- **Transaction sync** – Daily 6 AM.
- **Budget alerts** – Daily 8 AM.

---

## Run

```bash
npm start   # dev (nodemon)
node index.js
```

For Docker, see main [README](../README.md).
