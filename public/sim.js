// Shared simulation: runs in the Durable Object (multiplayer) AND in the browser (single player).
export const T = 16, W = 192, H = 192, MAX_PLAYERS = 4;
const PR = 4, MR = 5;
const SPEED = 62, DASH = 200, CHASE = 54, WANDER = 32, SENSE = 170;

export function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// tiles: 0 grass, 1 tree, 2 water, 3 floor, 4 wall, 5 door, 6 road, 7 bridge, 8 crate
export function createWorld(seed) {
  const tiles = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let t = 0;
    if (vnoise(x / 22, y / 22, seed) < 0.36) t = 2;                                    // big lakes
    else if (vnoise(x / 18, y / 18, seed + 3) > 0.5 && hash(x, y, seed + 9) < 0.36) t = 1; // dark woods
    else if (hash(x, y, seed + 11) < 0.012) t = 1;                                      // lone trees
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) t = 1;
    tiles[y * W + x] = t;
  }
  const r = rng(seed), buildings = [], lights = [];
  const dims = () => ({ w: 12 + Math.floor(r() * 5), h: 8 + Math.floor(r() * 4) });
  buildings.push({ x: W / 2 - 7, y: H / 2 - 5, w: 14, h: 10 });
  for (const gy of [32, 96, 160]) for (const gx of [32, 96, 160]) {
    if (gx === 96 && gy === 96) continue;
    const d = dims(), jx = Math.floor(r() * 17) - 8, jy = Math.floor(r() * 17) - 8;
    buildings.push({ x: gx - (d.w >> 1) + jx, y: gy - (d.h >> 1) + jy, w: d.w, h: d.h });
  }
  for (const b of buildings) {
    for (let y = b.y - 2; y < b.y + b.h + 2; y++) for (let x = b.x - 2; x < b.x + b.w + 2; x++)
      if (x >= 3 && y >= 3 && x < W - 3 && y < H - 3) tiles[y * W + x] = 0;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++)
      tiles[y * W + x] = (x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1) ? 4 : 3;
    const px = b.x + Math.floor(b.w / 3);
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) if (y !== b.y + 3 && y !== b.y + 4) tiles[y * W + px] = 4;
    const dx = b.x + (b.w >> 1);
    tiles[(b.y + b.h - 1) * W + dx] = 5;
    b.door = { x: dx, y: b.y + b.h - 1 };
    for (const [cx, cy] of [[b.x + 1, b.y + 1], [b.x + b.w - 2, b.y + 1], [b.x + b.w - 2, b.y + b.h - 2]])
      if (r() < 0.6) tiles[cy * W + cx] = 8;
    lights.push({ x: dx * T + 8, y: (b.y + b.h) * T + 8, r: 54 });
    lights.push({ x: (b.x + b.w / 2) * T, y: (b.y + b.h / 2) * T, r: 52, in: 1 });
  }
  // roads (bridges over water), carved after buildings so they never cut through walls
  const put = (px, py) => {
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) {
      const X = px + dx, Y = py + dy;
      if (X < 3 || Y < 3 || X >= W - 3 || Y >= H - 3) continue;
      const t = tiles[Y * W + X];
      if (t === 0 || t === 1) tiles[Y * W + X] = 6; else if (t === 2) tiles[Y * W + X] = 7;
    }
  };
  const road = (x0, y0, x1, y1) => {
    const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0); let x = x0, y = y0, n = 0;
    while (x !== x1 || y !== y1) { put(x, y); if (++n % 14 === 0) lights.push({ x: x * T + 16, y: y * T + 16, r: 38 }); x += sx; y += sy; }
    put(x1, y1);
  };
  const ROWS = [64, 128, 182];
  for (const y of ROWS) road(6, y, 184, y);
  for (const x of [64, 128]) road(x, 6, x, 182);
  for (const b of buildings) { const fy = b.y + b.h; const ty = ROWS.find((v) => v >= fy + 3); if (ty) road(b.door.x, fy, b.door.x, ty); }

  const b0 = buildings[0];
  const spawn = { x: (b0.x + b0.w / 2) * T, y: (b0.y + b0.h / 2) * T };
  const free = () => { for (let i = 0; i < 800; i++) { const x = 5 + Math.floor(r() * (W - 10)), y = 5 + Math.floor(r() * (H - 10)); const t = tiles[y * W + x]; if (t === 0 || t === 3 || t === 6) return { x: x * T + 8, y: y * T + 8, t }; } return { x: spawn.x, y: spawn.y, t: 3 }; };
  const pickups = Array.from({ length: 70 }, () => { const p = free(); return { x: p.x, y: p.y, type: r() < 0.5 ? 'dash' : 'speed' }; });
  const lairs = []; let guard = 0;
  while (lairs.length < 24 && guard++ < 5000) { const p = free(); if (p.t === 0 && Math.hypot(p.x - spawn.x, p.y - spawn.y) > 40 * T) lairs.push(p); }
  if (!lairs.length) lairs.push({ x: spawn.x + 400, y: spawn.y + 400 });
  return { seed, tiles, spawn, pickups, lairs, buildings, lights };
}

