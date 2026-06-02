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
  LoanItem,
  uid,
  computeEmi,
  computeOutstanding,
  computeScheduleToDate,
  computePayoffDate,
  computeTotalInterest,
} from "@/lib/portfolio";

interface Props {
  items: LoanItem[];
  onChange: (next: LoanItem[]) => void;
}

const todayISO = () => format(new Date(), "yyyy-MM-dd");

const parseISODate = (s?: string): Date | undefined => {
  if (!s) return undefined;
  const d = parseISO(s);
  return isValid(d) ? d : undefined;
};

const formatDateDisplay = (s?: string): string => {
  const d = parseISODate(s);
  return d ? format(d, "PPP") : "";
};

const getCur = (it: LoanItem): Currency => (it.currency as Currency) ?? "USD";

interface DraftState {
  name: string;
  lender: string;
  principal: string;
  startDate: string;
  tenureYears: string;
  interestRate: string;
  note: string;
}

const emptyDraft = (): DraftState => ({
  name: "",
  lender: "",
  principal: "",
  startDate: todayISO(),
  tenureYears: "",
  interestRate: "",
  note: "",
});

const fromItem = (it: LoanItem): DraftState => ({
  name: it.name ?? "",
  lender: it.lender ?? "",
  principal: it.principal != null ? String(it.principal) : "",
  startDate: it.startDate ?? todayISO(),
  tenureYears: it.tenureYears != null ? String(it.tenureYears) : "",
  interestRate: it.interestRate != null ? String(it.interestRate) : "",
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

export function LoanSection({ items, onChange }: Props) {
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [draftCurrency, setDraftCurrency] = useState<Currency>(() => getLastCurrency());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState>(emptyDraft);
  const [editCurrency, setEditCurrency] = useState<Currency>("USD");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-currency outstanding totals
  const totalsByCur: Partial<Record<Currency, number>> = {};
  for (const it of items) {
    const c = getCur(it);
    totalsByCur[c] = (totalsByCur[c] || 0) + computeOutstanding(it);
  }
  const activeCurrencies = CURRENCIES.filter((c) => totalsByCur[c] !== undefined);

  const draftEmi = useMemo(
    () =>
      computeEmi(
        Number(draft.principal) || 0,
        Number(draft.interestRate) || 0,
        Number(draft.tenureYears) || 0
      ),
    [draft.principal, draft.interestRate, draft.tenureYears]
  );

  const editEmi = useMemo(
    () =>
      computeEmi(
        Number(editDraft.principal) || 0,
        Number(editDraft.interestRate) || 0,
        Number(editDraft.tenureYears) || 0
      ),
    [editDraft.principal, editDraft.interestRate, editDraft.tenureYears]
  );

  const startAdd = () => {
    setDraft(emptyDraft());
    setDraftCurrency(getLastCurrency());
    setAdding(true);
  };

  const buildLoan = (d: DraftState): Omit<LoanItem, "id" | "createdAt" | "currency"> | null => {
    if (!d.name.trim()) return null;
    return {
      name: d.name.trim(),
      lender: d.lender.trim() || undefined,
      principal: Number(d.principal) || 0,
      startDate: d.startDate || todayISO(),
      tenureYears: Number(d.tenureYears) || 0,
      interestRate: Number(d.interestRate) || 0,
      note: d.note.trim() || undefined,
    };
  };

  const submitAdd = () => {
    const base = buildLoan(draft);
    if (!base) return;
    const newItem: LoanItem = {
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

  const startEdit = (it: LoanItem) => {
    setEditDraft(fromItem(it));
    setEditCurrency(getCur(it));
    setEditingId(it.id);
  };

  const submitEdit = () => {
    const base = buildLoan(editDraft);
    if (!base || !editingId) return;
    onChange(
      items.map((it) =>
        it.id === editingId
          ? { ...it, ...base, currency: editCurrency }
          : it
      )
    );
    setEditingId(null);
  };

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const renderForm = (
    d: DraftState,
    setD: (next: DraftState) => void,
    cur: Currency,
    setCur: (c: Currency) => void,
    emi: number,
    onCancel: () => void,
    onSubmit: () => void,
    submitLabel: string
  ) => (
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
        placeholder="Total loan amount"
        value={d.principal}
        onChange={(e) => setD({ ...d, principal: e.target.value })}
      />
      <DateField
        label="Start date"
        value={d.startDate}
        onChange={(v) => setD({ ...d, startDate: v })}
      />
      <Input
        type="number"
        placeholder="Tenure (years)"
        value={d.tenureYears}
        onChange={(e) => setD({ ...d, tenureYears: e.target.value })}
      />
      <Input
        type="number"
        placeholder="Interest rate %"
        value={d.interestRate}
        onChange={(e) => setD({ ...d, interestRate: e.target.value })}
      />
      <Input
        className="md:col-span-2"
        placeholder="Note (optional)"
        value={d.note}
        onChange={(e) => setD({ ...d, note: e.target.value })}
      />
      <div className="md:col-span-2 rounded-md border bg-card/50 px-3 py-2 text-sm flex items-center justify-between">
        <span className="text-muted-foreground">Estimated EMI / month</span>
        <span className="font-semibold tabular-nums">
          {formatMoney(emi, cur, { decimals: 0 })}
        </span>
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

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight">Loans</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter principal, start date, tenure & rate. EMI and current outstanding are calculated automatically.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Outstanding today
          </div>
          {activeCurrencies.length === 0 ? (
            <div className="font-display text-2xl font-semibold text-rose-500">
              {formatMoney(0, "USD", { decimals: 0 })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {activeCurrencies.map((c) => (
                <div
                  key={c}
                  className="font-display text-xl font-semibold text-rose-500 tabular-nums"
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
          No loans yet. Add your first one below.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it) => {
          const isEditing = editingId === it.id;
          const cur = getCur(it);
          const emi = computeEmi(it.principal, it.interestRate, it.tenureYears);
          const outstanding = computeOutstanding(it);
          const isExpanded = expandedId === it.id;
          const schedule = isExpanded ? computeScheduleToDate(it) : [];
          const totalInterestPaid = schedule.reduce((s, r) => s + r.interest, 0);
          const totalPrincipalPaid = schedule.reduce((s, r) => s + r.principal, 0);
          return (
            <li key={it.id} className="rounded-lg border bg-card/50 px-3 py-2.5">
              {isEditing ? (
                renderForm(
                  editDraft,
                  setEditDraft,
                  editCurrency,
                  setEditCurrency,
                  editEmi,
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
                        it.startDate ? `Start: ${formatDateDisplay(it.startDate)}` : null,
                        it.tenureYears ? `Tenure: ${it.tenureYears} yr` : null,
                        it.interestRate ? `Rate: ${it.interestRate}%` : null,
                        `EMI: ${formatMoney(emi, cur, { decimals: 0 })}`,
                        `Payoff: ${formatDateDisplay(computePayoffDate(it).toISOString().slice(0, 10))}`,
                        `Total interest: ${formatMoney(computeTotalInterest(it), cur, { decimals: 0 })}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Outstanding
                    </div>
                    <div className="font-semibold text-rose-500 tabular-nums">
                      {formatMoney(outstanding, cur, { decimals: 0 })}
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
                      <span>Payments to date · {schedule.length} month{schedule.length === 1 ? "" : "s"}</span>
                      <span className="tabular-nums">
                        Interest paid: <span className="font-medium text-foreground">{formatMoney(totalInterestPaid, cur, { decimals: 0 })}</span>
                        {" · "}
                        Principal paid: <span className="font-medium text-foreground">{formatMoney(totalPrincipalPaid, cur, { decimals: 0 })}</span>
                      </span>
                    </div>
                    {schedule.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No payments due yet.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                        <table className="w-full text-xs tabular-nums">
                          <thead className="bg-secondary/50 text-muted-foreground sticky top-0">
                            <tr>
                              <th className="text-left font-medium px-3 py-2">#</th>
                              <th className="text-left font-medium px-3 py-2">Date</th>
                              <th className="text-right font-medium px-3 py-2">Interest</th>
                              <th className="text-right font-medium px-3 py-2">Principal</th>
                              <th className="text-right font-medium px-3 py-2">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.map((row) => (
                              <tr key={row.monthIndex} className="border-t">
                                <td className="px-3 py-1.5 text-muted-foreground">{row.monthIndex}</td>
                                <td className="px-3 py-1.5">{formatDateDisplay(row.date)}</td>
                                <td className="px-3 py-1.5 text-right">{formatMoney(row.interest, cur, { decimals: 0 })}</td>
                                <td className="px-3 py-1.5 text-right">{formatMoney(row.principal, cur, { decimals: 0 })}</td>
                                <td className="px-3 py-1.5 text-right font-medium">{formatMoney(row.balance, cur, { decimals: 0 })}</td>
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
            draftEmi,
            () => setAdding(false),
            submitAdd,
            "Add"
          )}
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={startAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add loan
        </Button>
      )}
    </Card>
  );
}
