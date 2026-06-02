export type TxType = "income" | "expense";

export type Currency = "USD" | "INR";
export const CURRENCIES: Currency[] = ["USD", "INR"];

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string; // ISO
  currency?: Currency; // optional for backward-compat; treated as USD when missing
}

export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Housing", "Bills", "Shopping", "Health", "Entertainment", "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Gift", "Other",
] as const;

const KEY = "budget.tx.v1";
const LAST_CURRENCY_KEY = "budget.lastCurrency.v1";

export function loadTx(): Transaction[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTx(tx: Transaction[]) {
  localStorage.setItem(KEY, JSON.stringify(tx));
}

export function getLastCurrency(): Currency {
  const v = localStorage.getItem(LAST_CURRENCY_KEY);
  return v === "INR" || v === "USD" ? v : "USD";
}

export function setLastCurrency(c: Currency) {
  localStorage.setItem(LAST_CURRENCY_KEY, c);
}

export function getCurrency(t: { currency?: Currency }): Currency {
  return t.currency ?? "USD";
}

export function formatMoney(
  n: number,
  currency: Currency = "USD",
  opts?: { decimals?: number }
) {
  const decimals = opts?.decimals ?? 2;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function currencySymbol(c: Currency) {
  return c === "INR" ? "₹" : "$";
}
