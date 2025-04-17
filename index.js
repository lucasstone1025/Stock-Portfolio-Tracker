import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcrypt";
import axios from "axios";
import nodemailer from "nodemailer";

const app = express();
const port = 3000;
const API_KEY = "d000qg1r01qud9ql5dsgd000qg1r01qud9ql5dt0";

const db = new pg.Client({
  user : "postgres",
  host : "localhost",
  database : "stock_watchlist",
  password : "531924",
  port : 5432
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lucasstone49@gmail.com",
    pass: "loomlkrytkjzfijb"
  }
})

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "keyboard cat", 
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 
  }
}));
app.set("view engine", "ejs");

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
          text: `The stock ${alert.symbol} had ${direction === "up" ? "risen above" : "fallen below"} 
                your target price of $${target}. Current price: $${current}.`
        });

        await db.query(`UPDATE alerts SET triggered = TRUE WHERE id = $1`, [alert.id]);

        console.log(`Alert triggered and email sent for ${alert.symbol} (${direction} $${target})`);
      }
    }
  } catch(err) {
    console.log(err);
  }
}


function requireLogin(req, res, next) {
  if(!req.session.userId) {
    return res.redirect("/login"); //go back to login
  }
  next(); //user allowed
}

app.get("/", async (req,res) => {
  res.redirect("/login");
});

app.get("/login", async (req,res) => {
  res.render("login.ejs");
});

app.get("/register", async (req,res) => {
  res.render("register.ejs");
});

app.get("/dashboard", requireLogin, (req,res) => {
  res.render("dashboard.ejs", {username: req.session.username});
});

app.get("/search", requireLogin, async (req,res) => {
  res.render("search.ejs");
});

app.get("/logout", async (req,res) => {
  res.redirect("/login");
});

app.get("/watchlist", requireLogin, async(req,res) => {
  const userId = req.session.userId;

  try{
    const result = await db.query(
      `SELECT s.symbol, s.companyname, s.marketcap, s.currentprice, s.dayhigh, s.daylow
      FROM watchlist w
      JOIN stocks s ON w.stock_id = s.stockid
      WHERE w.user_id = $1`,
      [userId]
    );

    const countResult = await db.query(
      "SELECT COUNT(*) FROM watchlist WHERE user_id = $1",
      [userId]
    );

    const stockCount = countResult.rows[0].count;

    const stocks = result.rows;

    res.render("watchlist.ejs", { stocks, stockCount });
  } catch (err) {
    console.log(err);
    res.send("Unable to load watchlist");
  }
});

app.get("/checkalerts", requireLogin, async (req,res) => {
  await checkAlertsAndNotify();
  res.redirect("/watchlist");
});

app.get("/alerts", requireLogin, async (req,res) => {
  try {
    const userId = req.session.userId;

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
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.query(
      "INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3)",
      [username, hashedPassword, email]
    );
    res.redirect("/login");
  } catch(err) {
    console.log(err);
    res.send("Registration failed. Try a different username or email.");
  }
});

app.post("/login", async (req,res) => {
  const { username, password } = req.body;

  try{
    const result = await db.query("SELECT * FROM users WHERE username = $1",
      [username]
    );
    if(result.rows.length !== 0) {
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);

      if(isValid) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect("/dashboard");
      } else {
        res.send("Incorrect Password");
      }
    } else {
      res.send("User not found");
    }
  } catch(err) {
    console.log(err);
    res.send("Login failed, Please try again.");
  }
});

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

    // check our db first
    let companyName = null;
    let marketCap = null;

    const infoQuery = await db.query(
      "SELECT companyname, marketcap FROM stocks WHERE symbol ILIKE $1",
      [symbol]
    );

    if (infoQuery.rows.length > 0) {
      const rawName = infoQuery.rows[0].companyname;
      companyName = (!rawName || rawName === 'null' || rawName === 'N/A') ? null : rawName;
      marketCap = infoQuery.rows[0].marketcap;
    }
    

    // Fetch from profile2 if missing
    if (!companyName || !marketCap) {
      const profileRes = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol, token: API_KEY }
      });
    
      if (profileRes.data) {
        companyName = profileRes.data.name || profileRes.data.ticker || "N/A";
        marketCap = profileRes.data.marketCapitalization || marketCap;
    
        await db.query(
          `INSERT INTO stocks (symbol, companyname, marketcap)
           VALUES ($1, $2, $3)
           ON CONFLICT (symbol)
           DO UPDATE SET 
             companyname = COALESCE(EXCLUDED.companyname, stocks.companyname),
             marketcap = COALESCE(EXCLUDED.marketcap, stocks.marketcap)`,
          [symbol, companyName, marketCap]
        );
      }
    }

    
    const stock = {
      symbol: symbol,
      name: companyName || "N/A",
      marketCap: marketCap,
      price: data.c ? data.c.toFixed(2) : "0.00",
      dayhigh: data.h ? data.h.toFixed(2) : "0.00",
      daylow: data.l ? data.l.toFixed(2) : "0.00"
    };


    res.render("searchresult.ejs", { error: null, stock });
  } catch(err) {
    console.log(err);
    res.render("searchresult.ejs", { error: "Something went wrong. try again.", stock: null});
  }
});

app.post("/add", async (req,res) => {
  const { action, symbol, price, dayhigh, daylow, companyname } = req.body;

  if(action == "back") {
    return res.redirect("/search");
  }
  
  const userId = req.session.userId;

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
          `INSERT INTO stocks (symbol, companyname, currentprice, dayhigh, daylow)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING stockid`,
          [symbol, companyname, price, dayhigh, daylow]
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
  const userId = req.session.userId;

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

    if(!quote.c) {
      return res.send("Failed to refresh stock.");
    }

    await db.query (
      `UPDATE stocks
      SET currentprice = $1, dayhigh = $2, daylow = $3, updatedat = CURRENT_TIMESTAMP
      WHERE symbol = $4`,
      [quote.c, quote.h, quote.l, symbol]
    );

    res.redirect("/watchlist");
  } catch (err) {
    console.log(err);
    res.send("Unable to refresh stock");
  }
});

app.post("/setalert", async (req,res) => {
  const { symbol, direction, target_price } = req.body;
  const userId = req.session.userId;

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
      [alert_id, req.session.userId]
    );
    res.redirect("/alerts");
  } catch (err) {
    console.log(err);
    res.send("Unable to delete alert.");
  }
});


setInterval(checkAlertsAndNotify, 60 * 1000);

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
