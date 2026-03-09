"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
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
import { CalendarIcon } from "lucide-react";
import { INDEXERS } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";

interface AssetType {
  id: string;
  name: string;
  category: string;
}

export default function NovoAtivoPage() {
  const router = useRouter();
  const { activePortfolio } = usePortfolio();
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Form state
  const [assetTypeId, setAssetTypeId] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [broker, setBroker] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [maturityDate, setMaturityDate] = useState<Date | undefined>();
  const [indexer, setIndexer] = useState("");
  const [indexerRate, setIndexerRate] = useState("");
  const [stopGainPrice, setStopGainPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [notes, setNotes] = useState("");

  const selectedType = assetTypes.find((t) => t.id === assetTypeId);
  const isRendaFixa = selectedType?.category === "renda_fixa";
  const showTicker =
    selectedType?.category === "renda_variavel" ||
    selectedType?.category === "cripto";

  useEffect(() => {
    async function fetchAssetTypes() {
      try {
        const res = await fetch("/api/asset-types");
        if (!res.ok) throw new Error("Erro ao carregar tipos");
        const data = (await res.json()) as any;
        setAssetTypes(data.assetTypes || []);
      } catch {
        toast.error("Erro ao carregar tipos de ativo");
      } finally {
        setLoadingTypes(false);
      }
    }
    fetchAssetTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activePortfolio) {
      toast.error("Selecione uma carteira primeiro");
      return;
    }

    if (!assetTypeId || !name.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: activePortfolio.id,
          assetTypeId,
          name: name.trim(),
          ticker: ticker.trim() || undefined,
          broker: broker.trim() || undefined,
          currency,
          maturityDate: maturityDate
            ? maturityDate.toISOString().split("T")[0]
            : undefined,
          indexer: indexer || undefined,
          indexerRate: indexerRate ? parseFloat(indexerRate) : undefined,
          stopGainPrice: stopGainPrice
            ? parseFloat(stopGainPrice)
            : undefined,
          stopLossPrice: stopLossPrice
            ? parseFloat(stopLossPrice)
            : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar ativo");
        return;
      }

      toast.success("Ativo criado com sucesso!");
      router.push("/ativos");
    } catch {
      toast.error("Erro ao criar ativo");
    } finally {
      setLoading(false);
    }
  };

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader title="Novo Ativo" description="Cadastrar um novo ativo" />
        <p className="mt-6 text-muted-foreground">
          Selecione uma carteira no menu superior.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Novo Ativo" description="Cadastrar um novo ativo">
        <Button variant="outline" onClick={() => router.push("/ativos")}>
          <ArrowLeft className="mr-2 size-4" />
          Voltar
        </Button>
      </PageHeader>

      <div className="mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de Ativo */}
              <div className="space-y-2">
                <Label htmlFor="assetType">Tipo de Ativo *</Label>
                {loadingTypes ? (
                  <Input disabled placeholder="Carregando..." />
                ) : (
                  <Select value={assetTypeId} onValueChange={setAssetTypeId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Tesouro Selic 2029"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Ticker */}
              {showTicker && (
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker</Label>
                  <Input
                    id="ticker"
                    placeholder="Ex: PETR4, BTC"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Corretora */}
              <div className="space-y-2">
                <Label htmlFor="broker">Corretora</Label>
                <Input
                  id="broker"
                  placeholder="Ex: XP, Nubank, BTG"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Moeda */}
              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL - Real</SelectItem>
                    <SelectItem value="USD">USD - Dolar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos de Renda Fixa */}
              {isRendaFixa && (
                <>
                  {/* Data de Vencimento */}
                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !maturityDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {maturityDate
                            ? formatDate(maturityDate.toISOString())
                            : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={maturityDate}
                          onSelect={setMaturityDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Indexador */}
                  <div className="space-y-2">
                    <Label htmlFor="indexer">Indexador</Label>
                    <Select value={indexer} onValueChange={setIndexer}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o indexador" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDEXERS.map((idx) => (
                          <SelectItem key={idx.value} value={idx.value}>
                            {idx.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Taxa do Indexador */}
                  <div className="space-y-2">
                    <Label htmlFor="indexerRate">Taxa do Indexador (%)</Label>
                    <Input
                      id="indexerRate"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 110 (para 110% do CDI)"
                      value={indexerRate}
                      onChange={(e) => setIndexerRate(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* Stop Gain */}
              <div className="space-y-2">
                <Label htmlFor="stopGain">Stop Gain (R$)</Label>
                <Input
                  id="stopGain"
                  type="number"
                  step="0.01"
                  placeholder="Preco alvo para venda"
                  value={stopGainPrice}
                  onChange={(e) => setStopGainPrice(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss (R$)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.01"
                  placeholder="Preco limite para perda"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Observacoes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observacoes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionais sobre o ativo..."
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
                    "Criar Ativo"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/ativos")}
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
