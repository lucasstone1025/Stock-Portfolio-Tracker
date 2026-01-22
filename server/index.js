import 'dotenv/config';

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import connectPgSimple from 'connect-pg-simple';
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";
import axios from "axios";
import nodemailer from "nodemailer";
import flash from "connect-flash";
import cron from 'node-cron';
import { spawn } from 'child_process';
import cors from 'cors';

// Budget management imports
import {
  helmetMiddleware,
  generalLimiter,
  authLimiter,
  plaidLimiter,
  syncLimiter,
  handleValidationErrors,
  validators,
  createAuthorizationMiddleware
} from './middleware/security.js';
import * as plaidService from './services/plaidService.js';
import * as transactionSyncService from './services/transactionSyncService.js';
import * as budgetCalculationService from './services/budgetCalculationService.js';
import * as auditLogService from './services/auditLogService.js';

// Simple in-memory cache to avoid hitting API rate limits
const cache = {
  marketOverview: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 },
  stockNews: {}, // Per-symbol cache: { AAPL: { data: [...], timestamp: 123 }, ... }
  analytics: {} // Per-symbol-period cache: { "AAPL:1w": { data: {...}, timestamp: 123 }, ... }
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const STOCK_NEWS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for individual stock news
const ANALYTICS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for analytics

// Phone verification codes cache: { userId: { code: '123456', phone: '+1234567890', expiresAt: timestamp } }
const phoneVerificationCodes = {};
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);


const app = express();
app.set('trust proxy', 1); // trust proxy fix my problem!!

// Body parsing middleware - must be before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;
const saltRounds = 10;

const API_KEY = process.env.API_KEY;

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.on('connect', () => {
  console.log('Connected to the database');
});

// Initialize authorization middleware after db is created
const authMiddleware = createAuthorizationMiddleware(db);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

app.use(session({
  store: new PgSession({
    pool: db,
    tableName: "session",
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Set 'secure' to true in production, false in development
    secure: isProduction,
    sameSite: "lax", // 'lax' is a good default
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// serializeUser: store only the user ID in the session
passport.serializeUser((user, done) => {

  if (!user || typeof user.id === 'undefined') {
    console.error("FATAL: user obj is invalid during serialization:", user);
    return done(new Error("Invalid user object"));
  }


  done(null, user.id);
});

// deserializeUser: look up the user by ID on each request
passport.deserializeUser(async (id, done) => {

  try {
    const { rows } = await db.query(
      "SELECT id, email, first_name, phone FROM users WHERE id = $1",
      [id]
    );
    if (!rows || rows.length === 0) {
      console.error(`FATAL: No user found with ID: ${id}`);
      return done(null, false);
    }

    const user = rows[0];
    return done(null, user); // success here

  } catch (err) {
    console.error("FATAL: Database error during deserialization:", err);
    return done(err);
  }
});

//---------------------START OF FUNCTION HELPERS--------------------------------
import twilio from 'twilio';

let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log("Twilio client initialized");
} else {
  console.log("Twilio credentials missing. SMS alerts will not work.");
}

async function checkAlertsAndNotify() {
  console.log(`[${new Date().toISOString()}] Checking alerts...`);
  try {
    const alertResult = await db.query(
      `SELECT a.id, a.user_id, a.stock_id, a.target_price, a.direction, a.triggered, a.alert_method,
      u.email, u.phone, s.symbol
      FROM alerts a
      JOIN users u ON a.user_id = u.id
      JOIN stocks s ON a.stock_id = s.stockid
      WHERE a.triggered = FALSE`
    );

    if (alertResult.rows.length === 0) {
      console.log("No active alerts to check.");
      return;
    }

    // Group alerts by stock symbol to minimize API calls
    const alertsBySymbol = {};
    for (const alert of alertResult.rows) {
      if (!alertsBySymbol[alert.symbol]) {
        alertsBySymbol[alert.symbol] = [];
      }
      alertsBySymbol[alert.symbol].push(alert);
    }

    // Check price for each symbol
    for (const symbol in alertsBySymbol) {
      try {
        // Fetch current price
        const response = await axios.get("https://finnhub.io/api/v1/quote", {
          params: { symbol: symbol, token: API_KEY }
        });
        const currentPrice = response.data.c;

        if (!currentPrice) {
          console.error(`Failed to fetch price for ${symbol}`);
          continue;
        }

        // Check all alerts for this symbol
        for (const alert of alertsBySymbol[symbol]) {
          const target = parseFloat(alert.target_price);
          const direction = alert.direction; // 'up' or 'down'

          const shouldTrigger =
            (direction === "up" && currentPrice >= target) ||
            (direction === "down" && currentPrice <= target);

          if (shouldTrigger) {
            const messageText = `TrendTracker Alert: ${alert.symbol} has ${direction === "up" ? "risen above" : "fallen below"} your target of $${target}. Current: $${currentPrice}.`;
            let sentMethod = [];

            // Email
            if (alert.alert_method === 'email' || alert.alert_method === 'both' || !alert.alert_method) {
              await transporter.sendMail({
                from: '"TrendTracker" lucasstone49@gmail.com',
                to: alert.email,
                subject: `Price Alert for ${alert.symbol}`,
                text: messageText
              });
              sentMethod.push('email');
            }

            // SMS
            if ((alert.alert_method === 'sms' || alert.alert_method === 'both') && alert.phone && twilioClient) {
              try {
                await twilioClient.messages.create({
                  body: messageText,
                  from: process.env.TWILIO_PHONE_NUMBER,
                  to: alert.phone
                });
                sentMethod.push('sms');
              } catch (smsErr) {
                console.error("Failed to send SMS:", smsErr);
              }
            }

            await db.query(`UPDATE alerts SET triggered = TRUE WHERE id = $1`, [alert.id]);
            console.log(`Alert triggered for ${alert.symbol} (${direction} $${target}). Sent via: ${sentMethod.join(', ')}`);
          }
        }
      } catch (err) {
        console.error(`Error checking symbol ${symbol}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error in checkAlertsAndNotify:", err);
  }
}

// Check alerts every 5 minutes (300000 ms)
setInterval(checkAlertsAndNotify, 300000);

async function isMarketOpen() {

  try {
    const { data } = await axios.get("https://finnhub.io/api/v1/stock/market-status",
      {
        params: { exchange: "US", token: API_KEY }
      }
    );
    const marketOpen = data.isOpen;
    if (marketOpen == true) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error checking market status:", error);
    return false;
  }

}

// AUTOMATED STOCK REFRESH LOGIC

let isRefreshing = false;

async function refreshAllStockData() {

  if (isRefreshing) {
    console.log("Stock refresh in progress. Skipping alert check.");
    return;
  }

  console.log("Checking if market is open for stock refresh...");

  if (! await isMarketOpen()) {
    console.log("Market is closed. Skipping refresh.");
    return;
  }

  isRefreshing = true;
  console.log("Market is open. Starting stock data refresh process.");

  try {
    // find what stocks need updating 
    const { rows: stocksToUpdate } = await db.query(
      `SELECT DISTINCT symbol FROM stocks 
      WHERE symbol IN (
        SELECT DISTINCT symbol FROM watchlist
        UNION
        SELECT DISTINCT symbol FROM alerts WHERE triggered = false
      )`
    );

    if (stocksToUpdate.length === 0) {
      console.log("No stocks to refresh.");
      isRefreshing = false;
      return;
    }

    console.log(`Found ${stocksToUpdate.length} unique stocks to update.`);

    // Process in batches of 25 to stay well under 60/min limit
    const BATCH_SIZE = 25;
    const DELAY_BETWEEN_CALLS = 1500; // 1. 5 seconds between each call
    const DELAY_BETWEEN_BATCHES = 60000; // 60 seconds between batches

    for (let i = 0; i < stocksToUpdate.length; i += BATCH_SIZE) {
      const batch = stocksToUpdate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(stocksToUpdate.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNum} of ${totalBatches} (${batch.length} stocks)...`);

      for (const stock of batch) {
        const symbol = stock.symbol;
        try {
          const response = await axios.get("https://finnhub.io/api/v1/quote", {
            params: { symbol: symbol, token: API_KEY }
          });
          const quote = response.data;

          if (quote && quote.c) {
            // Update the stock's price in the database.
            await db.query(
              `UPDATE stocks SET currentprice = $1, dayhigh = $2, daylow = $3, updatedat = CURRENT_TIMESTAMP WHERE symbol = $4`,
              [quote.c, quote.h, quote.l, symbol]
            );
            console.log(`Updated ${symbol}: $${quote.c}`);
          } else {
            console.warn(`No quote data returned for ${symbol}.`);
          }

          // delay to be respectful of API rate limits
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS)); // 1.5 second delay
        } catch (apiError) {
          if (apiError.response?.status === 429) {
            console.log(`Rate limit hit while updating ${symbol}. Pausing for 60 seconds.`);
            await new Promise(resolve => setTimeout(resolve, 60000));
            i -= 1; //retry this stock 
          } else {
            console.error(`Failed to fetch or update data for symbol ${symbol}:`, apiError.message);
          }
        }
      }

      if (i + BATCH_SIZE < stocksToUpdate.length) {
        console.log(`Batch ${batchNum} complete. Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log("all stock prices updated. Now checking for alerts.");
    await checkAlertsAndNotify();
  } catch (err) {
    console.error("An error occurred during the refreshAllStockData process:", err);
  } finally {
    isRefreshing = false;
  }
}

// schedule job to run every 10 mins 
// cron syntax: '*/10 * * * *' means "at every 10th minute".
cron.schedule('*/10 * * * *', refreshAllStockData);

console.log('Automated stock refresh job scheduled to run every 10 minutes.');

// Schedule daily transaction sync at 6 AM
cron.schedule('0 6 * * *', async () => {
  console.log('[TransactionSync] Starting daily sync...');
  try {
    const result = await transactionSyncService.syncAllTransactions(db);
    console.log(`[TransactionSync] Daily sync complete: ${result.success}/${result.total} accounts synced`);
  } catch (err) {
    console.error('[TransactionSync] Daily sync failed:', err.message);
  }
});

console.log('Daily transaction sync scheduled for 6 AM.');

// Schedule budget alerts check at 8 AM daily
cron.schedule('0 8 * * *', async () => {
  console.log('[BudgetAlerts] Checking budget alerts...');
  try {
    // Get all users with active budgets
    const usersResult = await db.query(`
      SELECT DISTINCT u.id, u.email, u.phone, u.first_name
      FROM users u
      JOIN budgets b ON b.user_id = u.id AND b.is_active = TRUE
    `);
    
    for (const user of usersResult.rows) {
      try {
        const alerts = await budgetCalculationService.checkBudgetAlerts(db, user.id);
        
        if (alerts.length > 0) {
          // Build notification message
          const overBudget = alerts.filter(a => a.type === 'over_budget');
          const approaching = alerts.filter(a => a.type === 'approaching_limit');
          
          let message = `Hi ${user.first_name || 'there'},\n\n`;
          message += `TrendTracker Budget Alert:\n\n`;
          
          if (overBudget.length > 0) {
            message += `⚠️ OVER BUDGET:\n`;
            overBudget.forEach(a => {
              message += `  • ${a.categoryName}: $${a.spent.toFixed(2)} spent (budget: $${a.budgetAmount.toFixed(2)})\n`;
            });
            message += '\n';
          }
          
          if (approaching.length > 0) {
            message += `⏰ APPROACHING LIMIT:\n`;
            approaching.forEach(a => {
              message += `  • ${a.categoryName}: ${a.percentUsed.toFixed(0)}% used ($${a.spent.toFixed(2)} of $${a.budgetAmount.toFixed(2)})\n`;
            });
          }
          
          message += `\nView your budget: ${isProduction ? 'https://trendtracker.co/budget' : 'http://localhost:5173/budget'}`;
          
          // Send email notification
          await transporter.sendMail({
            from: '"TrendTracker" <' + process.env.EMAIL_USER + '>',
            to: user.email,
            subject: `Budget Alert: ${overBudget.length > 0 ? 'Over budget' : 'Approaching limit'}`,
            text: message
          });
          
          console.log(`[BudgetAlerts] Sent budget alert to ${user.email}`);
          
          // Send SMS if phone is available
          if (user.phone && twilioClient) {
            const smsMessage = overBudget.length > 0
              ? `TrendTracker: You're over budget in ${overBudget.length} categor${overBudget.length === 1 ? 'y' : 'ies'}. Check your app for details.`
              : `TrendTracker: You're approaching your budget limit in ${approaching.length} categor${approaching.length === 1 ? 'y' : 'ies'}. Check your app for details.`;
            
            try {
              await twilioClient.messages.create({
                body: smsMessage,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phone
              });
              console.log(`[BudgetAlerts] Sent SMS alert to ${user.phone}`);
            } catch (smsErr) {
              console.error(`[BudgetAlerts] Failed to send SMS to ${user.phone}:`, smsErr.message);
            }
          }
        }
      } catch (userErr) {
        console.error(`[BudgetAlerts] Error checking alerts for user ${user.id}:`, userErr.message);
      }
    }
    
    console.log('[BudgetAlerts] Budget alerts check completed.');
  } catch (err) {
    console.error('[BudgetAlerts] Failed to check budget alerts:', err.message);
  }
});

console.log('Daily budget alerts scheduled for 8 AM.');

function capitalizeFirst(name) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}


