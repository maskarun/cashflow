import { Card } from "@/components/ui/card";
import { PortfolioSection } from "./PortfolioSection";
import { formatMoney, Currency, CURRENCIES } from "@/lib/budget";
import { Portfolio, SavingItem, computeOutstanding, computeGoldLoanInterest } from "@/lib/portfolio";
import { LoanSection } from "./LoanSection";
import { GoldLoanSection } from "./GoldLoanSection";

interface Props {
  portfolio: Portfolio;
  onChange: (next: Portfolio) => void;
}

const itemCur = (it: { currency?: Currency }): Currency => it.currency ?? "USD";

const sumByCurrency = <T extends { currency?: Currency }>(
  items: T[],
  key: keyof T
): Partial<Record<Currency, number>> => {
  const out: Partial<Record<Currency, number>> = {};
  for (const it of items) {
    const c = itemCur(it);
    out[c] = (out[c] || 0) + (Number(it[key] as any) || 0);
  }
  return out;
};

export const PortfolioView = ({ portfolio, onChange }: Props) => {
  const savingsByCur = sumByCurrency(portfolio.savings, "amount");
  const loansByCur: Partial<Record<Currency, number>> = {};
  for (const it of portfolio.loans) {
    const c = itemCur(it);
    loansByCur[c] = (loansByCur[c] || 0) + computeOutstanding(it);
  }
  for (const it of portfolio.goldLoans) {
    const c = itemCur(it);
    loansByCur[c] = (loansByCur[c] || 0) + (it.principal || 0) + computeGoldLoanInterest(it);
  }

  const activeCurrencies: Currency[] = CURRENCIES.filter(
    (c) => savingsByCur[c] !== undefined || loansByCur[c] !== undefined
  );
  const displayCurrencies = activeCurrencies.length ? activeCurrencies : (["USD"] as Currency[]);

  return (
    <div className="space-y-6">
      {/* Totals: savings + loans outstanding per currency */}
      <div
        className={`grid gap-4 ${
          displayCurrencies.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {displayCurrencies.map((cur) => {
          const symbol = cur === "USD" ? "$" : "₹";
          const accent =
            cur === "USD"
              ? "from-emerald-500/10 via-transparent to-sky-500/10"
              : "from-amber-500/10 via-transparent to-rose-500/10";
          return (
            <Card
              key={cur}
              className={`relative overflow-hidden p-5 bg-gradient-to-br ${accent} border-border/60`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center font-display text-base font-semibold">
                    {symbol}
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold leading-none">
                      {cur}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      Portfolio totals
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Savings
                    </span>
                  </div>
                  <div className="font-display text-2xl font-semibold mt-1.5 text-emerald-500 tabular-nums">
                    {formatMoney(savingsByCur[cur] || 0, cur, { decimals: 0 })}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Loans
                    </span>
                  </div>
                  <div className="font-display text-2xl font-semibold mt-1.5 text-rose-500 tabular-nums">
                    {formatMoney(loansByCur[cur] || 0, cur, { decimals: 0 })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Savings */}
      <PortfolioSection<SavingItem>
        title="Savings"
        description="Bank accounts, deposits, cash reserves."
        items={portfolio.savings}
        accent="emerald"
        totalKey="amount"
        totalLabel="Total balance"
        emptyValues={() => ({
          name: "",
          institution: "",
          amount: 0,
          interestRate: undefined,
          note: "",
        })}
        fields={[
          { key: "name", label: "Name" },
          { key: "institution", label: "Institution", optional: true },
          { key: "amount", label: "Amount", type: "number" },
          { key: "interestRate", label: "Interest %", type: "number", optional: true },
          { key: "note", label: "Note", optional: true },
        ]}
        onChange={(next) => onChange({ ...portfolio, savings: next })}
      />



      {/* Loans */}
      <LoanSection
        items={portfolio.loans}
        onChange={(next) => onChange({ ...portfolio, loans: next })}
      />

      {/* Gold loans */}
      <GoldLoanSection
        items={portfolio.goldLoans}
        onChange={(next) => onChange({ ...portfolio, goldLoans: next })}
      />

    </div>
  );
};
