# Cashflow — CLAUDE.md

## Project Overview

**My Money** is a personal finance tracker built with React, TypeScript, Vite, and Tailwind CSS / shadcn-ui. It runs entirely in the browser with no backend — data persists in `localStorage` and optionally in a user-chosen local JSON file via the File System Access API.

Live deployment: https://arun-budget-tracker.lovable.app

## Repository Structure

```
cashflow/
├── src/
│   ├── pages/
│   │   ├── Index.tsx            # Root page: state management, file linking, tab layout
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── budget/
│   │   │   ├── AddTransaction.tsx    # Form to add income/expense entries
│   │   │   ├── CategoryBreakdown.tsx # Per-currency expense bar chart by category
│   │   │   ├── StatusBadge.tsx       # Storage status indicator (browser / file)
│   │   │   ├── SummaryCards.tsx      # Balance / income / expense cards per currency
│   │   │   └── TransactionList.tsx   # Sorted transaction list with delete
│   │   ├── portfolio/
│   │   │   ├── GoldLoanSection.tsx   # Gold loans — bullet repayment, daily accrual
│   │   │   ├── LoanSection.tsx       # EMI loans — amortisation schedule
│   │   │   ├── PortfolioSection.tsx  # Generic section (used for savings)
│   │   │   └── PortfolioView.tsx     # Portfolio tab root with per-currency totals
│   │   ├── ui/                       # shadcn-ui primitives (do not edit manually)
│   │   └── NavLink.tsx
│   ├── lib/
│   │   ├── budget.ts        # Transaction types, localStorage I/O, formatMoney
│   │   ├── portfolio.ts     # Portfolio types, EMI/amortisation/gold-loan math, localStorage I/O
│   │   ├── fileStore.ts     # File System Access API wrapper (IndexedDB-persisted handle)
│   │   └── utils.ts         # shadcn cn() helper
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/supabase/
│   │   ├── client.ts        # Supabase client (wired but not actively used for data)
│   │   └── types.ts         # Generated DB types
│   ├── test/
│   │   ├── example.test.ts
│   │   └── setup.ts
│   ├── App.tsx              # QueryClient, TooltipProvider, BrowserRouter, routes
│   ├── main.tsx             # React entry point
│   ├── index.css            # Tailwind directives + CSS custom properties + Google Fonts
│   └── vite-env.d.ts
├── public/                  # Static assets (favicon, robots.txt)
├── supabase/
│   └── config.toml
├── index.html               # Vite HTML entry
├── package.json
├── tailwind.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── components.json          # shadcn-ui config
├── .env.example             # Copy to .env and fill in Supabase credentials
└── CLAUDE.md
```

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Framework   | React 18 + TypeScript                           |
| Build       | Vite 5 (`@vitejs/plugin-react-swc`)             |
| Styling     | Tailwind CSS 3 + shadcn-ui (Radix primitives)   |
| State       | React `useState` / `useMemo` — no global store  |
| Persistence | `localStorage` (primary) + File System Access API (optional) |
| Forms       | Native + Zod validation (AddTransaction)        |
| Icons       | lucide-react                                    |
| Charts      | recharts (available, not yet wired to UI)       |
| Fonts       | Fraunces (display) + Inter (body) via Google Fonts |
| Tests       | Vitest + @testing-library/react                 |
| Deployment  | Lovable (static, auto-deploy on push to main)   |

## Data Models

### Transaction (`src/lib/budget.ts`)

```ts
interface Transaction {
  id: string;          // crypto.randomUUID()
  type: "income" | "expense";
  amount: number;      // positive float
  category: string;    // from EXPENSE_CATEGORIES / INCOME_CATEGORIES
  note?: string;       // max 120 chars
  date: string;        // ISO 8601 full datetime (new Date().toISOString())
  currency?: Currency; // "USD" | "INR" — treated as "USD" when missing
}
```

localStorage key: `budget.tx.v1`

### Portfolio (`src/lib/portfolio.ts`)

```ts
interface Portfolio {
  savings:   SavingItem[];
  loans:     LoanItem[];
  goldLoans: GoldLoanItem[];
}
```

localStorage key: `budget.portfolio.v1`

**SavingItem** — name, institution, amount, interestRate, currency  
**LoanItem** — EMI loan with principal, startDate, tenureYears, interestRate, lender, currency  
**GoldLoanItem** — bullet-repayment loan: principal + annual rate, payoff = start + 1 year

### File payload (`FilePayload` in `Index.tsx`)

When a JSON file is linked, both datasets are stored together:

```json
{ "version": 2, "transactions": [...], "portfolio": { "savings": [...], "loans": [...], "goldLoans": [...] } }
```

Backwards-compatible: a bare array of transactions is treated as v1 (portfolio is empty).

## Key Functions

### `src/lib/budget.ts`

| Function | Purpose |
|---|---|
| `loadTx()` / `saveTx(tx)` | localStorage read/write for transactions |
| `formatMoney(n, currency, opts?)` | `Intl.NumberFormat` in `en-IN` (INR) or `en-US` (USD) |
| `getCurrency(t)` | Returns `t.currency ?? "USD"` |
| `getLastCurrency()` / `setLastCurrency(c)` | Remembers last-used currency across sessions |

