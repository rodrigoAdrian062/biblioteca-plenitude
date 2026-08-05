import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Copy, Library, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
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
import { adminStats, listBooks, getGlobalSettings, updateGlobalSetting } from "@/lib/library.functions";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { SCOPES, KINDS, catalogName, scopeLabel, kindLabel, type BookScope, type BookKind } from "@/lib/catalog";

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
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: auth.user.id,
      _role: "admin",
    });
    if (error || !isAdmin) throw redirect({ to: "/biblioteca", search: { q: "", autor: "", categoria: "", grau: 0, tema: "", fav: false } });
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
              <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", fav: false }}>
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
              <TabsTrigger value="config">Configurações</TabsTrigger>

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
            <TabsContent value="config" className="mt-5">
              <SettingsAdmin />
            </TabsContent>

          </Tabs>
        )}
      </main>
    </div>
  );
}

function StatsPanel() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminStats() });
  const cards = [
    { label: "Irmãos cadastrados", value: data?.members ?? 0 },
    { label: "Obras no acervo", value: data?.books ?? 0 },
    { label: "Leituras registradas", value: data?.reads ?? 0 },
  ];
  const isLoadingStats = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminStats() }).isLoading;

  return (
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
  );
}

type BookForm = {
  title: string;
  author: string;
  category: string;
  description: string;
  min_degree: number;
  published: boolean;
  watermark_enabled: boolean;
  scope: BookScope;
  kind: BookKind;
  external_url: string;
};

const emptyBook: BookForm = {
  title: "",
  author: "",
  category: "",
  description: "",
  min_degree: 1,
  published: true,
  watermark_enabled: false,
  scope: "maconico",
  kind: "livro",
  external_url: "",
};



function BooksAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyBook);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<BookScope | "todos">("todos");


  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });

  function reset() {
    setForm(emptyBook);
    setFile(null);
    setCover(null);
    setEditingId(null);
  }

  async function resizeImage(file: File, maxWidth = 300): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Erro ao processar imagem"));
        }, "image/jpeg", 0.85);
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function upload(f: File | Blob, folder: string, originalName?: string) {
    const ext = originalName?.split(".").pop() ?? (f instanceof File ? f.name.split(".").pop() : "jpg") ?? "bin";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("acervo").upload(path, f);
    if (error) throw new Error(error.message);
    return path;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: {
        title: string;
        author: string | null;
        category: string | null;
        description: string | null;
        min_degree: number;
        published: boolean;
        watermark_enabled: boolean;
        scope: BookScope;
        kind: BookKind;
        file_path?: string;
        cover_path?: string;
        external_url?: string | null;
      } = {
        title: form.title.trim(),
        author: form.author.trim() || null,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        min_degree: form.min_degree,
        published: form.published,
        watermark_enabled: form.watermark_enabled,
        scope: form.scope,
        kind: form.kind,
        external_url: form.external_url.trim() || null,
      };


      if (file) payload.file_path = await upload(file, "obras");
      if (cover) {
        const resized = await resizeImage(cover);
        payload.cover_path = await upload(resized, "capas", cover.name);
      }

      if (editingId) {
        const { error } = await supabase.from("books").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
      } else {
        if (!file && !form.external_url.trim()) throw new Error("Selecione o arquivo da obra ou informe um link externo.");
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw new Error(error.message);
      }
      avisarSucesso(editingId ? "Obra atualizada." : "Obra publicada no acervo.", "Dica: os irmãos com o grau exigido já podem visualizá-la.");
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      setOpen(false);
      reset();
    } catch (err) {
      avisarErro(err, "Não foi possível salvar a obra.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remover esta obra do acervo? A ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) {
      avisarErro(error, "Não foi possível remover a obra.");
      return;
    }
    avisarSucesso("Obra removida.");
    await queryClient.invalidateQueries({ queryKey: ["books"] });
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg sm:text-xl">Obras do acervo</h2>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Nova obra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingId ? "Editar obra" : "Nova obra"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <p className="rounded-md border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                Nome padronizado:{" "}
                <span className="font-medium text-card-foreground">
                  {catalogName(form.author, form.title) || "AUTOR, Nome - Título"}
                </span>
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="author">Autor</Label>
                  <Input
                    id="author"
                    maxLength={160}
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    maxLength={80}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  maxLength={1000}
                  className="min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Grau mínimo</Label>
                <Select
                  value={String(form.min_degree)}
                  onValueChange={(v) => setForm({ ...form, min_degree: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem grau — liberado para todos</SelectItem>
                    {DEGREES.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use “Sem grau” para obras não-maçônicas: ficam visíveis a todos os irmãos.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tema do acervo</Label>
                <Select
                  value={form.scope}
                  onValueChange={(v) => {
                    const scope = v as BookScope;
                    setForm({
                      ...form,
                      scope,
                      min_degree: scope === "nao_maconico" ? 0 : form.min_degree,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo da obra</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as BookKind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="external_url">Link da página (opcional)</Label>
                <Input
                  id="external_url"
                  type="url"
                  placeholder="https://exemplo.com/arquivo"
                  value={form.external_url}
                  onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border border-border/60 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="watermark-toggle">Marca d'água</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibe o nome do irmão sobre o PDF para proteção.
                  </p>
                </div>
                <Switch
                  id="watermark-toggle"
                  checked={form.watermark_enabled}
                  onCheckedChange={(v) => setForm({ ...form, watermark_enabled: v })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo PDF/EPUB (opcional se houver link)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.epub"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">Capa (imagem)</Label>
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={form.published}
                  onCheckedChange={(v) => setForm({ ...form, published: v })}
                />
                <Label htmlFor="published">Publicada no acervo</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={scopeFilter === "todos" ? "default" : "outline"}
          onClick={() => setScopeFilter("todos")}
        >
          Todos
        </Button>
        {SCOPES.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={scopeFilter === s.value ? "default" : "outline"}
            onClick={() => setScopeFilter(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3 rounded-md border border-border/60 bg-card p-3">
              <Skeleton className="h-16 w-12 rounded border border-border/60" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {books
            .filter((b) => scopeFilter === "todos" || (b.scope ?? "maconico") === scopeFilter)
            .map((b) => (

            <div
              key={b.id}
              className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3 rounded-md border border-border/60 bg-card p-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
            >
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-border/60 bg-secondary">
                {b.cover_url ? (
                  <img
                    src={b.cover_url}
                    alt={`Capa da obra ${b.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-primary/50">
                    <BookOpen className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="break-words font-medium leading-snug text-card-foreground">
                  {catalogName(b.author, b.title)}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {b.category || "Sem categoria"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={b.scope === "nao_maconico" ? "secondary" : "default"}>
                    {scopeLabel(b.scope)}
                  </Badge>
                  <Badge variant="outline">{kindLabel(b.kind)}</Badge>
                  <Badge variant="outline">{degreeLabel(b.min_degree)}</Badge>
                  {!b.published ? <Badge variant="secondary">Rascunho</Badge> : null}
                </div>

              </div>

              <div className="col-span-2 flex justify-end gap-1 sm:col-span-1 sm:self-center">


              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar obra"
                onClick={() => {
                  setEditingId(b.id);
                   setForm({
                    title: b.title,
                    author: b.author ?? "",
                    category: b.category ?? "",
                    description: b.description ?? "",
                    min_degree: b.min_degree,
                    published: b.published,
                    watermark_enabled: b.watermark_enabled ?? true,
                    scope: (b.scope as BookScope) ?? "maconico",
                    kind: (b.kind as BookKind) ?? "livro",
                    external_url: b.external_url ?? "",
                  });

                  setOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remover obra"
                onClick={() => void remove(b.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              </div>
            </div>

          ))}
          {books.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada ainda.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function MembersAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    login: "",
    password: "",
    full_name: "",
    degree: 1,
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
          degree: form.degree,
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
      setForm({ login: "", password: "", full_name: "", degree: 1, is_admin: false });
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
                  value={String(form.degree)}
                  onValueChange={(v) => setForm({ ...form, degree: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEGREES.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
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
                    {DEGREES.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
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

function SettingsAdmin() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["global-settings"],
    queryFn: () => getGlobalSettings(),
  });

  const updateSetting = useMutation({
    mutationFn: (vars: { key: string; value: any }) => updateGlobalSetting({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-settings"] });
      avisarSucesso("Configuração atualizada.");
    },
    onError: (err: any) => avisarErro(err, "Erro ao atualizar configuração."),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  const watermarkGlobal = settings?.["watermark_enabled"] === true;

  return (
    <Card className="rounded-2xl border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="font-display">Configurações Gerais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 rounded-lg border border-border/60 p-4">
          <div className="space-y-1">
            <Label className="text-base">Marca d'água global</Label>
            <p className="text-sm text-muted-foreground">
              Se ativado, as obras com marca d'água individual habilitada exibirão o nome do irmão. 
              Se desativado, nenhuma obra exibirá marca d'água, independente da configuração individual.
            </p>
          </div>
          <Switch
            checked={watermarkGlobal}
            onCheckedChange={(v) => updateSetting.mutate({ key: "watermark_enabled", value: v })}
            disabled={updateSetting.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

