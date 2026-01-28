# TrendTracker

> Finance platform for tracking stocks, managing budgets, and achieving financial goals.  
> By Lucas Stone, CS student at Florida State University.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19.2.0-blue)](https://reactjs.org/)

**Live:** [https://trendtracker.co](https://trendtracker.co)

---

## Features

### Stocks
- **Watchlist** – Add stocks; filter by market cap, sort by symbol or cap
- **Search** – Find by ticker or company name (e.g. "cloudflare" → NET) via type-ahead suggestions
- **Charts** – Historical prices; 1H, 1D, 1W, 1M, 3M, 6M
- **Analytics** – At-a-glance (market cap, % change, high/low, sector); technical indicators (RSI, MACD, Bollinger Bands) and volatility
- **Alerts** – Price targets; email and/or SMS (Twilio)
- **News** – General and symbol-specific (Finnhub)

### Budgets
- **Plaid** – Link bank accounts; auto transaction sync
- **Budgets & goals** – Category budgets (weekly/monthly/yearly); spending limits and savings goals
- **Spending analytics** – By category, trends; budget alerts (email/SMS)
- **Categories** – System + custom; bulk categorize transactions

### Auth & security
- **Login** – Email/password or Google OAuth 2.0
- **Sessions** – HTTP-only cookies, PostgreSQL store, `secure` in production
- **Phone verification** – SMS codes (Twilio) for alert phone numbers
- **Security** – CORS allowlist, Helmet headers, rate limiting, input validation, parameterized SQL. See [SECURITY.md](./SECURITY.md).

---

## Tech stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19, React Router 7, Vite, Recharts, Axios |
| **Backend** | Node 22, Express 5, PostgreSQL 15, Passport (local + Google OAuth) |
| **Security** | Helmet, express-rate-limit, express-validator, CORS |
| **APIs** | Finnhub (quotes, news, search), Plaid, Twilio, Nodemailer, Google OAuth |
| **Data** | Python scripts + yfinance/pandas for charts and analytics |

---

## Prerequisites

- Node.js ≥ 18, PostgreSQL 15, Python 3.8+
- API keys: Finnhub (required), Plaid (budgets), Twilio (SMS), Gmail (alerts), Google OAuth (optional)

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/yourusername/Stock-Portfolio-Tracker.git
cd Stock-Portfolio-Tracker
cd server && npm install && pip install -r requirements.txt
cd ../client && npm install
```

### 2. Database

```bash
createdb trendtracker
cd server && node scripts/migrate_sms.js && node scripts/migrate_budget.js
```

### 3. Environment

Create `server/.env`. Required:

```env
NODE_ENV=development
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=trendtracker
DB_PASSWORD=***
DB_PORT=5432
SESSION_SECRET=***  # long random string
API_KEY=***         # Finnhub
```

Also set `PLAID_*`, `ENCRYPTION_KEY`, `EMAIL_*`, `TWILIO_*`, and optionally `GOOGLE_*`, `PYTHON_PATH`. See `server/README.md` for full list.

### 4. Run

**Development:**

```bash
# Terminal 1
cd server && npm start

# Terminal 2
cd client && npm run dev
```

App: `http://localhost:5173` (proxies `/api` to backend).

**Production (Docker):**

```bash
export POSTGRES_PASSWORD=***
docker compose up -d --build
# Migrations: docker exec -it <app> node scripts/migrate_budget.js
```

App: `http://localhost:3000`. Use `DB_HOST=db` in server env.

---

## Project structure

```
├── client/                 # React SPA
│   ├── src/
│   │   ├── components/     # Navbar, PlaidLink, NewsCard, StockAnalytics, etc.
│   │   ├── context/       # AuthContext
│   │   ├── pages/         # Dashboard, Watchlist, Budget, Transactions, etc.
│   │   └── utils/         # formatters (incl. safeExternalUrl, safeImageUrl)
│   └── vite.config.js     # Proxy /api, /auth → backend
├── server/
│   ├── middleware/        # security.js (Helmet, rate limit, validation)
│   ├── scripts/           # migrate_*, get-json-stock-data.py, stock_analytics.py
│   ├── services/          # plaid, transactionSync, budgetCalculation, auditLog
│   └── index.js           # Express app, routes, cron jobs
├── docker-compose.yml
├── Dockerfile
├── SECURITY.md            # Security overview and checklist
└── README.md
```

---

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** | | |
| POST | `/api/register` | Register (rate limited) |
| POST | `/api/login` | Login (rate limited) |
| POST | `/api/logout` | Logout |
| GET | `/api/user` | Current user |
| GET | `/auth/google` | Google OAuth |
| **Stocks** | | |
| GET | `/api/watchlist` | Watchlist (filter, capFilter) |
| POST | `/api/watchlist/add` | Add stock |
| POST | `/api/watchlist/delete` | Remove stock |
| GET | `/api/stock/:symbol` | Stock details |
| GET | `/api/search/suggest?q=` | Search by ticker or company name |
| GET | `/api/chart/:symbol` | Chart data (period: 1h–6m) |
| GET | `/api/analytics/:symbol` | Technical analytics |
| GET | `/api/news`, `/api/news/:symbol` | News |
| GET | `/api/market/overview` | Market overview |
| **Alerts** | | |
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts/create` | Create alert |
| POST | `/api/alerts/delete` | Delete alert |
| **Budget** | | |
| POST | `/api/plaid/create-link-token` | Plaid Link token |
| POST | `/api/plaid/exchange-public-token` | Connect account |
| GET | `/api/plaid/accounts` | Connected accounts |
| GET/POST/PUT/DELETE | `/api/transactions`, `/api/budgets`, `/api/categories`, etc. | Budget CRUD |

All except `/api/register`, `/api/login`, `/auth/*`, and `/api/plaid/webhook` require an authenticated session.

---

## Security

- **CORS** – Allowlisted origins; credentials enabled.
- **Helmet** – CSP, X-Frame-Options, etc.
- **Rate limiting** – General (100/min), auth (10 failed/15min), Plaid (20/min), sync (3/day), phone verify (5/15min).
- **Validation** – express-validator on register, watchlist, alerts, transactions, budgets, etc. Symbol and period allowlisted for chart/analytics.
- **Session** – HTTP-only, sameSite, secure in prod.
- **Safe URLs** – News links/images restricted to `http`/`https`.

See [SECURITY.md](./SECURITY.md) for details and production checklist.

---

## Automation

- **Stock refresh** – Every 10 min (market hours).
- **Price alerts** – Every 5 min.
- **Transaction sync** – Daily 6 AM.
- **Budget alerts** – Daily 8 AM.

---

## Docs

- [SECURITY.md](./SECURITY.md) – Security measures and deployment checklist.
- [server/README.md](./server/README.md) – Backend API, env, middleware, scripts.
- [client/README.md](./client/README.md) – Frontend structure, components, API usage.

---

## License

MIT. **Author:** Lucas Stone — [GitHub](https://github.com/lucasstone1025) · lucasstone1025@gmail.com
