const SIZE = 6;

let me = JSON.parse(sessionStorage.me || 'null');
if (!me) {
  me = { id: crypto.randomUUID(), name: 'Игрок ' + Math.floor(1000 + Math.random() * 9000) };
  sessionStorage.me = JSON.stringify(me);
}

// последнее известное поле — чтобы после потери сети экран не пустел
let game = JSON.parse(localStorage.game || 'null') || {
  board: Array.from({ length: SIZE * SIZE }, () => ({ owner: null, version: 0 })),
  players: {},
};
let pending = JSON.parse(localStorage.pending || '[]');
let ws;
let online = false;

const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const boardEl = document.getElementById('board');
const playersEl = document.getElementById('players');
const nameInput = document.getElementById('name-input');
const msgEl = document.getElementById('msg');

nameInput.value = me.name;
draw();
connect();

window.addEventListener('online', connect);
window.addEventListener('offline', () => ws && ws.close());

document.getElementById('name-form').onsubmit = (e) => {
  e.preventDefault();
  me.name = nameInput.value.trim().slice(0, 20) || me.name;
  sessionStorage.me = JSON.stringify(me);
  send({ type: 'join', id: me.id, name: me.name });
};

document.getElementById('reset').onclick = () => send({ type: 'reset' });

function connect() {
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  if (!navigator.onLine) {
    setStatus('off', 'Нет сети');
    return;
  }

  setStatus('wait', 'Подключение…');
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host);

  ws.onopen = () => {
    online = true;
    setStatus('on', 'Онлайн');
    send({ type: 'join', id: me.id, name: me.name });
    pending.forEach(send);
    pending = [];
    localStorage.pending = '[]';
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    game = msg.game;
    localStorage.game = JSON.stringify(game);
    draw();
    if (msg.conflict) msgEl.textContent = msg.conflict;
    else if (secondsLeft() > 0) msgEl.textContent = '';
  };

  ws.onclose = () => {
    online = false;
    setStatus('off', 'Нет сети');
    setTimeout(connect, 1000);
  };
}

function send(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function secondsLeft() {
  if (!game.endsAt) return 60;
  return Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1000));
}

function claim(index) {
  if (secondsLeft() === 0) return;
  const move = { type: 'claim', index, version: game.board[index].version };
  if (online) {
    send(move);
    return;
  }
  // офлайн: ход в localStorage, после reconnect уйдёт на сервер
  pending.push(move);
  localStorage.pending = JSON.stringify(pending);
  game.board[index].owner = me.id;
  localStorage.game = JSON.stringify(game);
  draw();
  msgEl.textContent = 'Ход сохранён и уйдёт после сети';
}

function tick() {
  const sec = secondsLeft();
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  timerEl.textContent = m + ':' + String(s).padStart(2, '0');
  timerEl.className = 'timer' + (sec === 0 ? ' is-end' : sec <= 10 ? ' is-low' : '');
  if (sec === 0) showWinner();
}

function showWinner() {
  let best = -1;
  const top = [];
  for (const p of Object.values(game.players || {})) {
    const n = game.board.filter((c) => c.owner === p.id).length;
    if (n > best) {
      best = n;
      top.length = 0;
      top.push(p.name);
    } else if (n === best) {
      top.push(p.name);
    }
  }
  if (best <= 0) {
    msgEl.textContent = 'Время вышло';
  } else if (top.length === 1) {
    msgEl.textContent = 'Победитель: ' + top[0];
  } else {
    msgEl.textContent = 'Ничья: ' + top.join(', ');
  }
}

function draw() {
  tick();
  playersEl.innerHTML = '';
  for (const p of Object.values(game.players || {})) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.name + (p.id === me.id ? ' (ты)' : '');
    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = game.board.filter((c) => c.owner === p.id).length;
    li.append(dot(p.color), name, score);
    playersEl.append(li);
  }

  boardEl.innerHTML = '';
  game.board.forEach((cell, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cell';
    btn.onclick = () => claim(i);
    if (secondsLeft() === 0) btn.disabled = true;
    const owner = game.players[cell.owner];
    if (owner) {
      btn.classList.add('is-owned');
      btn.style.background = owner.color;
      btn.textContent = owner.name[0].toUpperCase();
    }
    if (cell.owner === me.id) btn.classList.add('is-mine');
    const ver = document.createElement('span');
    ver.className = 'ver';
    ver.textContent = 'v' + cell.version;
    btn.append(ver);
    boardEl.append(btn);
  });
}

function dot(color) {
  const el = document.createElement('span');
  el.className = 'swatch';
  el.style.background = color;
  return el;
}

function setStatus(kind, text) {
  statusEl.className = 'status is-' + kind;
  statusEl.textContent = text;
}

setInterval(tick, 200);
