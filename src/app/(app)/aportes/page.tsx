"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CurrencyInput } from "@/components/common/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatters";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface ContributionSource {
  id: string;
  name: string;
}

// yearMonth format: "2026-01", "2026-02", etc.
interface ForecastEntry {
  sourceId: string;
  yearMonth: string;
  amount: number; // centavos
}

export default function AportesPage() {
  const { activePortfolio } = usePortfolio();
  const [sources, setSources] = useState<ContributionSource[]>([]);
  const [forecasts, setForecasts] = useState<ForecastEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [addingSource, setAddingSource] = useState(false);

  // Debounce timers
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  const fetchData = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        portfolioId: activePortfolio.id,
        year: String(year),
      });
      const res = await fetch(`/api/contributions?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar aportes");
      const data = (await res.json()) as any;
      setSources(data.sources || []);
      setForecasts(data.forecasts || []);
    } catch {
      toast.error("Erro ao carregar aportes");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const handleAddSource = async () => {
    if (!activePortfolio || !newSourceName.trim()) return;

    setAddingSource(true);
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: activePortfolio.id,
          name: newSourceName.trim(),
        }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar fonte");
      const data = (await res.json()) as any;
      setSources((prev) => [...prev, data.source]);
      setNewSourceName("");
      setDialogOpen(false);
      toast.success("Fonte adicionada com sucesso");
    } catch {
      toast.error("Erro ao adicionar fonte de aporte");
    } finally {
      setAddingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/contributions/${sourceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao remover fonte");
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      setForecasts((prev) => prev.filter((f) => f.sourceId !== sourceId));
      toast.success("Fonte removida com sucesso");
    } catch {
      toast.error("Erro ao remover fonte de aporte");
    }
  };

  const getForecastAmount = (sourceId: string, month: number): number => {
    const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
    const entry = forecasts.find(
      (f) => f.sourceId === sourceId && f.yearMonth === yearMonth
    );
    return entry?.amount ?? 0;
  };

  const handleForecastChange = (
    sourceId: string,
    month: number,
    amount: number
  ) => {
    const yearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
    const key = `${sourceId}-${yearMonth}`;

    // Update local state immediately
    setForecasts((prev) => {
      const idx = prev.findIndex(
        (f) => f.sourceId === sourceId && f.yearMonth === yearMonth
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], amount };
        return updated;
      }
      return [...prev, { sourceId, yearMonth, amount }];
    });

    // Debounce the API call
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(async () => {
      try {
        const res = await fetch("/api/contributions/forecasts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, yearMonth, amount }),
        });
        if (!res.ok) throw new Error("Erro ao salvar previsao");
      } catch {
        toast.error("Erro ao salvar previsao de aporte");
      }
      delete debounceTimers.current[key];
    }, 800);
  };

  const getMonthTotal = (month: number): number => {
    return sources.reduce((sum, src) => sum + getForecastAmount(src.id, month), 0);
  };

  const getSourceAnnualTotal = (sourceId: string): number => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      total += getForecastAmount(sourceId, m);
    }
    return total;
  };

  const getGrandTotal = (): number => {
    return sources.reduce((sum, src) => sum + getSourceAnnualTotal(src.id), 0);
  };

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Aportes"
          description="Previsao de aportes mensais"
        />
        <div className="mt-6">
          <EmptyState
            icon={DollarSign}
            title="Selecione uma carteira"
            description="Selecione uma carteira no menu superior para gerenciar seus aportes."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Aportes"
          description="Previsao de aportes mensais"
        />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Aportes" description="Previsao de aportes mensais">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Adicionar Fonte
        </Button>
      </PageHeader>

      {/* Add Source Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Fonte de Aporte</DialogTitle>
            <DialogDescription>
              Adicione uma nova fonte de aporte mensal (ex: Salario, Freelance,
              Bonus).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="source-name">Nome da fonte</Label>
            <Input
              id="source-name"
              placeholder="Ex: Salario"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSource();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setNewSourceName("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={!newSourceName.trim() || addingSource}
            >
              {addingSource ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sources List */}
      {sources.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Fontes de Aporte
          </h3>
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"
              >
                <span>{source.name}</span>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={DollarSign}
            title="Nenhuma fonte de aporte"
            description="Adicione fontes de aporte para comecar a planejar suas contribuicoes mensais."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Adicionar Fonte
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Year Selector */}
          <div className="mt-6 flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[60px] text-center text-lg font-semibold">
              {year}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Forecast Grid */}
          <div className="mt-4 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background min-w-[100px]">
                    Mes
                  </TableHead>
                  {sources.map((source) => (
                    <TableHead
                      key={source.id}
                      className="min-w-[160px] text-center"
                    >
                      {source.name}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[120px] text-right font-semibold">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTH_NAMES.map((monthName, monthIdx) => (
                  <TableRow key={monthIdx}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium">
                      {monthName}
                    </TableCell>
                    {sources.map((source) => (
                      <TableCell key={source.id} className="p-1">
                        <CurrencyInput
                          value={getForecastAmount(source.id, monthIdx)}
                          onChange={(centavos) =>
                            handleForecastChange(source.id, monthIdx, centavos)
                          }
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getMonthTotal(monthIdx))}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Annual Total Row */}
                <TableRow className="border-t-2 bg-muted/50 font-semibold">
                  <TableCell className="sticky left-0 z-10 bg-muted/50 font-semibold">
                    Total Anual
                  </TableCell>
                  {sources.map((source) => (
                    <TableCell
                      key={source.id}
                      className="text-center font-semibold"
                    >
                      {formatCurrency(getSourceAnnualTotal(source.id))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold">
                    {formatCurrency(getGrandTotal())}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