function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.status(401).send("Unauthorized: Please log in to access this resource.");
  }
}

//function to run python scripts

function runPythonScript() {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['scripts/get-json-stock-data.py']);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
      }
    });
  });
}

// ------------------ END OF FUNCTION HELPERS ---------------------------------



app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../_archive/views'));

app.use(express.static(path.join(__dirname, 'public')));

// Public landing page (no auth required) - for Twilio verification & new visitors
app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Also serve at /about for an alternative public URL
app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}!`);
});



app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}
));

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  function (req, res) {
    // Successful authentication, redirect to frontend dashboard.
    const frontendUrl = isProduction ? "https://trendtracker.co" : "http://localhost:5173";
    res.redirect(`${frontendUrl}/dashboard`);
  }
);









app.get("/api/chart/:symbol", isAuthenticated, async (req, res) => {

  const ticker = req.params.symbol.toUpperCase();
  const period = req.query.period || "1w"; //default to 1 week

  //validate period
  const validPeriods = ["1h", "1d", "1w", "1m", "3m", "6m"];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: "Invalid period" });
  }

  let scriptPath;

  if (process.env.NODE_ENV == "production") {
    scriptPath = process.env.SCRIPT_PATH;
  } else {
    scriptPath = path.join(__dirname, 'scripts', 'get-json-stock-data.py');
  }

  // Path to python script
  const pythonPath = process.env.PYTHON_PATH || 'python3';//path to python in ENV

  console.log('Script path:', scriptPath);
  console.log('Python path:', pythonPath);
  console.log('period:', period);

  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    console.log('ERROR: Python script not found! ');
    return res.status(500).json({ error: 'Python script not found' });
  }

  let python;
  try {
    python = spawn(pythonPath, [scriptPath, ticker, period]);
  } catch (err) {
    console.log('ERROR: Failed to spawn Python:', err);
    return res.status(500).json({ error: 'Failed to start Python' });
  }

  let stdoutData = '';
  let errorOutput = '';

  python.stdout.on('data', (data) => {
    stdoutData += data.toString();
    console.log('Python stdout:', data.toString());
  });

  python.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log('Python stderr:', data.toString());
  });

  // Handle spawn errors
  python.on('error', (error) => {
    console.log('Spawn error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: `Failed to run Python: ${error.message}` });
    }
  });

  python.on('close', (code) => {
    console.log('Python exited with code:', code);
    if (res.headersSent) return;

    if (code === 0) {
      const dataPath = path.join(__dirname, 'public', 'data', `${ticker.toLowerCase()}_${period}_output.json`);
      console.log('Looking for JSON at:', dataPath);

      try {
        const stockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('Success! Sending data...');
        res.json(stockData);

        fs.unlink(dataPath, (err) => {
          if (err) {
            console.log('ERROR deleting JSON file:', err);
          } else {
            console.log('Temporary JSON file deleted:', dataPath);
          }
        });

      } catch (err) {
        console.log('ERROR reading JSON:', err);
        if (!res.headersSent) res.status(500).json({ error: `Failed to read stock data for ${ticker}.` });
      }
    } else {
      console.error(`Python script error: ${errorOutput}`);
      if (!res.headersSent) res.status(500).json({ error: `Python script exited with code ${code}: ${errorOutput}` });
    }
  });
});

app.get("/api/analytics/:symbol", isAuthenticated, async (req, res) => {
  const ticker = req.params.symbol.toUpperCase();
  const period = req.query.period || "1w"; // default to 1 week

  // validate period
  const validPeriods = ["1h", "1d", "1w", "1m", "3m", "6m"];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: "Invalid period" });
  }

  // Check cache first
  const cacheKey = `${ticker}:${period}`;
  const now = Date.now();
  if (cache.analytics[cacheKey] && (now - cache.analytics[cacheKey].timestamp) < ANALYTICS_CACHE_DURATION) {
    console.log(`[Analytics] Serving ${cacheKey} from cache`);
    return res.json(cache.analytics[cacheKey].data);
  }

  let scriptPath;
  if (process.env.NODE_ENV == "production") {
    scriptPath = process.env.ANALYTICS_SCRIPT_PATH || path.join(__dirname, 'scripts', 'stock_analytics.py');
  } else {
    scriptPath = path.join(__dirname, 'scripts', 'stock_analytics.py');
  }

  // Path to python script
  const pythonPath = process.env.PYTHON_PATH || 'python3';

  console.log('[Analytics] Script path:', scriptPath);
  console.log('[Analytics] Python path:', pythonPath);
  console.log('[Analytics] period:', period);

  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    console.log('[Analytics] ERROR: Python script not found!');
    return res.status(500).json({ error: 'Analytics script not found' });
  }

  let python;
  try {
    python = spawn(pythonPath, [scriptPath, ticker, period]);
  } catch (err) {
    console.log('[Analytics] ERROR: Failed to spawn Python:', err);
    return res.status(500).json({ error: 'Failed to start Python' });
  }

  let stdoutData = '';
  let errorOutput = '';

  python.stdout.on('data', (data) => {
    stdoutData += data.toString();
    console.log('[Analytics] Python stdout:', data.toString());
  });

  python.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log('[Analytics] Python stderr:', data.toString());
  });

  // Handle spawn errors
  python.on('error', (error) => {
    console.log('[Analytics] Spawn error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: `Failed to run Python: ${error.message}` });
    }
  });

  python.on('close', (code) => {
    console.log('[Analytics] Python exited with code:', code);
    if (res.headersSent) return;

    if (code === 0) {
      const dataPath = path.join(__dirname, 'public', 'data', `${ticker.toLowerCase()}_${period}_analytics.json`);
      console.log('[Analytics] Looking for JSON at:', dataPath);

      try {
        const analyticsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log('[Analytics] Success! Sending data...');
        
        // Update cache
        cache.analytics[cacheKey] = { data: analyticsData, timestamp: now };
        
        res.json(analyticsData);

        fs.unlink(dataPath, (err) => {
          if (err) {
            console.log('[Analytics] ERROR deleting JSON file:', err);
          } else {
            console.log('[Analytics] Temporary JSON file deleted:', dataPath);
          }
        });

      } catch (err) {
        console.log('[Analytics] ERROR reading JSON:', err);
        if (!res.headersSent) res.status(500).json({ error: `Failed to read analytics data for ${ticker}.` });
      }
    } else {
      console.error(`[Analytics] Python script error: ${errorOutput}`);
      if (!res.headersSent) res.status(500).json({ error: `Analytics script exited with code ${code}: ${errorOutput}` });
    }
  });
});


// API ROUTES

app.get("/api/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true, user: { id: req.user.id, email: req.user.email, first_name: req.user.first_name } });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({ message: "Logged in successfully", user: { id: user.id, email: user.email, first_name: user.first_name } });
    });
  })(req, res, next);
});

app.post("/api/register", async (req, res) => {
  const { email, password, first_name, phone } = req.body;
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      "INSERT INTO users (email, password_hash, first_name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, phone",
      [email, hash, first_name, phone]
    );
    const user = result.rows[0];
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: "Login failed after registration" });
      return res.json({ message: "Registered and logged in", user });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/api/dashboard", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;

    // Get stats
    const watchlistCount = await db.query("SELECT COUNT(*) FROM watchlist WHERE user_id = $1", [user.id]);
    const alertsCount = await db.query("SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND triggered = FALSE", [user.id]);

    res.json({
      firstName: user.first_name,
      watchlistCount: parseInt(watchlistCount.rows[0].count),
      alertsCount: parseInt(alertsCount.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

app.get("/api/watchlist", isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const filter = req.query.filter || "def";
  const capFilter = req.query.capFilter || null;

  let orderClause = "";
  if (filter === "alpha") {
    orderClause = "ORDER BY s.symbol";
  } else if (filter === "asc") {
    orderClause = "ORDER BY s.marketcap";
  } else if (filter === "desc") {
    orderClause = "ORDER BY s.marketcap DESC";
  }

  const sql = `
  SELECT
    s.symbol,
    s.companyname,
    s.marketcap,
    s.currentprice,
    s.dayhigh,
    s.daylow,
    s.sector
  FROM watchlist w
  JOIN stocks s ON w.stock_id = s.stockid
  WHERE w.user_id = $1
  GROUP BY
    s.symbol, s.companyname, s.marketcap,
    s.currentprice, s.dayhigh, s.daylow, s.sector,
    CASE
      WHEN s.marketcap <    2000  THEN 'Small Cap'
      WHEN s.marketcap <=  10000  THEN 'Mid Cap'
      ELSE                            'Large Cap'
    END
  HAVING
    ($2::text) IS NULL
    OR CASE
         WHEN s.marketcap <    2000  THEN 'Small Cap'
         WHEN s.marketcap <=  10000  THEN 'Mid Cap'
         ELSE                            'Large Cap'
       END = $2::text
  ${orderClause};
  `;

  try {
    const { rows: stocks } = await db.query(sql, [userId, capFilter]);
    res.json({ stocks, filter, capFilter });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to load watchlist" });
  }
});

app.get("/api/stock/:symbol", isAuthenticated, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // 1. Try DB first
    const sql = `
      SELECT symbol, companyname, marketcap, currentprice, dayhigh, daylow, sector
      FROM stocks WHERE symbol = $1
    `;
    const { rows } = await db.query(sql, [symbol]);

    if (rows.length > 0) {
      console.log(`[StockDetails] Found ${symbol} in DB`);
      const stock = {
        symbol: rows[0].symbol,
        companyname: rows[0].companyname,
        marketcap: rows[0].marketcap,
        price: parseFloat(rows[0].currentprice).toFixed(2),
        dayhigh: parseFloat(rows[0].dayhigh).toFixed(2),
        daylow: parseFloat(rows[0].daylow).toFixed(2),
        sector: rows[0].sector
      };
      return res.json(stock);
    }

    // 2. Fallback to API
    console.log(`[StockDetails] ${symbol} not in DB, fetching from Finnhub...`);
    const response = await axios.get("https://finnhub.io/api/v1/quote", {
      params: { symbol: symbol, token: API_KEY }
    });
    const data = response.data;

    if (data.c === 0 && data.d === null && data.dp === null) {
      return res.status(404).json({ error: "Stock not found" });
    }

    let data2 = {};
    try {
      const response2 = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol: symbol, token: API_KEY }
      });
      data2 = response2.data;
    } catch (err) {
      console.log(`Profile not found for ${symbol}, using defaults.`);
    }

    const stock = {
      symbol: symbol,
      companyname: data2.name || symbol,
      marketcap: data2.marketCapitalization || 0,
      price: data.c.toFixed(2),
      dayhigh: data.h.toFixed(2),
      daylow: data.l.toFixed(2),
      sector: data2.finnhubIndustry || 'N/A'
    };
    res.json(stock);
  } catch (err) {
    console.error("Error fetching stock details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/news", isAuthenticated, async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (cache.news.data && (now - cache.news.timestamp) < CACHE_DURATION) {
      console.log('[News] Serving from cache');
      return res.json(cache.news.data);
    }

    console.log('[News] Cache miss, fetching from Finnhub...');
    const response = await axios.get("https://finnhub.io/api/v1/news", {
      params: { category: "general", token: API_KEY }
    });

    // Finnhub already returns data in our expected format
    const news = response.data.slice(0, 20).map(item => ({
      id: item.id,
      headline: item.headline,
      url: item.url,
      summary: item.summary || "Click to read full article...",
      source: item.source,
      datetime: item.datetime,
      image: item.image || null,
      category: item.category || "General"
    }));

    // Update cache
    cache.news = { data: news, timestamp: now };

    res.json(news);
  } catch (err) {
    console.error("Error fetching news:", err);
    // Return cached data if available, even if stale
    if (cache.news.data) {
      console.log('[News] Error occurred, serving stale cache');
      return res.json(cache.news.data);
    }
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/news/:symbol", isAuthenticated, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const now = Date.now();

    // Check per-symbol cache first
    if (cache.stockNews[symbol] && (now - cache.stockNews[symbol].timestamp) < STOCK_NEWS_CACHE_DURATION) {
      console.log(`[News/${symbol}] Serving from cache`);
      return res.json(cache.stockNews[symbol].data);
    }

    console.log(`[News/${symbol}] Cache miss, fetching from Finnhub...`);

    // Finnhub company news requires date range (last 7 days)
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await axios.get("https://finnhub.io/api/v1/company-news", {
      params: {
        symbol: symbol,
        from: fromDate,
        to: toDate,
        token: API_KEY
      }
    });

    const news = response.data.slice(0, 10).map(item => ({
      id: item.id,
      headline: item.headline,
      url: item.url,
      summary: item.summary || "Click to read full article...",
      source: item.source,
      datetime: item.datetime,
      image: item.image || null,
      category: "Company News"
    }));

    // Update per-symbol cache
    cache.stockNews[symbol] = { data: news, timestamp: now };

    res.json(news);
  } catch (err) {
    console.error(`Error fetching news for ${req.params.symbol}:`, err);
    // Return cached data if available, even if stale
    if (cache.stockNews[req.params.symbol.toUpperCase()]?.data) {
      console.log(`[News/${req.params.symbol}] Error occurred, serving stale cache`);
      return res.json(cache.stockNews[req.params.symbol.toUpperCase()].data);
    }
    res.status(500).json({ error: "Failed to fetch stock news" });
  }
});

app.get("/api/search", isAuthenticated, async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: "Symbol is required" });

  try {
    const response = await axios.get("https://finnhub.io/api/v1/quote", {
      params: { symbol: symbol.toUpperCase(), token: API_KEY }
    });
    const data = response.data;
    console.log(`[Search] Symbol: ${symbol}, Quote Data:`, data);

    // Some ETFs might return 0 if market is closed/pre-market? 
    // Or if symbol is invalid, Finnhub returns c: 0.
    if (data.c === 0 && data.d === null && data.dp === null) {
      console.log(`[Search] Invalid symbol ${symbol} (all nulls/zeros)`);
      return res.status(404).json({ error: "No stock found with that symbol." });
    }

    let data2 = {};
    try {
      const response2 = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol: symbol.toUpperCase(), token: API_KEY }
      });
      data2 = response2.data;
    } catch (err) {
      console.log(`Profile not found for ${symbol}, using defaults.`);
    }

    // Note: data2 might be empty for ETFs like SPY on free tier

    const stock = {
      symbol: symbol.toUpperCase(),
      companyname: data2.name || symbol.toUpperCase(),
      marketcap: data2.marketCapitalization || 0,
      price: data.c.toFixed(2),
      dayhigh: data.h.toFixed(2),
      daylow: data.l.toFixed(2),
      sector: data2.finnhubIndustry || 'N/A'
    };
    res.json({ stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

app.post("/api/watchlist/add", isAuthenticated, async (req, res) => {
  const { symbol, price, dayhigh, daylow, companyname, marketcap, sector } = req.body;
  const userId = req.user.id;
  console.log(`[WatchlistAdd] Request to add ${symbol} for user ${userId}. MarketCap: ${marketcap}, Sector: ${sector}`);

  try {
    let result = await db.query("SELECT * FROM stocks WHERE symbol = $1", [symbol]);
    let stockId;

    if (result.rows.length !== 0) {
      stockId = result.rows[0].stockid;
      console.log(`[WatchlistAdd] Stock ${symbol} already exists (ID: ${stockId})`);
    } else {
      console.log(`[WatchlistAdd] Inserting new stock ${symbol}...`);
      const insert = await db.query(
        `INSERT INTO stocks (symbol, currentprice, dayhigh, daylow, companyname, marketcap, sector)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING stockid`,
        [symbol, price, dayhigh, daylow, companyname, marketcap, sector]
      );
      stockId = insert.rows[0].stockid;
      console.log(`[WatchlistAdd] Created new stock ${symbol} (ID: ${stockId})`);
    }

    await db.query(
      `INSERT INTO watchlist (user_id, stock_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING`,
      [userId, stockId]
    );
    console.log(`[WatchlistAdd] Added ${symbol} to watchlist`);
    res.json({ message: "Added to watchlist" });
  } catch (err) {
    console.error(`[WatchlistAdd] Error adding ${symbol}:`, err);
    res.status(500).json({ error: "Failed to add to watchlist" });
  }
});

app.post("/api/alerts/create", isAuthenticated, async (req, res) => {
  const { symbol, direction, target_price, alert_method } = req.body; // 'email', 'sms', 'both'
  const userId = req.user.id;

  if (!symbol || !direction || !target_price) return res.status(400).json({ error: "Missing fields" });

  try {
    const stockResult = await db.query("SELECT stockid FROM stocks WHERE symbol = $1", [symbol]);

    if (stockResult.rows.length > 0) {
      const stockId = stockResult.rows[0].stockid;
      await db.query(
        `INSERT INTO alerts (user_id, stock_id, target_price, direction, alert_method)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, stockId, target_price, direction, alert_method || 'email']
      );
      res.json({ message: "Alert created successfully" });
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

