"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Package, Loader2 } from "lucide-react";
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

interface Asset {
  id: string;
  portfolioId: string;
  assetTypeId: string;
  ticker: string | null;
  name: string;
  broker: string | null;
  currency: string;
  isActive: number;
  assetTypeName: string;
  assetTypeCategory: string;
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
                <TableHead>Moeda</TableHead>
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
                  <TableCell>{asset.currency}</TableCell>
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
