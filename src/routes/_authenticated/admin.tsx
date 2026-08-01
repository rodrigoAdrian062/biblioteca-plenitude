import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  createMember,
  deleteMember,
  listMembers,
  updateMember,
} from "@/lib/admin.functions";
import { adminStats, listBooks } from "@/lib/library.functions";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/admin")({
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
      <AppHeader fullName={profile?.full_name} degree={profile?.degree} isAdmin={isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl">Administração</h1>
        <div className="gold-rule my-4 h-px w-32" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        ) : !isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Acesso restrito à administração da Loja.
          </p>
        ) : (
          <Tabs defaultValue="acervo">
            <TabsList>
              <TabsTrigger value="acervo">Acervo</TabsTrigger>
              <TabsTrigger value="irmaos">Irmãos</TabsTrigger>
              <TabsTrigger value="painel">Painel</TabsTrigger>
            </TabsList>
            <TabsContent value="acervo" className="mt-6">
              <BooksAdmin />
            </TabsContent>
            <TabsContent value="irmaos" className="mt-6">
              <MembersAdmin />
            </TabsContent>
            <TabsContent value="painel" className="mt-6">
              <StatsPanel />
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
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
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
};

const emptyBook: BookForm = {
  title: "",
  author: "",
  category: "",
  description: "",
  min_degree: 1,
  published: true,
};

function BooksAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyBook);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function upload(f: File, folder: string) {
    const ext = f.name.split(".").pop() ?? "bin";
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
        file_path?: string;
        cover_path?: string;
      } = {
        title: form.title.trim(),
        author: form.author.trim() || null,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        min_degree: form.min_degree,
        published: form.published,
      };
      if (file) payload.file_path = await upload(file, "obras");
      if (cover) payload.cover_path = await upload(cover, "capas");

      if (editingId) {
        const { error } = await supabase.from("books").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
      } else {
        if (!file) throw new Error("Selecione o arquivo da obra.");
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw new Error(error.message);
      }
      toast.success(editingId ? "Obra atualizada." : "Obra publicada no acervo.");
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar a obra.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Obra removida.");
    await queryClient.invalidateQueries({ queryKey: ["books"] });
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Obras do acervo</h2>
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
                    {DEGREES.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Arquivo (PDF/EPUB)</Label>
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {books.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-card-foreground">{b.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.author || "Autor não informado"}
                </p>
              </div>
              <Badge variant="outline">{degreeLabel(b.min_degree)}</Badge>
              {!b.published ? <Badge variant="secondary">Rascunho</Badge> : null}
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
    email: "",
    password: "",
    full_name: "",
    lodge: "",
    degree: 1,
    is_admin: false,
  });

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
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          degree: form.degree,
          lodge: form.lodge.trim() || null,
          is_admin: form.is_admin,
        },
      }),
    onSuccess: async () => {
      toast.success("Irmão cadastrado.");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", lodge: "", degree: 1, is_admin: false });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
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
      toast.success("Cadastro atualizado.");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMember({ data: { id } }),
    onSuccess: async () => {
      toast.success("Irmão removido.");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Irmãos</h2>
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
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-email">E-mail</Label>
                <Input
                  id="m-email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-pass">Senha provisória</Label>
                <Input
                  id="m-pass"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-lodge">Loja</Label>
                <Input
                  id="m-lodge"
                  maxLength={160}
                  value={form.lodge}
                  onChange={(e) => setForm({ ...form, lodge: e.target.value })}
                />
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
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-card-foreground">{m.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.is_admin ? <Badge>Admin</Badge> : null}
              <Select
                value={String(m.degree)}
                onValueChange={(v) => update.mutate({ id: m.id, degree: Number(v) })}
              >
                <SelectTrigger className="w-40">
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
                  checked={m.active}
                  aria-label="Acesso ativo"
                  onCheckedChange={(v) => update.mutate({ id: m.id, active: v })}
                />
                <span className="text-xs text-muted-foreground">
                  {m.active ? "Ativo" : "Suspenso"}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar login e senha"
                onClick={() =>
                  setEditing({
                    id: m.id,
                    full_name: m.full_name,
                    email: m.email,
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
                onClick={() => remove.mutate(m.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum irmão cadastrado.</p>
          ) : null}
        </div>
      )}

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
                const email = editing.email.trim();
                const password = editing.password;
                if (password && password.length < 8) {
                  toast.error("A senha deve ter ao menos 8 caracteres.");
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
                <Label htmlFor="e-email">Login (e-mail)</Label>
                <Input
                  id="e-email"
                  type="email"
                  required
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-pass">Nova senha</Label>
                <Input
                  id="e-pass"
                  type="text"
                  placeholder="Deixe em branco para manter a atual"
                  value={editing.password}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                />
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
