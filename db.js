const Database = require('better-sqlite3');
const db = new Database('./data.sqlite');

// users table
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  muted_until DATETIME DEFAULT NULL,
  coins INTEGER DEFAULT 50,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// rooms table
db.prepare(`CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  owner_id INTEGER,
  is_private INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// messages table
db.prepare(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER,
  user_id INTEGER,
  username TEXT,
  message TEXT,
  image TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// seed owner/king if missing
const bcrypt = require('bcryptjs');
const row = db.prepare("SELECT * FROM users WHERE role='king'").get();
if (!row) {
  const hashed = bcrypt.hashSync('ChangeMe123!', 8);
  db.prepare('INSERT INTO users (username, password, role, coins) VALUES (?, ?, ?, ?)').run('MEDO', hashed, 'king', 100000);
  console.log('Seeded KING account: MEDO / ChangeMe123! - change password immediately');
}

// default main room
const r = db.prepare("SELECT * FROM rooms WHERE name='main'").get();
if (!r) {
  db.prepare('INSERT INTO rooms (name, owner_id, is_private) VALUES (?, ?, ?)').run('main', null, 0);
}

module.exports = db;