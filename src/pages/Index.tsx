import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, FileJson, FolderOpen, X, Download, Upload, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddTransaction } from "@/components/budget/AddTransaction";
import { StatusBadge } from "@/components/budget/StatusBadge";
import { SummaryCards } from "@/components/budget/SummaryCards";
import { CategoryBreakdown } from "@/components/budget/CategoryBreakdown";
import { TransactionList } from "@/components/budget/TransactionList";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { Transaction, loadTx, saveTx, Currency, CURRENCIES, getCurrency } from "@/lib/budget";
import {
  Portfolio,
  emptyPortfolio,
  loadPortfolio,
  savePortfolio,
} from "@/lib/portfolio";
import { fileStore, AnyFileHandle } from "@/lib/fileStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "local";

// Shape stored in the linked JSON file. We keep backwards compatibility
// with files that contain just an array of transactions.
interface FilePayload {
  version: 2;
  transactions: Transaction[];
  portfolio: Portfolio;
}

function normalizePayload(data: unknown): { transactions: Transaction[]; portfolio: Portfolio } {
  if (Array.isArray(data)) {
    return { transactions: data as Transaction[], portfolio: emptyPortfolio() };
  }
  if (data && typeof data === "object") {
    const d = data as Partial<FilePayload>;
    return {
      transactions: Array.isArray(d.transactions) ? d.transactions : [],
      portfolio: {
        savings: Array.isArray(d.portfolio?.savings) ? d.portfolio!.savings : [],
        loans: Array.isArray(d.portfolio?.loans) ? d.portfolio!.loans : [],
        goldLoans: Array.isArray(d.portfolio?.goldLoans) ? d.portfolio!.goldLoans : [],
      },
    };
  }
  return { transactions: [], portfolio: emptyPortfolio() };
}

