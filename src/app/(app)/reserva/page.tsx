"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ShieldCheck, Pencil, Save, X, Plus } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CurrencyInput } from "@/components/common/currency-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface EmergencyReserve {
  id: string;
  portfolioId: string;
  targetAmount: number; // centavos
  currentAmount: number; // centavos
  notes: string | null;
}

export default function ReservaPage() {
  const { activePortfolio } = usePortfolio();
  const [reserve, setReserve] = useState<EmergencyReserve | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state (used for both create and edit)
  const [editing, setEditing] = useState(false);
  const [formTarget, setFormTarget] = useState(0);
  const [formCurrent, setFormCurrent] = useState(0);
  const [formNotes, setFormNotes] = useState("");

  const fetchReserve = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        portfolioId: activePortfolio.id,
      });
      const res = await fetch(`/api/emergency-reserve?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar reserva");
      const data = (await res.json()) as any;
      setReserve(data.reserve || null);
    } catch {
      toast.error("Erro ao carregar reserva de emergencia");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  useEffect(() => {
    fetchReserve();
  }, [fetchReserve]);

  const startEditing = () => {
    if (reserve) {
      setFormTarget(reserve.targetAmount);
      setFormCurrent(reserve.currentAmount);
      setFormNotes(reserve.notes || "");
    }
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormTarget(0);
    setFormCurrent(0);
    setFormNotes("");
  };

  const handleSave = async () => {
    if (!activePortfolio) return;

    setSaving(true);
    try {
      const res = await fetch("/api/emergency-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: activePortfolio.id,
          targetAmount: formTarget,
          currentAmount: formCurrent,
          notes: formNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar reserva");
      const data = (await res.json()) as any;
      setReserve(data.reserve);
      setEditing(false);
      toast.success("Reserva de emergencia salva com sucesso");
    } catch {
      toast.error("Erro ao salvar reserva de emergencia");
    } finally {
      setSaving(false);
    }
  };

  const progressPercent =
    reserve && reserve.targetAmount > 0
      ? Math.min((reserve.currentAmount / reserve.targetAmount) * 100, 100)
      : 0;

  const remainingAmount =
    reserve ? Math.max(reserve.targetAmount - reserve.currentAmount, 0) : 0;

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Reserva de Emergencia"
          description="Configure sua reserva de emergencia"
        />
        <div className="mt-6">
          <EmptyState
            icon={ShieldCheck}
            title="Selecione uma carteira"
            description="Selecione uma carteira no menu superior para gerenciar sua reserva de emergencia."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Reserva de Emergencia"
          description="Configure sua reserva de emergencia"
        />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-48 w-full max-w-xl" />
        </div>
      </div>
    );
  }

  // No reserve exists and not editing -> show setup form
  if (!reserve && !editing) {
    return (
      <div>
        <PageHeader
          title="Reserva de Emergencia"
          description="Configure sua reserva de emergencia"
        />
        <div className="mt-6">
          <EmptyState
            icon={ShieldCheck}
            title="Nenhuma reserva configurada"
            description="Configure sua reserva de emergencia para acompanhar seu progresso rumo a seguranca financeira."
            action={
              <Button
                onClick={() => {
                  setFormTarget(0);
                  setFormCurrent(0);
                  setFormNotes("");
                  setEditing(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Configurar Reserva
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Editing / Creating form
  if (editing) {
    return (
      <div>
        <PageHeader
          title="Reserva de Emergencia"
          description={reserve ? "Editar reserva de emergencia" : "Configurar reserva de emergencia"}
        />
        <div className="mt-6 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>
                {reserve ? "Editar Reserva" : "Nova Reserva de Emergencia"}
              </CardTitle>
              <CardDescription>
                Defina o valor meta e o valor atual da sua reserva de
                emergencia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target-amount">Valor Meta</Label>
                  <CurrencyInput
                    value={formTarget}
                    onChange={setFormTarget}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-amount">Valor Atual</Label>
                  <CurrencyInput
                    value={formCurrent}
                    onChange={setFormCurrent}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observacoes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex: 6 meses de despesas fixas"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 size-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing}>
                    <X className="mr-2 size-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reserve exists -> show dashboard
  return (
    <div>
      <PageHeader
        title="Reserva de Emergencia"
        description="Acompanhe o progresso da sua reserva"
      >
        <Button variant="outline" onClick={startEditing}>
          <Pencil className="mr-2 size-4" />
          Editar
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Target Amount Card */}
        <Card>
          <CardHeader>
            <CardDescription>Valor Meta</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(reserve!.targetAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Current Amount Card */}
        <Card>
          <CardHeader>
            <CardDescription>Valor Atual</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(reserve!.currentAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Remaining Card */}
        <Card>
          <CardHeader>
            <CardDescription>Valor Restante</CardDescription>
            <CardTitle className="text-2xl">
              {remainingAmount > 0
                ? formatCurrency(remainingAmount)
                : "Concluida!"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Progress Section */}
      <div className="mt-6 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Progresso</CardTitle>
            <CardDescription>
              {progressPercent.toFixed(1)}% da meta atingida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progressPercent >= 100
                      ? "bg-green-500"
                      : progressPercent >= 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(reserve!.currentAmount)}</span>
                <span>{formatCurrency(reserve!.targetAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {reserve!.notes && (
        <div className="mt-6 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Observacoes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {reserve!.notes}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
