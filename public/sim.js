// Shared simulation: runs in the Durable Object (multiplayer) AND in the browser (single player).
export const T = 16, W = 192, H = 192, MAX_PLAYERS = 4, MAXHP = 100;
const PR = 4, MR = 5, SPEED = 62, DASH = 200, CHASE = 54, STALK = 38, REST = 20, SENSE = 170, DMG = 25;
const MHP = 14, SW_DMG = 2, SW_RANGE = 26, SW_CD = 0.42;
// mini monsters. index = kind id used by the client
export const KINDS = [
  { n: 'bat', hp: 1, sp: 68, dmg: 8, r: 4, sense: 130, fly: 1 },
  { n: 'spider', hp: 2, sp: 56, dmg: 10, r: 4, sense: 110 },
  { n: 'slime', hp: 3, sp: 24, dmg: 10, r: 5, sense: 100 },
  { n: 'wisp', hp: 2, sp: 32, dmg: 12, r: 4, sense: 150, fly: 1 },
  { n: 'ghoul', hp: 5, sp: 38, dmg: 15, r: 5, sense: 150 },
  { n: 'hound', hp: 3, sp: 60, dmg: 12, r: 5, sense: 170 },
  { n: 'lurker', hp: 3, sp: 0, dmg: 15, r: 4, sense: 34, lurk: 1 },
  { n: 'moth', hp: 1, sp: 46, dmg: 6, r: 3, sense: 120, fly: 1 },
  { n: 'bog', hp: 8, sp: 26, dmg: 20, r: 6, sense: 120 },
];
// tiles: 0 grass,1 tree,2 deep water,3 wood floor,4 wood wall,5 door,6 road,7 bridge,8 crate,9 stone floor,
// 10 pew,11 altar,12 gravestone,13 fence,14 table,15 hay bale,16 campfire,17 rubble,18 shallow water,
// 19 hay floor,20 rug,21 stone wall,22 barn wall,23 tent,24 bed
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
// grass decoration: 1 bush, 2 flowers, 3 rock, 4 mushrooms, 5 tall grass, 6 stump
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
    } else { // ruin: crumbled walls, rubble
      for (let y = b.y; y <= by; y++) for (let x = b.x; x <= bx; x++) if (edge(x, y) && !(x === dx && y === by)) { const q = r(); if (q < 0.2) set(x, y, 9); else if (q < 0.3) set(x, y, 17); }
      for (let y = b.y + 1; y < by; y++) for (let x = b.x + 1; x < bx; x++) if (Math.abs(x - dx) > 1 && y < by - 1 && r() < 0.07) set(x, y, 17);
    }
    lights.push({ x: dx * T + 8, y: (by + 1) * T + 8, r: 54 });
    if (b.kind !== 'chapel') lights.push({ x: (b.x + b.w / 2) * T, y: (b.y + b.h / 2) * T, r: 52, in: 1 });
  }
  // roads (bridges over water) carved after buildings so they never cut through walls
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
  // flood fill: only tiles the player can actually walk to are used for pickups / monster lairs
  const reach = new Uint8Array(W * H), q = new Int32Array(W * H); let qh = 0, qt = 0;
  const s0 = ((sp.y / T) | 0) * W + ((sp.x / T) | 0); reach[s0] = 1; q[qt++] = s0;
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + ax, Y = y + ay; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const j = Y * W + X; if (reach[j] || SOLID[tiles[j]]) continue; reach[j] = 1; q[qt++] = j;
    }
  }
  const safe = [{ x: sp.x, y: sp.y, r: 100 }]; // monster can't enter safe zones; they also heal you
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
  // firefly swarms: around lights, bushes and tree edges (client animates them)
  const swarms = [];
  for (const l of lights) if (!l.in) swarms.push({ x: l.x, y: l.y, r: l.fire ? 20 : 12 });
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    const i = at(x, y); if (swarms.length >= 280) break;
    if (tiles[i] === 0 && reach[i] && decor(x, y, seed) === 1 && hash(x, y, seed + 5) < 0.14) swarms.push({ x: x * T + 8, y: y * T + 10, r: 11 });
    else if (tiles[i] === 1 && hash(x, y, seed + 6) < 0.004) swarms.push({ x: x * T + 8, y: y * T + 16, r: 14 });
  }
  const nogo = new Uint8Array(W * H);
  for (const z of safe) {
    const x0 = Math.max(0, ((z.x - z.r) / T) | 0), x1 = Math.min(W - 1, ((z.x + z.r) / T) | 0), y0 = Math.max(0, ((z.y - z.r) / T) | 0), y1 = Math.min(H - 1, ((z.y + z.r) / T) | 0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (Math.hypot(x * T + 8 - z.x, y * T + 8 - z.y) < z.r) nogo[at(x, y)] = 1;
  }
  const waterNear = (x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const t = tiles[at(x + i, y + j)]; if (t === 2 || t === 18) return true; } return false; };
  const espawns = [];
  for (let g = 0; espawns.length < 84 && g < 9000; g++) {
    const x = 5 + ((r() * (W - 10)) | 0), y = 5 + ((r() * (H - 10)) | 0), j = at(x, y);
    if (!reach[j] || !OK[tiles[j]] || nogo[j] || Math.hypot(x * T + 8 - sp.x, y * T + 8 - sp.y) < 16 * T) continue;
    const t = tiles[j], q3 = r(); let kind;
    if (t === 9) kind = q3 < 0.4 ? 4 : q3 < 0.7 ? 6 : 3;
    else if (t === 3 || t === 19 || t === 20) kind = q3 < 0.35 ? 1 : q3 < 0.65 ? 6 : q3 < 0.85 ? 7 : 4;
    else if (waterNear(x, y)) kind = q3 < 0.4 ? 2 : q3 < 0.65 ? 3 : q3 < 0.85 ? 8 : 7;
    else if (t === 6) kind = q3 < 0.5 ? 5 : q3 < 0.8 ? 0 : 1;
    else kind = q3 < 0.2 ? 0 : q3 < 0.4 ? 1 : q3 < 0.55 ? 4 : q3 < 0.7 ? 5 : q3 < 0.82 ? 7 : q3 < 0.92 ? 8 : 3;
    espawns.push({ x: x * T + 8, y: y * T + 8, kind });
  }
  return { seed, tiles, spawn: sp, pickups, lairs, buildings, lights, safe, swarms, reach, nogo, espawns };
}

