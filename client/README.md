# TrendTracker Frontend

React SPA for stocks, watchlist, alerts, budgets, and transactions. Built with React 19, Vite, React Router 7, Recharts, Axios.

---

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Proxies `/api` to `http://localhost:3000`.

---

## Project structure

```
client/
├── public/           # icon.svg, google-logo.svg, etc.
├── src/
│   ├── components/   # Navbar, CreateAlertModal, NewsCard, StockAnalytics, PlaidLink, etc.
│   ├── context/      # AuthContext
│   ├── pages/        # Dashboard, Watchlist, StockDetails, Search, Budget, etc.
│   ├── utils/        # formatters.js
│   ├── App.jsx
│   ├── main.jsx      # axios.defaults.withCredentials = true
│   └── index.css
├── vite.config.js
└── package.json
```

---

## Key components

| Component | Purpose |
|-----------|---------|
| **Navbar** | Nav links, user menu, logout |
| **CreateAlertModal** | Set price alert (symbol, direction, target, email/sms/both). Props: `symbol`, `onClose`, `currentPrice` |
| **NewsCard** | News item; safe link/image via `safeExternalUrl`, `safeImageUrl` |
| **StockAnalytics** | At-a-glance (market cap, % change, high/low, sector); technical indicators (RSI, MACD, Bollinger Bands). Props: `symbol`, `analytics`, `stock`, `loading`, `error` |
| **PlaidLink** | Bank connect; `onSuccess`, `onExit` |
| **SpendingAnalytics** | Budget charts (by category, trends) |
| **CategoryManager** | Category CRUD |

---

## Key pages

| Route | Page | Notes |
|-------|------|-------|
| `/` | Landing | Redirects to dashboard if logged in |
| `/login`, `/register` | Auth | Email/password + Google OAuth |
| `/dashboard` | Dashboard | Watchlist/alerts count, budget summary |
| `/watchlist` | Watchlist | Filter, sort, add/remove, alerts |
| `/stock/:symbol` | StockDetails | Chart, analytics, news, add to watchlist, create alert |
| `/search` | Search | **Type-ahead search by ticker or company name** (e.g. "cloudflare" → NET); add to watchlist |
| `/find-stocks` | FindStocks | Market overview, trending, news |
| `/alerts` | Alerts | List, create, delete |
| `/budget` | Budget | Summary, spending, budgets, goals |
| `/transactions` | Transactions | List, filters, categorize, manual add |
| `/categories` | Categories | System + custom categories |
| `/settings` | Settings | Profile, phone verification, Plaid accounts |
| `/faq` | FAQ | **Technical indicators, statistics, budgeting**; jump-to sections |

---

## Utils (`formatters.js`)

- **safeExternalUrl(url)** – Use for `href`. Returns `url` if `http`/`https`, else `#`.
- **safeImageUrl(url)** – Use for `img src`. Returns `url` if `http`/`https`, else `null`.
- **formatMarketCap(millions)** – Format market cap (e.g. `1234` → `"1.23B"`).

News links and images use these helpers to avoid `javascript:` / `data:` URLs.

---

## API usage

All API calls use **`withCredentials: true`** (set globally in `main.jsx`) for session cookies.

```js
// Auth
await axios.get('/api/user');
await axios.post('/api/login', { email, password });
await axios.post('/api/register', { email, password, first_name, ... });
await axios.post('/api/logout');

// Stocks
await axios.get('/api/watchlist', { params: { filter, capFilter } });
await axios.get('/api/stock/' + symbol);
await axios.get('/api/search/suggest', { params: { q } });
await axios.get('/api/chart/' + symbol, { params: { period } });
await axios.get('/api/analytics/' + symbol, { params: { period } });
await axios.post('/api/watchlist/add', { symbol, price, dayhigh, daylow, ... });
await axios.post('/api/watchlist/delete', { symbol });

// Alerts, budget, transactions, etc. – see server README for routes.
```

---

## Routing

- **Public:** `/`, `/login`, `/register`, `/faq` (redirect to dashboard if authenticated).
- **Protected:** `/dashboard`, `/watchlist`, `/stock/:symbol`, `/search`, `/find-stocks`, `/alerts`, `/budget`, `/transactions`, `/categories`, `/settings`.

`PrivateRoute` redirects unauthenticated users to landing.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server + HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Config

**vite.config.js** – Proxy `/api` to backend. No separate `baseURL` needed in dev.

For production, frontend is typically built and served from `server/public/` (same origin as API).

---

For full project docs, see the [main README](../README.md) and [SECURITY.md](../SECURITY.md).
