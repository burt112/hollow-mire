// Pixel art: tiles, player, big creature and mini monsters. createArt(ctx) returns the drawing functions.
import { T, W, H, hash, decor } from './sim.js';
export function createArt(ctx) {
const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function grass(tx, ty, sx, sy) {
  const h = hash(tx, ty, 5), p = hash(tx >> 2, ty >> 2, 3), f = hash(tx >> 3, ty >> 3, 9);
  R(f < 0.35 ? (p < 0.5 ? '#234c29' : '#285330') : (p < 0.3 ? '#2b5a30' : p < 0.65 ? '#2f6334' : '#356a38'), sx, sy, T, T);
  if (h > 0.7) { const c = f < 0.35 ? '#37753f' : '#4a8a4a'; R(c, sx + ((h * 97) % 11 | 0) + 2, sy + ((h * 53) % 9 | 0) + 3, 1, 3); R(c, sx + ((h * 61) % 9 | 0) + 4, sy + ((h * 29) % 7 | 0) + 7, 1, 2); }
  if (h < 0.1) R('#1f4a26', sx + ((h * 130) % 12 | 0) + 1, sy + ((h * 170) % 12 | 0) + 1, 3, 2);
}
function deco(k, h, sx, sy) {
  if (k === 1) { R('#00000033', sx + 1, sy + 11, 14, 3); R('#1d4a26', sx + 2, sy + 6, 12, 8); R('#2a6a34', sx + 3, sy + 4, 10, 8); R('#3f8a44', sx + 5, sy + 5, 3, 2); R('#3f8a44', sx + 10, sy + 8, 3, 2); if (h > 0.7) { R('#c84050', sx + 4, sy + 8, 2, 2); R('#c84050', sx + 10, sy + 6, 2, 2); } }
  else if (k === 2) { const c = h < 0.33 ? '#e8d070' : h < 0.66 ? '#e070b0' : '#a0a0f0'; R('#3a7a3a', sx + 4, sy + 8, 1, 3); R('#3a7a3a', sx + 10, sy + 6, 1, 4); R(c, sx + 3, sy + 7, 3, 2); R(c, sx + 9, sy + 5, 3, 2); R('#fff8', sx + 4, sy + 7, 1, 1); }
  else if (k === 3) { R('#00000033', sx + 3, sy + 11, 11, 2); R('#6a6a74', sx + 4, sy + 7, 9, 5); R('#8a8a96', sx + 5, sy + 6, 6, 3); R('#4a4a54', sx + 4, sy + 11, 9, 1); }
  else if (k === 4) { R('#e8e0d0', sx + 5, sy + 9, 2, 4); R('#c83030', sx + 3, sy + 6, 6, 4); R('#fff', sx + 4, sy + 7, 1, 1); R('#fff', sx + 7, sy + 8, 1, 1); R('#e8e0d0', sx + 11, sy + 10, 1, 3); R('#a02828', sx + 9, sy + 8, 4, 3); }
  else if (k === 5) { for (let i = 0; i < 5; i++) R('#4f9a4f', sx + 2 + i * 3, sy + 4 + (i % 2) * 2, 1, 8 - (i % 2) * 2); R('#68b568', sx + 5, sy + 3, 1, 3); }
  else if (k === 6) { R('#00000033', sx + 3, sy + 12, 11, 2); R('#4a2f1a', sx + 4, sy + 7, 8, 6); R('#8a6a3a', sx + 4, sy + 6, 8, 3); R('#6a4a28', sx + 7, sy + 7, 2, 1); }
}
function tree(tx, ty, sx, sy) { // trunk + shadow (canopy is drawn later, above players)
  R('#00000044', sx + 1, sy + 11, 14, 4); R('#4a2f1a', sx + 6, sy + 8, 4, 8); R('#3a2412', sx + 6, sy + 8, 1, 8);
}
function canopy(tx, ty, sx, sy) {
  const v = hash(tx, ty, 31), o = (hash(tx, ty, 5) * 4) | 0;
  if (v < 0.5) { R('#164a24', sx + 1, sy - 3, 14, 14); R('#164a24', sx - 1, sy, 18, 8); R('#1f6a32', sx + 3, sy - 2, 10, 8); R('#2e8a44', sx + 4 + o, sy - 1, 3, 2); R('#2e8a44', sx + 8, sy + 3, 2, 2); }
  else if (v < 0.85) { R('#0f3a1e', sx + 6, sy - 10, 4, 4); R('#134526', sx + 4, sy - 7, 8, 5); R('#185a30', sx + 2, sy - 3, 12, 6); R('#1d6a38', sx, sy + 2, 16, 7); R('#2a8a48', sx + 7, sy - 8, 1, 2); R('#2a8a48', sx + 5, sy - 3, 2, 1); R('#2a8a48', sx + 9, sy + 3, 2, 1); }
  else { R('#3a2a1c', sx + 7, sy - 6, 2, 16); R('#3a2a1c', sx + 3, sy - 3, 5, 1); R('#3a2a1c', sx + 9, sy - 5, 5, 1); R('#3a2a1c', sx + 2, sy - 4, 1, 2); R('#3a2a1c', sx + 13, sy - 7, 1, 2); R('#3a2a1c', sx + 8, sy + 1, 5, 1); }
}
function floor(t, tx, ty, sx, sy) {
  const h = hash(tx, ty, 7);
  if (t === 3) { R('#6a5640', sx, sy, T, T); R('#5a4936', sx, sy + 5, T, 1); R('#5a4936', sx, sy + 11, T, 1); R('#5a4936', sx + ((h * 16) | 0), sy, 1, 5); R('#7a6650', sx + ((h * 13) | 0), sy + 7, 3, 1); }
  else if (t === 9) { R('#6e6e78', sx, sy, T, T); R('#585863', sx, sy + 7, T, 1); R('#585863', sx + (ty % 2 ? 4 : 11), sy, 1, 7); R('#585863', sx + (ty % 2 ? 11 : 4), sy + 8, 1, 8); if (h < 0.15) R('#4a4a54', sx + 3, sy + 3, 4, 1); }
  else if (t === 19) { R('#b09040', sx, sy, T, T); for (let i = 0; i < 6; i++) R(i % 2 ? '#d8bc60' : '#8a7030', sx + ((h * (31 + i * 7)) % 14 | 0), sy + ((h * (17 + i * 11)) % 14 | 0), 3, 1); }
  else if (t === 20) { R('#7a2430', sx, sy, T, T); R('#c8a050', sx, sy, T, 1); R('#c8a050', sx, sy + 15, T, 1); R('#5a1824', sx + 4, sy + 4, 8, 8); R('#c8a050', sx + 7, sy + 7, 2, 2); }
}
function wall(t, tx, ty, sx, sy) {
  const h = hash(tx, ty, 2);
  if (t === 4) { R('#5a3d22', sx, sy, T, T); R('#7a5430', sx, sy, T, 4); for (let i = 0; i < T; i += 4) R('#4a321b', sx + i, sy + 4, 1, 12); R('#2a1c0e', sx, sy + 14, T, 2); }
  else if (t === 21) { R('#5a5a68', sx, sy, T, T); R('#7e7e8e', sx, sy, T, 4); for (let r = 0; r < 3; r++) { R('#42424f', sx, sy + 4 + r * 4, T, 1); R('#42424f', sx + ((r + ty) % 2 ? 4 : 10), sy + 4 + r * 4, 1, 4); } R('#2a2a36', sx, sy + 14, T, 2); }
  else { R('#7a2a22', sx, sy, T, T); R('#9a3a2c', sx, sy, T, 4); for (let i = 0; i < T; i += 4) R('#5a1c18', sx + i, sy + 4, 1, 12); R('#d8d0c0', sx, sy + 4, T, 1); R('#3a100c', sx, sy + 14, T, 2); }
  if (h < 0.12) { R('#1a1408', sx + 4, sy + 5, 8, 7); R(t === 21 ? '#5060c8' : '#a88a40', sx + 5, sy + 6, 6, 5); R('#1a1408', sx + 7, sy + 6, 1, 5); }
}
  function drawTile(t, tx, ty, sx, sy, time, seed) {
  const h = hash(tx, ty, 5), outside = tx < 0 || ty < 0 || tx >= W || ty >= H;
  if (t === 0 || t === 1) { grass(tx, ty, sx, sy); if (t === 1) tree(tx, ty, sx, sy); else { const k = decor(tx, ty, seed); if (k) deco(k, hash(tx, ty, 21), sx, sy); } }
  else if (t === 2) { R('#173f6a', sx, sy, T, T); if (((h * 60 + time * 1.5) | 0) % 7 === 0) R('#2f6a9a', sx + 2, sy + ((h * 12) | 0), 6, 1); if (h > 0.9) R('#1f4f80', sx + 8, sy + 10, 5, 1); }
  else if (t === 18) { R('#2f7a98', sx, sy, T, T); R('#3f8aa8', sx + ((h * 9) | 0), sy + ((h * 130) % 12 | 0), 4, 1); if (((h * 50 + time * 2) | 0) % 6 === 0) R('#6ab0c8', sx + 3, sy + 8, 5, 1); if (h < 0.2) R('#8a9a70', sx + 10, sy + 12, 2, 1); }
  else if (t === 3 || t === 9 || t === 19 || t === 20) floor(t, tx, ty, sx, sy);
  else if (t === 4 || t === 21 || t === 22) wall(t, tx, ty, sx, sy);
  else if (t === 5) { R('#3a3a46', sx, sy, T, T); R('#5a3a1a', sx + 1, sy + 1, 14, 15); R('#8a5a2a', sx + 2, sy + 2, 12, 14); R('#6a4220', sx + 7, sy + 2, 2, 14); R('#e8c050', sx + 11, sy + 8, 2, 2); }
  else if (t === 6) { R(h < 0.5 ? '#8a7650' : '#826e48', sx, sy, T, T); if (h < 0.3) R('#9a8660', sx + ((h * 40) | 0), sy + ((h * 90) % 12 | 0), 3, 2); if (h > 0.88) R('#6a5a3a', sx + 4, sy + 9, 2, 2); if (hash(tx, ty, 8) < 0.1) R('#6a5a3a', sx, sy + 7, T, 1); }
  else if (t === 7) { R('#173f6a', sx, sy, T, T); R('#7a5a30', sx, sy, T, T - 1); R('#5a4020', sx, sy + 3, T, 1); R('#5a4020', sx, sy + 7, T, 1); R('#5a4020', sx, sy + 11, T, 1); R('#3a2810', sx, sy, T, 1); R('#3a2810', sx, sy + 14, T, 2); }
  else if (t === 8) { floor(3, tx, ty, sx, sy); R('#00000044', sx + 2, sy + 13, 13, 3); R('#5a3a18', sx + 1, sy + 1, 14, 14); R('#9a6a30', sx + 2, sy + 2, 12, 12); R('#7a5020', sx + 2, sy + 7, 12, 2); R('#7a5020', sx + 7, sy + 2, 2, 12); }
  else if (t === 10) { floor(9, tx, ty, sx, sy); R('#00000044', sx, sy + 12, T, 3); R('#3a2410', sx, sy + 3, T, 10); R('#6a4424', sx, sy + 3, T, 3); R('#4a2e18', sx, sy + 8, T, 3); }
  else if (t === 11) { floor(9, tx, ty, sx, sy); R('#8a8a96', sx + 1, sy + 6, 14, 9); R('#a8a8b4', sx + 1, sy + 6, 14, 2); R('#a02030', sx + 3, sy + 8, 10, 4); R('#f0e8c0', sx + 3, sy + 1, 2, 6); R('#f0e8c0', sx + 11, sy + 1, 2, 6); R('#ffd060', sx + 3, sy, 2, 1); R('#ffd060', sx + 11, sy, 2, 1); }
  else if (t === 12) { grass(tx, ty, sx, sy); R('#00000044', sx + 3, sy + 12, 11, 3); R('#7a7a86', sx + 4, sy + 3, 8, 11); R('#9a9aa6', sx + 4, sy + 3, 8, 2); R('#4a6a4a', sx + 4, sy + 11, 3, 3); if (h < 0.4) { R('#7a7a86', sx + 7, sy, 2, 4); R('#9a9aa6', sx + 5, sy + 1, 6, 2); } else R('#5a5a66', sx + 6, sy + 6, 4, 1); }
  else if (t === 13) { grass(tx, ty, sx, sy); R('#1c1c22', sx, sy + 5, T, 1); R('#1c1c22', sx, sy + 10, T, 1); for (let i = 1; i < T; i += 5) { R('#2a2a32', sx + i, sy + 2, 2, 12); R('#3a3a44', sx + i, sy + 1, 2, 1); } }
  else if (t === 14) { floor(3, tx, ty, sx, sy); R('#00000044', sx + 2, sy + 13, 13, 3); R('#5a3a18', sx + 1, sy + 3, 14, 11); R('#8a6030', sx + 1, sy + 3, 14, 3); R('#6a4220', sx + 2, sy + 7, 12, 6); R('#d8d0c0', sx + 5, sy + 4, 3, 2); }
  else if (t === 24) { floor(3, tx, ty, sx, sy); R('#4a2e18', sx + 1, sy, 14, 16); R('#3a5a9a', sx + 2, sy + 5, 12, 10); R('#5a7ac0', sx + 2, sy + 5, 12, 2); R('#e8e0d0', sx + 3, sy + 1, 10, 4); }
  else if (t === 15) { floor(19, tx, ty, sx, sy); R('#00000044', sx + 2, sy + 13, 13, 3); R('#a88a40', sx + 1, sy + 3, 14, 11); R('#d8bc60', sx + 1, sy + 3, 14, 3); R('#7a6020', sx + 1, sy + 8, 14, 1); R('#7a6020', sx + 5, sy + 3, 1, 11); R('#7a6020', sx + 10, sy + 3, 1, 11); }
  else if (t === 16) { grass(tx, ty, sx, sy); for (let i = 0; i < 8; i++) R('#6a6a72', sx + 8 + Math.round(Math.cos(i * 0.785) * 6) - 1, sy + 9 + Math.round(Math.sin(i * 0.785) * 4) - 1, 3, 2);
    R('#4a2a14', sx + 3, sy + 9, 10, 2); R('#3a2010', sx + 4, sy + 7, 8, 2); const f = Math.sin(time * 14 + tx) * 1; R('#ff5a10', sx + 5, sy + 4 + f, 6, 6); R('#ffa020', sx + 6, sy + 2 + f, 4, 6); R('#ffe060', sx + 7, sy + 4 + f, 2, 4); }
  else if (t === 17) { floor(9, tx, ty, sx, sy); R('#00000044', sx + 1, sy + 12, 14, 3); R('#5a5a64', sx + 2, sy + 6, 7, 7); R('#7a7a86', sx + 3, sy + 6, 5, 2); R('#4a4a54', sx + 9, sy + 8, 5, 5); R('#6a6a74', sx + 10, sy + 8, 3, 2); }
  else if (t === 23) { grass(tx, ty, sx, sy); R('#00000044', sx + 1, sy + 13, 15, 3); for (let i = 0; i < 9; i++) R(i % 2 ? '#a88a58' : '#8a6a3a', sx + 8 - i, sy + 3 + i, 1 + i * 2, 1); R('#2a1a0a', sx + 6, sy + 9, 4, 4); R('#c8a870', sx + 8, sy + 2, 1, 1); }
  else { R('#000', sx, sy, T, T); }
}
function drawPlayer(p, x, y, isMe) {
  if (p.inv && ((performance.now() / 90) | 0) % 2) return;
  const bob = p.mv ? Math.abs(Math.sin(p.bob || 0)) * 1.5 : 0, st = p.mv ? Math.sin(p.bob || 0) * 2 : 0;
  R('#00000066', x - 4, y + 4, 9, 3);
  R('#2a2a3a', x - 3, y + 1 + st * 0.5, 2, 4); R('#2a2a3a', x + 1, y + 1 - st * 0.5, 2, 4);
  y -= bob;
  R(isMe ? '#d9a63c' : '#4c8fc9', x - 4, y - 6, 8, 8); R(isMe ? '#b07a20' : '#356a9a', x - 4, y, 8, 2);
  R('#e8cfa8', x - 3, y - 11, 6, 5); R('#3a2a1a', x - 3, y - 12, 6, 2);
  const sw = p.swt > 0, prog = sw ? 1 - p.swt / 0.2 : 0, ang = sw ? p.aim - 1.1 + 2.2 * prog : p.aim + 0.5;
  if (sw) for (let k = 1; k <= 5; k++) { const a2 = ang - k * 0.16; for (let i = 8; i <= 17; i += 3) R(`rgba(230,240,255,${0.5 - k * 0.09})`, Math.round(x + Math.cos(a2) * i), Math.round(y - 2 + Math.sin(a2) * i), 2, 2); }
  const L = sw ? 17 : 12;
  for (let i = 5; i <= L; i++) R(i < 7 ? '#8a5a2a' : i === 7 ? '#d8b040' : '#dfe8f0', Math.round(x + Math.cos(ang) * i), Math.round(y - 2 + Math.sin(ang) * i), i > 7 ? 2 : 1, i > 7 ? 2 : 1);
  if (p.fx) R('#ffd84f66', x - 7, y + 5, 14, 2);
}
  function drawMonster(x, y, time, a) {
  ctx.save(); ctx.globalAlpha = a; const j = Math.sin(time * 14);
  R('#00000099', x - 8, y + 9, 16, 3);
  R('#1a1a26', x - 4, y - 14, 8, 20); R('#1a1a26', x - 3, y - 21, 6, 8);
  R('#1a1a26', x - 10, y - 12 + j, 3, 17); R('#1a1a26', x + 7, y - 12 - j, 3, 17);
  R('#1a1a26', x - 4, y + 6, 3, 6); R('#1a1a26', x + 1, y + 6, 3, 6);
  R('#4a4a66', x - 4, y - 14, 1, 20); R('#4a4a66', x - 10, y - 12 + j, 1, 17); R('#4a4a66', x + 9, y - 12 - j, 1, 17);
  R('#c8c4b0', x - 10, y + 5 + j, 3, 2); R('#c8c4b0', x + 7, y + 5 - j, 3, 2);
  R('#ff2020', x - 3, y - 19, 2, 2); R('#ff2020', x + 1, y - 19, 2, 2);
  ctx.restore();
}
const EYES = { 0: ['#ff3030', -1, 1, -8], 1: ['#ff3030', -2, 1, -2], 4: ['#ffe040', -2, 1, -9], 5: ['#ff3030', 7, 8, -5], 8: ['#ff9020', -3, 1, -12] };
function drawEyes(k, x, y) { const e = EYES[k]; if (!e) return; R(e[0], x + e[1], y + e[3], 2, 2); R(e[0], x + e[2] + 1, y + e[3], 2, 2); }
function drawEnemy(k, x, y, time, a, flash, lunge, ph) {
  ctx.save(); ctx.globalAlpha = a; const j = Math.sin(time * 12 + ph), l = Math.sin(time * 20 + ph);
  if (k === 0) { const by = y - 8 + Math.sin(time * 5 + ph) * 1.5, w = Math.sin(time * 28 + ph) * 3; R('#00000044', x - 3, y + 2, 7, 2); R('#3a2a4a', x - 1, by, 3, 4); R('#4a3860', x - 6, by - 1 + w, 5, 2); R('#4a3860', x + 2, by - 1 - w, 5, 2); R('#2a1e38', x - 5, by + 1 + w, 3, 1); R('#2a1e38', x + 3, by + 1 - w, 3, 1); R('#ff3030', x - 1, by + 1, 1, 1); R('#ff3030', x + 1, by + 1, 1, 1); }
  else if (k === 1) { R('#00000044', x - 5, y + 3, 11, 2); R('#1a100c', x - 7, y - 3 + l, 4, 1); R('#1a100c', x + 4, y - 3 - l, 4, 1); R('#1a100c', x - 7, y - 1 - l, 4, 1); R('#1a100c', x + 4, y - 1 + l, 4, 1); R('#1a100c', x - 6, y + 1 + l, 3, 1); R('#1a100c', x + 4, y + 1 - l, 3, 1); R('#3a2418', x - 3, y - 3, 6, 5); R('#5a3a28', x - 2, y - 4, 4, 2); R('#ff2222', x - 2, y - 2, 1, 1); R('#ff2222', x + 1, y - 2, 1, 1); }
  else if (k === 2) { const sq = Math.sin(time * 5 + ph) * 1.2; R('#00000044', x - 6, y + 3, 13, 2); R('#2f9a3f', x - 5, y - 4 - sq, 11, 8 + sq); R('#4acb5a', x - 4, y - 5 - sq, 9, 3); R('#9af0a0', x - 3, y - 4 - sq, 3, 1); R('#10301a', x - 3, y - 1, 2, 2); R('#10301a', x + 1, y - 1, 2, 2); }
  else if (k === 3) { const by = y - 7 + Math.sin(time * 4 + ph) * 2, g = ctx.createRadialGradient(x, by, 1, x, by, 13); g.addColorStop(0, 'rgba(150,230,255,.75)'); g.addColorStop(1, 'rgba(150,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, by, 13, 0, 7); ctx.fill(); R('#e8fbff', x - 2, by - 2, 4, 4); R('#7fd8ff', x - 1, by + 2, 2, 4); R('#4aa8d8', x, by + 5, 1, 3); }
  else if (k === 4) { R('#00000066', x - 5, y + 6, 11, 3); R('#3a463a', x - 3, y + 5, 2, 3 + l * 0.5); R('#3a463a', x + 1, y + 5, 2, 3 - l * 0.5); R('#4a5a48', x - 3, y - 6, 7, 11); R('#5a6a58', x - 3, y - 6, 7, 3); R('#4a5a48', x - 3, y - 11, 6, 6); R('#4a5a48', x - 6, y - 5 + j, 3, 9); R('#4a5a48', x + 4, y - 5 - j, 3, 9); R('#d8d0b0', x - 6, y + 4 + j, 2, 2); R('#d8d0b0', x + 5, y + 4 - j, 2, 2); R('#ffe040', x - 2, y - 9, 1, 1); R('#ffe040', x + 1, y - 9, 1, 1); }
  else if (k === 5) { const q = l * 2; R('#00000066', x - 7, y + 3, 15, 3); R('#2a2224', x - 6, y - 4, 12, 6); R('#3a2e30', x - 6, y - 4, 12, 2); R('#2a2224', x + 5, y - 7, 5, 5); R('#2a2224', x - 9, y - 5, 4, 2); R('#1a1416', x - 5 + q, y + 2, 2, 3); R('#1a1416', x - 1 - q, y + 2, 2, 3); R('#1a1416', x + 2 + q, y + 2, 2, 3); R('#1a1416', x + 5 - q, y + 2, 2, 3); R('#ff2222', x + 8, y - 6, 1, 2); R('#eeeeee', x + 9, y - 3, 1, 1); }
  else if (k === 6) { if (!lunge) { R('#2a2418', x - 4, y, 9, 3); R('#3a3224', x - 3, y - 1, 7, 2); } else { R('#00000066', x - 4, y + 3, 9, 2); R('#d8d0b8', x - 2, y - 10, 4, 12); R('#d8d0b8', x - 4, y - 13, 2, 4); R('#d8d0b8', x - 1, y - 14, 2, 4); R('#d8d0b8', x + 2, y - 13, 2, 4); R('#8a1a1a', x - 1, y - 3, 2, 2); } }
  else if (k === 7) { const w = Math.sin(time * 30 + ph) * 3, by = y - 6 + Math.sin(time * 3 + ph) * 3; R('#e8e0c0', x - 5, by - 2 + w, 4, 4); R('#e8e0c0', x + 1, by - 2 - w, 4, 4); R('#8a7a50', x - 1, by - 1, 2, 4); R('#00000033', x - 2, y + 2, 5, 2); }
  else if (k === 8) { R('#00000066', x - 9, y + 7, 19, 3); R('#2a3818', x - 5, y + 5, 4, 4); R('#2a3818', x + 1, y + 5, 4, 4); R('#3a4a24', x - 7, y - 8, 14, 14); R('#4a5e2c', x - 7, y - 8, 14, 4); R('#3a4a24', x - 11, y - 6 + j, 4, 13); R('#3a4a24', x + 8, y - 6 - j, 4, 13); R('#3a4a24', x - 4, y - 14, 8, 7); R('#ff9020', x - 3, y - 12, 2, 2); R('#ff9020', x + 1, y - 12, 2, 2); R('#6a8a3a', x - 5, y - 6, 3, 2); R('#e8e0c0', x - 3, y - 8, 1, 2); R('#e8e0c0', x + 2, y - 8, 1, 2); }
  if (flash) { ctx.globalAlpha = 0.65 * a; R('#ffffff', x - 7, y - 12, 15, 20); }
  ctx.restore();
}
return { R, drawTile, canopy, drawPlayer, drawMonster, drawEnemy, drawEyes };
}
