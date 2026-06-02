import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { Currency, CURRENCIES, formatMoney } from "@/lib/budget";

interface Totals {
  income: number;
  expense: number;
  balance: number;
}

interface Props {
  totals: Record<Currency, Totals>;
}

export const SummaryCards = ({ totals }: Props) => {
  const active = CURRENCIES.filter(
    (c) => totals[c].income !== 0 || totals[c].expense !== 0
  );
  const display = active.length ? active : (["USD"] as Currency[]);

  return (
    <div className="space-y-6">
      {display.map((cur, idx) => {
        const { income, expense, balance } = totals[cur];
        return (
          <div key={cur} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {cur} totals
              </span>
              <div className="h-px bg-border flex-1" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div
                className="gradient-hero text-primary-foreground rounded-3xl p-8 shadow-bold animate-slide-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-center gap-2 text-sm uppercase tracking-widest opacity-70">
                  <Wallet className="h-4 w-4" /> Balance
                </div>
                <div className="font-display text-5xl md:text-6xl font-semibold mt-4 tracking-tight">
                  {formatMoney(balance, cur)}
                </div>
                <div className="mt-2 text-sm opacity-60">Net in {cur}</div>
              </div>

              <div className="bg-card rounded-3xl p-8 shadow-soft animate-slide-up [animation-delay:60ms]">
                <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4 text-success" /> Income
                </div>
                <div className="font-display text-4xl font-semibold mt-4 text-success">
                  {formatMoney(income, cur)}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Money in</div>
              </div>

              <div className="bg-card rounded-3xl p-8 shadow-soft animate-slide-up [animation-delay:120ms]">
                <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                  <ArrowDownRight className="h-4 w-4 text-destructive" /> Expenses
                </div>
                <div className="font-display text-4xl font-semibold mt-4 text-destructive">
                  {formatMoney(expense, cur)}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Money out</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
