import 'dotenv/config';

import express from "express";
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
import { fromZonedTime } from 'date-fns-tz';
import { isWeekend } from 'date-fns';
import cron from 'node-cron';

const isProduction = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);


const app = express();
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
app.use(express.static("public"));

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

  if(!user || typeof user.id === 'undefined'){
    console.error("FATAL: user obj is invalid during serialization:", user);
    return done(new Error("Invalid user object"));
  }


  done(null, user.id);
});

// deserializeUser: look up the user by ID on each request
passport.deserializeUser(async (id, done) => {

  try {
    const { rows } = await db.query(
      "SELECT id, email, first_name FROM users WHERE id = $1",
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

async function checkAlertsAndNotify() {
  try{
    const alertResult = await db.query(
      `SELECT a.id, a.user_id, a.stock_id, a.target_price, a.direction, a.triggered,
      u.email, s.symbol, s.currentprice
      FROM alerts a
      JOIN users u ON a.user_id = u.id
      JOIN stocks s ON a.stock_id = s.stockid
      WHERE a.triggered = FALSE`
    );

    for(const alert of alertResult.rows) {
      const current = parseFloat(alert.currentprice);
      const target = parseFloat(alert.target_price);
      const direction = alert.direction;

      const shouldTrigger = 
      (direction === "up" && current >= target) ||
      (direction === "down" && current <= target);
      
      if(shouldTrigger) {
        await transporter.sendMail({
          from: '"Stock Watcher" lucasstone49@gmail.com',
          to: alert.email,
          subject: `Price Alert for ${alert.symbol}`,
          text: `The stock ${alert.symbol} had ${direction === "up" ? "risen above" : "fallen below"} your target price of $${target}. Current price: $${current}.`
        });

        await db.query(`UPDATE alerts SET triggered = TRUE WHERE id = $1`, [alert.id]);

        console.log(`Alert triggered and email sent for ${alert.symbol} (${direction} $${target})`);
      }
    }
  } catch(err) {
    console.log(err);
  }
}

// AUTOMATED STOCK REFRESH LOGIC

function isMarketOpen() {
  const timeZone = 'America/New_York';
  const now = new Date();

  // find current time and date (EASTERN)
  const zonedNow = fromZonedTime(now, timeZone);

  // check if weekend
  if (isWeekend(zonedNow)) {
    return false;
  }

  //get current hour and min
  const hour = zonedNow.getHours();
  const minute = zonedNow.getMinutes();

  // Check if the time is between 9:30 AM and 4:00 PM.
  const isAfterOpen = hour > 9 || (hour === 9 && minute >= 30);
  const isBeforeClose = hour < 16;

  return isAfterOpen && isBeforeClose;
}

async function refreshAllStockData() {
  console.log("Checking if market is open for stock refresh...");

  if (!isMarketOpen()) {
    console.log("Market is closed. Skipping refresh.");
    return;
  }

  console.log("Market is open. Starting stock data refresh process.");
  try {
    // find what stocks need updating 
    const { rows: stocksToUpdate } = await db.query(
      `SELECT DISTINCT symbol FROM stocks`
    );

    if (stocksToUpdate.length === 0) {
      console.log("No stocks to refresh.");
      return;
    }

    console.log(`Found ${stocksToUpdate.length} unique stocks to update.`);

    // find new data
    for (const stock of stocksToUpdate) {
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
        } else {
          console.warn(`No quote data returned for ${symbol}.`);
        }
        
        // delay to be respectful of API rate limits
        await new Promise(resolve => setTimeout(resolve, 250)); 

      } catch (apiError) {
        console.error(`Failed to fetch or update data for symbol ${symbol}:`, apiError.message);
      }
    }

    // check for alerts now
    console.log("All stock prices updated. Now checking for alerts.");
    await checkAlertsAndNotify();

  } catch (err) {
    console.error("An error occurred during the refreshAllStockData process:", err);
  }
}

// schedule job to run every 5 mins 
// cron syntax: '*/5 * * * *' means "at every 5th minute".
cron.schedule('*/5 * * * *', refreshAllStockData);

console.log('Automated stock refresh job scheduled to run every 5 minutes.');

function capitalizeFirst(name){
  if(!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}


function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// ------------------ END OF FUNCTION HELPERS ---------------------------------



app.set("view engine", "ejs");

app.listen(port, () => {
  console.log(`Server running on port ${port}!`);
});

app.get("/", async (req,res) => {
  res.redirect("/login");
});

app.get("/login", async (req,res) => {
  res.render("login.ejs");
});

app.get("/register", async (req,res) => {
  res.render("register.ejs");
});

app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  }
));

app.get("/auth/google/callback", 
  passport.authenticate("google", { 
    successRedirect: "/dashboard",
    failureRedirect: "/login" 
  })
);

app.get("/dashboard", requireLogin, (req,res) => {
  res.render("dashboard", { firstName : capitalizeFirst(req.user.first_name) });
});

app.get("/search", requireLogin, async (req,res) => {
  res.render("search.ejs");
});

app.get("/help", requireLogin, async (req,res) => {
  res.render("help.ejs");
});

app.get("/logout", async (req,res) => {
  req.logout((err) => {
    if(err){
      console.log(err);
    } else {
      res.redirect("/");
    }
  })
});

