const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true
}));

const db = new sqlite3.Database("./db.sqlite");

// DB
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS debts (id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER)");

  db.run("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', '1234', 'admin')");
});

// LOGIN
app.get("/", (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST" action="/login">
      <input name="username" placeholder="Kullanıcı adı" />
      <input name="password" type="password" placeholder="Şifre" />
      <button>Giriş</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username=? AND password=?", [username, password], (err, user) => {
    if (!user) return res.send("Hatalı giriş");

    req.session.user = user;

    if (user.role === "admin") return res.redirect("/admin");
    else return res.redirect("/dashboard");
  });
});

// ADMIN
app.get("/admin", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") return res.redirect("/");

  db.all("SELECT debts.id, users.username, debts.amount FROM debts JOIN users ON debts.user_id = users.id", (err, rows) => {
    let list = rows.map(r => `<li>${r.username}: ${r.amount} TL <a href='/delete/${r.id}'>Sil</a></li>`).join("");

    res.send(`
      <h2>Admin Panel</h2>
      <form method="POST" action="/add">
        <input name="user_id" placeholder="Kullanıcı ID" />
        <input name="amount" placeholder="Borç" />
        <button>Ekle</button>
      </form>
      <ul>${list}</ul>
    `);
  });
});

// BORÇ EKLE
app.post("/add", (req, res) => {
  db.run("INSERT INTO debts (user_id, amount) VALUES (?, ?)", [req.body.user_id, req.body.amount]);
  res.redirect("/admin");
});

// BORÇ SİL
app.get("/delete/:id", (req, res) => {
  db.run("DELETE FROM debts WHERE id=?", [req.params.id]);
  res.redirect("/admin");
});

// MÜŞTERİ
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  db.all("SELECT * FROM debts WHERE user_id=?", [req.session.user.id], (err, rows) => {
    let list = rows.map(r => `<li>${r.amount} TL</li>`).join("");

    res.send(`<h2>Borçlarım</h2><
