import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, CalendarIcon } from "lucide-react";
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
  SavingItem,
  LoanItem,
  uid,
} from "@/lib/portfolio";

type AnyItem = SavingItem | LoanItem;

interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "date";
  placeholder?: string;
  optional?: boolean;
}

interface Props<T extends AnyItem> {
  title: string;
  description: string;
  items: T[];
  fields: Field[];
  totalKey: keyof T & string;
  totalLabel: string;
  emptyValues: () => Omit<T, "id" | "createdAt">;
  onChange: (next: T[]) => void;
  accent?: "emerald" | "sky" | "rose";
}

const accentMap = {
  emerald: "text-emerald-500",
  sky: "text-sky-500",
  rose: "text-rose-500",
};

const getCur = (it: AnyItem): Currency => (it.currency as Currency) ?? "USD";

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

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}

function DateField({ label, value, onChange, optional }: DateFieldProps) {
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
          {date ? format(date, "PPP") : <span>{label}{optional ? " (optional)" : ""}</span>}
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

export function PortfolioSection<T extends AnyItem>({
  title,
  description,
  items,
  fields,
  totalKey,
  totalLabel,
  emptyValues,
  onChange,
  accent = "emerald",
}: Props<T>) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftCurrency, setDraftCurrency] = useState<Currency>(() => getLastCurrency());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [editCurrency, setEditCurrency] = useState<Currency>("USD");

  // Per-currency totals
  const totalsByCur: Partial<Record<Currency, number>> = {};
  for (const it of items) {
    const c = getCur(it);
    const v = Number((it as any)[totalKey]) || 0;
    totalsByCur[c] = (totalsByCur[c] || 0) + v;
  }
  const activeCurrencies = CURRENCIES.filter((c) => totalsByCur[c] !== undefined);

  const startAdd = () => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      init[f.key] = f.type === "date" ? todayISO() : "";
    });
    setDraft(init);
    setDraftCurrency(getLastCurrency());
    setAdding(true);
  };

  const submitAdd = () => {
    const base = emptyValues() as any;
    fields.forEach((f) => {
      const v = draft[f.key]?.trim() ?? "";
      if (f.type === "number") base[f.key] = v === "" ? 0 : Number(v);
      else base[f.key] = v;
    });
    if (!base.name) return;
    const newItem = {
      ...base,
      currency: draftCurrency,
      id: uid(),
      createdAt: new Date().toISOString(),
    } as T;
    onChange([newItem, ...items]);
    setLastCurrency(draftCurrency);
    setAdding(false);
    setDraft({});
  };

  const startEdit = (it: T) => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      const v = (it as any)[f.key];
      init[f.key] = v === undefined || v === null ? "" : String(v);
    });
    setEditDraft(init);
    setEditCurrency(getCur(it));
    setEditingId(it.id);
  };

  const submitEdit = () => {
    onChange(
      items.map((it) => {
        if (it.id !== editingId) return it;
        const next = { ...it } as any;
        fields.forEach((f) => {
          const v = editDraft[f.key]?.trim() ?? "";
          if (f.type === "number") next[f.key] = v === "" ? 0 : Number(v);
          else next[f.key] = v;
        });
        next.currency = editCurrency;
        return next as T;
      })
    );
    setEditingId(null);
  };

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {totalLabel}
          </div>
          {activeCurrencies.length === 0 ? (
            <div className={`font-display text-2xl font-semibold ${accentMap[accent]}`}>
              {formatMoney(0, "USD", { decimals: 0 })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {activeCurrencies.map((c) => (
                <div
                  key={c}
                  className={`font-display text-xl font-semibold ${accentMap[accent]}`}
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
          No entries yet. Add your first one below.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it) => {
          const isEditing = editingId === it.id;
          const cur = getCur(it);
          return (
            <li
              key={it.id}
              className="rounded-lg border bg-card/50 px-3 py-2.5"
            >
              {isEditing ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <Select
                    value={editCurrency}
                    onValueChange={(v) => setEditCurrency(v as Currency)}
                  >
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
                  {fields.map((f) =>
                    f.type === "date" ? (
                      <DateField
                        key={f.key}
                        label={f.label}
                        optional={f.optional}
                        value={editDraft[f.key] ?? ""}
                        onChange={(v) =>
                          setEditDraft((d) => ({ ...d, [f.key]: v }))
                        }
                      />
                    ) : (
                      <Input
                        key={f.key}
                        type={f.type === "number" ? "number" : "text"}
                        placeholder={f.label}
                        value={editDraft[f.key] ?? ""}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                      />
                    )
                  )}
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={submitEdit}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate flex items-center gap-2">
                      <span className="truncate">{(it as any).name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                        {cur}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fields
                        .filter((f) => f.key !== "name" && f.key !== totalKey)
                        .map((f) => {
                          const v = (it as any)[f.key];
                          if (v === undefined || v === null || v === "") return null;
                          const display = f.type === "date" ? formatDateDisplay(v) : v;
                          if (!display) return null;
                          return `${f.label}: ${display}`;
                        })
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${accentMap[accent]}`}>
                      {formatMoney(Number((it as any)[totalKey]) || 0, cur, { decimals: 0 })}
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
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <Select
            value={draftCurrency}
            onValueChange={(v) => setDraftCurrency(v as Currency)}
          >
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
          {fields.map((f) =>
            f.type === "date" ? (
              <DateField
                key={f.key}
                label={f.label}
                optional={f.optional}
                value={draft[f.key] ?? ""}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
              />
            ) : (
              <Input
                key={f.key}
                type={f.type === "number" ? "number" : "text"}
                placeholder={f.label + (f.optional ? " (optional)" : "")}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            )
          )}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitAdd}>
              <Check className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={startAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add entry
        </Button>
      )}
    </Card>
  );
}
