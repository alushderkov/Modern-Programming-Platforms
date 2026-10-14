import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const FILE = path.join(ROOT, 'data', 'game.json');
const SIZE = 6;
const ROUND_SEC = 60;
const COLORS = ['#c0392b', '#2471a3', '#1e8449', '#b7950b', '#6c3483', '#ca6f1e'];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

function blank() {
  return {
    board: Array.from({ length: SIZE * SIZE }, () => ({ owner: null, version: 0 })),
    players: {},
  };
}

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!Array.isArray(data.board) || data.board.length !== SIZE * SIZE) return blank();
    data.board = data.board.map((cell) => ({
      owner: cell.owner ?? cell.ownerId ?? null,
      version: cell.version || 0,
    }));
    data.players = data.players || {};
    return data;
  } catch {
    return blank();
  }
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(game, null, 2));
}

let game = load();

const server = http.createServer((req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '').split('?')[0];
  const file = path.join(PUBLIC, name);
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' });
    res.end(buf);
  });
});

const wss = new WebSocketServer({ server });

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function sendAll() {
  for (const client of wss.clients) send(client, { type: 'state', game });
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));

    if (msg.type === 'join') {
      ws.playerId = msg.id;
      if (!game.players[msg.id]) {
        const n = Object.keys(game.players).length;
        game.players[msg.id] = {
          id: msg.id,
          name: String(msg.name || 'Игрок').slice(0, 20),
          color: COLORS[n % COLORS.length],
        };
      } else if (msg.name) {
        game.players[msg.id].name = String(msg.name).slice(0, 20);
      }
      if (!game.endsAt) {
        game.endsAt = Date.now() + ROUND_SEC * 1000;
      }
      save();
      sendAll();
      return;
    }

    if (!ws.playerId) return;

    if (msg.type === 'reset') {
      game.board = blank().board;
      game.endsAt = Date.now() + ROUND_SEC * 1000;
      save();
      sendAll();
      return;
    }

    if (msg.type === 'claim') {
      // 200 мс — чтобы на защите два человека успели кликнуть одну клетку
      setTimeout(() => claim(ws, msg), 200);
    }
  });
});

function claim(ws, msg) {
  const cell = game.board[msg.index];
  if (!cell || !ws.playerId) return;
  if (game.endsAt && Date.now() >= game.endsAt) {
    send(ws, { type: 'state', game, conflict: 'Время вышло' });
    return;
  }

  // конфликт: клиент видел старую version — клетку уже кто-то занял
  if (cell.version !== msg.version) {
    send(ws, { type: 'state', game, conflict: 'Конфликт: клетку уже изменили' });
    return;
  }

  cell.owner = ws.playerId;
  cell.version += 1;
  save();
  sendAll();
}

server.listen(process.env.PORT || 3000, () => {
  console.log('http://localhost:3000');
});
