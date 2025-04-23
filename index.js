import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcrypt";
import axios from "axios";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;;
const API_KEY = process.env.API_KEY;
const db = new pg.Client({
  user : process.env.DB_USER,
  host : process.env.DB_HOST,
  database : process.env.DB_NAME,
  password : process.env.DB_PASSWORD,
  port : process.env.DB_PORT
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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
  res.render("dashboard.ejs", {first_name: req.session.first_name});
});

app.get("/search", requireLogin, async (req,res) => {
  res.render("search.ejs");
});

app.get("/logout", async (req,res) => {
  res.redirect("/login");
});

app.get("/watchlist", requireLogin, async (req, res) => {
  const userId    = req.session.userId;
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
  const { username, email, password, first_name } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.query(
      "INSERT INTO users (username, password_hash, email, first_name) VALUES ($1, $2, $3, $4)",
      [username, hashedPassword, email, first_name]
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
        req.session.first_name = user.first_name;
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
    console.log(data2.marketCapitalization);

    const stock = {
      symbol: symbol,
      companyname: data2.name,
      marketCap: data2.marketCapitalization,
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

  const { action, symbol, price, dayhigh, daylow, companyname, marketCap, sector } = req.body;


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
          `INSERT INTO stocks (symbol, currentprice, dayhigh, daylow, companyname, marketcap, sector)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING stockid`,
          [symbol, price, dayhigh, daylow, companyname, marketCap, sector]
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
      SET currentprice = $1, dayhigh = $2, daylow = $3, marketCap = $4, updatedat = CURRENT_TIMESTAMP
      WHERE symbol = $5`,
      [quote.c, quote.h, quote.l, profile.marketCapitalization, symbol]
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
