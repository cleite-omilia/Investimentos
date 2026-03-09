"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Target,
  CalendarIcon,
  Ban,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CurrencyInput } from "@/components/common/currency-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/lib/formatters";
import { PROJECT_RECURRENCES } from "@/lib/constants";

interface ProjectDetail {
  id: string;
  portfolioId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  recurrence: string;
  recurrenceMonth: number | null;
  isRetirement: number;
  retirementMonthlyWithdrawal: number | null;
  retirementIpcaRate: number | null;
  priority: number;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Provision {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  source: string | null;
  notes: string | null;
  createdAt: string;
}

function getRecurrenceLabel(value: string): string {
  const found = PROJECT_RECURRENCES.find((r) => r.value === value);
  return found ? found.label : value;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white">
          Ativo
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
          Concluido
        </Badge>
      );
    case "cancelled":
      return <Badge variant="secondary">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const months = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Marco" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function getMonthLabel(month: number | null): string {
  if (month == null) return "-";
  const found = months.find((m) => parseInt(m.value) === month);
  return found ? found.label : String(month);
}

export default function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [provisions, setProvisions] = useState<Provision[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Provision dialog state
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [provisionDate, setProvisionDate] = useState<Date | undefined>(
    new Date()
  );
  const [provisionAmount, setProvisionAmount] = useState(0);
  const [provisionSource, setProvisionSource] = useState("");
  const [provisionLoading, setProvisionLoading] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTargetAmount, setEditTargetAmount] = useState(0);
  const [editTargetDate, setEditTargetDate] = useState<Date | undefined>();
  const [editRecurrence, setEditRecurrence] = useState("once");
  const [editRecurrenceMonth, setEditRecurrenceMonth] = useState("");
  const [editPriority, setEditPriority] = useState("1");
  const [editNotes, setEditNotes] = useState("");
  const [editRetirementMonthlyWithdrawal, setEditRetirementMonthlyWithdrawal] =
    useState(0);
  const [editRetirementIpcaRate, setEditRetirementIpcaRate] = useState("4.5");
  const [editLoading, setEditLoading] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Erro ao carregar projeto");
      const data = (await res.json()) as any;
      setProject(data.project || null);
      setProvisions(data.provisions || []);
    } catch {
      toast.error("Erro ao carregar detalhes do projeto");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const startEditing = () => {
    if (!project) return;
    setEditName(project.name);
    setEditTargetAmount(project.targetAmount);
    setEditTargetDate(
      project.targetDate ? new Date(project.targetDate) : undefined
    );
    setEditRecurrence(project.recurrence);
    setEditRecurrenceMonth(
      project.recurrenceMonth != null ? String(project.recurrenceMonth) : ""
    );
    setEditPriority(String(project.priority));
    setEditNotes(project.notes || "");
    setEditRetirementMonthlyWithdrawal(
      project.retirementMonthlyWithdrawal || 0
    );
    setEditRetirementIpcaRate(
      project.retirementIpcaRate != null
        ? String(project.retirementIpcaRate)
        : "4.5"
    );
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!project) return;
    if (!editName.trim()) {
      toast.error("Preencha o nome do projeto");
      return;
    }

    setEditLoading(true);
    try {
      const body: Record<string, any> = {
        name: editName.trim(),
        targetAmount: editTargetAmount,
        targetDate: editTargetDate
          ? editTargetDate.toISOString().split("T")[0]
          : null,
        recurrence: editRecurrence,
        recurrenceMonth:
          editRecurrence === "yearly" && editRecurrenceMonth
            ? parseInt(editRecurrenceMonth)
            : null,
        priority: parseInt(editPriority) || 1,
        notes: editNotes.trim() || null,
      };

      if (project.isRetirement) {
        body.retirementMonthlyWithdrawal = editRetirementMonthlyWithdrawal;
        body.retirementIpcaRate = editRetirementIpcaRate
          ? parseFloat(editRetirementIpcaRate)
          : 4.5;
      }

      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao atualizar projeto");
        return;
      }

      toast.success("Projeto atualizado com sucesso!");
      setEditing(false);
      fetchProject();
    } catch {
      toast.error("Erro ao atualizar projeto");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar este projeto?")) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) throw new Error("Erro ao cancelar");
      toast.success("Projeto cancelado");
      fetchProject();
    } catch {
      toast.error("Erro ao cancelar projeto");
    } finally {
      setCancelling(false);
    }
  };

  const handleAddProvision = async () => {
    if (!provisionDate) {
      toast.error("Selecione a data da provisao");
      return;
    }
    if (provisionAmount <= 0) {
      toast.error("Informe o valor da provisao");
      return;
    }

    setProvisionLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}/provisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: provisionDate.toISOString().split("T")[0],
          amount: provisionAmount,
          source: provisionSource.trim() || undefined,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao adicionar provisao");
        return;
      }

      toast.success("Provisao adicionada com sucesso!");
      setProvisionDialogOpen(false);
      setProvisionDate(new Date());
      setProvisionAmount(0);
      setProvisionSource("");
      fetchProject();
    } catch {
      toast.error("Erro ao adicionar provisao");
    } finally {
      setProvisionLoading(false);
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

  if (!project) {
    return (
      <div>
        <PageHeader title="Projeto nao encontrado" />
        <div className="mt-6">
          <Button variant="outline" onClick={() => router.push("/projetos")}>
            <ArrowLeft className="mr-2 size-4" />
            Voltar para Projetos
          </Button>
        </div>
      </div>
    );
  }

  const progress =
    project.targetAmount > 0
      ? Math.min((project.currentAmount / project.targetAmount) * 100, 100)
      : 0;

  return (
    <div>
      <PageHeader title={project.name} description="Detalhes do projeto">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/projetos")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Voltar
          </Button>
          {!editing && project.status === "active" && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="mr-2 size-4" />
              Editar
            </Button>
          )}
          {project.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Ban className="mr-2 size-4" />
              )}
              Cancelar Projeto
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="mt-6 space-y-6">
        {/* Progresso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Progresso</span>
              {getStatusBadge(project.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCurrency(project.currentAmount)} de{" "}
                  {project.targetAmount > 0
                    ? formatCurrency(project.targetAmount)
                    : "meta nao definida"}
                </span>
                <span className="font-semibold">
                  {project.targetAmount > 0 ? `${progress.toFixed(1)}%` : "-"}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    progress >= 100
                      ? "bg-green-600"
                      : progress >= 50
                        ? "bg-blue-600"
                        : "bg-primary"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Atual</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(project.currentAmount)}
                </p>
              </div>
              {project.targetAmount > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Meta</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(project.targetAmount)}
                  </p>
                </div>
              )}
              {project.targetAmount > 0 &&
                project.targetAmount > project.currentAmount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Faltam</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        project.targetAmount - project.currentAmount
                      )}
                    </p>
                  </div>
                )}
              {project.targetDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Data da Meta</p>
                  <p className="text-lg font-semibold">
                    {formatDate(project.targetDate)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informacoes do Projeto (view or edit mode) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Informacoes</span>
              {editing && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 size-4" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={editLoading}
                  >
                    <X className="mr-2 size-4" />
                    Cancelar
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Nome</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={editLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor da Meta</Label>
                  <CurrencyInput
                    value={editTargetAmount}
                    onChange={setEditTargetAmount}
                    disabled={editLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data da Meta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editTargetDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {editTargetDate
                          ? formatDate(editTargetDate.toISOString())
                          : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editTargetDate}
                        onSelect={setEditTargetDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Recorrencia</Label>
                  <Select
                    value={editRecurrence}
                    onValueChange={setEditRecurrence}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_RECURRENCES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editRecurrence === "yearly" && (
                  <div className="space-y-2">
                    <Label>Mes da Recorrencia</Label>
                    <Select
                      value={editRecurrenceMonth}
                      onValueChange={setEditRecurrenceMonth}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {project.isRetirement === 1 && (
                  <div className="space-y-4 rounded-md border p-4">
                    <CardDescription>
                      Parametros de aposentadoria
                    </CardDescription>
                    <div className="space-y-2">
                      <Label>Valor liquido mensal desejado</Label>
                      <CurrencyInput
                        value={editRetirementMonthlyWithdrawal}
                        onChange={setEditRetirementMonthlyWithdrawal}
                        disabled={editLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editIpcaRate">
                        Taxa IPCA estimada (%)
                      </Label>
                      <Input
                        id="editIpcaRate"
                        type="number"
                        step="0.1"
                        value={editRetirementIpcaRate}
                        onChange={(e) =>
                          setEditRetirementIpcaRate(e.target.value)
                        }
                        disabled={editLoading}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="editPriority">Prioridade</Label>
                  <Input
                    id="editPriority"
                    type="number"
                    min="1"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    disabled={editLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editNotes">Observacoes</Label>
                  <Textarea
                    id="editNotes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    disabled={editLoading}
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Recorrencia</p>
                    <p className="font-medium">
                      {getRecurrenceLabel(project.recurrence)}
                    </p>
                  </div>
                  {project.recurrence === "yearly" &&
                    project.recurrenceMonth != null && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Mes da Recorrencia
                        </p>
                        <p className="font-medium">
                          {getMonthLabel(project.recurrenceMonth)}
                        </p>
                      </div>
                    )}
                  <div>
                    <p className="text-sm text-muted-foreground">Prioridade</p>
                    <p className="font-medium">{project.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {formatDate(project.createdAt)}
                    </p>
                  </div>
                  {project.isRetirement === 1 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <Badge variant="outline">Aposentadoria</Badge>
                    </div>
                  )}
                </div>

                {/* Retirement Info */}
                {project.isRetirement === 1 && (
                  <div className="rounded-md border p-4">
                    <h4 className="mb-3 text-sm font-semibold">
                      Parametros de Aposentadoria
                    </h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {project.retirementMonthlyWithdrawal != null && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Valor Mensal Desejado
                          </p>
                          <p className="font-medium">
                            {formatCurrency(
                              project.retirementMonthlyWithdrawal
                            )}
                          </p>
                        </div>
                      )}
                      {project.retirementIpcaRate != null && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Taxa IPCA Estimada
                          </p>
                          <p className="font-medium">
                            {formatNumber(project.retirementIpcaRate, 1)}%
                          </p>
                        </div>
                      )}
                      {project.retirementMonthlyWithdrawal != null &&
                        project.retirementMonthlyWithdrawal > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Patrimonio Necessario (regra 4%)
                            </p>
                            <p className="font-medium">
                              {formatCurrency(
                                project.retirementMonthlyWithdrawal * 12 * 25
                              )}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {project.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Observacoes</p>
                    <p className="mt-1 text-sm">{project.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historico de Provisoes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Historico de Provisoes</span>
              {project.status === "active" && (
                <Dialog
                  open={provisionDialogOpen}
                  onOpenChange={setProvisionDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 size-4" />
                      Adicionar Provisao
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Provisao</DialogTitle>
                      <DialogDescription>
                        Registre uma provisao manual para este projeto.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Data *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !provisionDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 size-4" />
                              {provisionDate
                                ? formatDate(provisionDate.toISOString())
                                : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={provisionDate}
                              onSelect={setProvisionDate}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor *</Label>
                        <CurrencyInput
                          value={provisionAmount}
                          onChange={setProvisionAmount}
                          placeholder="R$ 0,00"
                          disabled={provisionLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="provisionSource">Origem</Label>
                        <Input
                          id="provisionSource"
                          placeholder="Ex: Salario, Bonus, Dividendos"
                          value={provisionSource}
                          onChange={(e) => setProvisionSource(e.target.value)}
                          disabled={provisionLoading}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setProvisionDialogOpen(false)}
                        disabled={provisionLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddProvision}
                        disabled={provisionLoading}
                      >
                        {provisionLoading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Adicionar"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {provisions.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Nenhuma provisao registrada"
                description="Adicione a primeira provisao para acompanhar o progresso do projeto."
                action={
                  project.status === "active" ? (
                    <Button
                      size="sm"
                      onClick={() => setProvisionDialogOpen(true)}
                    >
                      <Plus className="mr-2 size-4" />
                      Adicionar Provisao
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {provisions.map((prov) => (
                      <TableRow key={prov.id}>
                        <TableCell>{formatDate(prov.date)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(prov.amount)}
                        </TableCell>
                        <TableCell>{prov.source || "-"}</TableCell>
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
  );
}
