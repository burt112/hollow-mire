// Shared simulation: runs in the Durable Object (multiplayer) AND in the browser (single player).
export const T = 16, W = 192, H = 192, MAX_PLAYERS = 4, MAXHP = 100;
const PR = 4, MR = 5, SPEED = 62, DASH = 200, CHASE = 54, WANDER = 32, SENSE = 170, DMG = 25;
const SOLID = new Uint8Array(32); [1, 2, 4, 8, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24].forEach((t) => (SOLID[t] = 1));
const OK = new Uint8Array(32); [0, 3, 6, 9, 19, 20].forEach((t) => (OK[t] = 1));

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
export function decor(tx, ty, seed) {
  const h = hash(tx, ty, seed + 77);
  return h < 0.05 ? 1 : h < 0.085 ? 2 : h < 0.105 ? 3 : h < 0.12 ? 4 : h < 0.15 ? 5 : h < 0.156 ? 6 : 0;
}
export function createWorld(seed) {
  const tiles = new Uint8Array(W * H), at = (x, y) => y * W + x;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[at(x, y)] = t; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let t = 0; const lk = vnoise(x / 22, y / 22, seed);
    if (lk < 0.36) t = 2; else if (lk < 0.395) t = 18;
    else if (vnoise(x / 18, y / 18, seed + 3) > 0.5 && hash(x, y, seed + 9) < 0.36) t = 1;
    else if (hash(x, y, seed + 11) < 0.012) t = 1;
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) t = 1;
    tiles[at(x, y)] = t;
  }
  const r = rng(seed), buildings = [], lights = [];
  const kinds = ['chapel', 'barn', 'ruin', 'cabin', 'yard', 'cabin', 'ruin', 'barn'];
  for (let i = kinds.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const dim = { cabin: () => [12 + ((r() * 5) | 0), 8 + ((r() * 4) | 0)], chapel: () => [14, 12], barn: () => [18, 12], ruin: () => [13 + ((r() * 4) | 0), 9 + ((r() * 3) | 0)], yard: () => [16, 11] };
  buildings.push({ x: W / 2 - 7, y: H / 2 - 5, w: 14, h: 10, kind: 'cabin' });
  let ki = 0;
  for (const gy of [32, 96, 160]) for (const gx of [32, 96, 160]) {
    if (gx === 96 && gy === 96) continue;
    const kind = kinds[ki++], [w, h] = dim[kind](), jx = ((r() * 17) | 0) - 8, jy = ((r() * 17) | 0) - 8;
    buildings.push({ x: gx - (w >> 1) + jx, y: gy - (h >> 1) + jy, w, h, kind });
  }
  const WT = { cabin: 4, chapel: 21, barn: 22, ruin: 21 }, FT = { cabin: 3, chapel: 9, barn: 19, ruin: 9 };
  for (const b of buildings) {
    for (let y = b.y - 2; y < b.y + b.h + 2; y++) for (let x = b.x - 2; x < b.x + b.w + 2; x++)
      if (x >= 3 && y >= 3 && x < W - 3 && y < H - 3) tiles[at(x, y)] = 0;
    const dx = b.x + (b.w >> 1), bx = b.x + b.w - 1, by = b.y + b.h - 1;
    b.door = { x: dx, y: by };
    const edge = (x, y) => x === b.x || y === b.y || x === bx || y === by;
    if (b.kind === 'yard') {
      for (let y = b.y; y <= by; y++) for (let x = b.x; x <= bx; x++) set(x, y, edge(x, y) ? 13 : 0);
      set(dx, by, 0); set(dx - 1, by, 0);
      for (let y = b.y + 2; y < by - 1; y += 2) for (let x = b.x + 2; x < bx - 1; x += 2) if (Math.abs(x - dx) > 1 && r() < 0.8) set(x, y, 12);
      lights.push({ x: dx * T + 8, y: (by + 1) * T + 8, r: 50 }); continue;
    }
    for (let y = b.y; y <= by; y++) for (let x = b.x; x <= bx; x++) set(x, y, edge(x, y) ? WT[b.kind] : FT[b.kind]);
    set(dx, by, 5);
    if (b.kind === 'cabin') {
      const px = b.x + Math.floor(b.w / 3);
      for (let y = b.y + 1; y < by; y++) if (y !== b.y + 3 && y !== b.y + 4) set(px, y, 4);
      set(b.x + 1, b.y + 1, 24); set(b.x + 1, b.y + 2, 24); set(bx - 3, b.y + 2, 14); set(bx - 2, b.y + 2, 14);
      for (let y = b.y + 4; y <= b.y + 6; y++) for (let x = dx - 1; x <= dx + 1; x++) if (by - y > 1) set(x, y, 20);
      for (const [cx, cy] of [[bx - 1, b.y + 1], [bx - 1, by - 1], [b.x + 1, by - 1]]) if (r() < 0.6) set(cx, cy, 8);
    } else if (b.kind === 'chapel') {
      for (let y = b.y + 3; y <= by - 3; y += 2) { for (let x = b.x + 2; x <= dx - 2; x++) set(x, y, 10); for (let x = dx + 2; x <= bx - 2; x++) set(x, y, 10); }
      set(dx, b.y + 1, 11); for (let y = b.y + 2; y < by; y++) set(dx, y, 20);
      lights.push({ x: dx * T + 8, y: (b.y + 2) * T, r: 46, in: 1, fire: 1 });
    } else if (b.kind === 'barn') {
      for (let y = b.y + 1; y < by; y++) for (let x = b.x + 1; x < bx; x++) if (Math.abs(x - dx) > 1 && y < by - 2 && r() < 0.13) set(x, y, r() < 0.7 ? 15 : 8);
    } else { // ruin
      for (let y = b.y; y <= by; y++) for (let x = b.x; x <= bx; x++) if (edge(x, y) && !(x === dx && y === by)) { const q = r(); if (q < 0.2) set(x, y, 9); else if (q < 0.3) set(x, y, 17); }
      for (let y = b.y + 1; y < by; y++) for (let x = b.x + 1; x < bx; x++) if (Math.abs(x - dx) > 1 && y < by - 1 && r() < 0.07) set(x, y, 17);
    }
    lights.push({ x: dx * T + 8, y: (by + 1) * T + 8, r: 54 });
    if (b.kind !== 'chapel') lights.push({ x: (b.x + b.w / 2) * T, y: (b.y + b.h / 2) * T, r: 52, in: 1 });
  }
  const put = (px, py) => { for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) {
    const X = px + dx, Y = py + dy; if (X < 3 || Y < 3 || X >= W - 3 || Y >= H - 3) continue;
    const t = tiles[at(X, Y)]; if (t === 0 || t === 1) tiles[at(X, Y)] = 6; else if (t === 2 || t === 18) tiles[at(X, Y)] = 7; } };
  const road = (x0, y0, x1, y1) => {
    const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0); let x = x0, y = y0, n = 0;
    while (x !== x1 || y !== y1) { put(x, y); if (++n % 14 === 0) lights.push({ x: x * T + 16, y: y * T + 16, r: 38 }); x += sx; y += sy; }
    put(x1, y1);
  };
  const ROWS = [64, 128, 182];
  for (const y of ROWS) road(6, y, 184, y);
  for (const x of [64, 128]) road(x, 6, x, 182);
  for (const b of buildings) { const fy = b.y + b.h; const ty = ROWS.find((v) => v >= fy + 3); if (ty) road(b.door.x, fy, b.door.x, ty); }

  const b0 = buildings[0], sp = { x: (b0.x + b0.w / 2) * T, y: (b0.y + b0.h / 2) * T };
  const reach = new Uint8Array(W * H), q = new Int32Array(W * H); let qh = 0, qt = 0;
  const s0 = ((sp.y / T) | 0) * W + ((sp.x / T) | 0); reach[s0] = 1; q[qt++] = s0;
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + ax, Y = y + ay; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const j = Y * W + X; if (reach[j] || SOLID[tiles[j]]) continue; reach[j] = 1; q[qt++] = j;
    }
  }
  const safe = [{ x: sp.x, y: sp.y, r: 100 }];
  const clear5 = (x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!reach[at(x + i, y + j)] || tiles[at(x + i, y + j)] !== 0) return false; return true; };
  for (let n = 0, g = 0; n < 16 && g < 6000; g++) {
    const x = 6 + ((r() * (W - 12)) | 0), y = 6 + ((r() * (H - 12)) | 0);
    if (!clear5(x, y)) continue;
    set(x, y, 16); set(x + 2, y, 23);
    lights.push({ x: x * T + 8, y: y * T + 8, r: 74, fire: 1 }); safe.push({ x: x * T + 8, y: y * T + 8, r: 46 }); n++;
  }
  const inSafeP = (x, y) => safe.some((z) => Math.hypot(x - z.x, y - z.y) < z.r);
  const free = () => { for (let i = 0; i < 1500; i++) { const x = 5 + ((r() * (W - 10)) | 0), y = 5 + ((r() * (H - 10)) | 0), j = at(x, y); if (reach[j] && OK[tiles[j]]) return { x: x * T + 8, y: y * T + 8, t: tiles[j] }; } return { x: sp.x, y: sp.y, t: 3 }; };
  const pickups = Array.from({ length: 90 }, () => { const p = free(), q2 = r(); return { x: p.x, y: p.y, type: q2 < 0.28 ? 'med' : q2 < 0.64 ? 'dash' : 'speed' }; });
  const lairs = []; let guard = 0;
  while (lairs.length < 24 && guard++ < 6000) { const p = free(); if (p.t === 0 && Math.hypot(p.x - sp.x, p.y - sp.y) > 40 * T && !inSafeP(p.x, p.y)) lairs.push(p); }
  if (!lairs.length) for (let i = 0; i < 20; i++) { const p = free(); if (!inSafeP(p.x, p.y)) lairs.push(p); }
  const swarms = [];
  for (const l of lights) if (!l.in) swarms.push({ x: l.x, y: l.y, r: l.fire ? 20 : 12 });
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    const i = at(x, y); if (swarms.length >= 280) break;
    if (tiles[i] === 0 && reach[i] && decor(x, y, seed) === 1 && hash(x, y, seed + 5) < 0.14) swarms.push({ x: x * T + 8, y: y * T + 10, r: 11 });
    else if (tiles[i] === 1 && hash(x, y, seed + 6) < 0.004) swarms.push({ x: x * T + 8, y: y * T + 16, r: 14 });
  }
  return { seed, tiles, spawn: sp, pickups, lairs, buildings, lights, safe, swarms };
}

