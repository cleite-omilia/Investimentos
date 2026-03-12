"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Package, Check, Loader2 } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyInput } from "@/components/common/currency-input";
import { formatCurrency } from "@/lib/formatters";

interface Asset {
  id: string;
  portfolioId: string;
  assetTypeId: string;
  ticker: string | null;
  name: string;
  broker: string | null;
  currency: string;
  isActive: number;
  currentValue: number | null;
  currentValueUpdatedAt: string | null;
  assetTypeName: string;
  assetTypeCategory: string;
}

function InlineCurrentValue({
  asset,
  onSaved,
}: {
  asset: Asset;
  onSaved: (id: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(asset.currentValue ?? 0);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentValue: value,
          currentValueUpdatedAt: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast.success(`${asset.name}: valor atualizado`);
      onSaved(asset.id, value);
      setEditing(false);
    } catch {
      toast.error("Erro ao atualizar valor");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setValue(asset.currentValue ?? 0);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full text-right font-medium hover:text-primary hover:underline underline-offset-2 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setValue(asset.currentValue ?? 0);
          setEditing(true);
        }}
      >
        {asset.currentValue != null
          ? formatCurrency(asset.currentValue)
          : "—"}
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <CurrencyInput
        value={value}
        onChange={setValue}
        disabled={saving}
        className="h-8 text-sm w-[130px]"
      />
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
      </Button>
    </div>
  );
}

export default function AtivosPage() {
  const router = useRouter();
  const { activePortfolio } = usePortfolio();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    if (!activePortfolio) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/assets?portfolioId=${activePortfolio.id}`
      );
      if (!res.ok) throw new Error("Erro ao carregar ativos");
      const data = (await res.json()) as any;
      setAssets(data.assets || []);
    } catch {
      toast.error("Erro ao carregar ativos");
    } finally {
      setLoading(false);
    }
  }, [activePortfolio]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleValueSaved = (assetId: string, newValue: number) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? {
              ...a,
              currentValue: newValue,
              currentValueUpdatedAt: new Date().toISOString().split("T")[0],
            }
          : a
      )
    );
  };

  if (!activePortfolio) {
    return (
      <div>
        <PageHeader title="Ativos" description="Gerencie seus ativos" />
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="Selecione uma carteira"
            description="Selecione uma carteira no menu superior para visualizar os ativos."
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Ativos" description="Gerencie seus ativos">
          <Button disabled>
            <Plus className="mr-2 size-4" />
            Novo Ativo
          </Button>
        </PageHeader>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Ativos" description="Gerencie seus ativos">
        <Button onClick={() => router.push("/ativos/novo")}>
          <Plus className="mr-2 size-4" />
          Novo Ativo
        </Button>
      </PageHeader>

      {assets.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="Nenhum ativo cadastrado"
            description="Adicione seu primeiro ativo para começar a controlar seus investimentos."
            action={
              <Button onClick={() => router.push("/ativos/novo")}>
                <Plus className="mr-2 size-4" />
                Novo Ativo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Corretora</TableHead>
                <TableHead className="text-right">Valor Atual</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/ativos/${asset.id}`)}
                >
                  <TableCell>
                    <Badge variant="secondary">{asset.assetTypeName}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.ticker || "-"}</TableCell>
                  <TableCell>{asset.broker || "-"}</TableCell>
                  <TableCell className="text-right">
                    <InlineCurrentValue
                      asset={asset}
                      onSaved={handleValueSaved}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={asset.isActive ? "default" : "outline"}
                    >
                      {asset.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