const Index = () => {
  const [tx, setTx] = useState<Transaction[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>(emptyPortfolio());
  const [handle, setHandle] = useState<AnyFileHandle | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("local");
  const supported = fileStore.isSupported();
  const saveTimer = useRef<number | null>(null);

  // Initial load: try linked file first, fall back to localStorage.
  useEffect(() => {
    (async () => {
      if (supported) {
        const saved = await fileStore.getSavedHandle();
        if (saved) {
          setHandle(saved);
          try {
            const ok = await fileStore.ensurePermission(saved, "readwrite");
            if (ok) {
              const data = await fileStore.readJSON<unknown>(saved);
              const norm = normalizePayload(data);
              setTx(norm.transactions);
              setPortfolio(norm.portfolio);
              setHydrated(true);
              return;
            }
          } catch {
            /* fall back below */
          }
        }
      }
      setTx(loadTx());
      setPortfolio(loadPortfolio());
      setHydrated(true);
    })();
  }, [supported]);

  // Auto-save: write to file (debounced) and mirror to localStorage.
  useEffect(() => {
    if (!hydrated) return;
    saveTx(tx);
    savePortfolio(portfolio);
    if (!handle) {
      setStatus("local");
      return;
    }
    setStatus("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const ok = await fileStore.ensurePermission(handle, "readwrite");
        if (!ok) {
          setStatus("error");
          return;
        }
        const payload: FilePayload = { version: 2, transactions: tx, portfolio };
        await fileStore.writeJSON(handle, payload);
        setStatus("saved");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    }, 300);
  }, [tx, portfolio, handle, hydrated]);

  const totalsByCurrency = useMemo(() => {
    const base: Record<Currency, { income: number; expense: number; balance: number }> = {
      USD: { income: 0, expense: 0, balance: 0 },
      INR: { income: 0, expense: 0, balance: 0 },
    };
    for (const t of tx) {
      const c = getCurrency(t);
      if (t.type === "income") base[c].income += t.amount;
      else base[c].expense += t.amount;
    }
    for (const c of CURRENCIES) base[c].balance = base[c].income - base[c].expense;
    return base;
  }, [tx]);

  const linkNewFile = async () => {
    try {
      const h = await fileStore.pickNew("my-money.json");
      if (!h) return;
      setHandle(h);
      const payload: FilePayload = { version: 2, transactions: tx, portfolio };
      await fileStore.writeJSON(h, payload);
      toast.success("Linked. Changes will auto-save to this file.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Could not link file");
    }
  };

  const linkExistingFile = async () => {
    try {
      const h = await fileStore.pickExisting();
      if (!h) return;
      const ok = await fileStore.ensurePermission(h, "readwrite");
      if (!ok) {
        toast.error("Permission denied");
        return;
      }
      const data = await fileStore.readJSON<unknown>(h);
      const norm = normalizePayload(data);
      setHandle(h);
      setTx(norm.transactions);
      setPortfolio(norm.portfolio);
      toast.success("Loaded from file. Auto-save is on.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Could not open file");
    }
  };

  const unlinkFile = async () => {
    await fileStore.forget();
    setHandle(null);
    toast.message("Unlinked. Falling back to browser storage.");
  };

  const exportJSON = () => {
    const payload: FilePayload = { version: 2, transactions: tx, portfolio };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-money.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded my-money.json");
  };

  const importInputRef = useRef<HTMLInputElement>(null);
  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const norm = normalizePayload(data);
      setTx(norm.transactions);
      setPortfolio(norm.portfolio);
      setStatus("saved");
      toast.success(`Loaded ${norm.transactions.length} transactions`);

      if (fileStore.isSupported()) {
        try {
          const h = await fileStore.pickNew(file.name || "my-money.json");
          if (h) {
            setHandle(h);
            const payload: FilePayload = {
              version: 2,
              transactions: norm.transactions,
              portfolio: norm.portfolio,
            };
            await fileStore.writeJSON(h, payload);
            toast.success(`Auto-saving to ${h.name}`);
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            toast.error("Could not link file for auto-save");
          }
        }
      }
    } catch {
      setStatus("error");
      toast.error("Could not read JSON file");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12">
        <header className="mb-6 md:mb-10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/30 text-[10px] md:text-xs font-medium uppercase tracking-widest">
              <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" /> Personal finance
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={status} hasHandle={!!handle} supported={supported} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Data options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {supported && handle ? (
                    <>
                      <DropdownMenuItem disabled className="opacity-100 focus:bg-transparent">
                        <FileJson className="h-4 w-4 mr-2" />
                        <span className="truncate">{handle.name}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={unlinkFile}>
                        <X className="h-4 w-4 mr-2" /> Unlink file
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      {supported && (
                        <>
                          <DropdownMenuItem onSelect={linkNewFile}>
                            <FileJson className="h-4 w-4 mr-2" /> Link new file
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={linkExistingFile}>
                            <FolderOpen className="h-4 w-4 mr-2" /> Open JSON
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Import
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={exportJSON}>
                        <Download className="h-4 w-4 mr-2" /> Export
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJSON(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-balance leading-[0.95]">
            My Money
          </h1>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <SummaryCards totals={totalsByCurrency} />

            <div className="grid gap-6 lg:grid-cols-2">
              <AddTransaction onAdd={(t) => setTx((prev) => [t, ...prev])} />
              <CategoryBreakdown transactions={tx} />
            </div>

            <TransactionList
              transactions={tx}
              onDelete={(id) => setTx((prev) => prev.filter((t) => t.id !== id))}
            />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioView
              portfolio={portfolio}
              onChange={setPortfolio}
            />
          </TabsContent>
        </Tabs>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          {handle
            ? `Auto-saving to ${handle.name} on your device.`
            : supported
            ? "Tip: link a JSON file to auto-save your data to your drive."
            : "Your browser doesn't support file linking — data stays in local storage."}
        </footer>
      </div>
    </main>
  );
};

export default Index;
