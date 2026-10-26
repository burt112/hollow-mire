// Shared simulation: runs in the Durable Object (multiplayer) AND in the browser (single player).
export const T = 16, W = 96, H = 96, MAX_PLAYERS = 4;
const PR = 4, MR = 5;
const SPEED = 62, DASH = 200, CHASE = 54, WANDER = 30;

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

// tiles: 0 grass, 1 tree, 2 water, 3 floor, 4 wall, 5 door
export function createWorld(seed) {
  const tiles = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let t = 0;
    if (vnoise(x / 12, y / 12, seed) < 0.34) t = 2;                                   // lakes
    else if (vnoise(x / 16, y / 16, seed + 3) > 0.5 && hash(x, y, seed + 9) < 0.5) t = 1; // dark woods
    else if (hash(x, y, seed + 11) < 0.015) t = 1;                                     // lone trees
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) t = 1;
    tiles[y * W + x] = t;
  }
  const r = rng(seed);
  const buildings = [{ x: W / 2 - 7, y: H / 2 - 5, w: 14, h: 10 }];
  for (const [cx, cy] of [[8, 8], [68, 8], [8, 76], [68, 76]])
    buildings.push({ x: cx + Math.floor(r() * 8), y: cy + Math.floor(r() * 6), w: 12 + Math.floor(r() * 4), h: 8 + Math.floor(r() * 3) });
  for (const b of buildings) {
    for (let y = b.y - 2; y < b.y + b.h + 2; y++) for (let x = b.x - 2; x < b.x + b.w + 2; x++)
      if (x >= 2 && y >= 2 && x < W - 2 && y < H - 2) tiles[y * W + x] = 0;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++)
      tiles[y * W + x] = (x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1) ? 4 : 3;
    const px = b.x + Math.floor(b.w / 3);
    for (let y = b.y + 1; y < b.y + b.h - 1; y++) if (y !== b.y + 3 && y !== b.y + 4) tiles[y * W + px] = 4; // partition w/ doorway
    tiles[(b.y + b.h - 1) * W + b.x + Math.floor(b.w / 2)] = 5;                                              // front door
  }
  const b0 = buildings[0];
  const spawn = { x: (b0.x + b0.w / 2) * T, y: (b0.y + b0.h / 2) * T };
  const free = () => { for (let i = 0; i < 500; i++) { const x = 3 + Math.floor(r() * (W - 6)), y = 3 + Math.floor(r() * (H - 6)); const t = tiles[y * W + x]; if (t === 0 || t === 3) return { x: x * T + 8, y: y * T + 8, t }; } return spawn; };
  const pickups = Array.from({ length: 28 }, () => ({ ...free(), type: r() < 0.5 ? 'dash' : 'speed' }));
  const lairs = [];
  while (lairs.length < 10) { const p = free(); if (p.t === 0 && Math.hypot(p.x - spawn.x, p.y - spawn.y) > 25 * T) lairs.push(p); }
  return { seed, tiles, spawn, pickups, lairs, buildings };
}

const solidAt = (w, px, py) => { const x = Math.floor(px / T), y = Math.floor(py / T); if (x < 0 || y < 0 || x >= W || y >= H) return true; const t = w.tiles[y * W + x]; return t === 1 || t === 2 || t === 4; };
const blocked = (w, x, y, r) => solidAt(w, x - r, y - r) || solidAt(w, x + r, y - r) || solidAt(w, x - r, y + r) || solidAt(w, x + r, y + r);
function move(w, e, dx, dy, r) { if (!blocked(w, e.x + dx, e.y, r)) e.x += dx; if (!blocked(w, e.x, e.y + dy, r)) e.y += dy; }

export function newState(w) {
  const l = w.lairs[0];
  return { t: 0, players: {}, m: { x: l.x, y: l.y, lair: l, ang: 0, jit: 0, stuck: 0, pause: 0 }, pk: w.pickups.map(() => ({ on: true, t: 0 })), ev: [] };
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
  else if (near && nd < 150) { tx = near.x; ty = near.y; sp = CHASE; }
  else { if (Math.hypot(m.lair.x - m.x, m.lair.y - m.y) < 14) m.lair = w.lairs[Math.floor(Math.random() * w.lairs.length)]; tx = m.lair.x; ty = m.lair.y; sp = WANDER; }
  if (sp) {
    let a = Math.atan2(ty - m.y, tx - m.x);
    if (m.jit > 0) { m.jit -= dt; a = m.ang; }
    const ox = m.x, oy = m.y;
    move(w, m, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, MR);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.3) { m.stuck += dt; if (m.stuck > 0.4) { m.ang = Math.random() * 6.283; m.jit = 0.8; m.stuck = 0; } } else m.stuck = 0;
  }
  for (const p of ps) {
    if (p.dead) continue;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < 9) { p.dead = 4; p.item = null; s.ev.push({ k: 'caught', id: p.id }); m.lair = w.lairs[Math.floor(Math.random() * w.lairs.length)]; m.x = m.lair.x; m.y = m.lair.y; m.pause = 3; continue; }
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