const blocked = (w, x, y, r) => solidAt(w, x - r, y - r) || solidAt(w, x + r, y - r) || solidAt(w, x - r, y + r) || solidAt(w, x + r, y + r);
function move(w, e, dx, dy, r) { if (!blocked(w, e.x + dx, e.y, r)) e.x += dx; if (!blocked(w, e.x, e.y + dy, r)) e.y += dy; }
export const inSafe = (w, x, y) => w.safe.some((z) => Math.hypot(x - z.x, y - z.y) < z.r);
const slow = (w, e) => (w.tiles[Math.floor(e.y / T) * W + Math.floor(e.x / T)] === 18 ? 0.6 : 1);
function moveM(w, e, dx, dy) {
  if (!blocked(w, e.x + dx, e.y, MR) && !inSafe(w, e.x + dx, e.y)) e.x += dx;
  if (!blocked(w, e.x, e.y + dy, MR) && !inSafe(w, e.x, e.y + dy)) e.y += dy;
}
function relocate(w, m, ps) { // always puts the monster far away from every living player
  const alive = ps.filter((p) => !p.dead); let best = w.lairs[0], bd = -1;
  for (let i = 0; i < 16; i++) {
    const l = w.lairs[(Math.random() * w.lairs.length) | 0];
    const d = alive.length ? Math.min(...alive.map((p) => Math.hypot(p.x - l.x, p.y - l.y))) : 999;
    if (d > 400) { best = l; break; } if (d > bd) { bd = d; best = l; }
  }
  m.x = best.x; m.y = best.y; m.lair = best; m.pause = 2; m.stuck = 0; m.jit = 0; m.fails = 0; m.chk = 0; m.cx = m.x; m.cy = m.y;
}


