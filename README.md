# Cashflow

A zero-dependency personal finance tracker that runs entirely in the browser. No build step, no server, no package manager — just open `index.html` and go.

## Features

- Add expense and credit transactions with a date, amount, and description
- Summary cards showing balance (credit − expense), total expenses, and total credits
- Visual balance bar that shifts green → amber → red as expenses grow
- Filter transactions by type and by month
- Transactions grouped by calendar month, sorted newest first
- Data persists in browser `localStorage` — no account or backend needed

## Getting Started

Open `index.html` in any modern browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

Or serve it locally if you need to avoid cross-origin restrictions:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript (ES6+)** — no frameworks, no dependencies
- **Browser `localStorage`** — all data stays on your device
- **Google Fonts** — DM Serif Display & DM Mono

## Data & Privacy

All data is stored locally in your browser under the key `budget_tracker_v1`. Nothing is sent to any server. Clearing your browser's site data will erase all entries.

## Limitations

- Data is device- and browser-specific; there is no sync or export
- Currency is fixed to Indian Rupees (₹)
- Year range in the date picker starts from 2020
