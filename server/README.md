# TrendTracker Backend Server

Express.js backend API for TrendTracker - a comprehensive finance management platform.

## 📚 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Routes](#api-routes)
- [Services](#services)
- [Middleware](#middleware)
- [Automated Tasks](#automated-tasks)
- [Security](#security)
- [Scripts](#scripts)

## 🎯 Overview

The backend server provides RESTful API endpoints for:
- User authentication (local + OAuth)
- Stock market data retrieval and caching
- Watchlist and alert management
- Bank account integration via Plaid
- Budget and transaction management
- Real-time notifications (email/SMS)
- Security audit logging

## 🔧 Tech Stack

### Core Dependencies
- **Express 5.1.0** - Web framework
- **PostgreSQL 8.16.3** - Database driver
- **Passport 0.7.0** - Authentication middleware
  - `passport-local` - Email/password authentication
  - `passport-google-oauth2` - Google OAuth integration
- **Bcrypt 6.0.0** - Password hashing
- **Express-Session 1.18.1** - Session management with PostgreSQL store

### Budget & Banking
- **Plaid 12.0.0** - Banking API integration
- **Node-Cron 4.2.1** - Scheduled task automation

### Security
- **Helmet 7.1.0** - Security headers
- **Express-Rate-Limit 7.2.0** - Rate limiting
- **Express-Validator 7.0.1** - Input validation and sanitization
- **Crypto** (built-in) - AES-256-GCM encryption

### External APIs
- **Axios 1.8.4** - HTTP client
- **Yahoo-Finance2 3.10.2** - Yahoo Finance integration
- **Nodemailer 7.0.9** - Email notifications
- **Twilio 5.10.7** - SMS notifications

### Utilities
- **dotenv 16.6.1** - Environment variable management
- **body-parser 2.2.0** - Request body parsing
- **cors 2.8.5** - CORS middleware

## 🚀 Installation

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for data processing
pip install -r requirements.txt
```

## 🔐 Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=trendtracker
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Session Configuration
SESSION_SECRET=your_long_random_string_at_least_32_characters

# Stock Market API (Finnhub)
API_KEY=your_finnhub_api_key

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret_for_selected_env
PLAID_ENV=sandbox  # sandbox | development | production

# Encryption Key (Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_64_character_hex_string

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_specific_password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Python Configuration
PYTHON_PATH=python3
SCRIPT_PATH=/path/to/scripts/get-json-stock-data.py  # Production only
ANALYTICS_SCRIPT_PATH=/path/to/scripts/stock_analytics.py  # Production only
```

### Obtaining API Keys

#### Finnhub (Required)
1. Sign up at [https://finnhub.io/register](https://finnhub.io/register)
2. Get your API key from the dashboard
3. Free tier: 60 API calls/minute

#### Plaid (Required for Budget Features)
1. Sign up at [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Get `client_id` and `secret` from Team Settings → Keys
3. Start with `sandbox` environment (free)
4. Test credentials: username: `user_good`, password: `pass_good`

#### Twilio (Optional - for SMS)
1. Sign up at [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Get Account SID and Auth Token from console
3. Get a phone number for sending SMS

#### Gmail (Optional - for Email)
1. Enable 2FA on your Gmail account
2. Generate an App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the app password in `EMAIL_PASS`

#### Google OAuth (Optional - for Social Login)
1. Create project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

## 🗄️ Database Setup

### Create Database

```bash
createdb trendtracker
```

### Run Migrations

```bash
# Run migrations in order
node scripts/migrate_sms.js       # Add phone/SMS fields to users & alerts
node scripts/migrate_budget.js     # Create budget management tables
```

### Database Schema

#### Core Tables

**users**
```sql
- id (PRIMARY KEY)
- email (UNIQUE)
- password_hash
- first_name
- phone
- is_phone_verified
- created_at
```

**stocks**
```sql
- stockid (PRIMARY KEY)
- symbol (UNIQUE)
- companyname
- currentprice
- dayhigh
- daylow
- marketcap
- sector
- updatedat
```

**watchlist**
```sql
- user_id (FOREIGN KEY → users)
- stock_id (FOREIGN KEY → stocks)
- PRIMARY KEY (user_id, stock_id)
```

**alerts**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- stock_id (FOREIGN KEY → stocks)
- target_price
- direction (up/down)
- triggered
- alert_method (email/sms/both)
- created_at
```

#### Budget Management Tables

**bank_accounts**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- plaid_account_id (UNIQUE)
- plaid_item_id
- institution_name
- account_name
- account_type
- account_subtype
- mask
- access_token (ENCRYPTED)
- is_active
- created_at
- updated_at
```

**transactions**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- account_id (FOREIGN KEY → bank_accounts)
- plaid_transaction_id (UNIQUE)
- amount
- date
- name
- merchant_name
- category_id (FOREIGN KEY → budget_categories)
- is_manual
- notes
- created_at
- updated_at
```

**budget_categories**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users, NULL for system)
- name
- color
- icon
- is_system
- parent_category_id
- created_at
```

**budgets**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- category_id (FOREIGN KEY → budget_categories)
- amount
- period_type (monthly/weekly)
- is_active
- created_at
- updated_at
```

**budget_goals**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- category_id (FOREIGN KEY → budget_categories)
- target_amount
- goal_type (save/reduce)
- period_type
- is_active
- created_at
```

**audit_logs**
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- action_type
- action_details (JSONB)
- ip_address
- user_agent
- success
- created_at
```

## 🛣️ API Routes

### Authentication Routes

```javascript
POST   /api/register                    // Register new user
POST   /api/login                       // Login with credentials
POST   /api/logout                      // Logout
GET    /api/user                        // Get current user info
GET    /auth/google                     // Initiate Google OAuth
GET    /auth/google/callback            // Google OAuth callback
```

### Stock Management Routes

```javascript
GET    /api/watchlist                   // Get user's watchlist
POST   /api/watchlist/add               // Add stock to watchlist
POST   /api/watchlist/delete            // Remove stock
GET    /api/stock/:symbol               // Get stock details
GET    /api/search                      // Search stocks
GET    /api/chart/:symbol               // Get chart data (Python)
GET    /api/analytics/:symbol           // Get technical indicators
```

### Alert Routes

```javascript
GET    /api/alerts                      // Get user's alerts
POST   /api/alerts/create               // Create alert
POST   /api/alerts/delete               // Delete alert
POST   /api/alerts/check                // Manual alert check
```

### Market Data Routes

```javascript
GET    /api/news                        // General market news
GET    /api/news/:symbol                // Stock-specific news
GET    /api/market/overview             // Trending/gainers/losers
```

### Settings Routes

```javascript
GET    /api/settings                    // Get user settings
POST   /api/settings/phone/send-code    // Send verification code
POST   /api/settings/phone/verify       // Verify phone number
```

### Plaid/Banking Routes

```javascript
POST   /api/plaid/create-link-token     // [RATE LIMITED] Get Plaid Link token
POST   /api/plaid/exchange-public-token // [RATE LIMITED] Exchange token & save account
GET    /api/plaid/accounts               // Get connected accounts
POST   /api/plaid/accounts/:id/disconnect // Disconnect account
POST   /api/plaid/accounts/:id/sync      // [RATE LIMITED] Sync account transactions
POST   /api/plaid/sync-all               // [RATE LIMITED] Sync all accounts
POST   /api/plaid/webhook                // Plaid webhook handler
```

### Transaction Routes

```javascript
GET    /api/transactions                // Get transactions (with filters)
POST   /api/transactions/manual         // Create manual transaction
PUT    /api/transactions/:id/category   // Update category
PUT    /api/transactions/:id/notes      // Update notes
DELETE /api/transactions/:id            // Delete manual transaction
```

### Budget Routes

```javascript
GET    /api/budgets                     // Get user's budgets
GET    /api/budgets/summary             // Get budget summary
POST   /api/budgets                     // Create budget
PUT    /api/budgets/:id                 // Update budget
DELETE /api/budgets/:id                 // Delete budget
```

### Budget Goals Routes

```javascript
GET    /api/budget-goals                // Get user's goals
GET    /api/budget-goals/progress       // Get goal progress
POST   /api/budget-goals                // Create goal
PUT    /api/budget-goals/:id            // Update goal
DELETE /api/budget-goals/:id            // Delete goal
```

### Category Routes

```javascript
GET    /api/categories                  // Get all categories
GET    /api/categories/system           // Get system categories
POST   /api/categories                  // Create custom category
PUT    /api/categories/:id              // Update category
DELETE /api/categories/:id              // Delete category
```

### Analytics Routes

```javascript
GET    /api/spending/by-category        // Spending breakdown
GET    /api/spending/trends             // Monthly spending trends
GET    /api/budget/alerts               // Budget alert check
```

## 🔧 Services

### `plaidService.js`
Handles all Plaid API interactions:
- `isPlaidConfigured()` - Check if Plaid is set up
- `createLinkToken(userId, clientUserId)` - Generate Link token
- `exchangePublicToken(publicToken)` - Exchange for access token
- `getAccounts(encryptedToken)` - Fetch account details
- `getTransactions(encryptedToken, startDate, endDate)` - Fetch transactions
- `removeItem(encryptedToken)` - Disconnect bank account
- `encryptAccessToken(token)` - Encrypt token for storage
- `decryptAccessToken(encrypted)` - Decrypt stored token

### `transactionSyncService.js`
Manages transaction synchronization:
- `syncAccountTransactions(db, account)` - Sync single account
- `syncUserTransactions(db, userId)` - Sync all user accounts
- `syncAllTransactions(db)` - Sync all users (cron job)
- `getTransactions(db, userId, filters)` - Get filtered transactions
- `addManualTransaction(db, userId, data)` - Add manual entry
- `categorizeTransaction(name)` - Auto-categorize transactions

### `budgetCalculationService.js`
Budget calculations and analytics:
- `getBudgetSummary(db, userId, periodType)` - Overall budget status
- `getSpendingByCategory(db, userId, startDate, endDate)` - Category breakdown
- `getSpendingTrends(db, userId, months)` - Historical trends
- `checkBudgetAlerts(db, userId)` - Check for budget warnings
- `getBudgetGoalProgress(db, userId)` - Goal tracking
- `getPeriodDates(periodType)` - Calculate date ranges

### `auditLogService.js`
Security event logging:
- `logBankConnection(db, req, userId, institutionName, success)`
- `logBankDisconnection(db, req, userId, accountId)`
- `logTransactionSync(db, userId, accountId, result)`
- `logAuthFailure(db, req, email)`
- `logWebhook(db, req, webhookType, success, payload)`

## 🛡️ Middleware

### `middleware/security.js`

**Helmet Middleware**
- Sets secure HTTP headers
- XSS protection
- Content Security Policy
- HSTS enforcement

**Rate Limiters**
```javascript
generalLimiter     // 100 requests per 15 min
authLimiter        // 5 requests per 15 min (login/register)
plaidLimiter       // 10 requests per 15 min (Plaid endpoints)
syncLimiter        // 5 requests per hour (transaction sync)
```

**Validators**
```javascript
validators.transactionFilters      // GET /api/transactions
validators.createTransaction       // POST /api/transactions/manual
validators.updateTransactionCategory // PUT /api/transactions/:id/category
validators.createCategory          // POST /api/categories
validators.createBudget            // POST /api/budgets
validators.updateBudget            // PUT /api/budgets/:id
validators.createGoal              // POST /api/budget-goals
validators.idParam                 // Any route with :id param
```

**Authorization Middleware**
```javascript
createAuthorizationMiddleware(db)  // Creates authorization checker
isAuthenticated(req, res, next)    // Passport auth check
requireLogin(req, res, next)       // Redirect-based auth
```

### `utils/encryption.js`

**AES-256-GCM Encryption**
```javascript
encrypt(text)               // Encrypt sensitive data
decrypt(encryptedData)      // Decrypt sensitive data
generateEncryptionKey()     // Generate new key
```

## ⏰ Automated Tasks

### Stock Price Refresh (Every 10 minutes)
```javascript
cron.schedule('*/10 * * * *', refreshAllStockData);
```
- Checks if market is open
- Updates prices for all tracked stocks
- Respects API rate limits (25 stocks/batch)
- Triggers alert checks after update

### Price Alert Check (Every 5 minutes)
```javascript
setInterval(checkAlertsAndNotify, 300000);
```
- Checks all active alerts
- Sends email/SMS notifications
- Marks triggered alerts

### Transaction Sync (Daily at 6 AM)
```javascript
cron.schedule('0 6 * * *', syncAllTransactions);
```
- Syncs transactions for all connected accounts
- Auto-categorizes new transactions
- Logs sync results

### Budget Alerts (Daily at 8 AM)
```javascript
cron.schedule('0 8 * * *', checkBudgetAlerts);
```
- Checks all active budgets
- Identifies over-budget categories
- Sends email/SMS warnings
- Alerts for approaching limits (>80%)

## 🔒 Security Features

### Data Protection
- **Encryption at Rest** - Plaid access tokens encrypted with AES-256-GCM
- **Password Hashing** - Bcrypt with 10 salt rounds
- **Session Security** - HTTP-only cookies, secure in production
- **Database Security** - Parameterized queries prevent SQL injection

### Access Control
- **Authentication Required** - Most endpoints require valid session
- **User Isolation** - Users can only access their own data
- **Rate Limiting** - Prevents brute force and abuse
- **Input Validation** - All user inputs sanitized

### Audit Trail
- **Security Events** - Bank connections, auth failures logged
- **Transaction History** - All financial actions tracked
- **IP & User Agent** - Captured for all sensitive operations

### Headers & CORS
- **Helmet.js** - Secure headers (CSP, XSS, etc.)
- **CORS** - Restricted to specific origins
- **Trust Proxy** - Proper IP detection behind reverse proxy

## 📜 Scripts

### Migration Scripts

```bash
# Add phone verification to users and alerts
node scripts/migrate_sms.js

# Create budget management tables
node scripts/migrate_budget.js
```

### Python Data Scripts

```bash
# Generate stock chart data (called by API)
python3 scripts/get-json-stock-data.py <SYMBOL> <PERIOD>

# Generate technical analytics (called by API)
python3 scripts/stock_analytics.py <SYMBOL> <PERIOD>
```

**Supported Periods:** `1h`, `1d`, `1w`, `1m`, `3m`, `6m`

## 🚀 Running the Server

### Development Mode
```bash
npm start    # Uses nodemon for auto-reload
```

### Production Mode
```bash
node index.js
```

### With Docker
```bash
docker-compose up --build
```

## 📊 API Response Formats

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

### Validation Error
```json
{
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🐛 Debugging

### Enable Verbose Logging
```javascript
// Set in index.js
console.log('[Service] Detailed message');
```

### Check Active Connections
```bash
psql -d trendtracker -c "SELECT * FROM pg_stat_activity;"
```

### Test Plaid Connection
```javascript
// In console
const plaid = require('./services/plaidService.js');
await plaid.createLinkToken('test-user-id', 'test-client-id');
```

### Monitor Rate Limits
Watch for HTTP 429 responses in logs

## 📚 Dependencies Reference

| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.1.0 | Web framework |
| pg | 8.16.3 | PostgreSQL client |
| passport | 0.7.0 | Authentication |
| bcrypt | 6.0.0 | Password hashing |
| plaid | 12.0.0 | Banking API |
| helmet | 7.1.0 | Security headers |
| express-rate-limit | 7.2.0 | Rate limiting |
| express-validator | 7.0.1 | Input validation |
| nodemailer | 7.0.9 | Email service |
| twilio | 5.10.7 | SMS service |
| axios | 1.8.4 | HTTP client |
| node-cron | 4.2.1 | Task scheduling |

## 📝 License

MIT

---

For full project documentation, see the [main README](../README.md).
