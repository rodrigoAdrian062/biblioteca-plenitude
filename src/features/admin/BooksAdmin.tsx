import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, BookOpen, Search, Download, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listBooks } from "@/lib/library.functions";
import { avisarErro, avisarSucesso } from "@/lib/avisos";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { SCOPES, KINDS, catalogName, scopeLabel, kindLabel, type BookScope, type BookKind } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  download_enabled: boolean;
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
  download_enabled: false,
};

export function BooksAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyBook);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<BookScope | "todos">("todos");
  const [degreeFilter, setDegreeFilter] = useState<number | "todos">("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateBook, setDuplicateBook] = useState<{ id: string; title: string } | null>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });

  function reset() {
    setForm(emptyBook);
    setFile(null);
    setCover(null);
    setEditingId(null);
    setDuplicateBook(null);
  }

  const checkDuplicate = async (title: string) => {
    if (!title.trim() || editingId) {
      setDuplicateBook(null);
      return;
    }
    const { data } = await supabase
      .from("books")
      .select("id, title")
      .ilike("title", title.trim())
      .maybeSingle();
    setDuplicateBook(data ? { id: data.id, title: data.title } : null);
  };

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
    const isNew = !editingId;
    setSaving(true);
    try {
      const titleTrimmed = form.title.trim();
      
      // Check for duplicates only when creating a new book
      if (isNew) {
        const { data: existing } = await supabase
          .from("books")
          .select("id")
          .ilike("title", titleTrimmed)
          .maybeSingle();

        if (existing) {
          throw new Error("Esta obra já está cadastrada na biblioteca.");
        }
      }

      const payload: any = {
        title: form.title.trim(),
        author: form.author.trim() || null,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        min_degree: form.min_degree,
        published: form.published,
        watermark_enabled: form.watermark_enabled,
        scope: form.scope,
        kind: form.kind || "livro",
        external_url: form.external_url.trim() || null,
        download_enabled: form.download_enabled,
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
      avisarErro(err, "Não foi possível salvar essa obra.");
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
                   onChange={(e) => {
                     setForm({ ...form, title: e.target.value });
                     checkDuplicate(e.target.value);
                   }}
                 />
                 {duplicateBook && (
                   <p className="text-xs font-medium text-destructive">
                     ⚠️ Esta obra já existe na biblioteca.
                     <a 
                       href={`/obra/${duplicateBook.id}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="ml-1 underline underline-offset-2 hover:text-destructive/80"
                     >
                       Ver obra existente
                     </a>
                   </p>
                 )}
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
                  <Label htmlFor="min_degree">Grau (Categoria)</Label>
                  <Select
                    value={String(form.min_degree)}
                    onValueChange={(v) => setForm({ ...form, min_degree: Number(v) })}
                  >
                    <SelectTrigger id="min_degree">
                      <SelectValue placeholder="Selecione o grau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sem grau (liberado para todos)</SelectItem>
                      {DEGREES.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              <div className="flex items-center justify-between space-x-2 rounded-lg border border-border/60 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="download-toggle">Permitir Download</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite que os irmãos baixem o arquivo da obra.
                  </p>
                </div>
                <Switch
                  id="download-toggle"
                  checked={form.download_enabled}
                  onCheckedChange={(v) => setForm({ ...form, download_enabled: v })}
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

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tema:</span>
            <Button
              size="sm"
              variant={scopeFilter === "todos" ? "default" : "outline"}
              className="h-7 px-3 text-xs rounded-full"
              onClick={() => setScopeFilter("todos")}
            >
              Todos
            </Button>
            {SCOPES.map((s) => (
              <Button
                key={s.value}
                size="sm"
                variant={scopeFilter === s.value ? "default" : "outline"}
                className="h-7 px-3 text-xs rounded-full"
                onClick={() => setScopeFilter(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Procurar obras, autores, músicas..."
              className="h-9 pl-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Grau:</span>
          <Button
            size="sm"
            variant={degreeFilter === "todos" ? "default" : "outline"}
            className="h-7 px-3 text-xs rounded-full"
            onClick={() => setDegreeFilter("todos")}
          >
            Todos
          </Button>
          {DEGREES.map((d) => (
            <Button
              key={d.value}
              size="sm"
              variant={degreeFilter === d.value ? "default" : "outline"}
              className="h-7 px-3 text-xs rounded-full"
              onClick={() => setDegreeFilter(d.value)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-3 animate-pulse">
              <Skeleton className="h-16 w-12 rounded bg-muted/20" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {books
            .filter((b) => {
              const matchesScope = scopeFilter === "todos" || (b.scope ?? "maconico") === scopeFilter;
              const matchesDegree = degreeFilter === "todos" || b.min_degree === degreeFilter;
              const matchesSearch = !searchTerm || 
                b.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                b.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.category?.toLowerCase().includes(searchTerm.toLowerCase());
              return matchesScope && matchesDegree && matchesSearch;
            })
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
                    {b.kind === 'video' ? <Video className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="break-words font-medium leading-snug text-card-foreground">
                  {catalogName(b.author, b.title)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(b as any).download_enabled && (
                    <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] text-green-500 border-green-500/30 bg-green-500/5">
                      <Download className="h-3 w-3" />
                      Download Liberado
                    </Badge>
                  )}
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {degreeLabel(b.min_degree)}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {kindLabel(b.kind)}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {scopeLabel(b.scope)}
                  </Badge>
                  {b.watermark_enabled && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-primary border-primary/30">
                      M.D.
                    </Badge>
                  )}
                  {!b.published && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-destructive border-destructive/30">
                      Rascunho
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:self-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditingId(b.id);
                    setForm({
                      title: b.title,
                      author: b.author || "",
                      category: b.category || "",
                      description: b.description || "",
                      min_degree: b.min_degree,
                      published: b.published,
                      watermark_enabled: b.watermark_enabled,
                      scope: b.scope as BookScope,
                      kind: b.kind as BookKind,
                      external_url: b.external_url || "",
                      download_enabled: (b as any).download_enabled || false,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {books.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma obra encontrada.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
