// One GameRoom Durable Object = one lobby. Authoritative simulation at 20 Hz.
import { createWorld, newState, addPlayer, removePlayer, step, snapshot, MAX_PLAYERS } from '../public/sim.js';

const DT = 0.05;

export class GameRoom {
  constructor(ctx, env) {
    this.seed = (Math.random() * 2 ** 31) | 0;
    this.world = createWorld(this.seed);
    this.state = newState(this.world);
    this.socks = new Map(); // id -> ws
    this.inputs = {};
    this.timer = null;
  }

  async fetch(req) {
    if (this.socks.size >= MAX_PLAYERS) return new Response('Room full', { status: 403 });
    const name = (new URL(req.url).searchParams.get('name') || 'Player').slice(0, 12);
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const id = crypto.randomUUID().slice(0, 6);
    this.socks.set(id, server);
    addPlayer(this.state, this.world, id, name);
    server.send(JSON.stringify({ t: 'welcome', id, seed: this.seed }));

    server.addEventListener('message', (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.t === 'in') this.inputs[id] = { mx: +m.mx || 0, my: +m.my || 0, ax: +m.ax || 0, ay: +m.ay || 0, u: !!m.u, a: !!m.a };
      } catch {}
    });
    const leave = () => {
      this.socks.delete(id); delete this.inputs[id]; removePlayer(this.state, id);
      if (!this.socks.size) { clearInterval(this.timer); this.timer = null; }
    };
    server.addEventListener('close', leave);
    server.addEventListener('error', leave);

    if (!this.timer) this.timer = setInterval(() => this.tick(), DT * 1000);
    return new Response(null, { status: 101, webSocket: client });
  }

  tick() {
    step(this.world, this.state, DT, this.inputs);
    for (const k of Object.keys(this.inputs)) this.inputs[k].u = false; // use is edge-triggered
    const msg = JSON.stringify(snapshot(this.state));
    for (const ws of this.socks.values()) { try { ws.send(msg); } catch {} }
  }
}
