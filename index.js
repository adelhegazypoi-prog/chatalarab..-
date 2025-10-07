require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: "*" } });
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret';
const multer = require('multer');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g,'_');
    cb(null, unique);
  }
});
const upload = multer({ storage });

// static client
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// simple auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'مطلوب اسم وكلمة مرور' });
  const hashed = bcrypt.hashSync(password, 8);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const info = stmt.run(username, hashed);
    const user = { id: info.lastInsertRowid, username, role: 'user' };
    const token = jwt.sign(user, SECRET);
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: 'اسم المستخدم مأخوذ' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row) return res.status(400).json({ error: 'بيانات غير صحيحة' });
  if (row.banned) return res.status(403).json({ error: 'محظور' });
  const ok = bcrypt.compareSync(password, row.password);
  if (!ok) return res.status(400).json({ error: 'بيانات غير صحيحة' });
  const user = { id: row.id, username: row.username, role: row.role, coins: row.coins || 0 };
  const token = jwt.sign(user, SECRET);
  res.json({ user, token });
});

// upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});

// rooms
app.get('/api/rooms', (req, res) => {
  const rows = db.prepare('SELECT id, name, is_private, created_at FROM rooms ORDER BY created_at DESC').all();
  res.json(rows);
});
app.post('/api/rooms', (req, res) => {
  const { name, owner_id, is_private } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الغرفة مطلوب' });
  const stmt = db.prepare('INSERT INTO rooms (name, owner_id, is_private) VALUES (?, ?, ?)');
  const info = stmt.run(name, owner_id || null, is_private ? 1 : 0);
  res.json({ id: info.lastInsertRowid, name, is_private: is_private ? 1 : 0 });
});

// admin actions (basic, protected by token)
function authenticate(req, res, next){
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send('Unauthorized');
  const token = auth.split(' ')[1];
  try {
    const user = jwt.verify(token, SECRET);
    req.user = user;
    next();
  } catch (e) { res.status(401).send('Invalid token'); }
}

app.post('/api/admin/ban', authenticate, (req, res) => {
  if (!['king','master','owner','admin','superadmin','prince','queen'].includes(req.user.role)) return res.status(403).send('ممنوع');
  const { username } = req.body;
  db.prepare('UPDATE users SET banned=1 WHERE username = ?').run(username);
  res.json({ ok: true });
});

app.post('/api/admin/unban', authenticate, (req, res) => {
  if (!['king','master','owner','admin','superadmin','prince','queen'].includes(req.user.role)) return res.status(403).send('ممنوع');
  const { username } = req.body;
  db.prepare('UPDATE users SET banned=0 WHERE username = ?').run(username);
  res.json({ ok: true });
});

// messages stored
io.on('connection', (socket) => {
  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    const roomRow = db.prepare('SELECT id FROM rooms WHERE name = ?').get(room);
    const msgs = roomRow ? db.prepare('SELECT username, message, image, ts FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT 50').all(roomRow.id).reverse() : [];
    socket.emit('old_messages', msgs);
    socket.to(room).emit('system_message', { text: `${username} انضم للغرفة` });
  });

  socket.on('send_message', ({ room, message, username, image }) => {
    const roomRow = db.prepare('SELECT id FROM rooms WHERE name = ?').get(room);
    const room_id = roomRow ? roomRow.id : 1;
    const msg = { username, message, image: image || null, ts: Date.now() };
    db.prepare('INSERT INTO messages (room_id, username, message, image) VALUES (?, ?, ?, ?)').run(room_id, username, message, image || null);
    io.to(room).emit('new_message', msg);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
