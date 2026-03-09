"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ArrowRightLeft, CalendarIcon } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { OPERATION_TYPES } from "@/lib/constants";

interface OperationRow {
  id: string;
  portfolioId: string;
  assetId: string;
  type: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fees: number;
  brokerFrom: string | null;
  brokerTo: string | null;
  splitFactor: number | null;
  notes: string | null;
  assetName: string;
  assetTicker: string | null;
}

function getOperationLabel(type: string): string {
  const found = OPERATION_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

function getOperationBadgeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "compra":
    case "aporte":
      return "default";
    case "venda":
    case "resgate":
      return "destructive";
    case "dividendo":
    case "jcp":
    case "rendimento":
    case "bonificacao":
      return "secondary";
    default:
      return "outline";
  }
}

export default function OperacoesPage() {
  const router = useRouter();
  const { activePortfolio } = usePortfolio();
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchOperations = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        portfolioId: activePortfolio.id,
      });

      if (filterType && filterType !== "all") {
        params.set("type", filterType);
      }
      if (filterFrom) {
        params.set("from", filterFrom);
      }
      if (filterTo) {
        params.set("to", filterTo);
      }

      const res = await fetch(`/api/operations?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar operacoes");
      const data = (await res.json()) as any;
      setOperations(data.operations || []);
    } catch {
      toast.error("Erro ao carregar operacoes");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio, filterType, filterFrom, filterTo]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Operacoes"
          description="Historico de operacoes"
        />
        <div className="mt-6">
          <EmptyState
            icon={ArrowRightLeft}
            title="Selecione uma carteira"
            description="Selecione uma carteira no menu superior para visualizar as operacoes."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Operacoes"
          description="Historico de operacoes"
        >
          <Button disabled>
            <Plus className="mr-2 size-4" />
            Nova Operacao
          </Button>
        </PageHeader>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Operacoes" description="Historico de operacoes">
        <Button onClick={() => router.push("/operacoes/nova")}>
          <Plus className="mr-2 size-4" />
          Nova Operacao
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Tipo de Operacao
          </Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {OPERATION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ate</Label>
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
        {(filterType !== "all" || filterFrom || filterTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType("all");
              setFilterFrom("");
              setFilterTo("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {operations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={ArrowRightLeft}
            title="Nenhuma operacao encontrada"
            description="Registre sua primeira operacao para comecar a acompanhar seus investimentos."
            action={
              <Button onClick={() => router.push("/operacoes/nova")}>
                <Plus className="mr-2 size-4" />
                Nova Operacao
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preco Unitario</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Taxas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>{formatDate(op.date)}</TableCell>
                  <TableCell>
                    <Badge variant={getOperationBadgeVariant(op.type)}>
                      {getOperationLabel(op.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {op.assetTicker || op.assetName}
                      </span>
                      {op.assetTicker && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {op.assetName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(op.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(op.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(op.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {op.fees > 0 ? formatCurrency(op.fees) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
