"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput } from "@/components/common/currency-input";
import { OPERATION_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Operation {
  id: string;
  assetId: string;
  assetName?: string;
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

interface EditOperationDialogProps {
  operation: Operation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditOperationDialog({
  operation,
  open,
  onOpenChange,
  onSaved,
}: EditOperationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Operacao</DialogTitle>
          <DialogDescription>
            Altere os dados da operacao abaixo.
          </DialogDescription>
        </DialogHeader>
        {operation && (
          <EditOperationForm
            key={operation.id}
            operation={operation}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditOperationForm({
  operation,
  onOpenChange,
  onSaved,
}: {
  operation: Operation;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // Form state - pre-populated from operation
  const [type, setType] = useState(operation.type);
  const [date, setDate] = useState<Date | undefined>(
    () => new Date(operation.date + "T12:00:00")
  );
  const [quantity, setQuantity] = useState(String(operation.quantity || ""));
  const [unitPrice, setUnitPrice] = useState(operation.unitPrice);
  const [totalAmount, setTotalAmount] = useState(operation.totalAmount);
  const [fees, setFees] = useState(operation.fees);
  const [brokerFrom, setBrokerFrom] = useState(operation.brokerFrom || "");
  const [brokerTo, setBrokerTo] = useState(operation.brokerTo || "");
  const [splitFactor, setSplitFactor] = useState(
    operation.splitFactor != null ? String(operation.splitFactor) : ""
  );
  const [notes, setNotes] = useState(operation.notes || "");
  const [autoCalc, setAutoCalc] = useState(false);

  const isTransfer = type === "transferencia";
  const isSplitOrGroup = type === "desdobramento" || type === "grupamento";

  // Auto-calculate totalAmount when quantity or unitPrice changes
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

    if (!type || !date) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/operations/${operation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        toast.error(data.error || "Erro ao atualizar operacao");
        return;
      }

      toast.success("Operacao atualizada com sucesso!");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Erro ao atualizar operacao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Ativo (somente leitura) */}
      <div className="space-y-2">
        <Label>Ativo</Label>
        <Input value={operation.assetName || ""} disabled />
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
              {date ? formatDate(date.toISOString()) : "Selecione a data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Quantidade */}
      {!isSplitOrGroup && (
        <div className="space-y-2">
          <Label htmlFor="edit-quantity">Quantidade</Label>
          <Input
            id="edit-quantity"
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
            Calculado automaticamente (quantidade x preco). Edite para ajustar
            manualmente.
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
            <Label htmlFor="edit-brokerFrom">Corretora Origem</Label>
            <Input
              id="edit-brokerFrom"
              placeholder="Ex: XP"
              value={brokerFrom}
              onChange={(e) => setBrokerFrom(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-brokerTo">Corretora Destino</Label>
            <Input
              id="edit-brokerTo"
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
          <Label htmlFor="edit-splitFactor">Fator</Label>
          <Input
            id="edit-splitFactor"
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
        <Label htmlFor="edit-notes">Observacoes</Label>
        <Textarea
          id="edit-notes"
          placeholder="Notas adicionais sobre a operacao..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          rows={3}
        />
      </div>

      {/* Botoes */}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alteracoes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
