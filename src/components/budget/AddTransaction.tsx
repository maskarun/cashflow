import { useState } from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  TxType,
  Currency,
  CURRENCIES,
  getLastCurrency,
  setLastCurrency,
} from "@/lib/budget";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0").max(10_000_000_000),
  category: z.string().min(1).max(40),
  note: z.string().trim().max(120).optional(),
  currency: z.enum(["USD", "INR"]),
});

interface Props {
  onAdd: (tx: Transaction) => void;
}

export const AddTransaction = ({ onAdd }: Props) => {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState<Currency>(() => getLastCurrency());

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      type,
      amount: Number(amount),
      category,
      note: note || undefined,
      currency,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
      currency: parsed.data.currency,
      date: new Date().toISOString(),
    });
    setLastCurrency(parsed.data.currency);
    setAmount("");
    setNote("");
    toast.success(`${type === "income" ? "Income" : "Expense"} added`);
  };

  return (
    <form onSubmit={submit} className="bg-card rounded-3xl p-6 md:p-8 shadow-soft space-y-5">
      <div>
        <h3 className="font-display text-2xl font-semibold">New entry</h3>
        <p className="text-sm text-muted-foreground mt-1">Log a transaction in seconds.</p>
      </div>

      <div className="inline-flex p-1 bg-secondary rounded-full">
        {(["expense", "income"] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setCategory(t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
            }}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
              type === t
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg h-12 rounded-xl"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          maxLength={120}
          placeholder="e.g. Lunch with team"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-12 rounded-xl"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base shadow-accent"
      >
        <Plus className="h-5 w-5 mr-1" /> Add transaction
      </Button>
    </form>
  );
};
