"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  Target,
  Shield,
  Calendar,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
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
import { Button } from "@/components/ui/button";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercentValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// --- Types ---

interface EquityByCategory {
  category: string;
  categoryKey: string;
  value: number;
  percentage: number;
}

interface TopAsset {
  id: string;
  name: string;
  ticker: string | null;
  assetTypeName: string;
  totalValue: number;
  profitLoss: number;
  profitLossPct: number;
}

interface UpcomingMaturity {
  id: string;
  name: string;
  ticker: string | null;
  maturityDate: string;
  totalValue: number;
}

interface ProjectSummaryItem {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  targetDate: string | null;
  isRetirement: boolean;
}

interface ProjectsSummary {
  totalProjects: number;
  activeProjects: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  projects: ProjectSummaryItem[];
}

interface EmergencyReserveSummary {
  targetAmount: number;
  currentAmount: number;
  progress: number;
}

interface AllocationComparisonItem {
  assetTypeName: string;
  targetPct: number;
  currentPct: number;
  difference: number;
}

interface MonthlyContributions {
  totalForecasted: number;
  sources: Array<{ name: string; amount: number }>;
}

interface RecentOperation {
  id: string;
  assetName: string;
  type: string;
  date: string;
  totalAmount: number;
}

interface DashboardData {
  totalEquity: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  equityByCategory: EquityByCategory[];
  topAssets: TopAsset[];
  upcomingMaturities: UpcomingMaturity[];
  projectsSummary: ProjectsSummary;
  emergencyReserve: EmergencyReserveSummary | null;
  allocationComparison: AllocationComparisonItem[];
  monthlyContributions: MonthlyContributions;
  unallocatedCash: number;
  recentOperations: RecentOperation[];
}

// --- Helpers ---

const CATEGORY_COLORS: Record<string, string> = {
  renda_variavel: "#3b82f6",
  renda_fixa: "#10b981",
  fundos: "#f59e0b",
  cripto: "#8b5cf6",
  moeda: "#06b6d4",
  saldo: "#6b7280",
};

