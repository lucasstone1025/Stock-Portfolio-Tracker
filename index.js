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

async function isMarketOpen() {

  try {
    const { data } = await axios.get("https://finnhub.io/api/v1/stock/market-status",
      {
        params: { exchange: "US", token: API_KEY }
      }
    );
    const marketOpen = data.marketOpen;
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
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

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

app.get("/findstocks", requireLogin, async (req,res) => {
  res.render("findstocks.ejs");
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

app.get("/chart", async (req, res) => {
  // read json data from file
  try {

    //run python script to get latest data
    await runPythonScript();
    
    const dataPath = path.join(__dirname, 'public', 'data', 'stock_data.json');
    const stockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    res.render('chart', { stockData });
    
  } catch (err) {
    console.error('Error', err);
    res.status(500).render('error', { message: 'Failed to load chart data.' });
  }
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

app.get("/stock/:symbol", isAuthenticated, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const sql = `
      SELECT 
        symbol,
        companyname,
        marketcap,
        currentprice,
        dayhigh,
        daylow,
        sector
      FROM stocks
      WHERE symbol = $1
    `;

    const { rows } = await db.query(sql, [symbol]);

    if (rows.length === 0) {
      return res.status(404).send("Stock not found");
    }

    const stock = {
      symbol: rows[0].symbol,
      companyname: rows[0].companyname,
      marketcap: rows[0].marketcap,
      price: parseFloat(rows[0].currentprice).toFixed(2),
      dayhigh: parseFloat(rows[0].dayhigh).toFixed(2),
      daylow: parseFloat(rows[0].daylow).toFixed(2),
      sector: rows[0].sector
    }

    // for now just pass ticker to the voew
    // here is where I make api calls for more data if needed
    //like const financialData = await getFinancialData(ticker);

    res.render("stockdetails.ejs", { 
      stock: stock
      //will pass financialData: financialData etc
    });
  } catch (err) {
    console.error("Error fetching stock details:", err);
    res.status(500).send("Internal Server Error") 
  }
});

app.get("/api/stock/:symbol", isAuthenticated, async (req, res) => {

  const ticker = req.params.symbol.toUpperCase();

  const scriptPath = path.join(__dirname, 'scripts', 'get-json-stock-data.py');
  

  // Path to python script
  const pythonPath = '/home/lucas/anaconda3/bin/python';
  
  console.log('Script path:', scriptPath);
  console.log('Python path:', pythonPath);
  
  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
      console.log('ERROR: Python script not found! ');
      return res.status(500).json({ error: 'Python script not found' });
  }
  
  let python;
  try {
      python = spawn(pythonPath, [scriptPath, ticker]);
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
      return res.status(500).json({ error: `Failed to run Python: ${error.message}` });
  });
  
  python.on('close', (code) => {
      console.log('Python exited with code:', code);
      
      if (code === 0) {
          const dataPath = path.join(__dirname, 'public', 'data', `${ticker.toLowerCase()}_output.json`);
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
              res.status(500).json({ error: `Failed to read stock data for ${ticker}.` });
          }
      } else {
          console.error(`Python script error: ${errorOutput}`);
          res.status(500).json({ error: `Python script exited with code ${code}: ${errorOutput}` });
      }
  });
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

  const open = await isMarketOpen();
  if(open){

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

  } else {
    console.log("Market is closed... cannot refresh stock.");
    return res.redirect("/watchlist");
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
