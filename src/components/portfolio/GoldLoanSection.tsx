import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatMoney,
  Currency,
  CURRENCIES,
  getLastCurrency,
  setLastCurrency,
} from "@/lib/budget";
import {
  GoldLoanItem,
  uid,
  computeGoldLoanInterest,
  computeGoldLoanFullYearInterest,
  computeGoldLoanRepayment,
  computeGoldLoanPayoffDate,
  computeGoldLoanScheduleToDate,
} from "@/lib/portfolio";

interface Props {
  items: GoldLoanItem[];
  onChange: (next: GoldLoanItem[]) => void;
}

const todayISO = () => format(new Date(), "yyyy-MM-dd");
const parseISODate = (s?: string) => {
  if (!s) return undefined;
  const d = parseISO(s);
  return isValid(d) ? d : undefined;
};
const formatDateDisplay = (s?: string) => {
  const d = parseISODate(s);
  return d ? format(d, "PPP") : "";
};
const getCur = (it: GoldLoanItem): Currency => (it.currency as Currency) ?? "USD";

interface DraftState {
  name: string;
  lender: string;
  principal: string;
  interestRate: string;
  startDate: string;
  note: string;
}

const emptyDraft = (): DraftState => ({
  name: "",
  lender: "",
  principal: "",
  interestRate: "",
  startDate: todayISO(),
  note: "",
});

