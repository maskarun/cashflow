import { Transaction, formatMoney, getCurrency, CURRENCIES, Currency } from "@/lib/budget";

interface Props {
  transactions: Transaction[];
}

export const CategoryBreakdown = ({ transactions }: Props) => {
  const expenses = transactions.filter((t) => t.type === "expense");

  // Group by currency, then by category
  const byCurrency = new Map<Currency, { total: number; cats: Record<string, number> }>();
  for (const t of expenses) {
    const cur = getCurrency(t);
    if (!byCurrency.has(cur)) byCurrency.set(cur, { total: 0, cats: {} });
    const bucket = byCurrency.get(cur)!;
    bucket.total += t.amount;
    bucket.cats[t.category] = (bucket.cats[t.category] || 0) + t.amount;
  }

  const sections = CURRENCIES.filter((c) => byCurrency.has(c));

  return (
    <div className="bg-card rounded-3xl p-6 md:p-8 shadow-soft">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-2xl font-semibold">By category</h3>
      </div>
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No expenses yet — add one to see the breakdown.
        </p>
      ) : (
        <div className="space-y-6">
          {sections.map((cur) => {
            const { total, cats } = byCurrency.get(cur)!;
            const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
            return (
              <div key={cur}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {cur}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {rows.length} categories
                  </span>
                </div>
                <ul className="space-y-4">
                  {rows.map(([cat, amt]) => {
                    const pct = total ? (amt / total) * 100 : 0;
                    return (
                      <li key={cat}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">{cat}</span>
                          <span className="text-muted-foreground">
                            {formatMoney(amt, cur)} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full gradient-accent rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
