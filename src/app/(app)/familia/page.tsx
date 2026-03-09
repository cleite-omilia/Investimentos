"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Crown, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FamilyMember {
  id: string;
  role: string;
  joinedAt: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
}

interface Family {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export default function FamiliaPage() {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const fetchFamily = useCallback(async () => {
    try {
      const res = await fetch("/api/family");
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = (await res.json()) as any;
      setFamily(data.family);
      setMembers(data.members || []);
    } catch {
      toast.error("Erro ao carregar dados da família");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName.trim()) {
      toast.error("Digite o nome da família");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName.trim() }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar família");
        return;
      }

      toast.success("Família criada com sucesso!");
      setFamilyName("");
      await fetchFamily();
    } catch {
      toast.error("Erro ao criar família");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      toast.error("Digite o e-mail do membro");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao convidar membro");
        return;
      }

      toast.success("Membro adicionado com sucesso!");
      setInviteEmail("");
      setMembers((prev) => [...prev, data.member]);
    } catch {
      toast.error("Erro ao convidar membro");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string | null) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/family/members/${memberId}`, {
        method: "DELETE",
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        toast.error(data.error || "Erro ao remover membro");
        return;
      }

      toast.success(`${memberName || "Membro"} removido da família`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      toast.error("Erro ao remover membro");
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "owner") {
      return <Badge variant="default">Proprietário</Badge>;
    }
    return <Badge variant="secondary">Membro</Badge>;
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Família"
          description="Gerencie seu grupo familiar"
        />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // No family yet - show create form
  if (!family) {
    return (
      <div>
        <PageHeader
          title="Família"
          description="Gerencie seu grupo familiar"
        />
        <div className="mt-6 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Criar Família
              </CardTitle>
              <CardDescription>
                Crie um grupo familiar para compartilhar uma carteira de
                investimentos com seus familiares.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFamily} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="familyName">Nome da família</Label>
                  <Input
                    id="familyName"
                    placeholder="Ex: Família Silva"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 size-4" />
                      Criar Família
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Has family - show management view
  return (
    <div>
      <PageHeader title="Família" description="Gerencie seu grupo familiar" />

      <div className="mt-6 space-y-6">
        {/* Family Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              {family.name}
            </CardTitle>
            <CardDescription>
              Criada em {formatDate(family.createdAt)} &middot;{" "}
              {members.length} {members.length === 1 ? "membro" : "membros"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
            <CardDescription>
              Gerencie os membros do seu grupo familiar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {member.role === "owner" && (
                          <Crown className="size-4 text-yellow-500" />
                        )}
                        {member.userName || "Sem nome"}
                      </div>
                    </TableCell>
                    <TableCell>{member.userEmail}</TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{formatDate(member.joinedAt)}</TableCell>
                    <TableCell>
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(member.id, member.userName)
                          }
                          disabled={removingId === member.id}
                        >
                          {removingId === member.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5" />
              Convidar Membro
            </CardTitle>
            <CardDescription>
              Adicione um familiar usando o e-mail cadastrado na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                />
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Convidando...
                  </>
                ) : (
                  "Convidar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