app.get("/api/alerts", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT a.id, s.symbol, s.currentprice, a.target_price, a.direction, a.alert_method
       FROM alerts a
       JOIN stocks s ON a.stock_id = s.stockid
       WHERE a.user_id = $1 AND a.triggered = FALSE
       ORDER BY s.symbol ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

app.post("/api/alerts/check", isAuthenticated, async (req, res) => {
  try {
    await checkAlertsAndNotify();
    res.json({ message: "Alert check triggered successfully" });
  } catch (err) {
    console.error("Manual alert check failed:", err);
    res.status(500).json({ error: "Failed to check alerts" });
  }
});

app.post("/api/alerts/delete", isAuthenticated, async (req, res) => {
  const { alert_id } = req.body;

  try {
    const result = await db.query("DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING id",
      [alert_id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Alert not found or unauthorized" });

    res.json({ message: "Alert deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete alert" });
  }
});


app.post("/api/watchlist/delete", isAuthenticated, async (req, res) => {
  const { symbol } = req.body;
  const userId = req.user.id;

  try {
    const stockResult = await db.query("SELECT stockid FROM stocks WHERE symbol = $1", [symbol]);
    if (stockResult.rows.length > 0) {
      const stockId = stockResult.rows[0].stockid;
      await db.query("DELETE FROM watchlist WHERE user_id = $1 AND stock_id = $2", [userId, stockId]);
    }
    res.json({ message: "Removed from watchlist" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from watchlist" });
  }
});

// Settings endpoints
app.get("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, email, first_name, phone FROM users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = rows[0];
    res.json({
      email: user.email,
      firstName: user.first_name,
      phone: user.phone || null
    });
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Cleanup expired verification codes
function cleanupExpiredCodes() {
  const now = Date.now();
  Object.keys(phoneVerificationCodes).forEach(userId => {
    if (phoneVerificationCodes[userId].expiresAt < now) {
      delete phoneVerificationCodes[userId];
    }
  });
}

app.post("/api/settings/phone/send-code", isAuthenticated, async (req, res) => {
  const { phone } = req.body;
  const userId = req.user.id;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Cleanup expired codes
  cleanupExpiredCodes();

  // Validate phone number format (basic validation)
  const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleanedPhone)) {
    return res.status(400).json({ error: "Invalid phone number format. Please include country code (e.g., +1 for US)" });
  }

  // Format phone number (ensure it starts with +)
  const formattedPhone = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;

  if (!twilioClient) {
    return res.status(500).json({ error: "SMS service is not available" });
  }

  try {
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiration
    phoneVerificationCodes[userId] = {
      code,
      phone: formattedPhone,
      expiresAt: Date.now() + VERIFICATION_CODE_EXPIRY
    };

    // Send SMS via Twilio
    await twilioClient.messages.create({
      body: `Your TrendTracker verification code is: ${code}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`[Phone Verification] Code sent to ${formattedPhone} for user ${userId}`);
    res.json({ message: "Verification code sent successfully" });
  } catch (err) {
    console.error("Error sending verification code:", err);
    const errorMessage = err.message || "Failed to send verification code";
    res.status(500).json({ error: `Failed to send verification code: ${errorMessage}. Please check the phone number and try again.` });
  }
});

app.post("/api/settings/phone/verify", isAuthenticated, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: "Verification code is required" });
  }

  // Cleanup expired codes
  cleanupExpiredCodes();

  const storedData = phoneVerificationCodes[userId];

  if (!storedData) {
    return res.status(400).json({ error: "No verification code found. Please request a new code." });
  }

  if (Date.now() > storedData.expiresAt) {
    delete phoneVerificationCodes[userId];
    return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
  }

  if (storedData.code !== code) {
    return res.status(400).json({ error: "Invalid verification code" });
  }

  try {
    // Update phone number in database
    await db.query(
      "UPDATE users SET phone = $1, is_phone_verified = TRUE WHERE id = $2",
      [storedData.phone, userId]
    );

    // Clear verification code
    delete phoneVerificationCodes[userId];

    console.log(`[Phone Verification] Phone number verified and updated for user ${userId}`);
    res.json({ message: "Phone number verified and updated successfully", phone: storedData.phone });
  } catch (err) {
    console.error("Error updating phone number:", err);
    res.status(500).json({ error: "Failed to update phone number" });
  }
});

// ==================== BUDGET MANAGEMENT API ROUTES ====================

// ----- Plaid Routes -----

app.post("/api/plaid/create-link-token", isAuthenticated, plaidLimiter, async (req, res) => {
  try {
    if (!plaidService.isPlaidConfigured()) {
      return res.status(503).json({ error: "Banking services are not configured" });
    }
    
    const linkToken = await plaidService.createLinkToken(req.user.id, req.user.id.toString());
    res.json({ link_token: linkToken.link_token });
  } catch (err) {
    console.error("[Plaid] Error creating link token:", err);
    res.status(500).json({ error: "Failed to initialize bank connection" });
  }
});

app.post("/api/plaid/exchange-public-token", isAuthenticated, plaidLimiter, async (req, res) => {
  const { public_token, metadata } = req.body;
  
  if (!public_token) {
    return res.status(400).json({ error: "Public token is required" });
  }
  
  try {
    // Exchange public token for access token
    const { accessToken, itemId } = await plaidService.exchangePublicToken(public_token);
    
    // Encrypt the access token
    const encryptedToken = plaidService.encryptAccessToken(accessToken);
    
    // Get account details
    const accountsResponse = await plaidService.getAccounts(encryptedToken);
    const accounts = accountsResponse.accounts;
    const institutionId = accountsResponse.item.institution_id;
    
    // Get institution name
    let institutionName = "Unknown Bank";
    try {
      const institution = await plaidService.getInstitution(institutionId);
      institutionName = institution.name;
    } catch (e) {
      console.log("[Plaid] Could not fetch institution name");
    }
    
    // Save accounts to database
    for (const account of accounts) {
      await db.query(`
        INSERT INTO bank_accounts (
          user_id, plaid_account_id, plaid_item_id, institution_name,
          account_name, account_type, account_subtype, mask, access_token
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id, plaid_account_id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
      `, [
        req.user.id,
        account.account_id,
        itemId,
        institutionName,
        account.name,
        account.type,
        account.subtype,
        account.mask,
        encryptedToken
      ]);
    }
    
    // Log the connection
    await auditLogService.logBankConnection(db, req, req.user.id, institutionName, true);
    
    // Trigger initial transaction sync
    try {
      const bankAccounts = await db.query(
        `SELECT * FROM bank_accounts WHERE user_id = $1 AND plaid_item_id = $2`,
        [req.user.id, itemId]
      );
      
      for (const account of bankAccounts.rows) {
        await transactionSyncService.syncAccountTransactions(db, account);
      }
    } catch (syncErr) {
      console.error("[Plaid] Initial sync failed:", syncErr.message);
    }
    
    res.json({ 
      message: "Bank account connected successfully",
      accounts: accounts.map(a => ({
        id: a.account_id,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask
      }))
    });
  } catch (err) {
    console.error("[Plaid] Error exchanging token:", err);
    await auditLogService.logBankConnection(db, req, req.user.id, "Unknown", false);
    res.status(500).json({ error: "Failed to connect bank account" });
  }
});

app.get("/api/plaid/accounts", isAuthenticated, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, institution_name, account_name, account_type, account_subtype, mask, is_active, created_at
      FROM bank_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    res.json({ accounts: result.rows });
  } catch (err) {
    console.error("[Plaid] Error fetching accounts:", err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

app.post("/api/plaid/accounts/:id/disconnect", isAuthenticated, async (req, res) => {
  const accountId = req.params.id;
  
  try {
    // Check ownership
    const accountResult = await db.query(
      `SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, req.user.id]
    );
    
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }
    
    const account = accountResult.rows[0];
    
    // Try to remove from Plaid (may fail if already disconnected)
    try {
      await plaidService.removeItem(account.access_token);
    } catch (e) {
      console.log("[Plaid] Item may already be disconnected:", e.message);
    }
    
    // Mark as inactive in our database
    await db.query(
      `UPDATE bank_accounts SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [accountId]
    );
    
    // Log disconnection
    await auditLogService.logBankDisconnection(db, req, req.user.id, accountId);
    
    res.json({ message: "Bank account disconnected" });
  } catch (err) {
    console.error("[Plaid] Error disconnecting account:", err);
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

// Get remaining sync count for today
app.get("/api/plaid/sync-status", isAuthenticated, async (req, res) => {
  try {
    const syncLimit = await auditLogService.checkSyncLimit(db, req.user.id, 3);
    res.json(syncLimit);
  } catch (err) {
    console.error("[Plaid] Error getting sync status:", err);
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

app.post("/api/plaid/accounts/:id/sync", isAuthenticated, syncLimiter, async (req, res) => {
  const accountId = req.params.id;

  try {
    // Check daily sync limit
    const syncLimit = await auditLogService.checkSyncLimit(db, req.user.id, 3);
    if (!syncLimit.canSync) {
      return res.status(429).json({
        error: "Daily sync limit reached (3 per day). Try again tomorrow.",
        remaining: 0,
        dailyLimit: syncLimit.dailyLimit
      });
    }

    const accountResult = await db.query(
      `SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [accountId, req.user.id]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const result = await transactionSyncService.syncAccountTransactions(db, accountResult.rows[0]);
    await auditLogService.logTransactionSync(db, req.user.id, accountId, result);
    await auditLogService.logManualSync(db, req, req.user.id);

    res.json({ ...result, remaining: syncLimit.remaining - 1 });
  } catch (err) {
    console.error("[Plaid] Error syncing account:", err);
    res.status(500).json({ error: "Failed to sync transactions" });
  }
});

app.post("/api/plaid/sync-all", isAuthenticated, syncLimiter, async (req, res) => {
  try {
    // Check daily sync limit
    const syncLimit = await auditLogService.checkSyncLimit(db, req.user.id, 3);
    if (!syncLimit.canSync) {
      return res.status(429).json({
        error: "Daily sync limit reached (3 per day). Try again tomorrow.",
        remaining: 0,
        dailyLimit: syncLimit.dailyLimit
      });
    }

    const results = await transactionSyncService.syncUserTransactions(db, req.user.id);
    await auditLogService.logManualSync(db, req, req.user.id);

    res.json({ results, remaining: syncLimit.remaining - 1 });
  } catch (err) {
    console.error("[Plaid] Error syncing all accounts:", err);
    res.status(500).json({ error: "Failed to sync transactions" });
  }
});

// Plaid Webhook Handler
app.post("/api/plaid/webhook", async (req, res) => {
  const { webhook_type, webhook_code, item_id } = req.body;
  
  console.log(`[Plaid Webhook] Type: ${webhook_type}, Code: ${webhook_code}`);
  
  // Log webhook (verification would happen here in production)
  await auditLogService.logWebhook(db, req, webhook_type, true, { webhook_code, item_id });
  
  try {
    if (webhook_type === 'TRANSACTIONS') {
      if (webhook_code === 'SYNC_UPDATES_AVAILABLE' || webhook_code === 'INITIAL_UPDATE' || webhook_code === 'HISTORICAL_UPDATE') {
        // Find accounts for this item
        const accounts = await db.query(
          `SELECT * FROM bank_accounts WHERE plaid_item_id = $1 AND is_active = TRUE`,
          [item_id]
        );
        
        for (const account of accounts.rows) {
          try {
            await transactionSyncService.syncAccountTransactions(db, account);
          } catch (e) {
            console.error(`[Plaid Webhook] Failed to sync account ${account.id}:`, e.message);
          }
        }
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error("[Plaid Webhook] Error processing webhook:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ----- Transaction Routes -----

app.get("/api/transactions", isAuthenticated, validators.transactionFilters, handleValidationErrors, async (req, res) => {
  try {
    const transactions = await transactionSyncService.getTransactions(db, req.user.id, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      categoryId: req.query.categoryId,
      accountId: req.query.accountId,
      searchTerm: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    });
    
    res.json({ transactions });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions/manual", isAuthenticated, validators.createTransaction, handleValidationErrors, async (req, res) => {
  try {
    const transaction = await transactionSyncService.addManualTransaction(db, req.user.id, {
      amount: req.body.amount,
      date: req.body.date,
      name: req.body.name,
      categoryId: req.body.categoryId,
      notes: req.body.notes
    });
    
    res.json({ transaction });
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

app.put("/api/transactions/:id/category", isAuthenticated, validators.updateTransactionCategory, handleValidationErrors, async (req, res) => {
  const transactionId = req.params.id;
  const { categoryId } = req.body;
  
  try {
    // Check ownership
    const txResult = await db.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    if (txResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.query(
      `UPDATE transactions SET category_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [categoryId, transactionId]
    );
    
    res.json({ message: "Category updated" });
  } catch (err) {
    console.error("Error updating transaction category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.put("/api/transactions/:id/notes", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const transactionId = req.params.id;
  const { notes } = req.body;
  
  try {
    // Check ownership
    const txResult = await db.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    if (txResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.query(
      `UPDATE transactions SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [notes, transactionId]
    );
    
    res.json({ message: "Notes updated" });
  } catch (err) {
    console.error("Error updating transaction notes:", err);
    res.status(500).json({ error: "Failed to update notes" });
  }
});

app.delete("/api/transactions/:id", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const transactionId = req.params.id;
  
  try {
    // Only allow deleting manual transactions
    const result = await db.query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2 AND is_manual = TRUE RETURNING id`,
      [transactionId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found or cannot be deleted" });
    }
    
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ----- Category Routes -----

app.get("/api/categories", isAuthenticated, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM budget_categories
      WHERE user_id = $1 OR is_system = TRUE
      ORDER BY is_system DESC, name ASC
    `, [req.user.id]);
    
    res.json({ categories: result.rows });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/categories/system", isAuthenticated, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM budget_categories WHERE is_system = TRUE ORDER BY name ASC
    `);
    
    res.json({ categories: result.rows });
  } catch (err) {
    console.error("Error fetching system categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/categories", isAuthenticated, validators.createCategory, handleValidationErrors, async (req, res) => {
  const { name, color, icon, parentCategoryId } = req.body;
  
  try {
    const result = await db.query(`
      INSERT INTO budget_categories (user_id, name, color, icon, parent_category_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, name, color || '#6366f1', icon || 'tag', parentCategoryId || null]);
    
    res.json({ category: result.rows[0] });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/categories/:id", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const categoryId = req.params.id;
  const { name, color, icon } = req.body;
  
  try {
    // Check ownership (can't edit system categories)
    const catResult = await db.query(
      `SELECT user_id, is_system FROM budget_categories WHERE id = $1`,
      [categoryId]
    );
    
    if (catResult.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    if (catResult.rows[0].is_system) {
      return res.status(403).json({ error: "Cannot edit system categories" });
    }
    
    if (catResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.query(`
      UPDATE budget_categories
      SET name = COALESCE($1, name), color = COALESCE($2, color), icon = COALESCE($3, icon)
      WHERE id = $4
    `, [name, color, icon, categoryId]);
    
    res.json({ message: "Category updated" });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const categoryId = req.params.id;
  
  try {
    // Check ownership (can't delete system categories)
    const catResult = await db.query(
      `SELECT user_id, is_system FROM budget_categories WHERE id = $1`,
      [categoryId]
    );
    
    if (catResult.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    if (catResult.rows[0].is_system) {
      return res.status(403).json({ error: "Cannot delete system categories" });
    }
    
    if (catResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.query(`DELETE FROM budget_categories WHERE id = $1`, [categoryId]);
    
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ----- Budget Routes -----

app.get("/api/budgets", isAuthenticated, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, bc.name as category_name, bc.color as category_color, bc.icon as category_icon
      FROM budgets b
      LEFT JOIN budget_categories bc ON b.category_id = bc.id
      WHERE b.user_id = $1 AND b.is_active = TRUE
      ORDER BY bc.name ASC
    `, [req.user.id]);
    
    res.json({ budgets: result.rows });
  } catch (err) {
    console.error("Error fetching budgets:", err);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

app.get("/api/budgets/summary", isAuthenticated, async (req, res) => {
  try {
    const periodType = req.query.period || 'monthly';
    const summary = await budgetCalculationService.getBudgetSummary(db, req.user.id, periodType);
    res.json(summary);
  } catch (err) {
    console.error("Error fetching budget summary:", err);
    res.status(500).json({ error: "Failed to fetch budget summary" });
  }
});

app.post("/api/budgets", isAuthenticated, validators.createBudget, handleValidationErrors, async (req, res) => {
  const { categoryId, amount, periodType } = req.body;
  
  try {
    // Check if budget already exists for this category and period
    const existing = await db.query(`
      SELECT id FROM budgets
      WHERE user_id = $1 AND category_id = $2 AND period_type = $3 AND is_active = TRUE
    `, [req.user.id, categoryId, periodType]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Budget already exists for this category and period" });
    }
    
    const result = await db.query(`
      INSERT INTO budgets (user_id, category_id, amount, period_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.id, categoryId, amount, periodType]);
    
    res.json({ budget: result.rows[0] });
  } catch (err) {
    console.error("Error creating budget:", err);
    res.status(500).json({ error: "Failed to create budget" });
  }
});

app.put("/api/budgets/:id", isAuthenticated, validators.updateBudget, handleValidationErrors, async (req, res) => {
  const budgetId = req.params.id;
  const { amount, periodType, isActive } = req.body;
  
  try {
    // Check ownership
    const budgetResult = await db.query(
      `SELECT user_id FROM budgets WHERE id = $1`,
      [budgetId]
    );
    
    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    if (budgetResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.query(`
      UPDATE budgets
      SET amount = COALESCE($1, amount),
          period_type = COALESCE($2, period_type),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [amount, periodType, isActive, budgetId]);
    
    res.json({ message: "Budget updated" });
  } catch (err) {
    console.error("Error updating budget:", err);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

app.delete("/api/budgets/:id", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const budgetId = req.params.id;
  
  try {
    const result = await db.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id`,
      [budgetId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    res.json({ message: "Budget deleted" });
  } catch (err) {
    console.error("Error deleting budget:", err);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

// ----- Budget Goals Routes -----

app.get("/api/budget-goals", isAuthenticated, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bg.*, bc.name as category_name, bc.color as category_color
      FROM budget_goals bg
      LEFT JOIN budget_categories bc ON bg.category_id = bc.id
      WHERE bg.user_id = $1 AND bg.is_active = TRUE
      ORDER BY bg.created_at DESC
    `, [req.user.id]);
    
    res.json({ goals: result.rows });
  } catch (err) {
    console.error("Error fetching goals:", err);
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

app.get("/api/budget-goals/progress", isAuthenticated, async (req, res) => {
  try {
    const progress = await budgetCalculationService.getBudgetGoalProgress(db, req.user.id);
    res.json({ goals: progress });
  } catch (err) {
    console.error("Error fetching goal progress:", err);
    res.status(500).json({ error: "Failed to fetch goal progress" });
  }
});

app.post("/api/budget-goals", isAuthenticated, validators.createGoal, handleValidationErrors, async (req, res) => {
  const { categoryId, targetAmount, goalType, periodType } = req.body;
  
  try {
    const result = await db.query(`
      INSERT INTO budget_goals (user_id, category_id, target_amount, goal_type, period_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, categoryId || null, targetAmount, goalType, periodType]);
    
    res.json({ goal: result.rows[0] });
  } catch (err) {
    console.error("Error creating goal:", err);
    res.status(500).json({ error: "Failed to create goal" });
  }
});

app.put("/api/budget-goals/:id", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const goalId = req.params.id;
  const { targetAmount, isActive } = req.body;
  
  try {
    // Check ownership
    const goalResult = await db.query(
      `SELECT user_id FROM budget_goals WHERE id = $1`,
      [goalId]
    );
    
    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }
    
    if (goalResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await db.query(`
      UPDATE budget_goals
      SET target_amount = COALESCE($1, target_amount),
          is_active = COALESCE($2, is_active)
      WHERE id = $3
    `, [targetAmount, isActive, goalId]);
    
    res.json({ message: "Goal updated" });
  } catch (err) {
    console.error("Error updating goal:", err);
    res.status(500).json({ error: "Failed to update goal" });
  }
});

app.delete("/api/budget-goals/:id", isAuthenticated, validators.idParam, handleValidationErrors, async (req, res) => {
  const goalId = req.params.id;
  
  try {
    const result = await db.query(
      `DELETE FROM budget_goals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [goalId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Goal not found" });
    }
    
    res.json({ message: "Goal deleted" });
  } catch (err) {
    console.error("Error deleting goal:", err);
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

// ----- Analytics Routes -----

app.get("/api/spending/by-category", isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { startDate: defaultStart, endDate: defaultEnd } = budgetCalculationService.getPeriodDates('monthly');
    
    const spending = await budgetCalculationService.getSpendingByCategory(
      db,
      req.user.id,
      startDate || defaultStart,
      endDate || defaultEnd
    );
    
    res.json({ spending });
  } catch (err) {
    console.error("Error fetching spending by category:", err);
    res.status(500).json({ error: "Failed to fetch spending data" });
  }
});

app.get("/api/spending/trends", isAuthenticated, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const trends = await budgetCalculationService.getSpendingTrends(db, req.user.id, months);
    res.json({ trends });
  } catch (err) {
    console.error("Error fetching spending trends:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

app.get("/api/budget/alerts", isAuthenticated, async (req, res) => {
  try {
    const alerts = await budgetCalculationService.checkBudgetAlerts(db, req.user.id);
    res.json({ alerts });
  } catch (err) {
    console.error("Error checking budget alerts:", err);
    res.status(500).json({ error: "Failed to check alerts" });
  }
});

// ==================== END OF BUDGET MANAGEMENT API ROUTES ====================



app.post("/register", async (req, res) => {
  const { email, password, first_name } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (checkResult.rows.length > 0) {
      return res.redirect("/login");
    }
    const hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      "INSERT INTO users (email, password_hash, first_name) VALUES ($1, $2, $3)",
      [email, hash, first_name]
    );
    const user = result.rows[0];

    req.login(user, (err) => {
      if (err) { console.log(err); }
      return res.redirect("/dashboard");
    });

  } catch (err) {
    console.log(err);
  }
});

app.post("/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: "Incorrect Username or Password"
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);



app.post("/add", async (req, res) => {

  const { action, symbol, price, dayhigh, daylow, companyname, marketcap, sector } = req.body;

  if (action == "back") {
    return res.redirect("/search");
  }

  const userId = req.user.id;

  if (action == "add") {
    try {
      //check if stock exists in watchlist
      let result = await db.query("SELECT * FROM stocks WHERE symbol = $1",
        [symbol]
      );
      let stockId;

      if (result.rows.length !== 0) {
        stockId = result.rows[0].stockid;
      } else {
        const insert = await db.query(
          `INSERT INTO stocks (symbol, currentprice, dayhigh, daylow, companyname, marketcap, sector)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING stockid`,
          [symbol, price, dayhigh, daylow, companyname, marketcap, sector]
        );
        stockId = insert.rows[0].stockid;
      }

      //add to watchlist
      await db.query(
        `INSERT INTO watchlist (user_id, stock_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING`,
        [userId, stockId]
      );
      res.redirect("/watchlist");
    } catch (err) {
      console.log(err);
      res.send("Failed to add to watchlist");
    }
  }


});

app.post("/delete", async (req, res) => {
  const { symbol } = req.body;
  const userId = req.user.id;

  try {
    const stockResult = await db.query("SELECT stockid FROM stocks WHERE symbol = $1",
      [symbol]
    );

    if (stockResult.rows.length > 0) {
      const stockId = stockResult.rows[0].stockid;

      await db.query("DELETE FROM watchlist WHERE user_id = $1 AND stock_id = $2",
        [userId, stockId]
      );
    }
    res.redirect("/watchlist");
  } catch (err) {
    console.log(err);
    req.send("Failed to delete stock chosen");
  }
});

app.post("/refresh", async (req, res) => {

  const open = await isMarketOpen();
  if (open) {

    const { symbol } = req.body;
    console.log(`Manual refresh requested for ${symbol}`);
    try {
      const response = await axios.get("https://finnhub.io/api/v1/quote", {
        params: {
          symbol: symbol,
          token: API_KEY
        }
      });
      const quote = response.data;

      const response2 = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: {
          symbol: symbol,
          token: API_KEY
        }
      });

      const profile = response2.data

      if (!quote.c) {
        return res.send("Failed to refresh stock.");
      }

      await db.query(
        `UPDATE stocks
        SET currentprice = $1, dayhigh = $2, daylow = $3, marketcap = $4, updatedat = CURRENT_TIMESTAMP
        WHERE symbol = $5`,
        [quote.c, quote.h, quote.l, profile.marketCapitalization, symbol]
      );

      //check for alerts
      await checkAlertsAndNotify();

      res.redirect("/watchlist");
    } catch (err) {
      console.log(err);
      res.send("Unable to refresh stock");
    }

  } else {
    console.log("Market is closed... cannot refresh stock.");
    return res.redirect("/watchlist");
  }

});

app.post("/setalert", async (req, res) => {
  const { symbol, direction, target_price } = req.body;
  const userId = req.user.id;

  try {
    const stockResult = await db.query("SELECT stockid FROM stocks WHERE symbol = $1",
      [symbol]
    );

    if (stockResult.rows.length > 0) {
      const stockId = stockResult.rows[0].stockid;

      await db.query(
        `INSERT INTO alerts (user_id, stock_id, target_price, direction)
        VALUES ($1, $2, $3, $4)`,
        [userId, stockId, target_price, direction]
      );
    }

    res.redirect("/watchlist");
  } catch (err) {
    console.log(err);
    res.send("Unable to get alert");
  }
});

app.post("/deletealert", requireLogin, async (req, res) => {
  const { alert_id } = req.body;

  try {
    await db.query("DELETE FROM alerts WHERE id = $1 AND user_id = $2",
      [alert_id, req.user.id]
    );
    res.redirect("/alerts");
  } catch (err) {
    console.log(err);
    res.send("Unable to delete alert.");
  }
});

passport.use("local",
  new Strategy({ usernameField: "email", passwordField: "password" },
    async function verify(email, password, cb) {
      try {
        const { rows } = await db.query("SELECT * FROM users WHERE email = $1",
          [email]
        );

        if (rows.length === 0) {
          //no user
          console.log("FAIL: User not found in the database.");
          return cb(null, false, { message: "User not found" });
        }

        const user = rows[0];

        const storedHashedPassword = user.password_hash;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          }
          if (!valid) {
            console.log("FAIL: Passwords DO NOT match.");
            return cb(null, false, { message: "Incorrect password" });
          }
          return cb(null, user);
        });

      } catch (err) {
        console.error("Error during authentication:", err);
        return cb(err);
      }
    })
);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use("google", new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const email = profile.emails[0].value;

      const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        const insert = await db.query(
          `INSERT INTO users (email, password_hash, first_name)
           VALUES ($1, $2, $3) RETURNING *`,
          [email, `google_${email}`, profile.name.givenName]
        );
        cb(null, insert.rows[0]);
      } else {
        cb(null, result.rows[0]);
      }
    } catch (err) {
      cb(err);
    }
  }));
  console.log("Google OAuth initialized");
} else {
  console.log("Google OAuth credentials missing. Google login will not work.");
}

// Market Overview Endpoint - Using Finnhub for reliable data
app.get("/api/market/overview", isAuthenticated, async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (cache.marketOverview.data && (now - cache.marketOverview.timestamp) < CACHE_DURATION) {
      console.log('[MarketOverview] Serving from cache');
      return res.json(cache.marketOverview.data);
    }

    console.log('[MarketOverview] Cache miss, fetching from Finnhub...');

    // Popular/trending stocks to display (mix of tech, finance, retail, healthcare)
    const popularSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'WMT',
      'JNJ', 'UNH', 'HD', 'PG', 'BAC', 'DIS', 'NFLX', 'AMD', 'CRM', 'INTC'
    ];

    // Fetch quotes for all symbols in parallel
    const quotePromises = popularSymbols.map(async (symbol) => {
      try {
        const response = await axios.get("https://finnhub.io/api/v1/quote", {
          params: { symbol, token: API_KEY }
        });
        const q = response.data;

        // Skip if no valid data
        if (!q.c || q.c === 0) return null;

        return {
          symbol,
          name: symbol, // Finnhub quote doesn't include name, we'll use symbol
          price: q.c,
          change: q.d || 0,
          changePercent: q.dp || 0,
          high: q.h,
          low: q.l,
          prevClose: q.pc
        };
      } catch (err) {
        console.log(`[MarketOverview] Failed to fetch ${symbol}:`, err.message);
        return null;
      }
    });

    // Add small delays between batches to respect rate limits (60/min)
    const results = [];
    const BATCH_SIZE = 10;
    for (let i = 0; i < quotePromises.length; i += BATCH_SIZE) {
      const batch = quotePromises.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);

      // Small delay between batches if more to come
      if (i + BATCH_SIZE < quotePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const validQuotes = results.filter(q => q !== null);

    // Get company names for the symbols we have
    const profilePromises = validQuotes.slice(0, 10).map(async (quote) => {
      try {
        const response = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
          params: { symbol: quote.symbol, token: API_KEY }
        });
        return { symbol: quote.symbol, name: response.data.name || quote.symbol };
      } catch {
        return { symbol: quote.symbol, name: quote.symbol };
      }
    });

    // Fetch profiles with delay
    const profiles = [];
    for (let i = 0; i < profilePromises.length; i += 5) {
      const batch = profilePromises.slice(i, i + 5);
      const batchResults = await Promise.all(batch);
      profiles.push(...batchResults);
      if (i + 5 < profilePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    const nameMap = Object.fromEntries(profiles.map(p => [p.symbol, p.name]));

    // Update names in quotes
    validQuotes.forEach(q => {
      if (nameMap[q.symbol]) q.name = nameMap[q.symbol];
    });

    // Sort by absolute change percent to get most active
    const sortedByActivity = [...validQuotes].sort((a, b) =>
      Math.abs(b.changePercent) - Math.abs(a.changePercent)
    );

    // Trending = top 10 most active
    const trending = sortedByActivity.slice(0, 10).map(q => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent
    }));

    // Gainers = top 5 positive change
    const gainers = [...validQuotes]
      .filter(q => q.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5)
      .map(q => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent
      }));

    // Losers = top 5 negative change
    const losers = [...validQuotes]
      .filter(q => q.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5)
      .map(q => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent
      }));

    const responseData = {
      trending,
      gainers,
      losers
    };

    // Update cache
    cache.marketOverview = { data: responseData, timestamp: now };

    console.log(`[MarketOverview] Fetched ${validQuotes.length} quotes, ${trending.length} trending, ${gainers.length} gainers, ${losers.length} losers`);
    res.json(responseData);
  } catch (err) {
    console.error("Error fetching market overview:", err);
    // Return cached data if available, even if stale
    if (cache.marketOverview.data) {
      console.log('[MarketOverview] Error occurred, serving stale cache');
      return res.json(cache.marketOverview.data);
    }
    res.status(500).json({ error: "Failed to fetch market data" });
  }
});

// Serve React App in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, 'public')));

  // Express 5 requires proper wildcard syntax
  // Fallback for SPA (using middleware to avoid router syntax issues)
  app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

app.listen(port, () => {
  console.log("Server running!");
});
