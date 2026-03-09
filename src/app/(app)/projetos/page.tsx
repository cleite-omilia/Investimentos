"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FolderKanban, Target, CalendarIcon } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
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
import { formatCurrency, formatDate } from "@/lib/formatters";
import { PROJECT_RECURRENCES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Project {
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
          Concluído
        </Badge>
      );
    case "cancelled":
      return <Badge variant="secondary">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ProjetosPage() {
  const router = useRouter();
  const { activePortfolio } = usePortfolio();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects?portfolioId=${activePortfolio.id}`
      );
      if (!res.ok) throw new Error("Erro ao carregar projetos");
      const data = (await res.json()) as any;
      const list: Project[] = data.projects || [];
      list.sort((a, b) => a.priority - b.priority);
      setProjects(list);
    } catch {
      toast.error("Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Projetos"
          description="Gerencie seus projetos financeiros"
        />
        <div className="mt-6">
          <EmptyState
            icon={FolderKanban}
            title="Selecione uma carteira"
            description="Selecione uma carteira no menu superior para visualizar os projetos."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Projetos"
          description="Gerencie seus projetos financeiros"
        >
          <Button disabled>
            <Plus className="mr-2 size-4" />
            Novo Projeto
          </Button>
        </PageHeader>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Gerencie seus projetos financeiros"
      >
        <Button onClick={() => router.push("/projetos/novo")}>
          <Plus className="mr-2 size-4" />
          Novo Projeto
        </Button>
      </PageHeader>

      {projects.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={FolderKanban}
            title="Nenhum projeto cadastrado"
            description="Crie seu primeiro projeto para planejar seus objetivos financeiros."
            action={
              <Button onClick={() => router.push("/projetos/novo")}>
                <Plus className="mr-2 size-4" />
                Novo Projeto
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const progress =
              project.targetAmount > 0
                ? Math.min(
                    (project.currentAmount / project.targetAmount) * 100,
                    100
                  )
                : 0;

            return (
              <Card
                key={project.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/projetos/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">
                      {project.name}
                    </CardTitle>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {project.isRetirement === 1 && (
                        <Badge variant="outline" className="text-xs">
                          Aposentadoria
                        </Badge>
                      )}
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                  {project.targetDate && (
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <CalendarIcon className="size-3" />
                      Meta: {formatDate(project.targetDate)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {project.targetAmount > 0
                          ? `${progress.toFixed(1)}%`
                          : "-"}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
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

                  {/* Amounts */}
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Atual</p>
                      <p className="font-semibold">
                        {formatCurrency(project.currentAmount)}
                      </p>
                    </div>
                    {project.targetAmount > 0 && (
                      <div className="text-right">
                        <p className="text-muted-foreground">Meta</p>
                        <p className="font-semibold">
                          {formatCurrency(project.targetAmount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getRecurrenceLabel(project.recurrence)}</span>
                    <span className="flex items-center gap-1">
                      <Target className="size-3" />
                      Prioridade {project.priority}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