// ---------- pathfinding: one breadth-first "distance to player" field per player, shared by every walker ----------
const Q = new Int32Array(W * H);
const passable = (w, j) => !SOLID[w.tiles[j]] && !w.nogo[j];
function buildField(w, f, px, py, maxD) {
  const g = ++f.gen, st = f.st, d = f.d, s0 = Math.min(H - 1, Math.max(0, (py / T) | 0)) * W + Math.min(W - 1, Math.max(0, (px / T) | 0));
  let qh = 0, qt = 0; st[s0] = g; d[s0] = 0; Q[qt++] = s0;
  while (qh < qt) {
    const i = Q[qh++], di = d[i]; if (di >= maxD) continue;
    const x = i % W, y = (i / W) | 0;
    if (x > 0 && st[i - 1] !== g && passable(w, i - 1)) { st[i - 1] = g; d[i - 1] = di + 1; Q[qt++] = i - 1; }
    if (x < W - 1 && st[i + 1] !== g && passable(w, i + 1)) { st[i + 1] = g; d[i + 1] = di + 1; Q[qt++] = i + 1; }
    if (y > 0 && st[i - W] !== g && passable(w, i - W)) { st[i - W] = g; d[i - W] = di + 1; Q[qt++] = i - W; }
    if (y < H - 1 && st[i + W] !== g && passable(w, i + W)) { st[i + W] = g; d[i + W] = di + 1; Q[qt++] = i + W; }
  }
}
function pathDir(w, f, x, y) { // centre of the neighbouring tile that is closest to the player, or null
  const cx = (x / T) | 0, cy = (y / T) | 0; if (cx < 0 || cy < 0 || cx >= W || cy >= H) return null;
  const ci = cy * W + cx; if (f.st[ci] !== f.gen) return null;
  let best = f.d[ci], bx = -1, by = -1;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue; const nx = cx + ox, ny = cy + oy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = ny * W + nx; if (f.st[j] !== f.gen || f.d[j] >= best) continue;
    if (ox && oy && (!passable(w, cy * W + nx) || !passable(w, ny * W + cx))) continue;
    best = f.d[j]; bx = nx; by = ny;
  }
  return bx < 0 ? null : [bx * T + 8, by * T + 8];
}
function updateFields(w, s, ps, dt) {
  for (const p of ps) {
    if (p.dead > 0 || inSafe(w, p.x, p.y)) continue;
    const f = s.fld[p.id] || (s.fld[p.id] = { st: new Uint32Array(W * H), d: new Int16Array(W * H), gen: 0, t: 0 });
    if ((f.t -= dt) <= 0) { buildField(w, f, p.x, p.y, 44); f.t = 0.4; }
  }
}
function moveE(w, e, dx, dy, k) { // walkers collide with the world; flyers only with the map edge. Nobody enters safe zones.
  const ox = e.x, oy = e.y;
  if (k.fly) {
    const nx = Math.min(W * T - 20, Math.max(20, e.x + dx)), ny = Math.min(H * T - 20, Math.max(20, e.y + dy));
    if (!inSafe(w, nx, e.y)) e.x = nx; if (!inSafe(w, e.x, ny)) e.y = ny;
  } else {
    if (!blocked(w, e.x + dx, e.y, k.r) && !inSafe(w, e.x + dx, e.y)) e.x += dx;
    if (!blocked(w, e.x, e.y + dy, k.r) && !inSafe(w, e.x, e.y + dy)) e.y += dy;
  }
  return Math.hypot(e.x - ox, e.y - oy) > 0.02;
}
function placeNear(w, p, dmin, dmax) { // a walkable, non-safe spot in a ring around p
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * 6.283, d = dmin + Math.random() * (dmax - dmin), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    const tx = (x / T) | 0, ty = (y / T) | 0; if (tx < 4 || ty < 4 || tx >= W - 4 || ty >= H - 4) continue;
    const j = ty * W + tx; if (w.reach[j] && OK[w.tiles[j]] && !w.nogo[j]) return { x: tx * T + 8, y: ty * T + 8 };
  }
  return null;
}

export function newState(w) {
  const l = w.lairs[(Math.random() * w.lairs.length) | 0];
  return {
    t: 0, players: {}, fld: {}, ev: [], pk: w.pickups.map(() => ({ on: true, t: 0 })),
    m: { x: l.x, y: l.y, lair: l, ang: 0, jit: 0, stuck: 0, pause: 0, fails: 0, side: 1, chk: 0, cx: l.x, cy: l.y, cool: 0, chase: 0, hp: MHP, hunt: 25, rest: 0, far: 10, away: 0, wa: 0, wt: 0 },
    en: w.espawns.map((sp, i) => ({ id: i, kind: sp.kind, x: sp.x, y: sp.y, hx: sp.x, hy: sp.y, hp: KINDS[sp.kind].hp, pause: 0, stun: 0, kx: 0, ky: 0, st: 0, tm: 0, la: 0, wa: Math.random() * 6.283, wt: 0, wi: 0, rt: 0, act: false, ph: Math.random() * 6.283 })),
  };
}
export function addPlayer(s, w, id, name) {
  s.players[id] = { id, name, x: w.spawn.x + Math.random() * 16 - 8, y: w.spawn.y + Math.random() * 16 - 8, aim: 0, item: null, dead: 0, hp: MAXHP, inv: 2, speedT: 0, dashT: 0, scare: 6, amb: 25 + Math.random() * 25, atkCd: 0, sw: 0, kills: 0 };
}
export const removePlayer = (s, id) => { delete s.players[id]; delete s.fld[id]; };

