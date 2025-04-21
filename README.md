# Stock Watchlist App

A lightweight web app that lets you track your favorite stocks, view up‑to‑date quotes, and set email price alerts. Built with Node.js, Express, EJS templating, and PostgreSQL.

## Features
- User auth: Sign up, log in, and manage your own watchlist  
- Watchlist management: Add or remove stocks by symbol  
- Live quotes: Fetch real‑time prices and market data via a free API (e.g. Finnhub or Alpha Vantage)  
- Sorting & filtering: Alphabetical or by market cap  
- Price alerts: Get an email when a stock crosses your target price  

## Tech Stack
- Backend:** Node.js, Express, express-session  
- Database:** PostgreSQL (pg)  
- HTTP client:** Axios  
- Email: Nodemailer + Gmail SMTP  
- Templating: EJS
- API: finnhub.io - RestAPI that is "one of the most comprehensive financial API available on the market."

# SETUP INSTRUCTIONS

1. Clone the repository

git clone https://github.com/yourusername/stock-watchlist.git
cd stock-watchlist

2. Install dependencies

npm install

3. Set up the database

createdb stock_watchlist
psql -U your_pg_user -d stock_watchlist -f db/schema.sql

4. Create your own .env file and fill in your data 
(can get free finnhub api online @ https://finnhub.io/dashboard (60 requests/min))
(also if you have Google 2FA, have to use an "App Password" for EMAIL_PASS)

cp .env.example .env

5. Start the App

node index.js

6. Open in your browser

http://localhost:3000

## You can now register an account, search stocks, create watchlists, and set google email price alerts!!