function getOperationLabel(type: string): string {
  const types: Record<string, string> = {
    compra: "Compra",
    venda: "Venda",
    dividendo: "Dividendo",
    jcp: "JCP",
    rendimento: "Rendimento",
    desdobramento: "Desdobramento",
    grupamento: "Grupamento",
    bonificacao: "Bonificacao",
    amortizacao: "Amortizacao",
    aporte: "Aporte",
    resgate: "Resgate",
    transferencia: "Transferencia",
    conversao_cambial: "Conversao Cambial",
  };
  return types[type] || type;
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

// --- Component ---

export default function DashboardPage() {
  const router = useRouter();
  const { activePortfolio } = usePortfolio();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard?portfolioId=${activePortfolio.id}`
      );
      if (!res.ok) throw new Error("Erro ao carregar dashboard");
      const json = (await res.json()) as any;
      setData(json);
    } catch {
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // --- No portfolio selected ---
  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visao geral dos seus investimentos"
        />
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Wallet className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            Selecione uma carteira
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione uma carteira no menu superior para visualizar o dashboard.
          </p>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visao geral dos seus investimentos"
        />
        <div className="mt-6 space-y-6">
          {/* Summary cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          {/* Charts skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          {/* Projects / Reserve skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          {/* Tables skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          {/* Bottom skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Visao geral dos seus investimentos"
        />
        <div className="mt-6 text-center text-muted-foreground">
          Nao foi possivel carregar os dados do dashboard.
        </div>
      </div>
    );
  }

  // --- Derived values ---
  const profitIsPositive = data.totalProfitLoss >= 0;

  const pieChartData = data.equityByCategory.map((item) => ({
    name: item.category,
    value: item.value / 100,
    percentage: item.percentage,
    fill: CATEGORY_COLORS[item.categoryKey] || "#94a3b8",
  }));

  const allocationChartData = data.allocationComparison.map((item) => ({
    name: item.assetTypeName,
    meta: item.targetPct,
    atual: item.currentPct,
  }));

  // --- Render ---
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visao geral dos seus investimentos"
      />

      <div className="mt-6 space-y-6">
        {/* ================================================================ */}
        {/* Row 1 - Summary Cards                                            */}
        {/* ================================================================ */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 1. Patrimonio Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Patrimonio Total
              </CardTitle>
              <DollarSign className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.totalEquity)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {profitIsPositive ? (
                  <TrendingUp className="size-3 text-green-600" />
                ) : (
                  <TrendingDown className="size-3 text-red-600" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    profitIsPositive
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {profitIsPositive ? "+" : ""}
                  {formatPercentValue(data.totalProfitLossPct)}
                </span>
                <span className="text-muted-foreground">vs investido</span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Total Investido */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Investido
              </CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.totalInvested)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Capital total aplicado
              </p>
            </CardContent>
          </Card>

          {/* 3. Lucro/Prejuizo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Lucro / Prejuizo
              </CardTitle>
              {profitIsPositive ? (
                <TrendingUp className="size-4 text-green-600" />
              ) : (
                <TrendingDown className="size-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  profitIsPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {profitIsPositive ? "+" : ""}
                {formatCurrency(data.totalProfitLoss)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {profitIsPositive ? "+" : ""}
                {formatPercentValue(data.totalProfitLossPct)} de retorno
              </p>
            </CardContent>
          </Card>

          {/* 4. Dinheiro Nao Alocado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dinheiro Nao Alocado
              </CardTitle>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.unallocatedCash)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Disponivel para investir
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================ */}
        {/* Row 2 - Charts                                                   */}
        {/* ================================================================ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 5. Patrimonio por Classe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="size-5" />
                Patrimonio por Classe
              </CardTitle>
              <CardDescription>
                Distribuicao do patrimonio por categoria de ativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pieChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponivel
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value * 100),
                          "Valor",
                        ]}
                        labelFormatter={(label: string) => label}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) => (
                          <span className="text-xs">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Alocacao Atual vs Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                Alocacao Atual vs Meta
              </CardTitle>
              <CardDescription>
                Comparacao entre metas e alocacao atual (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allocationChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  Nenhuma meta de alocacao configurada
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={allocationChartData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(val: number) => `${val}%`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(1)}%`,
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
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="atual"
                        fill="#3b82f6"
                        name="atual"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ================================================================ */}
        {/* Row 3 - Projects and Emergency Reserve                           */}
        {/* ================================================================ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 7. Status dos Projetos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5" />
                    Status dos Projetos
                  </CardTitle>
                  <CardDescription>
                    {data.projectsSummary.activeProjects} projeto
                    {data.projectsSummary.activeProjects !== 1 ? "s" : ""} ativo
                    {data.projectsSummary.activeProjects !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/projetos")}
                >
                  Ver todos
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.projectsSummary.projects.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Nenhum projeto cadastrado
                </div>
              ) : (
                <div className="space-y-4">
                  {data.projectsSummary.projects.map((project) => (
                    <div
                      key={project.id}
                      className="cursor-pointer space-y-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/projetos/${project.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {project.name}
                          </span>
                          {project.isRetirement && (
                            <Badge variant="outline" className="text-xs">
                              Aposentadoria
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-semibold">
                          {project.progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            project.progress >= 100
                              ? "bg-green-600"
                              : project.progress >= 50
                                ? "bg-blue-600"
                                : "bg-primary"
                          )}
                          style={{
                            width: `${Math.min(project.progress, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatCurrency(project.currentAmount)} /{" "}
                          {formatCurrency(project.targetAmount)}
                        </span>
                        {project.targetDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(project.targetDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 8. Reserva de Emergencia */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="size-5" />
                    Reserva de Emergencia
                  </CardTitle>
                  <CardDescription>
                    Progresso da sua reserva de seguranca
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/reserva")}
                >
                  Gerenciar
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.emergencyReserve === null ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="size-8 text-muted-foreground/50" />
                  <span>Nao configurada</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/reserva")}
                  >
                    Configurar Reserva
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">
                        {data.emergencyReserve.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          data.emergencyReserve.progress >= 100
                            ? "bg-green-500"
                            : data.emergencyReserve.progress >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                        )}
                        style={{
                          width: `${Math.min(data.emergencyReserve.progress, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Valor Atual
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(data.emergencyReserve.currentAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Valor Meta
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(data.emergencyReserve.targetAmount)}
                      </p>
                    </div>
                  </div>
                  {data.emergencyReserve.targetAmount >
                    data.emergencyReserve.currentAmount && (
                    <p className="text-xs text-muted-foreground">
                      Faltam{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          data.emergencyReserve.targetAmount -
                            data.emergencyReserve.currentAmount
                        )}
                      </span>{" "}
                      para atingir a meta
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ================================================================ */}
        {/* Row 4 - Tables                                                   */}
        {/* ================================================================ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 9. Top Ativos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5" />
                Top Ativos
              </CardTitle>
              <CardDescription>
                Maiores posicoes por valor de mercado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topAssets.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Nenhum ativo encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">L/P</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topAssets.map((asset) => (
                        <TableRow
                          key={asset.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/ativos/${asset.id}`)}
                        >
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {asset.ticker || asset.name}
                              </span>
                              {asset.ticker && (
                                <p className="text-xs text-muted-foreground">
                                  {asset.name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {asset.assetTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(asset.totalValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className={cn(
                                "text-sm font-medium",
                                asset.profitLoss >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {asset.profitLoss >= 0 ? "+" : ""}
                              {formatCurrency(asset.profitLoss)}
                            </div>
                            <div
                              className={cn(
                                "text-xs",
                                asset.profitLossPct >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {asset.profitLossPct >= 0 ? "+" : ""}
                              {formatPercentValue(asset.profitLossPct)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 10. Vencimentos Proximos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                Vencimentos Proximos
              </CardTitle>
              <CardDescription>
                Ativos com vencimento nos proximos meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.upcomingMaturities.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Nenhum vencimento proximo
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.upcomingMaturities.map((maturity) => (
                        <TableRow
                          key={maturity.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/ativos/${maturity.id}`)}
                        >
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {maturity.ticker || maturity.name}
                              </span>
                              {maturity.ticker && (
                                <p className="text-xs text-muted-foreground">
                                  {maturity.name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm">
                              <Calendar className="size-3 text-muted-foreground" />
                              {formatDate(maturity.maturityDate)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(maturity.totalValue)}
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

        {/* ================================================================ */}
        {/* Row 5 - Bottom                                                   */}
        {/* ================================================================ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 11. Aportes do Mes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="size-5" />
                    Aportes do Mes
                  </CardTitle>
                  <CardDescription>
                    Previsao de aportes para o mes atual
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/aportes")}
                >
                  Ver detalhes
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Previsto
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.monthlyContributions.totalForecasted)}
                  </p>
                </div>
                {data.monthlyContributions.sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Por fonte
                    </p>
                    {data.monthlyContributions.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <span className="text-sm">{source.name}</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(source.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {data.monthlyContributions.sources.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma fonte de aporte configurada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 12. Ultimas Operacoes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="size-5" />
                    Ultimas Operacoes
                  </CardTitle>
                  <CardDescription>
                    Operacoes mais recentes da carteira
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/operacoes")}
                >
                  Ver todas
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentOperations.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Nenhuma operacao registrada
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOperations.map((op) => (
                        <TableRow key={op.id}>
                          <TableCell className="text-sm font-medium">
                            {op.assetName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getOperationBadgeVariant(op.type)}
                              className="text-xs"
                            >
                              {getOperationLabel(op.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(op.date)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(op.totalAmount)}
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
      </div>
    </div>
  );
}