function hurtP(w, s, p, dmg, inv, fx, fy, ps, byBoss) {
  p.hp -= dmg; p.inv = inv;
  const a = Math.atan2(p.y - fy, p.x - fx); move(w, p, Math.cos(a) * 12, Math.sin(a) * 12, PR);
  if (p.hp <= 0) { p.hp = 0; p.dead = 5; p.item = null; p.dashT = 0; p.speedT = 0; s.ev.push({ k: 'caught', id: p.id }); if (byBoss) relocate(w, s.m, ps); }
  else s.ev.push({ k: 'hurt', id: p.id });
}
function slash(w, s, p, ps) {
  const test = (x, y, rad) => {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy); if (d > SW_RANGE + rad) return false; if (d < 8 + rad) return true;
    let da = Math.atan2(dy, dx) - p.aim; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < 1.1;
  };
  for (const e of s.en) {
    if (e.hp <= 0 || !e.act) continue; const k = KINDS[e.kind]; if (!test(e.x, e.y, k.r)) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x); e.hp -= SW_DMG; e.kx = Math.cos(a) * 160; e.ky = Math.sin(a) * 160; e.stun = 0.22;
    s.ev.push({ k: 'hit', x: Math.round(e.x), y: Math.round(e.y) });
    if (e.hp <= 0) { e.rt = 40 + Math.random() * 20; p.kills++; s.ev.push({ k: 'kill', id: p.id, x: Math.round(e.x), y: Math.round(e.y), kind: e.kind }); }
  }
  const m = s.m;
  if (m.away <= 0 && test(m.x, m.y, MR + 2)) {
    const a = Math.atan2(m.y - p.y, m.x - p.x); m.hp -= SW_DMG; moveM(w, m, Math.cos(a) * 14, Math.sin(a) * 14); m.pause = Math.max(m.pause, 0.3);
    s.ev.push({ k: 'hit', x: Math.round(m.x), y: Math.round(m.y), big: 1 });
    if (m.hp <= 0) { p.kills += 5; s.ev.push({ k: 'banish', id: p.id, x: Math.round(m.x), y: Math.round(m.y) }); m.hp = MHP; relocate(w, m, ps); m.pause = 25; m.away = 25; m.chase = 0; }
  }
}

