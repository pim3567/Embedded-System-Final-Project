# Chroma — Frontend Prototype

A browser-only Next.js App Router prototype for trying the game's core mechanic before connecting any hardware or NETPIE services.

## Run Locally

Requires Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run these commands from this `frontend/` directory. In PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## How to Play

- Pick Chill (10 seconds), Classic (7 seconds), or Rush (4 seconds), then start.
- The signal panel simulates the physical RGB LED. Its color name is also shown.
- Use arrow keys to move the circular player onto a square.
- Press Space to select that square. Match the **color of its letters** to the signal; ignore the word's meaning.
- Every round contains all six ink colors exactly once. Every word conflicts with its ink color.
- A correct choice earns 100 points plus a remaining-time bonus of up to 50 points.
- An incorrect choice or timeout costs one life. Selecting empty space has no penalty.
- Finish ten rounds or lose all three lives. The player returns to the center each round.
- Press P or Escape to pause/resume. Leaving the browser window or hiding the tab automatically pauses the game; resume manually.

The prototype is designed for a keyboard. It has no touch joystick, jump action, obstacles, hardware connection, or shared ranking. The optional best score is saved only in this browser's local storage. It combines all difficulty levels for casual testing and is not a competitive leaderboard.

## Project Layout

```text
app/
  layout.tsx       # Metadata and root layout
  page.tsx         # Game UI, keyboard input, animation loop, and optional sound
  globals.css      # Responsive layout and visual styles
lib/
  game.ts          # Round generation, movement, scoring, and game state transitions
  game.test.ts     # Game-rule tests
```

Google Fonts are loaded by CSS, with local font fallbacks. The game works without the font service.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

The tests use Node's built-in TypeScript stripping, so run them with Node 22.18+ or Node 24+. Production requires `npm run build` followed by `npm start`.

The keyboard-to-game boundary can later be replaced with hardware input events. The current game rules and browser timings are only for playtesting, not validated hardware scores.
