import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Library, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { avisarErro, avisarSucesso } from "@/lib/avisos";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  createMember,
  deleteMember,
  listMembers,
  updateMember,
} from "@/lib/admin.functions";
import { adminStats, updateGlobalSetting, resetAccessLogs } from "@/lib/library.functions";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { SCOPES, KINDS, catalogName, type BookScope, type BookKind } from "@/lib/catalog";
import { BooksAdmin } from "@/features/admin/BooksAdmin";

import { emailToLogin, loginToEmail, suggestLogin, suggestPassword } from "@/lib/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function copyText(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    avisarErro("Não foi possível copiar.");
  }
}

function credentialsMessage(info: { login: string; password: string }) {
  return [
    "Meu irmão, seguem suas credenciais de acesso à Biblioteca Plenitude:",
    "",
    `Login: ${info.login}`,
    `Senha: ${info.password}`,
    "",
    `Acesse: ${typeof window !== "undefined" ? window.location.origin : ""}/auth`,
    "Recomendamos alterar a senha em “Minha conta” após o primeiro acesso.",
  ].join("\n");
}

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/auth" });
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id);
    
    const isAdmin = (roleData || []).some((r: any) => r.role === "admin");
    
    if (error) {
      console.error("Erro na verificação de admin (route):", error);
    }

    if (!isAdmin) {
      throw redirect({ 
        to: "/biblioteca", 
        search: { q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false } 
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Administração | Biblioteca Plenitude" },
      {
        name: "description",
        content: "Painel administrativo para gerir irmãos, graus e o acervo da Biblioteca Plenitude.",
      },
      { property: "og:title", content: "Administração | Biblioteca Plenitude" },
      { property: "og:description", content: "Gestão de irmãos e do acervo digital da Loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { profile, isAdmin, loading } = useSessionProfile();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader fullName={profile?.full_name} degree={profile?.degree} isAdmin={isAdmin} userId={profile?.id} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl">Administração</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Gerencie o acervo, os irmãos e acompanhe os números da Biblioteca Plenitude.
              </p>
              <div className="gold-rule mt-4 h-px w-24" />
            </div>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}>
                <Library className="mr-1 h-4 w-4" />
                Ir para a biblioteca
              </Link>
            </Button>
          </div>
        </section>

        {loading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : !isAdmin ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Acesso restrito à administração da Loja.
          </p>
        ) : (
          <Tabs defaultValue="acervo" className="mt-5">
            <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
              <TabsTrigger value="acervo">Acervo</TabsTrigger>
              <TabsTrigger value="irmaos">Irmãos</TabsTrigger>
              <TabsTrigger value="painel">Painel</TabsTrigger>

            </TabsList>
            <TabsContent value="acervo" className="mt-5">
              <BooksAdmin />
            </TabsContent>
            <TabsContent value="irmaos" className="mt-5">
              <MembersAdmin />
            </TabsContent>
            <TabsContent value="painel" className="mt-5">
              <StatsPanel />
            </TabsContent>

          </Tabs>
        )}
      </main>
    </div>
  );
}

function StatsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading: isLoadingStats } = useQuery({ 
    queryKey: ["admin-stats"], 
    queryFn: () => adminStats() 
  });

  const resetLogs = useMutation({
    mutationFn: () => resetAccessLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      avisarSucesso("Histórico de leituras reiniciado.", "Dica: o contador de leituras agora está em zero.");
    },
    onError: (err: any) => avisarErro(err, "Erro ao resetar leituras."),
  });

  const handleReset = () => {
    if (window.confirm("Deseja realmente zerar todas as leituras registradas? Esta ação não pode ser desfeita.")) {
      resetLogs.mutate();
    }
  };

  const cards = [
    { label: "Irmãos cadastrados", value: data?.members ?? 0 },
    { label: "Obras no acervo", value: data?.books ?? 0 },
    { label: "Leituras registradas", value: data?.reads ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {isLoadingStats ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : cards.map((c) => (
          <Card
            key={c.label}
            className="rounded-2xl border-border/60 bg-card/60 transition-colors hover:border-primary/40"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl text-primary">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoadingStats && (
        <div className="grid gap-6">
          <Card className="rounded-2xl border-border/60 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Contador de Visitas por Irmão</CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase">
                Acervo Aberto
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="pb-2 font-medium">Nome do Irmão</th>
                      <th className="pb-2 text-right font-medium">Obras Abertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data?.visitingStats?.length ? (
                      data.visitingStats.map((stat: any) => (
                        <tr key={stat.full_name} className="hover:bg-primary/5">
                          <td className="py-2 pr-4 font-medium">{stat.full_name}</td>
                          <td className="py-2 text-right text-primary tabular-nums">
                            {stat.reads_count}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-muted-foreground italic">
                          Nenhum registro de acesso encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalWatermarkControl />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Manutenção do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Zerar contador de leituras</p>
                  <p className="text-xs text-muted-foreground">
                    Remove todos os registros de acesso às obras. Isso não afeta o progresso individual dos irmãos.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleReset}
                  disabled={resetLogs.isPending}
                >
                  {resetLogs.isPending ? "Reiniciando..." : "Resetar Leituras"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function GlobalWatermarkControl() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["global-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("global_settings").select("*");
      if (error) throw error;
      return data.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    },
  });

  const updateSetting = useMutation({
    mutationFn: (vars: { key: string; value: any }) => updateGlobalSetting({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-settings"] });
      avisarSucesso("Configuração atualizada.");
    },
    onError: (err: any) => avisarErro(err, "Erro ao atualizar configuração."),
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  const watermarkGlobal = settings?.["watermark_enabled"] === true;

  return (
    <div className="flex items-center justify-between space-x-2 rounded-lg border border-border/60 p-4">
      <div className="space-y-1">
        <Label className="text-base">Marca d'água global</Label>
        <p className="text-sm text-muted-foreground">
          Se ativado, as obras com marca d'água habilitada individualmente exibirão o nome do irmão.
        </p>
      </div>
      <Switch
        checked={watermarkGlobal}
        onCheckedChange={(v) => updateSetting.mutate({ key: "watermark_enabled", value: v })}
        disabled={updateSetting.isPending}
      />
    </div>
  );
}


function MembersAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    login: "",
    password: "",
    full_name: "",
    degree: "1",
    is_admin: false,
  });
  const [createdInfo, setCreatedInfo] = useState<{ login: string; password: string } | null>(null);

  function fillCredentials(fullName: string) {
    setForm((f) => ({
      ...f,
      full_name: fullName,
      login: suggestLogin(fullName),
      password: suggestPassword(fullName),
    }));
  }

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => listMembers(),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["members"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
    ]);

  const create = useMutation({
    mutationFn: () =>
      createMember({
        data: {
          email: loginToEmail(form.login),
          password: form.password,
          full_name: form.full_name.trim(),
          degree: Number(form.degree),
          is_admin: form.is_admin,
        },
      }),
    onSuccess: async (result) => {
      // O servidor pode ajustar o login quando já existe outro igual — mostramos o real.
      const realLogin = emailToLogin(result?.email ?? "") || form.login;
      if (realLogin !== form.login) {
        toast.info(`O login “${form.login}” já existia. Login criado: ${realLogin}`);
      } else {
        avisarSucesso("Irmão cadastrado.", "Dica: use os botões de copiar para enviar o login e a senha ao irmão.");
      }
      setOpen(false);
      setCreatedInfo({ login: realLogin, password: form.password });
      setForm({ login: "", password: "", full_name: "", degree: "1", is_admin: false });
      await invalidate();
    },
    onError: (e: Error) => avisarErro(e, "Não foi possível cadastrar o irmão."),
  });

  const [editing, setEditing] = useState<{
    id: string;
    full_name: string;
    email: string;
    password: string;
  } | null>(null);

  const update = useMutation({
    mutationFn: (vars: {
      id: string;
      degree?: number;
      active?: boolean;
      password?: string;
      email?: string;
      full_name?: string;
      is_admin?: boolean;
    }) => updateMember({ data: vars }),
    onSuccess: async () => {
      avisarSucesso(
        "Cadastro atualizado.",
        "Dica: se você alterou o login ou a senha, avise o irmão para usar os novos dados.",
      );
      await invalidate();
    },
    onError: (e: Error) => avisarErro(e, "Não foi possível atualizar o cadastro."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMember({ data: { id } }),
    onSuccess: async () => {
      avisarSucesso("Irmão removido.");
      await invalidate();
    },
    onError: (e: Error) => avisarErro(e, "Não foi possível remover o irmão."),
  });

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg sm:text-xl">Irmãos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Novo irmão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Cadastrar irmão</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="m-name">Nome completo</Label>
                <Input
                  id="m-name"
                  required
                  maxLength={120}
                  value={form.full_name}
                  onChange={(e) => fillCredentials(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-login">Login</Label>
                <Input
                  id="m-login"
                  required
                  maxLength={40}
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Gerado automaticamente a partir do nome. Pode ser editado.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-pass">Senha</Label>
                <div className="flex gap-2">
                  <Input
                    id="m-pass"
                    required
                    minLength={8}
                    maxLength={72}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setForm({ ...form, password: suggestPassword(form.full_name || "Irmao") })
                    }
                  >
                    Gerar
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Grau</Label>
                <Select
                  value={form.degree}
                  onValueChange={(v) => setForm({ ...form, degree: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Aprendiz</SelectItem>
                    <SelectItem value="2">Companheiro</SelectItem>
                    <SelectItem value="3">Mestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="m-admin"
                  checked={form.is_admin}
                  onCheckedChange={(v) => setForm({ ...form, is_admin: v })}
                />
                <Label htmlFor="m-admin">Conceder acesso administrativo</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Cadastrando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="rounded-md border border-border/60 bg-card p-3"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium leading-snug text-card-foreground">
                    {m.full_name}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {emailToLogin(m.email)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {m.is_admin ? <Badge>Admin</Badge> : null}
                    <Badge variant={m.active ? "outline" : "secondary"}>
                      {m.active ? "Ativo" : "Suspenso"}
                    </Badge>
                    <Badge variant="outline">{degreeLabel(m.degree)}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar login e senha"
                    onClick={() =>
                      setEditing({
                        id: m.id,
                        full_name: m.full_name,
                        email: emailToLogin(m.email),
                        password: "",
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover irmão"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remover definitivamente o acesso de ${m.full_name}? A ação não pode ser desfeita.`,
                        )
                      ) {
                        remove.mutate(m.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3">
                <Select
                  value={String(m.degree)}
                  onValueChange={(v) => update.mutate({ id: m.id, degree: Number(v) })}
                >
                  <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Grau do irmão">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Aprendiz</SelectItem>
                    <SelectItem value="2">Companheiro</SelectItem>
                    <SelectItem value="3">Mestre</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={m.is_admin}
                    aria-label="Acesso administrativo"
                    onCheckedChange={(v) => update.mutate({ id: m.id, is_admin: v })}
                  />
                  <span className="text-xs text-muted-foreground">Admin</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={m.active}
                    aria-label="Acesso ativo"
                    onCheckedChange={(v) => update.mutate({ id: m.id, active: v })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {m.active ? "Ativo" : "Suspenso"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum irmão cadastrado.</p>
          ) : null}
        </div>
      )}

      <Dialog open={createdInfo !== null} onOpenChange={(o) => !o && setCreatedInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Credenciais do irmão</DialogTitle>
          </DialogHeader>
          {createdInfo ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Anote e entregue ao irmão. A senha não poderá ser exibida novamente.
              </p>
              <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2">
                <span>
                  <span className="text-muted-foreground">Login: </span>
                  <span className="font-medium">{createdInfo.login}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(createdInfo.login, "Login copiado")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2">
                <span>
                  <span className="text-muted-foreground">Senha: </span>
                  <span className="font-medium">{createdInfo.password}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(createdInfo.password, "Senha copiada")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    copyText(credentialsMessage(createdInfo), "Mensagem copiada")
                  }
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(credentialsMessage(createdInfo))}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatedInfo(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar acesso</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const email = editing.email.trim() ? loginToEmail(editing.email) : "";
                const password = editing.password;
                if (password && password.length < 8) {
                  avisarErro("A senha deve ter ao menos 8 caracteres.");
                  return;
                }
                update.mutate(
                  {
                    id: editing.id,
                    full_name: editing.full_name.trim(),
                    ...(email ? { email } : {}),
                    ...(password ? { password } : {}),
                  },
                  { onSuccess: () => setEditing(null) },
                );
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="e-name">Nome</Label>
                <Input
                  id="e-name"
                  required
                  value={editing.full_name}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-email">Login</Label>
                <Input
                  id="e-email"
                  required
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-pass">Nova senha</Label>
                <div className="flex gap-2">
                  <Input
                    id="e-pass"
                    type="text"
                    placeholder="Deixe em branco para manter a atual"
                    value={editing.password}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setEditing({ ...editing, password: suggestPassword(editing.full_name) })
                    }
                  >
                    Gerar
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={update.isPending}>
                  Salvar alterações
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}