function stepMonster(w, s, dt, ps) {
  const m = s.m; m.cool = Math.max(0, m.cool - dt);
  let near = null, nd = 1e9, any = null, ad = 1e9;
  for (const p of ps) {
    if (p.dead > 0) continue; const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < ad) { ad = d; any = p; }
    if (!inSafe(w, p.x, p.y) && d < nd) { nd = d; near = p; }
  }
  if (m.away > 0) { m.away -= dt; m.pause -= dt; m.chase = 0; return; } // banished: gone for a while
  // director: keep the creature near the action. If it is far away / cut off for 5s, bring it close (out of sight)
  const f = near && s.fld[near.id];
  const cut = near && f && f.st[Math.min(H - 1, Math.max(0, (m.y / T) | 0)) * W + Math.min(W - 1, Math.max(0, (m.x / T) | 0))] !== f.gen;
  if (any && (ad > 700 || cut)) m.far += dt; else m.far = 0;
  if (any && m.far > 5) { const sp = placeNear(w, any, 260, 420); if (sp) { m.x = sp.x; m.y = sp.y; m.pause = 2.5; m.jit = 0; m.stuck = 0; m.fails = 0; m.chk = 0; m.cx = m.x; m.cy = m.y; } m.far = 0; }
  // mood: hunts for a while, then loses interest and drifts about for a while
  if (m.rest > 0) { m.rest -= dt; if (m.rest <= 0) m.hunt = 25 + Math.random() * 20; }
  else if ((m.hunt -= dt) <= 0) m.rest = 8 + Math.random() * 6;
  const resting = m.rest > 0, chasing = !!(near && m.cool <= 0 && nd < (resting ? 60 : SENSE));
  if (chasing && !m.chase) s.ev.push({ k: 'aggro', id: near.id });
  m.chase = chasing ? 1 : 0;
  let tx = null, ty = null, sp = 0;
  if (m.pause > 0) m.pause -= dt;
  else if (chasing || (near && !resting)) {
    const pd = f && nd > 22 ? pathDir(w, f, m.x, m.y) : null;
    tx = pd ? pd[0] : near.x; ty = pd ? pd[1] : near.y; sp = (chasing ? CHASE : STALK) * slow(w, m);
  } else { // resting / nobody outside a safe zone: slow aimless drifting
    if ((m.wt -= dt) <= 0) { m.wt = 1.5 + Math.random() * 2.5; m.wa = Math.random() * 6.283; }
    tx = m.x + Math.cos(m.wa) * 50; ty = m.y + Math.sin(m.wa) * 50; sp = REST;
  }
  if (sp) {
    let a = Math.atan2(ty - m.y, tx - m.x); if (m.jit > 0) { m.jit -= dt; a = m.ang; }
    const ox = m.x, oy = m.y; moveM(w, m, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
    if (Math.hypot(m.x - ox, m.y - oy) < sp * dt * 0.35) {
      m.stuck += dt;
      if (m.stuck > 0.35) { m.ang = a + m.side * (1.1 + Math.random() * 0.7); m.side = -m.side; m.jit = 0.6; m.stuck = 0; m.wt = 0; if (++m.fails > 4) { if (chasing) m.cool = 5; m.fails = 0; } }
    } else m.stuck = 0;
  }
  m.chk += dt; // watchdog: if it has barely moved in 5s while it should be moving, put it somewhere sensible
  if (m.chk > 5) { if (any && m.pause <= 0 && !resting && Math.hypot(m.x - m.cx, m.y - m.cy) < 24) { const q = placeNear(w, any, 240, 380); if (q) { m.x = q.x; m.y = q.y; m.pause = 1.5; } } m.chk = 0; m.cx = m.x; m.cy = m.y; }
  for (const p of ps) {
    if (p.dead > 0) continue; const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d < 11 && p.inv <= 0 && m.pause <= 0 && !inSafe(w, p.x, p.y)) { hurtP(w, s, p, DMG, 1.6, m.x, m.y, ps, true); m.pause = 0.8; continue; }
    p.scare -= dt; p.amb -= dt;
    if (d < 80 && m.chase && p.scare <= 0) { s.ev.push({ k: 'scare', id: p.id, big: 1 }); p.scare = 9; }
    else if (p.amb <= 0) { s.ev.push({ k: 'scare', id: p.id, big: 0 }); p.amb = 25 + Math.random() * 35; }
  }
}
function stepEnemies(w, s, dt, ps) {
  for (const e of s.en) {
    const k = KINDS[e.kind];
    if (e.hp <= 0) { // dead: come back later at the same spot, but never in front of a player
      e.act = false;
      if ((e.rt -= dt) <= 0) { if (ps.every((p) => Math.hypot(p.x - e.hx, p.y - e.hy) > 300)) { e.hp = k.hp; e.x = e.hx; e.y = e.hy; e.st = 0; e.stun = 0; e.pause = 1; } else e.rt = 5; }
      continue;
    }
    let near = null, nd = 1e9, ad = 1e9;
    for (const p of ps) { if (p.dead > 0) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < ad) ad = d; if (!inSafe(w, p.x, p.y) && d < nd) { nd = d; near = p; } }
    e.act = ad < 560; if (!e.act) continue;
    e.pause -= dt; e.stun -= dt;
    if (Math.abs(e.kx) + Math.abs(e.ky) > 1) { moveE(w, e, e.kx * dt, e.ky * dt, k); const dec = Math.exp(-dt * 9); e.kx *= dec; e.ky *= dec; }
    if (e.stun > 0) continue;
    if (k.lurk) { // hides, then lunges when you get close
      if (e.st === 0) { if (near && nd < k.sense) { e.st = 1; e.tm = 0.7; e.la = Math.atan2(near.y - e.y, near.x - e.x); } }
      else if (e.st === 1) { e.tm -= dt; moveE(w, e, Math.cos(e.la) * 105 * dt, Math.sin(e.la) * 105 * dt, k); if (e.tm <= 0) { e.st = 2; e.tm = 2.5; } }
      else if ((e.tm -= dt) <= 0) e.st = 0;
    } else if (near && nd < k.sense && e.pause <= 0) {
      let a;
      if (k.fly) { a = Math.atan2(near.y - e.y, near.x - e.x) + Math.sin(s.t * (k.n === 'bat' ? 9 : 5) + e.ph) * (k.n === 'bat' ? 1.1 : 0.55); }
      else { const f = s.fld[near.id], pd = f && nd > 24 ? pathDir(w, f, e.x, e.y) : null; a = pd ? Math.atan2(pd[1] - e.y, pd[0] - e.x) : Math.atan2(near.y - e.y, near.x - e.x); }
      const sp = k.sp * (k.fly ? 1 : slow(w, e));
      if (!moveE(w, e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, k) && !k.fly) moveE(w, e, Math.cos(a + 1.3) * sp * dt, Math.sin(a + 1.3) * sp * dt, k);
    } else { // idle: potter about near home
      if ((e.wt -= dt) <= 0) { e.wt = 1.2 + Math.random() * 2.5; e.wi = Math.random() < 0.35 ? 1 : 0; e.wa = Math.hypot(e.hx - e.x, e.hy - e.y) > 140 ? Math.atan2(e.hy - e.y, e.hx - e.x) : Math.random() * 6.283; }
      if (!e.wi && e.pause <= 0) { const sp = k.sp * 0.35; if (!moveE(w, e, Math.cos(e.wa) * sp * dt, Math.sin(e.wa) * sp * dt, k)) e.wt = 0; }
    }
    if (near && e.pause <= 0 && near.inv <= 0 && nd < k.r + PR + 3 && (!k.lurk || e.st === 1)) {
      hurtP(w, s, near, k.dmg, 1.0, e.x, e.y, ps, false);
      const a = Math.atan2(e.y - near.y, e.x - near.x); e.kx = Math.cos(a) * 90; e.ky = Math.sin(a) * 90; e.pause = 1.0;
    }
  }
}

