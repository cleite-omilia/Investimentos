"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CalendarIcon } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { CurrencyInput } from "@/components/common/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PROJECT_RECURRENCES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";

export default function NovoProjetoPage() {
  const router = useRouter();
  const { activePortfolio } = usePortfolio();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [recurrence, setRecurrence] = useState("once");
  const [recurrenceMonth, setRecurrenceMonth] = useState("");
  const [isRetirement, setIsRetirement] = useState(false);
  const [retirementMonthlyWithdrawal, setRetirementMonthlyWithdrawal] =
    useState(0);
  const [retirementIpcaRate, setRetirementIpcaRate] = useState("4.5");
  const [priority, setPriority] = useState("1");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activePortfolio) {
      toast.error("Selecione uma carteira primeiro");
      return;
    }

    if (!name.trim()) {
      toast.error("Preencha o nome do projeto");
      return;
    }

    if (!isRetirement && targetAmount <= 0) {
      toast.error("Informe o valor da meta");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, any> = {
        portfolioId: activePortfolio.id,
        name: name.trim(),
        targetAmount,
        targetDate: targetDate
          ? targetDate.toISOString().split("T")[0]
          : undefined,
        recurrence,
        recurrenceMonth:
          recurrence === "yearly" && recurrenceMonth
            ? parseInt(recurrenceMonth)
            : undefined,
        isRetirement,
        priority: parseInt(priority) || 1,
        notes: notes.trim() || undefined,
      };

      if (isRetirement) {
        body.retirementMonthlyWithdrawal = retirementMonthlyWithdrawal;
        body.retirementIpcaRate = retirementIpcaRate
          ? parseFloat(retirementIpcaRate)
          : 4.5;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar projeto");
        return;
      }

      toast.success("Projeto criado com sucesso!");
      router.push("/projetos");
    } catch {
      toast.error("Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Novo Projeto"
          description="Criar um novo projeto financeiro"
        />
        <p className="mt-6 text-muted-foreground">
          Selecione uma carteira no menu superior.
        </p>
      </div>
    );
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

  return (
    <div>
      <PageHeader
        title="Novo Projeto"
        description="Criar um novo projeto financeiro"
      >
        <Button variant="outline" onClick={() => router.push("/projetos")}>
          <ArrowLeft className="mr-2 size-4" />
          Voltar
        </Button>
      </PageHeader>

      <div className="mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Reserva de emergencia, Casa propria"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Valor da Meta */}
              <div className="space-y-2">
                <Label>
                  Valor da Meta {isRetirement ? "(opcional)" : "*"}
                </Label>
                {isRetirement && (
                  <p className="text-xs text-muted-foreground">
                    Para projetos de aposentadoria, o valor da meta pode ser
                    calculado automaticamente com base no valor mensal desejado.
                  </p>
                )}
                <CurrencyInput
                  value={targetAmount}
                  onChange={setTargetAmount}
                  placeholder="R$ 0,00"
                  disabled={loading}
                />
              </div>

              {/* Data da Meta */}
              <div className="space-y-2">
                <Label>Data da Meta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !targetDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {targetDate
                        ? formatDate(targetDate.toISOString())
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetDate}
                      onSelect={setTargetDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Recorrencia */}
              <div className="space-y-2">
                <Label>Recorrencia</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a recorrencia" />
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

              {/* Mes da Recorrencia (apenas para Anual) */}
              {recurrence === "yearly" && (
                <div className="space-y-2">
                  <Label>Mes da Recorrencia</Label>
                  <Select
                    value={recurrenceMonth}
                    onValueChange={setRecurrenceMonth}
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

              {/* Aposentadoria */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isRetirement"
                    checked={isRetirement}
                    onChange={(e) => setIsRetirement(e.target.checked)}
                    disabled={loading}
                    className="size-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isRetirement" className="cursor-pointer">
                    Projeto de aposentadoria
                  </Label>
                </div>
              </div>

              {/* Campos de Aposentadoria */}
              {isRetirement && (
                <div className="space-y-4 rounded-md border p-4">
                  <CardDescription>
                    Configure os parametros de aposentadoria para calcular o
                    valor necessario.
                  </CardDescription>

                  <div className="space-y-2">
                    <Label>Valor liquido mensal desejado *</Label>
                    <CurrencyInput
                      value={retirementMonthlyWithdrawal}
                      onChange={setRetirementMonthlyWithdrawal}
                      placeholder="R$ 0,00"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ipcaRate">Taxa IPCA estimada (%)</Label>
                    <Input
                      id="ipcaRate"
                      type="number"
                      step="0.1"
                      placeholder="4.5"
                      value={retirementIpcaRate}
                      onChange={(e) => setRetirementIpcaRate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Prioridade */}
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade (1 = mais alta)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Observacoes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observacoes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionais sobre o projeto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>

              {/* Botoes */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Criar Projeto"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/projetos")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
