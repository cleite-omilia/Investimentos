"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Plus,
  TrendingUp,
  TrendingDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditOperationDialog } from "@/components/operations/edit-operation-dialog";
import { DeleteOperationDialog } from "@/components/operations/delete-operation-dialog";
import { CurrencyInput } from "@/components/common/currency-input";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { OPERATION_TYPES } from "@/lib/constants";

interface AssetDetail {
  id: string;
  portfolioId: string;
  assetTypeId: string;
  ticker: string | null;
  name: string;
  broker: string | null;
  currency: string;
  maturityDate: string | null;
  indexer: string | null;
  indexerRate: number | null;
  isActive: number;
  currentValue: number | null;
  currentValueUpdatedAt: string | null;
  stopGainPrice: number | null;
  stopLossPrice: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assetTypeName: string;
  assetTypeCategory: string;
}

interface Position {
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
}

interface Operation {
  id: string;
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
}

function getOperationLabel(type: string): string {
  const found = OPERATION_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

export default function AtivoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingOperation, setEditingOperation] = useState<any>(null);
  const [deletingOperationId, setDeletingOperationId] = useState<string | null>(null);
  const [editingCurrentValue, setEditingCurrentValue] = useState(false);
  const [currentValueInput, setCurrentValueInput] = useState(0);
  const [savingCurrentValue, setSavingCurrentValue] = useState(false);

  const fetchAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${id}`);
      if (!res.ok) throw new Error("Erro ao carregar ativo");
      const data = (await res.json()) as { asset: any; position: any; operations: any[] };
      setAsset(data.asset);
      setPosition(data.position);
      setOperations(data.operations || []);
    } catch {
      toast.error("Erro ao carregar detalhes do ativo");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja desativar este ativo?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Ativo desativado com sucesso");
      router.push("/ativos");
    } catch {
      toast.error("Erro ao desativar ativo");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCurrentValue = async () => {
    setSavingCurrentValue(true);
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentValue: currentValueInput,
          currentValueUpdatedAt: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast.success("Valor atual atualizado!");
      setEditingCurrentValue(false);
      fetchAsset();
    } catch {
      toast.error("Erro ao atualizar valor atual");
    } finally {
      setSavingCurrentValue(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Carregando..." />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div>
        <PageHeader title="Ativo nao encontrado" />
        <div className="mt-6">
          <Button variant="outline" onClick={() => router.push("/ativos")}>
            <ArrowLeft className="mr-2 size-4" />
            Voltar para Ativos
          </Button>
        </div>
      </div>
    );
  }

  const profitLossIsPositive = (position?.profitLoss ?? 0) >= 0;

  return (
    <div>
      <PageHeader title={asset.name} description={asset.assetTypeName}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ativos")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Desativar
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 space-y-6">
        {/* Informacoes do Ativo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Informacoes</span>
              <Badge variant="secondary">{asset.assetTypeName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {asset.ticker && (
                <div>
                  <p className="text-sm text-muted-foreground">Ticker</p>
                  <p className="font-medium">{asset.ticker}</p>
                </div>
              )}
              {asset.broker && (
                <div>
                  <p className="text-sm text-muted-foreground">Corretora</p>
                  <p className="font-medium">{asset.broker}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Moeda</p>
                <p className="font-medium">{asset.currency}</p>
              </div>
              {asset.maturityDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
                  <p className="font-medium">
                    {formatDate(asset.maturityDate)}
                  </p>
                </div>
              )}
              {asset.indexer && (
                <div>
                  <p className="text-sm text-muted-foreground">Indexador</p>
                  <p className="font-medium">
                    {asset.indexer}
                    {asset.indexerRate != null && ` (${asset.indexerRate}%)`}
                  </p>
                </div>
              )}
              {asset.stopGainPrice != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Stop Gain</p>
                  <p className="font-medium">
                    R$ {formatNumber(asset.stopGainPrice)}
                  </p>
                </div>
              )}
              {asset.stopLossPrice != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Stop Loss</p>
                  <p className="font-medium">
                    R$ {formatNumber(asset.stopLossPrice)}
                  </p>
                </div>
              )}
            </div>
            {asset.notes && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Observacoes</p>
                <p className="mt-1 text-sm">{asset.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valor Atual de Mercado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Valor Atual de Mercado</span>
              {!editingCurrentValue && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentValueInput(
                      asset.currentValue ?? position?.currentValue ?? 0
                    );
                    setEditingCurrentValue(true);
                  }}
                >
                  Atualizar
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              {asset.currentValueUpdatedAt
                ? `Atualizado em ${formatDate(asset.currentValueUpdatedAt)}`
                : "Usando calculo baseado em operacoes"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingCurrentValue ? (
              <div className="flex items-center gap-2">
                <CurrencyInput
                  value={currentValueInput}
                  onChange={setCurrentValueInput}
                  disabled={savingCurrentValue}
                  className="max-w-[200px]"
                />
                <Button
                  size="sm"
                  onClick={handleSaveCurrentValue}
                  disabled={savingCurrentValue}
                >
                  {savingCurrentValue ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCurrentValue(false)}
                  disabled={savingCurrentValue}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-semibold">
                {formatCurrency(
                  asset.currentValue ?? position?.currentValue ?? 0
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Posicao */}
        {position && (
          <Card>
            <CardHeader>
              <CardTitle>Posicao</CardTitle>
              <CardDescription>
                Resumo calculado a partir das operacoes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(position.totalQuantity)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Preco Medio</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(position.averagePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Valor Investido
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(position.totalInvested)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Atual</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(position.currentValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Lucro/Prejuizo
                  </p>
                  <div className="flex items-center gap-1">
                    {profitLossIsPositive ? (
                      <TrendingUp className="size-4 text-green-600" />
                    ) : (
                      <TrendingDown className="size-4 text-red-600" />
                    )}
                    <p
                      className={cn(
                        "text-lg font-semibold",
                        profitLossIsPositive
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {formatCurrency(position.profitLoss)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historico de Operacoes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Historico de Operacoes</span>
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/operacoes/nova?assetId=${asset.id}`)
                }
              >
                <Plus className="mr-2 size-4" />
                Nova Operacao
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {operations.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Nenhuma operacao registrada"
                description="Registre a primeira operacao deste ativo."
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(`/operacoes/nova?assetId=${asset.id}`)
                    }
                  >
                    <Plus className="mr-2 size-4" />
                    Nova Operacao
                  </Button>
                }
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">
                        Preco Unitario
                      </TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Taxas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell>{formatDate(op.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getOperationLabel(op.type)}
                          </Badge>
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="size-8 p-0">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingOperation({ ...op, assetId: asset.id, assetName: asset.name })}>
                                <Pencil className="mr-2 size-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeletingOperationId(op.id)}>
                                <Trash2 className="mr-2 size-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditOperationDialog
        operation={editingOperation}
        open={!!editingOperation}
        onOpenChange={(open) => { if (!open) setEditingOperation(null); }}
        onSaved={() => { setEditingOperation(null); fetchAsset(); }}
      />
      <DeleteOperationDialog
        operationId={deletingOperationId}
        open={!!deletingOperationId}
        onOpenChange={(open) => { if (!open) setDeletingOperationId(null); }}
        onDeleted={() => { setDeletingOperationId(null); fetchAsset(); }}
      />
    </div>
  );
}