app.get("/watchlist", requireLogin, async (req, res) => {
  const userId    = req.user.id;
  const filter    = req.query.filter    || "def";
  const capFilter = req.query.capFilter || null;

  // build ORDER BY once
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

    const stockCount = stocks.length;

    res.render("watchlist.ejs", {
      stocks,
      stockCount,
      filter,
      capFilter
    });
  } catch (err) {
    console.error(err);
    res.send("Unable to load watchlist");
  }
});


app.get("/checkalerts", requireLogin, async (req,res) => {
  await checkAlertsAndNotify();
  res.redirect("/alerts");
});

app.get("/alerts", requireLogin, async (req,res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT a.id, s.symbol, a.target_price, a.direction, a.triggered
      FROM alerts a
      JOIN stocks s ON a.stock_id = s.stockid
      WHERE a.user_id = $1
      ORDER BY a.triggered ASC, s.symbol ASC`,
      [userId]
    );
    
    const alerts = result.rows;
    res.render("alerts", { alerts });
  } catch (err) {
    console.log(err);
    res.send("Unable to load alerts");
  }
});


app.post("/register", async (req,res) => {
  const { email, password, first_name } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1",
      [email]
    );

    if(checkResult.rows.length > 0) {
      return res.redirect("/login");
    }
    const hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      "INSERT INTO users (email, password_hash, first_name) VALUES ($1, $2, $3)",
      [email, hash, first_name]
    );
    const user = result.rows[0];

    req.login(user, (err) => {
      if (err) {console.log(err);}
      return res.redirect("/dashboard");
    });
    
  } catch(err) {
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

app.post("/search", async (req,res) => {
  const symbol = req.body.symbol.toUpperCase();
  const { action } = req.body;

  if(action == "back"){
    return res.redirect("/dashboard");
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/quote", {
      params: {
        symbol : symbol,
        token: API_KEY
      }
    });
    const data = response.data

    if(!data.c){
      return res.render("searchresult.ejs", {error: "No stock found with that symbol.", stock: null});
    };

    const response2 = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
      params: {
        symbol : symbol,
        token : API_KEY
      }
    });

    const data2 = response2.data;

    if(!data2.name){
      return res.render("searchresult.ejs", {error: "No stock found with that symbol...", stock: null});
    }

    const stock = {
      symbol: symbol,
      companyname: data2.name,
      marketcap: data2.marketCapitalization,
      price: data.c.toFixed(2),
      dayhigh: data.h.toFixed(2),
      daylow: data.l.toFixed(2),
      sector: data2.finnhubIndustry
    };

    


    res.render("searchresult.ejs", { error: null, stock });
  } catch(err) {
    console.log(err);
    res.render("searchresult.ejs", { error: "Something went wrong. try again.", stock: null});
  }
});

app.post("/add", async (req,res) => {

  const { action, symbol, price, dayhigh, daylow, companyname, marketcap, sector } = req.body;

  if(action == "back") {
    return res.redirect("/search");
  }
  
  const userId = req.user.id;

  if(action == "add"){
    try {
      //check if stock exists in watchlist
      let result = await db.query("SELECT * FROM stocks WHERE symbol = $1",
        [symbol]
      );
      let stockId;

      if(result.rows.length !== 0) {
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
    } catch(err) {
      console.log(err);
      res.send("Failed to add to watchlist");
    }
  }


});

app.post("/delete", async (req,res) => {
  const { symbol } = req.body;
  const userId = req.user.id;

  try {
    const stockResult = await db.query("SELECT stockid FROM stocks WHERE symbol = $1",
      [symbol]
    );

    if(stockResult.rows.length > 0) {
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

app.post("/refresh", async (req,res) => {
  const { symbol } = req.body;

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

    if(!quote.c) {
      return res.send("Failed to refresh stock.");
    }

    await db.query (
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
});

app.post("/setalert", async (req,res) => {
  const { symbol, direction, target_price } = req.body;
  const userId = req.user.id;

  try {
    const stockResult = await db.query("SELECT stockid FROM stocks WHERE symbol = $1",
      [symbol]
    );

    if(stockResult.rows.length > 0) {
      const stockId = stockResult.rows[0].stockid;

      await db.query(
        `INSERT INTO alerts (user_id, stock_id, target_price, direction)
        VALUES ($1, $2, $3, $4)`,
        [userId, stockId, target_price, direction]
      );
    }

    res.redirect("/watchlist");
  } catch(err) {
    console.log(err);
    res.send("Unable to get alert");
  }
});

app.post("/deletealert", requireLogin, async (req,res) => {
  const { alert_id } = req.body;

  try{
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
  new Strategy( { usernameField: "email", passwordField: "password" },
    async function verify(email, password, cb) {
    try {
      const { rows } = await db.query("SELECT * FROM users WHERE email = $1",
        [email]
      );

      if(rows.length === 0) {
        //no user
        console.log("FAIL: User not found in the database.");
        return cb(null, false, { message: "User not found"});
      }

      const user = rows[0];

      const storedHashedPassword = user.password_hash;
      bcrypt.compare(password, storedHashedPassword, (err, valid) => {
        if(err) {
          console.error("Error comparing passwords:", err);
          return cb(err);
        } 
        if(!valid){
          console.log("FAIL: Passwords DO NOT match."); 
          return cb(null, false, { message: "Incorrect password" });
        }
        return cb(null, user);
      });

    } catch(err) {
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

app.listen(port, () => {
    console.log("Server running!");
  });