const solidAt = (w, px, py) => { const x = Math.floor(px / T), y = Math.floor(py / T); if (x < 0 || y < 0 || x >= W || y >= H) return true; return SOLID[w.tiles[y * W + x]] === 1; };
const blocked = (w, x, y, r) => solidAt(w, x - r, y - r) || solidAt(w, x + r, y - r) || solidAt(w, x - r, y + r) || solidAt(w, x + r, y + r);
function move(w, e, dx, dy, r) { if (!blocked(w, e.x + dx, e.y, r)) e.x += dx; if (!blocked(w, e.x, e.y + dy, r)) e.y += dy; }
export const inSafe = (w, x, y) => w.safe.some((z) => Math.hypot(x - z.x, y - z.y) < z.r);
const slow = (w, e) => (w.tiles[Math.floor(e.y / T) * W + Math.floor(e.x / T)] === 18 ? 0.6 : 1);
function moveM(w, e, dx, dy) {
  if (!blocked(w, e.x + dx, e.y, MR) && !inSafe(w, e.x + dx, e.y)) e.x += dx;
  if (!blocked(w, e.x, e.y + dy, MR) && !inSafe(w, e.x, e.y + dy)) e.y += dy;
}
function pickLair(w, ps) {
  const alive = ps.filter((p) => !p.dead);
  if (alive.length && Math.random() < 0.5) {
    const p = alive[(Math.random() * alive.length) | 0];
    const c = w.lairs.filter((l) => { const d = Math.hypot(l.x - p.x, l.y - p.y); return d > 180 && d < 520; });
    if (c.length) return c[(Math.random() * c.length) | 0];
  }
  return w.lairs[(Math.random() * w.lairs.length) | 0];
}
function relocate(w, m, ps) {
  const alive = ps.filter((p) => !p.dead); let best = w.lairs[0], bd = -1;
  for (let i = 0; i < 16; i++) {
    const l = w.lairs[(Math.random() * w.lairs.length) | 0];
    const d = alive.length ? Math.min(...alive.map((p) => Math.hypot(p.x - l.x, p.y - l.y))) : 999;
    if (d > 400) { best = l; break; } if (d > bd) { bd = d; best = l; }
  }
  m.x = best.x; m.y = best.y; m.lair = best; m.pause = 2; m.stuck = 0; m.jit = 0; m.fails = 0; m.chk = 0; m.cx = m.x; m.cy = m.y;
}
export function newState(w) {
  const l = w.lairs[(Math.random() * w.lairs.length) | 0];
  return { t: 0, players: {}, m: { x: l.x, y: l.y, lair: l, ang: 0, jit: 0, stuck: 0, pause: 0, fails: 0, side: 1, chk: 0, cx: l.x, cy: l.y, cool: 0, chase: 0 }, pk: w.pickups.map(() => ({ on: true, t: 0 })), ev: [] };
}
export function addPlayer(s, w, id, name) {
  s.players[id] = { id, name, x: w.spawn.x + Math.random() * 16 - 8, y: w.spawn.y + Math.random() * 16 - 8, aim: 0, item: null, dead: 0, hp: MAXHP, inv: 2, speedT: 0, dashT: 0, scare: 6, amb: 25 + Math.random() * 25 };
}
export const removePlayer = (s, id) => { delete s.players[id]; };

