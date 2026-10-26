# Hollow Mire

A 2D top-down pixel horror game for up to 4 players per room, or single player.
Built on Cloudflare Workers and Durable Objects.

**Controls:** left stick or WASD = move. Right stick or mouse = aim the flashlight.
POWER button or Space = use a power-up (dash or speed).

## Run locally
    npm install
    npm run dev

## Deploy
    npx wrangler login
    npm run deploy

## Layout
- `src/index.js`: Worker entry, routes `/ws/<ROOM>` to a Durable Object
- `src/room.js`: multiplayer room server, runs the 20 Hz simulation
- `public/sim.js`: shared game logic (map, monster, pickups, scares)
- `public/index.html`: client (menu, renderer, controls, audio)
