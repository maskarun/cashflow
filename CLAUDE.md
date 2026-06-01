# Cashflow — CLAUDE.md

## Project Overview

Cashflow is a zero-dependency personal finance tracker that runs entirely in the browser. It is a **single-file static application** (`index.html`) — no build step, no server, no package manager.

## Repository Structure

```
cashflow/
├── index.html   # Complete application (HTML + CSS + JS, ~687 lines)
└── README.md    # Minimal project title
```

Everything — markup, styles, and logic — lives in `index.html`.

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Markup   | HTML5                                 |
| Styling  | CSS3 (inline `<style>` block)         |
| Logic    | Vanilla JavaScript ES6+ (inline `<script>`) |
| Storage  | Browser `localStorage`                |
| Fonts    | Google Fonts — DM Serif Display, DM Mono |
| Build    | None                                  |
| Tests    | None                                  |
| CI/CD    | None                                  |

## Application Architecture

### Data Model

Each transaction entry is a plain object stored in a JSON array under `localStorage` key `budget_tracker_v1`:

```js
{
  id:     number,   // Date.now() timestamp — used as primary key
  date:   string,   // "YYYY-MM-DD"
  type:   string,   // "expense" | "credit"
  amount: number,   // positive float
  desc:   string    // user-supplied description, defaults to "—"
}
```

Entries are kept sorted descending by date (`b.date.localeCompare(a.date)`) on every write.

### Key Functions (`index.html:498–686`)

| Function | Line | Purpose |
|---|---|---|
| `load()` | ~534 | Read and parse `localStorage` array |
| `save(data)` | ~539 | Serialize and write array to `localStorage` |
| `addEntry()` | ~547 | Validate form, push entry, re-render |
| `deleteEntry(id)` | ~571 | Filter out entry by `id`, re-render |
| `renderTable()` | ~579 | Apply filters, build tbody HTML, inject |
| `updateSummary()` | ~623 | Recalculate balance/expense/credit totals and update cards + balance bar |
| `clearFilters()` | ~652 | Reset filter controls, re-render |
| `fmt(n)` | ~543 | Format number as Indian Rupees (`₹x,xx,xxx.xx`) |
| `formatDate(d)` | ~658 | Convert `YYYY-MM-DD` → `DD Mon YYYY` |
| `escHtml(s)` | ~663 | Sanitize user text before inserting into innerHTML |
| `showToast(msg)` | ~668 | Display transient notification (auto-dismisses after 2.2 s) |

### UI Regions

1. **Header** — app title "Tracker"
2. **Summary cards** — Balance (credit − expense), Total Expenses, Total Credit; each has a coloured top border and entry count
3. **Balance bar** — thin progress bar; green when credit > 60 % of total, amber 35–60 %, red below 35 %
4. **Entry form** — day/month/year dropdowns (today pre-selected), type select, amount input, description input, "Add Entry" button
5. **Filter bar** — type select, month `<input type="month">`, "Clear filters" button
6. **Transactions table** — grouped by calendar month, sorted newest first; each row shows date, type badge, description, signed amount, and a delete button

### CSS Design Tokens (`index.html:10–21`)

```css
--bg:       #0e0f11   /* page background */
--surface:  #16181c   /* card / panel background */
--surface2: #1e2126   /* input background / table hover */
--border:   #2a2d35   /* borders */
--text:     #e8e9eb   /* primary text */
--muted:    #6b7280   /* secondary / label text */
--accent:   #f0c040   /* gold — primary brand colour */
--green:    #4ade80   /* credit amounts */
--red:      #f87171   /* expense amounts */
--blue:     #60a5fa   /* reserved, unused */
```

Dark theme only. Mobile breakpoint at `640px` (`@media (max-width: 640px)`).

## Development Workflow

### Running the app

Open `index.html` directly in any modern browser — no server needed:

```bash
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or serve it with any static file server if cross-origin restrictions matter:

```bash
python3 -m http.server 8080
npx serve .
```

### Editing

All changes go into `index.html`. The file has three logical sections separated by HTML comments:

- **`<style>` block** (lines 9–396) — all styling
- **HTML body** (lines 399–496) — static structure
- **`<script>` block** (lines 498–686) — all logic

### Testing changes

There is no automated test suite. Verify changes manually:

1. Open `index.html` in a browser
2. Add expense and credit entries
3. Confirm summary cards and balance bar update correctly
4. Filter by type and by month; confirm results match
5. Delete an entry; confirm it disappears and totals update
6. Reload the page; confirm data persists via localStorage
7. Resize to < 640 px; confirm single-column layout

### Committing

```bash
git add index.html
git commit -m "your message"
git push -u origin <branch>
```

## Key Conventions

- **No dependencies** — do not introduce npm, bundlers, or external libraries. The zero-dependency constraint is a feature, not a limitation.
- **Single file** — keep everything in `index.html`. Do not split into separate `.css` or `.js` files unless there is a compelling reason and the user explicitly requests it.
- **XSS hygiene** — any user-supplied string rendered via `innerHTML` must pass through `escHtml()`. Never skip this for new rendering code.
- **Currency locale** — amounts are formatted as Indian Rupees using `en-IN` locale. Do not change the locale or symbol without an explicit user request.
- **Date format** — internal storage is always `YYYY-MM-DD`. Display format is `DD Mon YYYY`. Maintain this separation.
- **Entry IDs** — `Date.now()` timestamps. They are unique enough for a single-user local app; do not replace with UUIDs unless persistence across devices is introduced.
- **Sorted writes** — the array is always sorted descending by date after each mutation. Maintain this invariant.
- **No confirmation dialogs** — deletes are immediate with only a toast notification. Match this UX pattern for any destructive actions.

## Known Limitations

- Data lives only in the browser's localStorage for the current origin. Clearing browser data deletes all entries.
- No export/import, backup, or sync functionality.
- Year range in the date picker is hard-coded from 2020 to the current year (`index.html:520`).
- Single currency (Indian Rupees) with no settings to change it.
- No offline service worker or PWA manifest.
