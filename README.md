# Gridiron Scoreboard

A football-themed scoreboard app for tracking scores and counting down quarters like a real game — built to go along with a tabletop football board game.

## Features

- **Scoring** — TD +6, TD+XP +7, FG +3, Safety +2, XP +1, and a −1 button to correct mistakes, tracked separately for each team
- **Game clock** — a real countdown clock per quarter with start/pause/reset, a configurable quarter length (5–20 minutes), quarter navigation (Q1–Q4, then OT), and an air-horn sound when time expires
- **Down & distance** — adjustable down and yards to go, with a one-tap "1st Down" reset
- **Possession indicator** — tap either team's football icon (or the possession arrow) to flip who has the ball
- **Timeouts** — 3 per team, tap a dot to mark it used/unused
- **Customization** — editable team names, per-team colors, and a horn on/off toggle, all in Settings (⚙️)
- **Autosave** — game state is saved to your browser's local storage, so a page refresh won't lose the score, clock, or quarter

## Usage

No install or build step required — it's a static site.

- **Open directly**: double-click `index.html` to open it in your browser.
- **Or serve it locally** (recommended for the best experience on a phone/tablet at the table):

  ```bash
  python3 -m http.server 8000
  ```

  then visit `http://localhost:8000` from any device on the same network.

## Files

- `index.html` — page structure
- `style.css` — football field / scoreboard theme
- `app.js` — game state, clock, and interactions (vanilla JS, no dependencies)
