// Worker entry: routes WebSocket traffic to one Durable Object per room code,
// everything else is served from /public (static client).
export { GameRoom } from './room.js';

const clean = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/ws/')) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const code = clean(url.pathname.slice(4)) || 'LOBBY';
      return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code)).fetch(req);
    }
    if (url.pathname === '/api/new') {
      const c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
      return Response.json({ code: c });
    }
    return env.ASSETS.fetch(req);
  },
};