export function step(w, s, dt, inputs) {
  s.t += dt; s.ev = [];
  const ps = Object.values(s.players);
  for (const p of ps) {
    p.inv = Math.max(0, p.inv - dt); p.atkCd = Math.max(0, p.atkCd - dt); p.sw = Math.max(0, p.sw - dt);
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
    if (i.a && p.atkCd <= 0) { p.atkCd = SW_CD; p.sw = 0.2; s.ev.push({ k: 'swing', id: p.id }); slash(w, s, p, ps); }
    if (p.hp < MAXHP && inSafe(w, p.x, p.y)) p.hp = Math.min(MAXHP, p.hp + 6 * dt);
    w.pickups.forEach((pk, n) => {
      const k = s.pk[n]; if (!k.on || Math.hypot(pk.x - p.x, pk.y - p.y) >= 10) return;
      if (pk.type === 'med') { if (p.hp < MAXHP) { p.hp = Math.min(MAXHP, p.hp + 40); k.on = false; k.t = 45; s.ev.push({ k: 'heal', id: p.id }); } }
      else if (!p.item) { k.on = false; k.t = 30; p.item = pk.type; s.ev.push({ k: 'pick', id: p.id }); }
    });
  }
  s.pk.forEach((k) => { if (!k.on && (k.t -= dt) <= 0) k.on = true; });
  if (!ps.length) return;
  updateFields(w, s, ps, dt);
  stepMonster(w, s, dt, ps);
  stepEnemies(w, s, dt, ps);
}

const r1 = (n) => Math.round(n * 10) / 10;
export function enemyView(s) { // only awake, living enemies are sent / drawn: [id, kind, x, y, hp, flags(1 hit-flash, 2 lunging)]
  const out = []; for (const e of s.en) if (e.act && e.hp > 0) out.push([e.id, e.kind, r1(e.x), r1(e.y), e.hp, (e.stun > 0 ? 1 : 0) | (e.st === 1 ? 2 : 0)]); return out;
}
export function snapshot(s) {
  return {
    t: 's',
    p: Object.values(s.players).map((p) => [p.id, r1(p.x), r1(p.y), Math.round(p.aim * 100) / 100, p.item, p.dead > 0 ? 1 : 0, p.speedT > 0 ? 1 : 0, p.name, Math.round(p.hp), p.inv > 0 ? 1 : 0, p.sw > 0 ? 1 : 0, p.kills]),
    m: [r1(s.m.x), r1(s.m.y), s.m.chase ? 1 : 0, s.m.pause > 0 ? 1 : 0, s.m.away > 0 ? 1 : 0],
    n: enemyView(s),
    k: s.pk.map((k) => (k.on ? 1 : 0)),
    e: s.ev,
  };
}
const solidAt = (w, px, py) => { const x = Math.floor(px / T), y = Math.floor(py / T); if (x < 0 || y < 0 || x >= W || y >= H) return true; return SOLID[w.tiles[y * W + x]] === 1; };
