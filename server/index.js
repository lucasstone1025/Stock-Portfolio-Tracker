import 'dotenv/config';

import express from "express";
import path from "path";
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
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const yahooFinanceModule = require('yahoo-finance2');
// In many CJS/ESM interops, we might need .default
const YahooFinanceClass = yahooFinanceModule.YahooFinance || yahooFinanceModule.default || yahooFinanceModule;

let yahooFinance;
try {
  yahooFinance = new YahooFinanceClass();
} catch (e) {
  // If it's not a constructor, maybe it's the instance already?
  yahooFinance = YahooFinanceClass;
}

console.log('YahooFinance initialized via require. Type:', typeof yahooFinance);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);


const app = express();
app.set('trust proxy', 1); // trust proxy fix my problem

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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(cors({
  origin: "http://localhost:5173", // Vite default port
  credentials: true
}));

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

app.listen(port, () => {
  console.log(`Server running on port ${port}!`);
});

// app.get("/", async (req, res) => {
//   res.redirect("/login");
// });

// app.get("/login", async (req, res) => {
//   res.render("login.ejs");
// });

// app.get("/register", async (req, res) => {
//   res.render("register.ejs");
// });

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
    res.redirect("http://localhost:5173/dashboard");
  }
);

// app.get("/dashboard", requireLogin, (req, res) => {
//   res.render("dashboard", { firstName: capitalizeFirst(req.user.first_name) });
// });

// app.get("/findstocks", requireLogin, async (req, res) => {
//   res.render("findstocks.ejs");
// });

// app.get("/search", requireLogin, async (req, res) => {
//   res.render("search.ejs");
// });

// app.get("/help", requireLogin, async (req, res) => {
//   res.render("help.ejs");
// });

// app.get("/logout", async (req, res) => {
//   req.logout((err) => {
//     if (err) {
//       console.log(err);
//     } else {
//       res.redirect("/");
//     }
//   })
// });

// app.get("/chart", async (req, res) => {
//   // read json data from file
//   try {

//     //run python script to get latest data
//     await runPythonScript();

//     const dataPath = path.join(__dirname, 'public', 'data', `${ticker.toLowerCase()}_${period}_output.json`);
//     const stockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

//     res.render('chart', { stockData });

//   } catch (err) {
//     console.error('Error', err);
//     res.status(500).render('error', { message: 'Failed to load chart data.' });
//   }
// });

// app.get("/watchlist", requireLogin, async (req, res) => {
//   const userId = req.user.id;
//   const filter = req.query.filter || "def";
//   const capFilter = req.query.capFilter || null;

//   // build ORDER BY once
//   let orderClause = "";
//   if (filter === "alpha") {
//     orderClause = "ORDER BY s.symbol";
//   } else if (filter === "asc") {
//     orderClause = "ORDER BY s.marketcap";
//   } else if (filter === "desc") {
//     orderClause = "ORDER BY s.marketcap DESC";
//   }

//   const sql = `
//   SELECT
//     s.symbol,
//     s.companyname,
//     s.marketcap,
//     s.currentprice,
//     s.dayhigh,
//     s.daylow,
//     s.sector
//   FROM watchlist w
//   JOIN stocks s ON w.stock_id = s.stockid
//   WHERE w.user_id = $1
//   GROUP BY
//     s.symbol, s.companyname, s.marketcap,
//     s.currentprice, s.dayhigh, s.daylow, s.sector,
//     CASE
//       WHEN s.marketcap <    2000  THEN 'Small Cap'
//       WHEN s.marketcap <=  10000  THEN 'Mid Cap'
//       ELSE                            'Large Cap'
//     END
//   HAVING
//     ($2::text) IS NULL
//     OR CASE
//          WHEN s.marketcap <    2000  THEN 'Small Cap'
//          WHEN s.marketcap <=  10000  THEN 'Mid Cap'
//          ELSE                            'Large Cap'
//        END = $2::text
//   ${orderClause};
// `;



//   try {
//     const { rows: stocks } = await db.query(sql, [userId, capFilter]);

//     const stockCount = stocks.length;


//     res.render("watchlist.ejs", {
//       stocks,
//       stockCount,
//       filter,
//       capFilter
//     });
//   } catch (err) {
//     console.error(err);
//     res.send("Unable to load watchlist");
//   }
// });

// app.get("/stock/:symbol", isAuthenticated, async (req, res) => {
//   try {
//     const symbol = req.params.symbol.toUpperCase();

//     const sql = `
//       SELECT 
//         symbol,
//         companyname,
//         marketcap,
//         currentprice,
//         dayhigh,
//         daylow,
//         sector
//       FROM stocks
//       WHERE symbol = $1
//     `;

//     const { rows } = await db.query(sql, [symbol]);

//     if (rows.length === 0) {
//       return res.status(404).send("Stock not found");
//     }

//     const stock = {
//       symbol: rows[0].symbol,
//       companyname: rows[0].companyname,
//       marketcap: rows[0].marketcap,
//       price: parseFloat(rows[0].currentprice).toFixed(2),
//       dayhigh: parseFloat(rows[0].dayhigh).toFixed(2),
//       daylow: parseFloat(rows[0].daylow).toFixed(2),
//       sector: rows[0].sector
//     }

//     // for now just pass ticker to the voew
//     // here is where I make api calls for more data if needed
//     //like const financialData = await getFinancialData(ticker);