### `src/lib/portfolio.ts`

| Function | Purpose |
|---|---|
| `computeEmi(principal, rate, years)` | Standard amortisation formula → monthly EMI |
| `computeOutstanding(loan)` | Balance after months elapsed since `startDate` |
| `computeScheduleToDate(loan)` | Month-by-month amortisation table up to today |
| `computeGoldLoanInterest(loan)` | Day-by-day simple interest, capped at 1 year |
| `computeGoldLoanScheduleToDate(loan)` | Daily accrual table up to today |
| `uid()` | Compact random ID (`Math.random + Date.now` in base-36) |

### `src/lib/fileStore.ts`

Wraps the File System Access API. The chosen file handle is persisted in IndexedDB (`budget-fs` / `handles` store) so it survives page reloads without a new picker.

| Method | Purpose |
|---|---|
| `isSupported()` | Checks for `showSaveFilePicker` in `window` |
| `getSavedHandle()` | Retrieves saved handle from IndexedDB |
| `ensurePermission(handle, mode)` | Requests permission if not already granted |
| `pickNew(name)` / `pickExisting()` | Open file pickers |
| `readJSON(handle)` / `writeJSON(handle, data)` | JSON I/O on the linked file |
| `forget()` | Deletes the saved handle from IndexedDB |

## Application Flow (`src/pages/Index.tsx`)

1. **Hydrate** — on mount, try to load from linked file (IndexedDB handle); fall back to `localStorage`.
2. **Auto-save** — any change to `tx` or `portfolio` triggers a 300 ms debounced write to the linked file (if any) and an immediate `localStorage` mirror.
3. **UI** — `Dashboard` tab shows `SummaryCards`, `AddTransaction`, `CategoryBreakdown`, `TransactionList`. `Portfolio` tab shows `PortfolioView`.
4. **Data menu** (`⋯` button) — Link new file, Open JSON, Import, Export. When a file is linked the menu shows its name and an Unlink option.

## CSS Design Tokens (`src/index.css`)

Light theme only (no dark mode toggle):

```
--background:  hsl(40 33% 96%)    warm off-white page
--card:        hsl(0 0% 100%)     white cards
--primary:     hsl(220 15% 12%)   near-black
--accent:      hsl(75 95% 55%)    yellow-green brand accent
--success:     hsl(150 65% 40%)   income green
--destructive: hsl(8 85% 58%)     expense red/orange
--radius:      1rem               border-radius base
```

Custom gradients: `--gradient-hero` (dark), `--gradient-accent` (yellow-green), `--gradient-warm` (off-white).  
Custom shadows: `--shadow-soft`, `--shadow-bold`, `--shadow-accent`.  
Display font: **Fraunces** (serif). Body font: **Inter**.

## Development Workflow

### Setup

```bash
npm install        # install dependencies
cp .env.example .env   # fill in Supabase values if needed
npm run dev        # start dev server at http://localhost:8080
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest watch mode |

### Committing

```bash
git add -p           # stage intentionally; never commit .env
git commit -m "..."
git push -u origin <branch>
```

### Adding shadcn-ui components

```bash
npx shadcn@latest add <component>
```

Components land in `src/components/ui/` — do not hand-edit generated files unless absolutely necessary.

## Key Conventions

- **No global state manager** — all state lives in `Index.tsx` and is passed down as props. Keep it that way unless the component tree gets 3+ levels deep.
- **Multi-currency aware** — every transaction and portfolio item has an optional `currency` field defaulting to `"USD"`. New fields or summary calculations must respect this.
- **XSS safety** — this app uses React JSX so XSS is handled automatically. If you ever write raw `innerHTML` (avoid it), you must sanitise first.
- **IDs** — transactions use `crypto.randomUUID()`; portfolio items use the lightweight `uid()` from `portfolio.ts`. Do not mix them.
- **Date storage** — transactions store full ISO 8601 datetime; portfolio items store `YYYY-MM-DD` strings. Keep this distinction.
- **File payload version** — the JSON file format is `{ version: 2, transactions, portfolio }`. If you add a new top-level field, bump the version and update `normalizePayload` in `Index.tsx` for backwards compatibility.
- **No `.env` in git** — `.env` is gitignored. Use `.env.example` for documentation.
- **Supabase is wired but passive** — the client is set up but data is not persisted to Supabase. Do not add Supabase data calls without discussing the auth strategy first.

## Known Limitations

- Data is device- and browser-specific unless a JSON file is linked. No cloud sync.
- The File System Access API is Chromium-only; Safari/Firefox fall back to localStorage silently (status badge shows "Browser storage").
- Transaction list shows the 12 most recent entries only (`sorted.slice(0, 12)`).
- No pagination, search, or date-range filter on the Dashboard tab.
- Year range: no hard limit — `new Date().toISOString()` is used for transaction dates.
- Currencies: USD and INR only. Adding a third currency requires updating `CURRENCIES` in `budget.ts` and the UI formatting logic.
