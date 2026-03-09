"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Target,
  Save,
  Loader2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ASSET_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AssetType {
  id: string;
  name: string;
  category: string;
}

interface AllocationTarget {
  id: string;
  assetTypeId: string;
  assetTypeName: string;
  assetTypeCategory: string;
  targetPercentage: number;
}

interface CurrentAllocation {
  assetTypeId: string;
  assetTypeName: string;
  assetTypeCategory: string;
  currentValue: number;
  currentPercentage: number;
}

interface TargetInput {
  assetTypeId: string;
  targetPercentage: number;
}

function getCategoryLabel(categoryValue: string): string {
  const cat = ASSET_CATEGORIES.find((c) => c.value === categoryValue);
  return cat ? cat.label : categoryValue;
}

function getDifferenceColor(diff: number): string {
  const absDiff = Math.abs(diff);
  if (absDiff <= 2) return "text-green-600 dark:text-green-400";
  if (absDiff <= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getDifferenceBadgeVariant(
  diff: number
): "default" | "secondary" | "destructive" | "outline" {
  const absDiff = Math.abs(diff);
  if (absDiff <= 2) return "secondary";
  if (absDiff <= 5) return "outline";
  return "destructive";
}

export default function AlocacaoPage() {
  const { activePortfolio } = usePortfolio();

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [targets, setTargets] = useState<AllocationTarget[]>([]);
  const [currentAllocations, setCurrentAllocations] = useState<
    CurrentAllocation[]
  >([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state: map of assetTypeId -> targetPercentage
  const [formTargets, setFormTargets] = useState<Record<string, number>>({});

  const fetchAssetTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/asset-types");
      if (!res.ok) throw new Error("Erro ao carregar tipos de ativo");
      const data = (await res.json()) as any;
      setAssetTypes(data.assetTypes || []);
    } catch {
      toast.error("Erro ao carregar tipos de ativo");
    }
  }, []);

  const fetchAllocations = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        portfolioId: activePortfolio.id,
      });
      const res = await fetch(`/api/allocation-targets?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar alocacao");
      const data = (await res.json()) as any;

      setTargets(data.targets || []);
      setCurrentAllocations(data.currentAllocations || []);
      setTotalPortfolioValue(data.totalPortfolioValue || 0);

      // Initialize form state from existing targets
      const targetMap: Record<string, number> = {};
      for (const t of data.targets || []) {
        targetMap[t.assetTypeId] = t.targetPercentage;
      }
      setFormTargets(targetMap);
    } catch {
      toast.error("Erro ao carregar metas de alocacao");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  useEffect(() => {
    fetchAssetTypes();
  }, [fetchAssetTypes]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  // Group asset types by category
  const groupedAssetTypes = useMemo(() => {
    const groups: Record<string, AssetType[]> = {};
    for (const cat of ASSET_CATEGORIES) {
      const typesInCategory = assetTypes.filter(
        (at) => at.category === cat.value
      );
      if (typesInCategory.length > 0) {
        groups[cat.value] = typesInCategory;
      }
    }
    return groups;
  }, [assetTypes]);

  // Calculate total target percentage from form
  const totalTarget = useMemo(() => {
    return Object.values(formTargets).reduce(
      (sum, val) => sum + (val || 0),
      0
    );
  }, [formTargets]);

  const isTotalValid = Math.abs(totalTarget - 100) <= 0.1;

  // Build current allocation lookup
  const currentAllocationMap = useMemo(() => {
    const map: Record<
      string,
      { currentValue: number; currentPercentage: number }
    > = {};
    for (const ca of currentAllocations) {
      map[ca.assetTypeId] = {
        currentValue: ca.currentValue,
        currentPercentage: ca.currentPercentage,
      };
    }
    return map;
  }, [currentAllocations]);

  // Build chart data
  const chartData = useMemo(() => {
    const data: Array<{
      name: string;
      meta: number;
      atual: number;
    }> = [];

    for (const at of assetTypes) {
      const target = formTargets[at.id] || 0;
      const current = currentAllocationMap[at.id]?.currentPercentage || 0;

      if (target > 0 || current > 0) {
        data.push({
          name: at.name,
          meta: Number(target.toFixed(2)),
          atual: Number(current.toFixed(2)),
        });
      }
    }

    return data;
  }, [assetTypes, formTargets, currentAllocationMap]);

  const handleTargetChange = (assetTypeId: string, value: string) => {
    const numValue = parseFloat(value);
    setFormTargets((prev) => ({
      ...prev,
      [assetTypeId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleSave = async () => {
    if (!activePortfolio) return;

    if (!isTotalValid) {
      toast.error(
        `A soma das metas deve ser 100%. Atual: ${formatNumber(totalTarget, 1)}%`
      );
      return;
    }

    // Build targets list (only those with percentage > 0)
    const targetList: TargetInput[] = Object.entries(formTargets)
      .filter(([, pct]) => pct > 0)
      .map(([assetTypeId, targetPercentage]) => ({
        assetTypeId,
        targetPercentage,
      }));

    setSaving(true);
    try {
      const res = await fetch("/api/allocation-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: activePortfolio.id,
          targets: targetList,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as any;
        throw new Error(errData.error || "Erro ao salvar metas");
      }

      const data = (await res.json()) as any;
      setTargets(data.targets || []);
      toast.success("Metas de alocacao salvas com sucesso");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar metas de alocacao");
    } finally {
      setSaving(false);
    }
  };

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Alocacao"
          description="Metas de alocacao por classe de ativo"
        />
        <div className="mt-6">
          <EmptyState
            icon={Target}
            title="Selecione uma carteira"
            description="Selecione uma carteira no menu superior para gerenciar suas metas de alocacao."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Alocacao"
          description="Metas de alocacao por classe de ativo"
        />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (assetTypes.length === 0) {
    return (
      <div>
        <PageHeader
          title="Alocacao"
          description="Metas de alocacao por classe de ativo"
        />
        <div className="mt-6">
          <EmptyState
            icon={Target}
            title="Nenhum tipo de ativo cadastrado"
            description="Cadastre tipos de ativos antes de configurar metas de alocacao."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Alocacao"
        description="Metas de alocacao por classe de ativo"
      >
        <Button onClick={handleSave} disabled={saving || !isTotalValid}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {saving ? "Salvando..." : "Salvar Metas"}
        </Button>
      </PageHeader>

      <div className="mt-6 space-y-8">
        {/* Target Configuration Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configuracao de Metas</CardTitle>
                <CardDescription>
                  Defina a porcentagem alvo para cada tipo de ativo
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isTotalValid && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    Total: {formatNumber(totalTarget, 1)}%
                  </Badge>
                )}
                {isTotalValid && (
                  <Badge variant="secondary">
                    Total: {formatNumber(totalTarget, 1)}%
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Ativo</TableHead>
                  <TableHead className="w-[140px] text-right">
                    Meta (%)
                  </TableHead>
                  <TableHead className="w-[120px] text-right">
                    Atual (%)
                  </TableHead>
                  <TableHead className="w-[120px] text-right">
                    Diferenca
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ASSET_CATEGORIES.map((cat) => {
                  const typesInCategory = groupedAssetTypes[cat.value];
                  if (!typesInCategory || typesInCategory.length === 0)
                    return null;

                  return (
                    <CategoryGroup
                      key={cat.value}
                      categoryLabel={cat.label}
                      assetTypes={typesInCategory}
                      formTargets={formTargets}
                      currentAllocationMap={currentAllocationMap}
                      onTargetChange={handleTargetChange}
                    />
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold",
                      !isTotalValid && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatNumber(totalTarget, 1)}%
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    100,0%
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Chart Section */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-5" />
                Comparacao Visual
              </CardTitle>
              <CardDescription>
                Comparacao entre metas e alocacao atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, "auto"]}
                      tickFormatter={(val: number) => `${val}%`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${formatNumber(value, 2)}%`,
                        name === "meta" ? "Meta" : "Atual",
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === "meta" ? "Meta" : "Atual"
                      }
                    />
                    <Bar
                      dataKey="meta"
                      fill="#22c55e"
                      name="meta"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="atual"
                      fill="#3b82f6"
                      name="atual"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Table */}
        {(targets.length > 0 || currentAllocations.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Tabela Comparativa</CardTitle>
              <CardDescription>
                Detalhamento de metas versus alocacao atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Ativo</TableHead>
                    <TableHead className="text-right">Meta (%)</TableHead>
                    <TableHead className="text-right">Atual (%)</TableHead>
                    <TableHead className="text-right">Diferenca (%)</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getComparisonRows().map((row) => (
                    <TableRow key={row.assetTypeId}>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {row.assetTypeName}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {getCategoryLabel(row.assetTypeCategory)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.targetPercentage, 1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.currentPercentage, 1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getDifferenceBadgeVariant(row.diff)}>
                          <span className={getDifferenceColor(row.diff)}>
                            {row.diff > 0 ? "+" : ""}
                            {formatNumber(row.diff, 1)}%
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.currentValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {totalPortfolioValue > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatNumber(totalTarget, 1)}%
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        100,0%
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totalPortfolioValue)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  function getComparisonRows() {
    // Merge targets and current allocations
    const assetTypeIds = new Set<string>();
    const rows: Array<{
      assetTypeId: string;
      assetTypeName: string;
      assetTypeCategory: string;
      targetPercentage: number;
      currentPercentage: number;
      currentValue: number;
      diff: number;
    }> = [];

    // Add from targets
    for (const t of targets) {
      assetTypeIds.add(t.assetTypeId);
      const current = currentAllocationMap[t.assetTypeId];
      const currentPct = current?.currentPercentage || 0;
      const currentVal = current?.currentValue || 0;
      rows.push({
        assetTypeId: t.assetTypeId,
        assetTypeName: t.assetTypeName,
        assetTypeCategory: t.assetTypeCategory,
        targetPercentage: t.targetPercentage,
        currentPercentage: currentPct,
        currentValue: currentVal,
        diff: currentPct - t.targetPercentage,
      });
    }

    // Add current allocations not in targets
    for (const ca of currentAllocations) {
      if (!assetTypeIds.has(ca.assetTypeId)) {
        rows.push({
          assetTypeId: ca.assetTypeId,
          assetTypeName: ca.assetTypeName,
          assetTypeCategory: ca.assetTypeCategory,
          targetPercentage: 0,
          currentPercentage: ca.currentPercentage,
          currentValue: ca.currentValue,
          diff: ca.currentPercentage,
        });
      }
    }

    return rows;
  }
}

function CategoryGroup({
  categoryLabel,
  assetTypes,
  formTargets,
  currentAllocationMap,
  onTargetChange,
}: {
  categoryLabel: string;
  assetTypes: AssetType[];
  formTargets: Record<string, number>;
  currentAllocationMap: Record<
    string,
    { currentValue: number; currentPercentage: number }
  >;
  onTargetChange: (assetTypeId: string, value: string) => void;
}) {
  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell
          colSpan={4}
          className="font-semibold text-sm text-muted-foreground"
        >
          {categoryLabel}
        </TableCell>
      </TableRow>
      {assetTypes.map((at) => {
        const targetPct = formTargets[at.id] || 0;
        const currentPct =
          currentAllocationMap[at.id]?.currentPercentage || 0;
        const diff = currentPct - targetPct;

        return (
          <TableRow key={at.id}>
            <TableCell className="pl-6">{at.name}</TableCell>
            <TableCell className="text-right">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={targetPct || ""}
                onChange={(e) => onTargetChange(at.id, e.target.value)}
                className="ml-auto w-[100px] text-right"
                placeholder="0,0"
              />
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(currentPct, 1)}%
            </TableCell>
            <TableCell className="text-right">
              {targetPct > 0 || currentPct > 0 ? (
                <span className={getDifferenceColor(diff)}>
                  {diff > 0 ? "+" : ""}
                  {formatNumber(diff, 1)}%
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