//     res.render("stockdetails.ejs", {
//       stock: stock
//       //will pass financialData: financialData etc
//     });
//   } catch (err) {
//     console.error("Error fetching stock details:", err);
//     res.status(500).send("Internal Server Error")
//   }
// });

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
// app.get("/checkalerts", requireLogin, async (req, res) => {
//   await checkAlertsAndNotify();
//   res.redirect("/alerts");
// });

// app.get("/alerts", requireLogin, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const result = await db.query(
//       `SELECT a.id, s.symbol, a.target_price, a.direction, a.triggered
//       FROM alerts a
//       JOIN stocks s ON a.stock_id = s.stockid
//       WHERE a.user_id = $1
//       ORDER BY a.triggered ASC, s.symbol ASC`,
//       [userId]
//     );

//     const alerts = result.rows;
//     res.render("alerts", { alerts });
//   } catch (err) {
//     console.log(err);
//     res.send("Unable to load alerts");
//   }
// });

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
    const sql = `
      SELECT symbol, companyname, marketcap, currentprice, dayhigh, daylow, sector
      FROM stocks WHERE symbol = $1
    `;
    const { rows } = await db.query(sql, [symbol]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const stock = {
      symbol: rows[0].symbol,
      companyname: rows[0].companyname,
      marketcap: rows[0].marketcap,
      price: parseFloat(rows[0].currentprice).toFixed(2),
      dayhigh: parseFloat(rows[0].dayhigh).toFixed(2),
      daylow: parseFloat(rows[0].daylow).toFixed(2),
      sector: rows[0].sector
    };
    res.json(stock);
  } catch (err) {
    console.error("Error fetching stock details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/news", isAuthenticated, async (req, res) => {
  try {
    const result = await yahooFinance.search("financial news", { newsCount: 20 });

    // Transform Yahoo Finance results to match the structure expected by the frontend (FinnHub format)
    const news = result.news.map(item => {
      // Determine if time is ms or s
      let timeInSeconds = item.providerPublishTime;
      if (timeInSeconds > 9999999999) {
        timeInSeconds = Math.floor(timeInSeconds / 1000);
      }

      return {
        id: item.uuid,
        headline: item.title,
        url: item.link,
        // Yahoo search doesn't always provide a text summary, providing a fallback or empty string
        summary: item.type === "VIDEO" ? "Video content" : "Click to read full article...",
        source: item.publisher,
        datetime: timeInSeconds,
        image: item.thumbnail?.resolutions?.[0]?.url || null,
        category: "General"
      };
    });

    res.json(news);
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/api/news/:symbol", isAuthenticated, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    // Search for the symbol to get related news
    const result = await yahooFinance.search(symbol, { newsCount: 10 });

    if (!result.news || result.news.length === 0) {
      return res.json([]);
    }

    const news = result.news.map(item => {
      let timeInSeconds = item.providerPublishTime;
      if (timeInSeconds && timeInSeconds > 9999999999) {
        timeInSeconds = Math.floor(timeInSeconds / 1000);
      }

      return {
        id: item.uuid,
        headline: item.title,
        url: item.link,
        summary: item.type === "VIDEO" ? "Video content" : "Click to read full article...",
        source: item.publisher,
        datetime: timeInSeconds,
        image: item.thumbnail?.resolutions?.[0]?.url || null,
        category: "Company News"
      };
    });

    res.json(news);
  } catch (err) {
    console.error(`Error fetching news for ${req.params.symbol}:`, err);
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

    if (!data.c) {
      return res.status(404).json({ error: "No stock found with that symbol." });
    }

    const response2 = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
      params: { symbol: symbol.toUpperCase(), token: API_KEY }
    });
    const data2 = response2.data;

    if (!data2.name) {
      return res.status(404).json({ error: "No stock profile found." });
    }

    const stock = {
      symbol: symbol.toUpperCase(),
      companyname: data2.name,
      marketcap: data2.marketCapitalization,
      price: data.c.toFixed(2),
      dayhigh: data.h.toFixed(2),
      daylow: data.l.toFixed(2),
      sector: data2.finnhubIndustry
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

  try {
    let result = await db.query("SELECT * FROM stocks WHERE symbol = $1", [symbol]);
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

    await db.query(
      `INSERT INTO watchlist (user_id, stock_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING`,
      [userId, stockId]
    );
    res.json({ message: "Added to watchlist" });
  } catch (err) {
    console.error(err);
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

// app.post("/search", async (req, res) => {
//   const symbol = req.body.symbol.toUpperCase();
//   const { action } = req.body;

//   if (action == "back") {
//     return res.redirect("/dashboard");
//   }

//   try {
//     const response = await axios.get("https://finnhub.io/api/v1/quote", {
//       params: {
//         symbol: symbol,
//         token: API_KEY
//       }
//     });
//     const data = response.data

//     if (!data.c) {
//       return res.render("searchresult.ejs", { error: "No stock found with that symbol.", stock: null });
//     };

//     const response2 = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
//       params: {
//         symbol: symbol,
//         token: API_KEY
//       }
//     });

//     const data2 = response2.data;

//     if (!data2.name) {
//       return res.render("searchresult.ejs", { error: "No stock found with that symbol...", stock: null });
//     }

//     const stock = {
//       symbol: symbol,
//       companyname: data2.name,
//       marketcap: data2.marketCapitalization,
//       price: data.c.toFixed(2),
//       dayhigh: data.h.toFixed(2),
//       daylow: data.l.toFixed(2),
//       sector: data2.finnhubIndustry
//     };




//     res.render("searchresult.ejs", { error: null, stock });
//   } catch (err) {
//     console.log(err);
//     res.render("searchresult.ejs", { error: "Something went wrong. try again.", stock: null });
//   }
// });

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
