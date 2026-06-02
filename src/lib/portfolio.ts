// Portfolio data: savings and loans. Stored alongside transactions
// in localStorage and (when linked) the user's JSON file.

import { Currency } from "./budget";

export interface SavingItem {
  id: string;
  name: string;
  institution?: string;
  amount: number;
  interestRate?: number;
  note?: string;
  currency?: Currency;
  createdAt: string;
}

export interface LoanItem {
  id: string;
  name: string;
  lender?: string;
  principal: number; // total loan amount
  startDate: string; // ISO yyyy-MM-dd
  tenureYears: number; // number of years
  interestRate: number; // annual %
  note?: string;
  currency?: Currency;
  createdAt: string;
}

// Compute monthly EMI using the standard amortization formula.
export function computeEmi(principal: number, annualRatePct: number, tenureYears: number): number {
  const n = Math.round(tenureYears * 12);
  if (!principal || !n) return 0;
  const r = (annualRatePct || 0) / 100 / 12;
  if (r === 0) return principal / n;
  const pow = Math.pow(1 + r, n);
  return (principal * r * pow) / (pow - 1);
}

// Months elapsed between startDate and "now" (clamped to [0, n]).
function monthsElapsed(startDate: string, n: number): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  let m =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) m -= 1;
  return Math.max(0, Math.min(n, m));
}

// Outstanding balance after k EMIs paid on schedule.
export function computeOutstanding(loan: LoanItem): number {
  const n = Math.round((loan.tenureYears || 0) * 12);
  if (!loan.principal || !n) return 0;
  const k = monthsElapsed(loan.startDate, n);
  if (k >= n) return 0;
  const r = (loan.interestRate || 0) / 100 / 12;
  if (r === 0) {
    const emi = loan.principal / n;
    return Math.max(0, loan.principal - emi * k);
  }
  const pow = Math.pow(1 + r, n);
  const powK = Math.pow(1 + r, k);
  const emi = (loan.principal * r * pow) / (pow - 1);
  const balance = loan.principal * powK - (emi * (powK - 1)) / r;
  return Math.max(0, balance);
}

// Payoff date = startDate + tenureYears.
export function computePayoffDate(loan: LoanItem): Date {
  const d = new Date(loan.startDate || new Date());
  d.setFullYear(d.getFullYear() + Math.round(loan.tenureYears || 0));
  return d;
}

// Total interest payable over the full tenure (EMI * n - principal).
export function computeTotalInterest(loan: LoanItem): number {
  const n = Math.round((loan.tenureYears || 0) * 12);
  if (!loan.principal || !n) return 0;
  const emi = computeEmi(loan.principal, loan.interestRate, loan.tenureYears);
  return Math.max(0, emi * n - loan.principal);
}

export interface ScheduleRow {
  monthIndex: number; // 1-based
  date: string; // ISO yyyy-MM-dd of that EMI
  interest: number;
  principal: number;
  emi: number;
  balance: number;
}

// Amortization schedule up to and including the current month (paid EMIs).
export function computeScheduleToDate(loan: LoanItem): ScheduleRow[] {
  const n = Math.round((loan.tenureYears || 0) * 12);
  if (!loan.principal || !n || !loan.startDate) return [];
  const k = monthsElapsed(loan.startDate, n);
  if (k <= 0) return [];
  const r = (loan.interestRate || 0) / 100 / 12;
  const emi = computeEmi(loan.principal, loan.interestRate, loan.tenureYears);
  const start = new Date(loan.startDate);
  const rows: ScheduleRow[] = [];
  let balance = loan.principal;
  for (let i = 1; i <= k; i++) {
    const interest = r === 0 ? 0 : balance * r;
    const principalPart = Math.min(balance, emi - interest);
    balance = Math.max(0, balance - principalPart);
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    rows.push({
      monthIndex: i,
      date: d.toISOString().slice(0, 10),
      interest,
      principal: principalPart,
      emi: interest + principalPart,
      balance,
    });
  }
  return rows;
}

export interface GoldLoanItem {
  id: string;
  name: string;
  lender?: string;
  principal: number; // borrowed amount
  interestRate: number; // annual %
  startDate?: string;
  note?: string;
  currency?: Currency;
  createdAt: string;
}

// Gold loan payoff date = startDate + 1 year (today if no start date).
export function computeGoldLoanPayoffDate(loan: GoldLoanItem): Date {
  const d = new Date(loan.startDate || new Date());
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Days between two dates (floor, non-negative).
function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

// Full-year simple interest: principal * rate / 100.
export function computeGoldLoanFullYearInterest(loan: GoldLoanItem): number {
  return ((loan.principal || 0) * (loan.interestRate || 0)) / 100;
}

// Day-by-day accrued interest up to today, capped at 1 year.
export function computeGoldLoanInterest(loan: GoldLoanItem): number {
  const principal = loan.principal || 0;
  const rate = loan.interestRate || 0;
  if (!principal || !rate) return 0;
  const start = loan.startDate ? new Date(loan.startDate) : null;
  if (!start || isNaN(start.getTime())) return 0;
  const payoff = computeGoldLoanPayoffDate(loan);
  const now = new Date();
  const end = now > payoff ? payoff : now;
  const days = daysBetween(start, end);
  const yearDays = 365;
  const cappedDays = Math.min(days, yearDays);
  return (principal * rate * cappedDays) / (100 * yearDays);
}

// Repayment at end of 1-year term: principal + full-year interest.
export function computeGoldLoanRepayment(loan: GoldLoanItem): number {
  return (loan.principal || 0) + computeGoldLoanFullYearInterest(loan);
}

export interface GoldScheduleRow {
  dayIndex: number;
  date: string;
  dailyInterest: number;
  cumulativeInterest: number;
  totalOwed: number;
}

// Day-by-day interest accrual from start date up to today (capped at 1 year).
export function computeGoldLoanScheduleToDate(loan: GoldLoanItem): GoldScheduleRow[] {
  const principal = loan.principal || 0;
  const rate = loan.interestRate || 0;
  if (!principal || !loan.startDate) return [];
  const start = new Date(loan.startDate);
  if (isNaN(start.getTime())) return [];
  const payoff = computeGoldLoanPayoffDate(loan);
  const now = new Date();
  const end = now > payoff ? payoff : now;
  const days = Math.min(365, daysBetween(start, end));
  if (days <= 0) return [];
  const daily = (principal * rate) / (100 * 365);
  const rows: GoldScheduleRow[] = [];
  let cumulative = 0;
  for (let i = 1; i <= days; i++) {
    cumulative += daily;
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    rows.push({
      dayIndex: i,
      date: d.toISOString().slice(0, 10),
      dailyInterest: daily,
      cumulativeInterest: cumulative,
      totalOwed: principal + cumulative,
    });
  }
  return rows;
}

export interface Portfolio {
  savings: SavingItem[];
  loans: LoanItem[];
  goldLoans: GoldLoanItem[];
}

export const emptyPortfolio = (): Portfolio => ({
  savings: [],
  loans: [],
  goldLoans: [],
});

const KEY = "budget.portfolio.v1";

export function loadPortfolio(): Portfolio {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPortfolio();
    const parsed = JSON.parse(raw);
    return {
      savings: Array.isArray(parsed?.savings) ? parsed.savings : [],
      loans: Array.isArray(parsed?.loans) ? parsed.loans : [],
      goldLoans: Array.isArray(parsed?.goldLoans) ? parsed.goldLoans : [],
    };
  } catch {
    return emptyPortfolio();
  }
}

export function savePortfolio(p: Portfolio) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
