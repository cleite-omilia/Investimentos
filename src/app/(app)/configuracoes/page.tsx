"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  User,
  Settings,
  Shield,
  Loader2,
  Save,
  Calendar,
  Mail,
  Lock,
  Palette,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
}

interface UserPreferences {
  theme: string;
  defaultPortfolioId: string | null;
}

interface Portfolio {
  id: string;
  name: string;
  type: string;
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  const [name, setName] = useState("");
  const [defaultPortfolioId, setDefaultPortfolioId] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const [userRes, portfoliosRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/portfolios"),
      ]);

      if (!userRes.ok) throw new Error("Erro ao carregar perfil");

      const userData = (await userRes.json()) as any;
      setUser(userData.user);
      setPreferences(userData.preferences);
      setName(userData.user.name || "");
      setDefaultPortfolioId(userData.preferences?.defaultPortfolioId || "");

      if (portfoliosRes.ok) {
        const portfoliosData = (await portfoliosRes.json()) as any;
        setPortfolios(portfoliosData.portfolios || []);
      }
    } catch {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          defaultPortfolioId:
            defaultPortfolioId && defaultPortfolioId !== "none"
              ? defaultPortfolioId
              : null,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar configurações");
        return;
      }

      setUser(data.user);
      setPreferences(data.preferences);
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const currentPortfolioId =
    defaultPortfolioId && defaultPortfolioId !== "none"
      ? defaultPortfolioId
      : "";
  const savedPortfolioId = preferences?.defaultPortfolioId || "";

  const hasChanges =
    name.trim() !== (user?.name || "") ||
    currentPortfolioId !== savedPortfolioId;

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Configurações"
          description="Gerencie seu perfil e preferências"
        />
        <div className="mt-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil e preferências"
      >
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </PageHeader>

      <div className="mt-6 space-y-6">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Perfil
            </CardTitle>
            <CardDescription>
              Informações básicas da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                E-mail
              </Label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                Membro desde
              </Label>
              <p className="text-sm text-muted-foreground">
                {user?.createdAt ? formatDate(user.createdAt) : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Preferências
            </CardTitle>
            <CardDescription>
              Personalize sua experiência na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultPortfolio">Carteira padrão</Label>
              <Select
                value={defaultPortfolioId}
                onValueChange={setDefaultPortfolioId}
                disabled={saving}
              >
                <SelectTrigger id="defaultPortfolio" className="w-full">
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {portfolios.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A carteira padrão será selecionada automaticamente ao acessar a
                plataforma.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="size-4 text-muted-foreground" />
                Tema
              </Label>
              <p className="text-sm text-muted-foreground">
                O tema pode ser alterado pelo botão na barra superior da
                aplicação.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Conta
            </CardTitle>
            <CardDescription>
              Segurança e configurações da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  Alterar Senha
                </Label>
                <p className="text-xs text-muted-foreground">
                  Em breve
                </p>
              </div>
              <Button variant="outline" disabled>
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
