"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@/lib/utils";
import { INDEXERS } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";

interface AssetData {
  id: string;
  assetTypeId: string;
  name: string;
  ticker: string | null;
  broker: string | null;
  currency: string;
  maturityDate: string | null;
  indexer: string | null;
  indexerRate: number | null;
  stopGainPrice: number | null;
  stopLossPrice: number | null;
  notes: string | null;
  assetTypeCategory: string;
}

interface AssetType {
  id: string;
  name: string;
  category: string;
}

interface EditAssetDialogProps {
  asset: AssetData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function EditAssetForm({
  asset,
  onSaved,
  onClose,
}: {
  asset: AssetData;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [assetTypeId, setAssetTypeId] = useState(asset.assetTypeId);
  const [name, setName] = useState(asset.name);
  const [ticker, setTicker] = useState(asset.ticker ?? "");
  const [broker, setBroker] = useState(asset.broker ?? "");
  const [currency, setCurrency] = useState(asset.currency);
  const [maturityDate, setMaturityDate] = useState<Date | undefined>(
    asset.maturityDate
      ? new Date(asset.maturityDate + "T12:00:00")
      : undefined
  );
  const [indexer, setIndexer] = useState(asset.indexer ?? "");
  const [indexerRate, setIndexerRate] = useState(
    asset.indexerRate != null ? String(asset.indexerRate) : ""
  );
  const [stopGainPrice, setStopGainPrice] = useState(
    asset.stopGainPrice != null ? String(asset.stopGainPrice) : ""
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    asset.stopLossPrice != null ? String(asset.stopLossPrice) : ""
  );
  const [notes, setNotes] = useState(asset.notes ?? "");

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

  const selectedType = assetTypes.find((t) => t.id === assetTypeId);
  const category = selectedType?.category ?? asset.assetTypeCategory;
  const isRendaFixa = category === "renda_fixa";
  const showTicker =
    category === "renda_variavel" || category === "cripto";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetTypeId || !name.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetTypeId,
          name: name.trim(),
          ticker: ticker.trim() || null,
          broker: broker.trim() || null,
          currency,
          maturityDate: maturityDate
            ? maturityDate.toISOString().split("T")[0]
            : null,
          indexer: indexer || null,
          indexerRate: indexerRate ? parseFloat(indexerRate) : null,
          stopGainPrice: stopGainPrice ? parseFloat(stopGainPrice) : null,
          stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as any;
        toast.error(data.error || "Erro ao atualizar ativo");
        return;
      }

      toast.success("Ativo atualizado com sucesso!");
      onSaved();
    } catch {
      toast.error("Erro ao atualizar ativo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo de Ativo */}
      <div className="space-y-2">
        <Label>Tipo de Ativo *</Label>
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
        <Label>Nome *</Label>
        <Input
          placeholder="Ex: Tesouro Selic 2029"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Ticker */}
      {showTicker && (
        <div className="space-y-2">
          <Label>Ticker</Label>
          <Input
            placeholder="Ex: PETR4, BTC"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            disabled={loading}
          />
        </div>
      )}

      {/* Corretora */}
      <div className="space-y-2">
        <Label>Corretora</Label>
        <Input
          placeholder="Ex: XP, Nubank, BTG"
          value={broker}
          onChange={(e) => setBroker(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Moeda */}
      <div className="space-y-2">
        <Label>Moeda</Label>
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
          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
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

          <div className="space-y-2">
            <Label>Indexador</Label>
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

          <div className="space-y-2">
            <Label>Taxa do Indexador (%)</Label>
            <Input
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
        <Label>Stop Gain (R$)</Label>
        <Input
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
        <Label>Stop Loss (R$)</Label>
        <Input
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
        <Label>Observacoes</Label>
        <Textarea
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
            "Salvar"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function EditAssetDialog({
  asset,
  open,
  onOpenChange,
  onSaved,
}: EditAssetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ativo</DialogTitle>
        </DialogHeader>
        {asset && (
          <EditAssetForm
            key={asset.id}
            asset={asset}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