const fromItem = (it: GoldLoanItem): DraftState => ({
  name: it.name ?? "",
  lender: it.lender ?? "",
  principal: it.principal != null ? String(it.principal) : "",
  interestRate: it.interestRate != null ? String(it.interestRate) : "",
  startDate: it.startDate ?? todayISO(),
  note: it.note ?? "",
});

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const date = parseISODate(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 mr-2 opacity-60" />
          {date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function GoldLoanSection({ items, onChange }: Props) {
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [draftCurrency, setDraftCurrency] = useState<Currency>(() => getLastCurrency());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState>(emptyDraft);
  const [editCurrency, setEditCurrency] = useState<Currency>("USD");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalsByCur: Partial<Record<Currency, number>> = {};
  for (const it of items) {
    const c = getCur(it);
    totalsByCur[c] = (totalsByCur[c] || 0) + (it.principal || 0) + computeGoldLoanInterest(it);
  }
  const activeCurrencies = CURRENCIES.filter((c) => totalsByCur[c] !== undefined);

  const draftInterest = useMemo(
    () =>
      ((Number(draft.principal) || 0) * (Number(draft.interestRate) || 0)) / 100,
    [draft.principal, draft.interestRate]
  );
  const editInterest = useMemo(
    () =>
      ((Number(editDraft.principal) || 0) *
        (Number(editDraft.interestRate) || 0)) /
      100,
    [editDraft.principal, editDraft.interestRate]
  );

  const startAdd = () => {
    setDraft(emptyDraft());
    setDraftCurrency(getLastCurrency());
    setAdding(true);
  };

  const build = (d: DraftState): Omit<GoldLoanItem, "id" | "createdAt" | "currency"> | null => {
    if (!d.name.trim()) return null;
    return {
      name: d.name.trim(),
      lender: d.lender.trim() || undefined,
      principal: Number(d.principal) || 0,
      interestRate: Number(d.interestRate) || 0,
      startDate: d.startDate || undefined,
      note: d.note.trim() || undefined,
    };
  };

  const submitAdd = () => {
    const base = build(draft);
    if (!base) return;
    const newItem: GoldLoanItem = {
      ...base,
      currency: draftCurrency,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    onChange([newItem, ...items]);
    setLastCurrency(draftCurrency);
    setAdding(false);
    setDraft(emptyDraft());
  };

  const startEdit = (it: GoldLoanItem) => {
    setEditDraft(fromItem(it));
    setEditCurrency(getCur(it));
    setEditingId(it.id);
  };

  const submitEdit = () => {
    const base = build(editDraft);
    if (!base || !editingId) return;
    onChange(
      items.map((it) =>
        it.id === editingId ? { ...it, ...base, currency: editCurrency } : it
      )
    );
    setEditingId(null);
  };

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const renderForm = (
    d: DraftState,
    setD: (n: DraftState) => void,
    cur: Currency,
    setCur: (c: Currency) => void,
    interest: number,
    onCancel: () => void,
    onSubmit: () => void,
    submitLabel: string
  ) => {
    const principal = Number(d.principal) || 0;
    return (
      <div className="grid gap-2 md:grid-cols-2">
        <Select value={cur} onValueChange={(v) => setCur(v as Currency)}>
          <SelectTrigger>
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div />
        <Input
          placeholder="Loan name"
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
        <Input
          placeholder="Lender (optional)"
          value={d.lender}
          onChange={(e) => setD({ ...d, lender: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Principal amount"
          value={d.principal}
          onChange={(e) => setD({ ...d, principal: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Interest rate % per year"
          value={d.interestRate}
          onChange={(e) => setD({ ...d, interestRate: e.target.value })}
        />
        <DateField
          label="Start date (optional)"
          value={d.startDate}
          onChange={(v) => setD({ ...d, startDate: v })}
        />
        <Input
          placeholder="Note (optional)"
          value={d.note}
          onChange={(e) => setD({ ...d, note: e.target.value })}
        />
        <div className="md:col-span-2 rounded-md border bg-card/50 px-3 py-2 text-sm grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Principal</div>
            <div className="font-semibold tabular-nums">{formatMoney(principal, cur, { decimals: 0 })}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Interest (1 yr)</div>
            <div className="font-semibold tabular-nums">{formatMoney(interest, cur, { decimals: 0 })}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Repay at end</div>
            <div className="font-semibold tabular-nums">{formatMoney(principal + interest, cur, { decimals: 0 })}</div>
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={onSubmit}>
            <Check className="h-4 w-4 mr-1" /> {submitLabel}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight">Gold loans</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bullet repayment: principal + interest due at the end of one year.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Owed today
          </div>
          {activeCurrencies.length === 0 ? (
            <div className="font-display text-2xl font-semibold text-amber-500">
              {formatMoney(0, "USD", { decimals: 0 })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {activeCurrencies.map((c) => (
                <div
                  key={c}
                  className="font-display text-xl font-semibold text-amber-500 tabular-nums"
                >
                  {formatMoney(totalsByCur[c] || 0, c, { decimals: 0 })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {items.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No gold loans yet. Add your first one below.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it) => {
          const isEditing = editingId === it.id;
          const cur = getCur(it);
          const interest = computeGoldLoanInterest(it);
          const owedToday = (it.principal || 0) + interest;
          const payoffDate = it.startDate ? computeGoldLoanPayoffDate(it) : null;
          const isExpanded = expandedId === it.id;
          const schedule = isExpanded ? computeGoldLoanScheduleToDate(it) : [];
          return (
            <li key={it.id} className="rounded-lg border bg-card/50 px-3 py-2.5">
              {isEditing ? (
                renderForm(
                  editDraft,
                  setEditDraft,
                  editCurrency,
                  setEditCurrency,
                  editInterest,
                  () => setEditingId(null),
                  submitEdit,
                  "Save"
                )
              ) : (
                <>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : it.id)}
                    className="shrink-0 -ml-1 p-1 rounded hover:bg-secondary text-muted-foreground"
                    aria-label={isExpanded ? "Hide schedule" : "Show schedule"}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate flex items-center gap-2">
                      <span className="truncate">{it.name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                        {cur}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[
                        it.lender ? `Lender: ${it.lender}` : null,
                        `Principal: ${formatMoney(it.principal, cur, { decimals: 0 })}`,
                        it.interestRate ? `Rate: ${it.interestRate}% / yr` : null,
                        it.startDate ? `Start: ${formatDateDisplay(it.startDate)}` : null,
                        payoffDate ? `Payoff: ${format(payoffDate, "PPP")}` : null,
                        `Interest to date: ${formatMoney(interest, cur, { decimals: 0 })}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {payoffDate ? `Payoff ${format(payoffDate, "PP")}` : "Owed today"}
                    </div>
                    <div className="font-semibold text-amber-500 tabular-nums">
                      {formatMoney(owedToday, cur, { decimals: 0 })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(it)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 rounded-md border bg-background/50 overflow-hidden">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
                      <span>Daily accrual · {schedule.length} day{schedule.length === 1 ? "" : "s"}</span>
                      <span className="tabular-nums">
                        Accrued: <span className="font-medium text-foreground">{formatMoney(interest, cur, { decimals: 0 })}</span>
                        {" · "}
                        Owed today: <span className="font-medium text-foreground">{formatMoney(it.principal + interest, cur, { decimals: 0 })}</span>
                      </span>
                    </div>
                    {schedule.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No interest accrued yet.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                        <table className="w-full text-xs tabular-nums">
                          <thead className="bg-secondary/50 text-muted-foreground sticky top-0">
                            <tr>
                              <th className="text-left font-medium px-3 py-2">Day</th>
                              <th className="text-left font-medium px-3 py-2">Date</th>
                              <th className="text-right font-medium px-3 py-2">Daily interest</th>
                              <th className="text-right font-medium px-3 py-2">Cumulative</th>
                              <th className="text-right font-medium px-3 py-2">Total owed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.map((row) => (
                              <tr key={row.dayIndex} className="border-t">
                                <td className="px-3 py-1.5 text-muted-foreground">{row.dayIndex}</td>
                                <td className="px-3 py-1.5">{formatDateDisplay(row.date)}</td>
                                <td className="px-3 py-1.5 text-right">{formatMoney(row.dailyInterest, cur, { decimals: 2 })}</td>
                                <td className="px-3 py-1.5 text-right">{formatMoney(row.cumulativeInterest, cur, { decimals: 0 })}</td>
                                <td className="px-3 py-1.5 text-right font-medium">{formatMoney(row.totalOwed, cur, { decimals: 0 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="mt-4">
          {renderForm(
            draft,
            setDraft,
            draftCurrency,
            setDraftCurrency,
            draftInterest,
            () => setAdding(false),
            submitAdd,
            "Add"
          )}
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={startAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add gold loan
        </Button>
      )}
    </Card>
  );
}