const solidAt = (w, px, py) => { const x = Math.floor(px / T), y = Math.floor(py / T); if (x < 0 || y < 0 || x >= W || y >= H) return true; const t = w.tiles[y * W + x]; return t === 1 || t === 2 || t === 4 || t === 8; };
const blocked = (w, x, y, r) => solidAt(w, x - r, y - r) || solidAt(w, x + r, y - r) || solidAt(w, x - r, y + r) || solidAt(w, x + r, y + r);
function move(w, e, dx, dy, r) { if (!blocked(w, e.x + dx, e.y, r)) e.x += dx; if (!blocked(w, e.x, e.y + dy, r)) e.y += dy; }

function pickLair(w, ps) {
  const alive = ps.filter((p) => !p.dead);
  if (alive.length && Math.random() < 0.5) { // stalk: head for a lair near a random player
    const p = alive[(Math.random() * alive.length) | 0]; let best = null, bd = 1e9;
    for (const l of w.lairs) { const d = Math.hypot(l.x - p.x, l.y - p.y); if (d > 40 && d < bd) { bd = d; best = l; } }
    if (best) return best;
  }
  return w.lairs[(Math.random() * w.lairs.length) | 0];
}

export function newState(w) {
  const l = w.lairs[0];
  return { t: 0, players: {}, m: { x: l.x, y: l.y, lair: l, ang: 0, jit: 0, stuck: 0, pause: 0, fails: 0 }, pk: w.pickups.map(() => ({ on: true, t: 0 })), ev: [] };
}
export function addPlayer(s, w, id, name) {
  s.players[id] = { id, name, x: w.spawn.x + Math.random() * 16 - 8, y: w.spawn.y + Math.random() * 16 - 8, aim: 0, item: null, dead: 0, speedT: 0, dashT: 0, scare: 5, amb: 15 + Math.random() * 20 };
}
export const removePlayer = (s, id) => { delete s.players[id]; };

export function step(w, s, dt, inputs) {
  s.t += dt; s.ev = [];
  const ps = Object.values(s.players);
  for (const p of ps) {
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.x = w.spawn.x; p.y = w.spawn.y; } continue; }
    const i = inputs[p.id] || {};
    let mx = i.mx || 0, my = i.my || 0; const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    if (Math.hypot(i.ax || 0, i.ay || 0) > 0.2) p.aim = Math.atan2(i.ay, i.ax);
    if (i.u && p.item) {
      if (p.item === 'dash') p.dashT = 0.25; else p.speedT = 4;
      s.ev.push({ k: 'use', id: p.id, item: p.item }); p.item = null;
    }
    p.dashT = Math.max(0, p.dashT - dt); p.speedT = Math.max(0, p.speedT - dt);
    let sp = SPEED * (p.speedT > 0 ? 1.6 : 1);
    if (p.dashT > 0) { sp = DASH; if (ml < 0.1) { mx = Math.cos(p.aim); my = Math.sin(p.aim); } }
    move(w, p, mx * sp * dt, my * sp * dt, PR);
    if (!p.item) w.pickups.forEach((pk, n) => { const k = s.pk[n]; if (k.on && Math.hypot(pk.x - p.x, pk.y - p.y) < 10) { k.on = false; k.t = 30; p.item = pk.type; s.ev.push({ k: 'pick', id: p.id }); } });
  }
  s.pk.forEach((k) => { if (!k.on && (k.t -= dt) <= 0) k.on = true; });

  // ---- monster ----
  const m = s.m; let near = null, nd = 1e9;
  for (const p of ps) if (!p.dead) { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < nd) { nd = d; near = p; } }
  let tx, ty, sp;
  if (m.pause > 0) { m.pause -= dt; sp = 0; }
  else if (near && nd < SENSE) { tx = near.x; ty = near.y; sp = CHASE; }
  else {
    if (Math.hypot(m.lair.x - m.x, m.lair.y - m.y) < 14) { m.lair = pickLair(w, ps); m.fails = 0; }
    tx = m.lair.x; ty = m.lair.y; sp = WANDER;
  }
  if (sp) {
    let a = Math.atan2(ty - m.y, tx - m.x);
    if (m.jit > 0) { m.jit -= dt; a = m.ang; }
    const ox = m.x, oy = m.y;
    move(w, m, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, MR);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.3) {
      m.stuck += dt;
      if (m.stuck > 0.4) { m.ang = Math.random() * 6.283; m.jit = 0.8; m.stuck = 0; if (++m.fails > 3) { m.lair = pickLair(w, ps); m.fails = 0; } }
    } else m.stuck = 0;
  }
  for (const p of ps) {
    if (p.dead) continue;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < 9) { p.dead = 4; p.item = null; s.ev.push({ k: 'caught', id: p.id }); m.lair = pickLair(w, ps); m.x = m.lair.x; m.y = m.lair.y; m.pause = 3; continue; }
    p.scare -= dt; p.amb -= dt;
    if (d < 80 && p.scare <= 0) { s.ev.push({ k: 'scare', id: p.id, big: 1 }); p.scare = 7; }
    else if (p.amb <= 0) { s.ev.push({ k: 'scare', id: p.id, big: 0 }); p.amb = 20 + Math.random() * 30; }
  }
}

const r1 = (n) => Math.round(n * 10) / 10;
export function snapshot(s) {
  return {
    t: 's',
    p: Object.values(s.players).map((p) => [p.id, r1(p.x), r1(p.y), Math.round(p.aim * 100) / 100, p.item, p.dead > 0 ? 1 : 0, p.speedT > 0 ? 1 : 0, p.name]),
    m: [r1(s.m.x), r1(s.m.y)],
    k: s.pk.map((k) => (k.on ? 1 : 0)),
    e: s.ev,
  };
}