export function step(w, s, dt, inputs) {
  s.t += dt; s.ev = [];
  const ps = Object.values(s.players);
  for (const p of ps) {
    p.inv = Math.max(0, p.inv - dt);
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.x = w.spawn.x; p.y = w.spawn.y; p.hp = MAXHP; p.inv = 2; } continue; }
    const i = inputs[p.id] || {};
    let mx = i.mx || 0, my = i.my || 0; const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    if (Math.hypot(i.ax || 0, i.ay || 0) > 0.2) p.aim = Math.atan2(i.ay, i.ax);
    if (i.u && p.item) { if (p.item === 'dash') p.dashT = 0.25; else p.speedT = 4; s.ev.push({ k: 'use', id: p.id, item: p.item }); p.item = null; }
    p.dashT = Math.max(0, p.dashT - dt); p.speedT = Math.max(0, p.speedT - dt);
    let sp = SPEED * (p.speedT > 0 ? 1.6 : 1) * slow(w, p);
    if (p.dashT > 0) { sp = DASH; if (ml < 0.1) { mx = Math.cos(p.aim); my = Math.sin(p.aim); } }
    move(w, p, mx * sp * dt, my * sp * dt, PR);
    if (p.hp < MAXHP && inSafe(w, p.x, p.y)) p.hp = Math.min(MAXHP, p.hp + 6 * dt);
    w.pickups.forEach((pk, n) => {
      const k = s.pk[n]; if (!k.on || Math.hypot(pk.x - p.x, pk.y - p.y) >= 10) return;
      if (pk.type === 'med') { if (p.hp < MAXHP) { p.hp = Math.min(MAXHP, p.hp + 40); k.on = false; k.t = 45; s.ev.push({ k: 'heal', id: p.id }); } }
      else if (!p.item) { k.on = false; k.t = 30; p.item = pk.type; s.ev.push({ k: 'pick', id: p.id }); }
    });
  }
  s.pk.forEach((k) => { if (!k.on && (k.t -= dt) <= 0) k.on = true; });

  const m = s.m; m.cool = Math.max(0, m.cool - dt);
  let near = null, nd = 1e9;
  for (const p of ps) if (!p.dead && !inSafe(w, p.x, p.y)) { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < nd) { nd = d; near = p; } }
  const chasing = !!(near && nd < SENSE && m.cool <= 0);
  if (chasing && !m.chase) s.ev.push({ k: 'aggro', id: near.id });
  m.chase = chasing ? 1 : 0;
  let tx, ty, sp;
  if (m.pause > 0) { m.pause -= dt; sp = 0; }
  else if (chasing) { tx = near.x; ty = near.y; sp = CHASE * slow(w, m); }
  else {
    if (Math.hypot(m.lair.x - m.x, m.lair.y - m.y) < 14) { m.lair = pickLair(w, ps); m.fails = 0; }
    tx = m.lair.x; ty = m.lair.y; sp = WANDER * slow(w, m);
  }
  if (sp) {
    let a = Math.atan2(ty - m.y, tx - m.x);
    if (m.jit > 0) { m.jit -= dt; a = m.ang; }
    const ox = m.x, oy = m.y;
    moveM(w, m, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.35) {
      m.stuck += dt;
      if (m.stuck > 0.35) { m.ang = a + m.side * (1.1 + Math.random() * 0.7); m.side = -m.side; m.jit = 0.7; m.stuck = 0;
        if (++m.fails > 3) { if (chasing) m.cool = 6; else m.lair = pickLair(w, ps); m.fails = 0; } }
    } else m.stuck = 0;
  }
  m.chk += dt;
  if (m.chk > 6) { if (!chasing && m.pause <= 0 && Math.hypot(m.x - m.cx, m.y - m.cy) < 30) relocate(w, m, ps); m.chk = 0; m.cx = m.x; m.cy = m.y; }

  for (const p of ps) {
    if (p.dead) continue;
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < 11 && p.inv <= 0 && m.pause <= 0 && !inSafe(w, p.x, p.y)) {
      p.hp -= DMG; p.inv = 1.6; m.pause = 0.8;
      const a = Math.atan2(p.y - m.y, p.x - m.x); move(w, p, Math.cos(a) * 14, Math.sin(a) * 14, PR);
      if (p.hp <= 0) { p.hp = 0; p.dead = 5; p.item = null; p.dashT = 0; p.speedT = 0; s.ev.push({ k: 'caught', id: p.id }); relocate(w, m, ps); }
      else s.ev.push({ k: 'hurt', id: p.id });
      continue;
    }
    p.scare -= dt; p.amb -= dt;
    if (d < 80 && m.chase && p.scare <= 0) { s.ev.push({ k: 'scare', id: p.id, big: 1 }); p.scare = 9; }
    else if (p.amb <= 0) { s.ev.push({ k: 'scare', id: p.id, big: 0 }); p.amb = 25 + Math.random() * 35; }
  }
}

const r1 = (n) => Math.round(n * 10) / 10;
export function snapshot(s) {
  return {
    t: 's',
    p: Object.values(s.players).map((p) => [p.id, r1(p.x), r1(p.y), Math.round(p.aim * 100) / 100, p.item, p.dead > 0 ? 1 : 0, p.speedT > 0 ? 1 : 0, p.name, Math.round(p.hp), p.inv > 0 ? 1 : 0]),
    m: [r1(s.m.x), r1(s.m.y), s.m.chase ? 1 : 0],
    k: s.pk.map((k) => (k.on ? 1 : 0)),
    e: s.ev,
  };
}
