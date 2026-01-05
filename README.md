# TrendTracker - Stock Portfolio Tracker

A full-stack web application for tracking stocks, managing watchlists, and receiving price alerts via email and SMS.

## Features

- **User Authentication** - Secure login with email/password or Google OAuth
- **Stock Watchlist** - Search and add stocks to your personal watchlist
- **Price Alerts** - Set target prices and receive notifications when triggered
- **Multi-Channel Notifications** - Get alerts via email (Nodemailer) or SMS (Twilio)
- **Real-Time Data** - Live stock quotes from Finnhub API with intelligent caching
- **Interactive Charts** - Historical price charts with multiple timeframes (1H, 1D, 1W, 1M, 3M, 6M)
- **Market Overview** - View trending stocks, top gainers, and losers
- **News Integration** - Stock-specific news articles
- **Responsive Design** - Mobile-friendly interface

## Tech Stack

### Frontend
- React 19 with React Router
- Vite for build tooling
- Recharts for data visualization
- Axios for API requests
- CSS with Bootstrap

### Backend
- Node.js with Express 5
- PostgreSQL 15 for data persistence
- Passport.js for authentication (local + Google OAuth2)
- Python scripts for Yahoo Finance data processing

### Infrastructure
- Docker & Docker Compose
- Multi-stage Docker builds

### External APIs
- [Finnhub](https://finnhub.io/) - Real-time stock quotes and market data
- [Yahoo Finance](https://finance.yahoo.com/) - Historical chart data

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Python 3 with pip
- Docker (optional)

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Database
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=trendtracker
DB_PASSWORD=your_db_password
DB_PORT=5432

# Session
SESSION_SECRET=your_session_secret

# APIs
API_KEY=your_finnhub_api_key

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Local Development

**Backend:**
```bash
cd server
npm install
pip install -r requirements.txt
npm start
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to the backend on port 3000.

### Docker

```bash
# Set required environment variables
export POSTGRES_PASSWORD=your_secure_password

# Build and run
docker-compose up --build
```

Access the application at `http://localhost:3000`

## Project Structure

```
.
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (auth)
│   │   ├── pages/          # Page components
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Express backend
│   ├── scripts/            # Python data processing
│   ├── public/             # Static files
│   ├── index.js            # Main server file
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/register` - Create new account
- `POST /api/login` - Login with credentials
- `GET /api/auth/google` - Google OAuth login
- `POST /api/logout` - Logout

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add stock to watchlist
- `DELETE /api/watchlist/:symbol` - Remove stock

### Alerts
- `GET /api/alerts` - Get user's alerts
- `POST /api/alerts` - Create price alert
- `DELETE /api/alerts/:id` - Delete alert

### Market Data
- `GET /api/search?q=` - Search stocks
- `GET /api/quote/:symbol` - Get stock quote
- `GET /api/stock/:symbol/news` - Get stock news
- `GET /api/trending` - Get trending stocks
- `GET /api/gainers` - Get top gainers
- `GET /api/losers` - Get top losers

## License

MIT
