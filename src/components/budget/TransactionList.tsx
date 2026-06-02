import { ArrowDownRight, ArrowUpRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transaction, formatMoney, getCurrency } from "@/lib/budget";

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export const TransactionList = ({ transactions, onDelete }: Props) => {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-card rounded-3xl p-6 md:p-8 shadow-soft">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-2xl font-semibold">Recent activity</h3>
        <span className="text-sm text-muted-foreground">{sorted.length} total</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nothing here yet. Your transactions will appear in this list.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.slice(0, 12).map((t) => {
            const isIncome = t.type === "income";
            const cur = getCurrency(t);
            return (
              <li key={t.id} className="flex items-center gap-4 py-4 group">
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    isIncome ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    <span className="truncate">{t.category}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                      {cur}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.note || new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div className={`font-display text-lg font-semibold tabular-nums ${
                  isIncome ? "text-success" : "text-foreground"
                }`}>
                  {isIncome ? "+" : "−"}{formatMoney(t.amount, cur)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 rounded-xl"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
