# My Money — Cashflow Tracker

A personal finance tracker built with React, TypeScript, and Tailwind CSS. Runs entirely in the browser — no account, no backend, no data leaves your device.

**Live app:** https://arun-budget-tracker.lovable.app

## Features

**Dashboard**
- Add income and expense transactions with category, currency (USD / INR), amount, and an optional note
- Summary cards: balance, total income, total expenses — shown per currency
- Category breakdown with percentage bars
- Recent transactions list with delete

**Portfolio**
- Savings — track bank accounts, deposits, and cash reserves by institution and currency
- Loans — enter principal, start date, tenure, and interest rate; EMI and outstanding balance are calculated automatically with a full amortisation schedule
- Gold loans — bullet-repayment loans with day-by-day interest accrual

**Storage**
- Data auto-saves to `localStorage` in your browser
- Link a local JSON file (Chromium only) for durable, portable storage that persists across browsers

## Getting Started

```bash
npm install
cp .env.example .env    # fill in Supabase values if needed
npm run dev             # http://localhost:8080
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run) |

## Tech Stack

- **React 18 + TypeScript** — component UI
- **Vite** — build tooling
- **Tailwind CSS + shadcn-ui** — styling and component primitives
- **Zod** — form validation
- **Vitest + Testing Library** — unit tests
- **Lovable** — deployment platform

## Data & Privacy

All data is stored locally in your browser (`localStorage`) under `budget.tx.v1` and `budget.portfolio.v1`. When a JSON file is linked, data is also written to `my-money.json` on your device. Nothing is sent to any server unless Supabase integration is explicitly wired up.
