# TrendTracker 📈

> An all-in-one finance management platform for tracking stocks, managing budgets, and achieving financial goals.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.2.0-blue)](https://reactjs.org/)

## 🌟 Features

### Stock Market Management
- **Real-Time Stock Tracking** - Live stock quotes powered by Finnhub API with intelligent caching
- **Personal Watchlist** - Search and add stocks to your customizable watchlist
- **Price Alerts** - Set target prices and receive instant notifications via email or SMS
- **Interactive Charts** - Historical price data with multiple timeframes (1H, 1D, 1W, 1M, 3M, 6M)
- **Stock Analytics** - Technical indicators including RSI, MACD, Bollinger Bands, and volatility metrics
- **Market Overview** - View trending stocks, top gainers, and losers
- **News Integration** - Real-time market news and company-specific articles

### Budget Management (NEW)
- **Bank Account Integration** - Securely connect bank accounts via Plaid API
- **Automatic Transaction Sync** - Daily transaction imports from all connected accounts
- **Smart Categorization** - AI-powered transaction categorization with manual override
- **Budget Goals** - Set and track monthly or weekly spending limits by category
- **Spending Analytics** - Visual insights into spending patterns with charts and trends
- **Budget Alerts** - Receive notifications when approaching or exceeding budget limits
- **Category Management** - Create custom categories or use system defaults

### Security & Authentication
- **Multi-Factor Authentication** - Email/password or Google OAuth 2.0
- **End-to-End Encryption** - AES-256-GCM encryption for sensitive financial data
- **Rate Limiting** - Protection against brute force and DDoS attacks
- **Security Audit Logs** - Comprehensive logging of all security-sensitive events
- **Phone Verification** - SMS-based phone number verification via Twilio

## 🚀 Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **React Router v7** - Client-side routing
- **Vite** - Lightning-fast build tool and dev server
- **Recharts** - Beautiful, composable charts for data visualization
- **Axios** - Promise-based HTTP client

### Backend
- **Node.js 22** - JavaScript runtime
- **Express 5** - Fast, minimalist web framework
- **PostgreSQL 15** - Robust relational database
- **Passport.js** - Authentication middleware (Local + Google OAuth2)
- **Helmet.js** - Security headers
- **Express Rate Limit** - Rate limiting middleware
- **Express Validator** - Input validation and sanitization
- **Node-Cron** - Scheduled task automation

### External Services
- **[Plaid API](https://plaid.com/)** - Bank account linking and transaction data
- **[Finnhub API](https://finnhub.io/)** - Real-time stock quotes and market data
- **[Yahoo Finance](https://finance.yahoo.com/)** - Historical chart data (via Python)
- **[Twilio](https://www.twilio.com/)** - SMS notifications
- **[Nodemailer](https://nodemailer.com/)** - Email notifications
- **Google OAuth 2.0** - Social authentication

### DevOps & Tools
- **Docker & Docker Compose** - Containerization
- **Python 3** - Data processing scripts
- **ESLint** - Code linting
- **Git** - Version control

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **PostgreSQL** 15.0 or higher
- **Python** 3.8 or higher with pip
- **Docker** (optional, for containerized deployment)
- **API Keys** (see Environment Variables section)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Stock-Portfolio-Tracker.git
cd Stock-Portfolio-Tracker
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
pip install -r requirements.txt
```

**Frontend:**
```bash
cd ../client
npm install
```

### 3. Database Setup

Create a PostgreSQL database:

```bash
createdb trendtracker
```

Run the migration scripts:

```bash
cd server
node scripts/migrate_sms.js
node scripts/migrate_budget.js
```

### 4. Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=trendtracker
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Session Configuration
SESSION_SECRET=your_long_random_session_secret_here

# Stock Market API
API_KEY=your_finnhub_api_key

# Plaid Configuration (Budget Features)
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # sandbox, development, or production

# Encryption (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_64_character_hex_encryption_key

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Python Configuration
PYTHON_PATH=python3
```

### 5. Obtain API Keys

#### Required APIs:
- **Finnhub** - [Sign up](https://finnhub.io/register) for free API key
- **Plaid** - [Sign up](https://dashboard.plaid.com/signup) for sandbox access

#### Optional APIs:
- **Twilio** - [Sign up](https://www.twilio.com/try-twilio) for SMS functionality
- **Google OAuth** - [Create project](https://console.cloud.google.com/) for social login

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Access the application at `http://localhost:5173`

### Production Mode with Docker

```bash
# Set environment variables
export POSTGRES_PASSWORD=your_secure_password

# Build and start all services
docker-compose up --build
```

Access the application at `http://localhost:3000`

## 📁 Project Structure

```
Stock-Portfolio-Tracker/
├── client/                     # React frontend application
│   ├── public/                 # Static assets
│   │   ├── google-logo.svg
│   │   └── icon.svg
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── CreateAlertModal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── NewsCard.jsx
│   │   │   ├── PlaidLink.jsx
│   │   │   ├── SpendingAnalytics.jsx
│   │   │   ├── CategoryManager.jsx
│   │   │   └── StockAnalytics.jsx
│   │   ├── context/            # React Context providers
│   │   │   └── AuthContext.jsx
│   │   ├── pages/              # Page-level components
│   │   │   ├── Alerts.jsx
│   │   │   ├── Budget.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FAQ.jsx
│   │   │   ├── FindStocks.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── StockDetails.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── Watchlist.jsx
│   │   ├── utils/              # Utility functions
│   │   │   └── formatters.js
│   │   ├── App.jsx             # Main app component
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx            # Entry point
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── server/                     # Express backend application
│   ├── middleware/             # Custom middleware
│   │   └── security.js         # Security, rate limiting, validation
│   ├── scripts/                # Utility scripts
│   │   ├── get-json-stock-data.py
│   │   ├── migrate_budget.js
│   │   ├── migrate_sms.js
│   │   └── stock_analytics.py
│   ├── services/               # Business logic services
│   │   ├── auditLogService.js
│   │   ├── budgetCalculationService.js
│   │   ├── plaidService.js
│   │   └── transactionSyncService.js
│   ├── utils/                  # Utility functions
│   │   └── encryption.js       # AES-256-GCM encryption
│   ├── public/                 # Static files
│   │   ├── data/               # Temporary data storage
│   │   ├── images/
│   │   └── styles.css
│   ├── index.js                # Main server file
│   ├── package.json
│   ├── requirements.txt
│   └── README.md
│
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Multi-stage Docker build
├── .dockerignore
├── .gitignore
└── README.md                   # This file
```

## 🔌 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/register` | Register new user | No |
| POST | `/api/login` | Login with email/password | No |
| GET | `/auth/google` | Login with Google OAuth | No |
| POST | `/api/logout` | Logout current user | Yes |
| GET | `/api/user` | Get current user info | Yes |

### Stock Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/watchlist` | Get user's watchlist | Yes |
| POST | `/api/watchlist/add` | Add stock to watchlist | Yes |
| POST | `/api/watchlist/delete` | Remove stock from watchlist | Yes |
| GET | `/api/stock/:symbol` | Get stock details | Yes |
| GET | `/api/search` | Search for stocks | Yes |
| GET | `/api/chart/:symbol` | Get historical chart data | Yes |
| GET | `/api/analytics/:symbol` | Get technical analytics | Yes |

### Alert Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/alerts` | Get user's alerts | Yes |
| POST | `/api/alerts/create` | Create price alert | Yes |
| POST | `/api/alerts/delete` | Delete alert | Yes |
| POST | `/api/alerts/check` | Manually trigger alert check | Yes |

### Budget & Banking Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/plaid/create-link-token` | Get Plaid Link token | Yes |
| POST | `/api/plaid/exchange-public-token` | Connect bank account | Yes |
| GET | `/api/plaid/accounts` | Get connected accounts | Yes |
| POST | `/api/plaid/accounts/:id/disconnect` | Disconnect account | Yes |
| POST | `/api/plaid/accounts/:id/sync` | Sync account transactions | Yes |
| POST | `/api/plaid/sync-all` | Sync all accounts | Yes |
| POST | `/api/plaid/webhook` | Plaid webhook handler | No |

### Transaction Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/transactions` | Get transactions with filters | Yes |
| POST | `/api/transactions/manual` | Create manual transaction | Yes |
| PUT | `/api/transactions/:id/category` | Update transaction category | Yes |
| PUT | `/api/transactions/:id/notes` | Update transaction notes | Yes |
| DELETE | `/api/transactions/:id` | Delete manual transaction | Yes |

### Budget Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/budgets` | Get user's budgets | Yes |
| GET | `/api/budgets/summary` | Get budget summary | Yes |
| POST | `/api/budgets` | Create budget | Yes |
| PUT | `/api/budgets/:id` | Update budget | Yes |
| DELETE | `/api/budgets/:id` | Delete budget | Yes |

### Category Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/categories` | Get all categories | Yes |
| GET | `/api/categories/system` | Get system categories | Yes |
| POST | `/api/categories` | Create custom category | Yes |
| PUT | `/api/categories/:id` | Update category | Yes |
| DELETE | `/api/categories/:id` | Delete category | Yes |

### Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/spending/by-category` | Get spending by category | Yes |
| GET | `/api/spending/trends` | Get spending trends | Yes |
| GET | `/api/budget/alerts` | Check budget alerts | Yes |

### Market Data Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/news` | Get general market news | Yes |
| GET | `/api/news/:symbol` | Get stock-specific news | Yes |
| GET | `/api/market/overview` | Get market overview | Yes |

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts and authentication
- **stocks** - Stock information and current prices
- **watchlist** - User watchlist entries
- **alerts** - Price alert configurations
- **session** - User session management

### Budget Management Tables
- **bank_accounts** - Connected Plaid accounts
- **transactions** - Imported and manual transactions
- **budget_categories** - System and custom categories
- **budgets** - Budget configurations by category
- **budget_goals** - Long-term financial goals
- **audit_logs** - Security and activity logs

For detailed schema, see `server/scripts/migrate_budget.js`

## 🔒 Security Features

- **Data Encryption** - AES-256-GCM for sensitive data (Plaid tokens)
- **Password Hashing** - Bcrypt with salt rounds
- **Session Management** - Secure HTTP-only cookies with PostgreSQL store
- **Rate Limiting** - Configurable limits per endpoint
- **Input Validation** - Express Validator sanitization
- **Security Headers** - Helmet.js middleware
- **CORS Protection** - Configured origins
- **SQL Injection Protection** - Parameterized queries
- **Audit Logging** - All sensitive operations logged

## 🤖 Automated Tasks

The application runs several automated cron jobs:

- **Stock Price Refresh** - Every 10 minutes during market hours
- **Price Alert Check** - Every 5 minutes
- **Transaction Sync** - Daily at 6:00 AM
- **Budget Alerts** - Daily at 8:00 AM

## 🧪 Testing

### Run Linting

```bash
cd client
npm run lint
```

### Test Plaid in Sandbox

Use these test credentials in sandbox mode:
- **Username:** `user_good`
- **Password:** `pass_good`

## 📦 Deployment

### Environment Setup

1. Set `NODE_ENV=production` in server `.env`
2. Update CORS origins in `server/index.js`
3. Set Plaid to `development` or `production` environment
4. Configure SSL/TLS certificates
5. Set secure session cookie settings

### Build Frontend

```bash
cd client
npm run build
```

Copy `dist/` contents to `server/public/`

### Start Production Server

```bash
cd server
node index.js
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

**Database connection error:**
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -l`

**Python script errors:**
- Install requirements: `pip install -r server/requirements.txt`
- Check Python path in `.env`

**Plaid connection issues:**
- Verify API keys are correct
- Ensure `PLAID_ENV` matches your credentials
- Check webhook URL is accessible (use ngrok for local testing)

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Lucas Stone**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: lucasstone49@gmail.com

## 🙏 Acknowledgments

- [Finnhub](https://finnhub.io/) for market data API
- [Plaid](https://plaid.com/) for banking infrastructure
- [Twilio](https://www.twilio.com/) for SMS services
- [Yahoo Finance](https://finance.yahoo.com/) for historical data

## 📸 Screenshots

Coming soon...

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Cryptocurrency tracking
- [ ] Investment portfolio analysis
- [ ] Tax optimization tools
- [ ] Social features (share watchlists)
- [ ] Advanced charting tools

---

⭐ Star this repo if you find it useful!
