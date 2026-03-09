"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { OPERATION_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";

interface AssetOption {
  id: string;
  name: string;
  ticker: string | null;
}

export default function NovaOperacaoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovaOperacaoContent />
    </Suspense>
  );
}

function NovaOperacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedAssetId = searchParams.get("assetId");
  const { activePortfolio } = usePortfolio();

  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form state
  const [assetId, setAssetId] = useState(preSelectedAssetId || "");
  const [type, setType] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState(0); // centavos
  const [totalAmount, setTotalAmount] = useState(0); // centavos
  const [fees, setFees] = useState(0); // centavos
  const [brokerFrom, setBrokerFrom] = useState("");
  const [brokerTo, setBrokerTo] = useState("");
  const [splitFactor, setSplitFactor] = useState("");
  const [notes, setNotes] = useState("");
  const [autoCalc, setAutoCalc] = useState(true);

  const isTransfer = type === "transferencia";
  const isSplitOrGroup =
    type === "desdobramento" || type === "grupamento";

  // Buscar ativos da carteira
  const fetchAssets = useCallback(async () => {
    if (!activePortfolio) {
      setLoadingAssets(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/assets?portfolioId=${activePortfolio.id}`
      );
      if (!res.ok) throw new Error("Erro ao carregar ativos");
      const data = (await res.json()) as any;
      setAssets(
        (data.assets || []).map(
          (a: { id: string; name: string; ticker: string | null }) => ({
            id: a.id,
            name: a.name,
            ticker: a.ticker,
          })
        )
      );
    } catch {
      toast.error("Erro ao carregar ativos");
    } finally {
      setLoadingAssets(false);
    }
  }, [activePortfolio]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Calculo automatico do total
  useEffect(() => {
    if (autoCalc && quantity && unitPrice > 0) {
      const qty = parseFloat(quantity);
      if (!isNaN(qty)) {
        setTotalAmount(Math.round(qty * unitPrice));
      }
    }
  }, [quantity, unitPrice, autoCalc]);

  const handleTotalAmountChange = (centavos: number) => {
    setAutoCalc(false);
    setTotalAmount(centavos);
  };

  const handleUnitPriceChange = (centavos: number) => {
    setAutoCalc(true);
    setUnitPrice(centavos);
  };

  const handleQuantityChange = (value: string) => {
    setAutoCalc(true);
    setQuantity(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activePortfolio) {
      toast.error("Selecione uma carteira primeiro");
      return;
    }

    if (!assetId || !type || !date) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: activePortfolio.id,
          assetId,
          type,
          date: date.toISOString().split("T")[0],
          quantity: quantity ? parseFloat(quantity) : 0,
          unitPrice,
          totalAmount,
          fees: fees || 0,
          brokerFrom: brokerFrom.trim() || undefined,
          brokerTo: brokerTo.trim() || undefined,
          splitFactor: splitFactor ? parseFloat(splitFactor) : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar operacao");
        return;
      }

      toast.success("Operacao registrada com sucesso!");
      router.push("/operacoes");
    } catch {
      toast.error("Erro ao criar operacao");
    } finally {
      setLoading(false);
    }
  };

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader
          title="Nova Operacao"
          description="Registrar uma operacao"
        />
        <p className="mt-6 text-muted-foreground">
          Selecione uma carteira no menu superior.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Nova Operacao"
        description="Registrar uma operacao de investimento"
      >
        <Button variant="outline" onClick={() => router.push("/operacoes")}>
          <ArrowLeft className="mr-2 size-4" />
          Voltar
        </Button>
      </PageHeader>

      <div className="mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Operacao</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ativo */}
              <div className="space-y-2">
                <Label>Ativo *</Label>
                {loadingAssets ? (
                  <Input disabled placeholder="Carregando ativos..." />
                ) : (
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.ticker
                            ? `${asset.ticker} - ${asset.name}`
                            : asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Tipo de Operacao */}
              <div className="space-y-2">
                <Label>Tipo de Operacao *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {date
                        ? formatDate(date.toISOString())
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quantidade */}
              {!isSplitOrGroup && (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.000001"
                    placeholder="Ex: 100"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Preco Unitario */}
              {!isSplitOrGroup && (
                <div className="space-y-2">
                  <Label>Preco Unitario</Label>
                  <CurrencyInput
                    value={unitPrice}
                    onChange={handleUnitPriceChange}
                    placeholder="R$ 0,00"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Valor Total */}
              {!isSplitOrGroup && (
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <CurrencyInput
                    value={totalAmount}
                    onChange={handleTotalAmountChange}
                    placeholder="R$ 0,00"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Calculado automaticamente (quantidade x preco). Edite para
                    ajustar manualmente.
                  </p>
                </div>
              )}

              {/* Taxas */}
              {!isSplitOrGroup && (
                <div className="space-y-2">
                  <Label>Taxas</Label>
                  <CurrencyInput
                    value={fees}
                    onChange={setFees}
                    placeholder="R$ 0,00"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Campos de Transferencia */}
              {isTransfer && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brokerFrom">Corretora Origem</Label>
                    <Input
                      id="brokerFrom"
                      placeholder="Ex: XP"
                      value={brokerFrom}
                      onChange={(e) => setBrokerFrom(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brokerTo">Corretora Destino</Label>
                    <Input
                      id="brokerTo"
                      placeholder="Ex: BTG"
                      value={brokerTo}
                      onChange={(e) => setBrokerTo(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Fator de Desdobramento/Grupamento */}
              {isSplitOrGroup && (
                <div className="space-y-2">
                  <Label htmlFor="splitFactor">Fator</Label>
                  <Input
                    id="splitFactor"
                    type="number"
                    step="0.01"
                    placeholder={
                      type === "desdobramento"
                        ? "Ex: 2 (cada acao vira 2)"
                        : "Ex: 5 (a cada 5 acoes vira 1)"
                    }
                    value={splitFactor}
                    onChange={(e) => setSplitFactor(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    {type === "desdobramento"
                      ? "Multiplicador: cada unidade sera multiplicada por este fator."
                      : "Divisor: a quantidade sera dividida por este fator."}
                  </p>
                </div>
              )}

              {/* Observacoes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observacoes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionais sobre a operacao..."
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
                    "Registrar Operacao"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/operacoes")}
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
