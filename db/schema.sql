-- Drop existing tables (for resetting the database)
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS stocks;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  userid SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  passwordhash TEXT NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(25)
);

-- Stocks table
CREATE TABLE stocks (
  stockid SERIAL PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  companyname VARCHAR(100) NOT NULL,
  sector VARCHAR(50),
  marketcap NUMERIC (15,2),
  currentprice NUMERIC (10,2),
  dayhigh NUMERIC(10,2),
  daylow NUMERIC(10,2),
  updatedat TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table (many-to-many: user <-> stock)
CREATE TABLE watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(userid) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(stockid) ON DELETE CASCADE,
  createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(stockid) ON DELETE CASCADE,
);

-- Alerts table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(userid) ON DELETE CASCADE,
  stock_id INTEGER REFERENCES stocks(stockid) ON DELETE CASCADE,
  targetprice NUMERIC(10,2) NOT NULL,
  direction VARCHAR(4),
  triggered BOOLEAN DEFAULT FALSE,
  createdat TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
