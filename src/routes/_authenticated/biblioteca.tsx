import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { BookOpen, Search, X, Heart, History, Trash2, LayoutGrid, Grid2x2, List } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { listBooks } from "@/lib/library.functions";
import { listFavorites, toggleFavorite, listHistory, clearProgress } from "@/lib/reading.functions";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { SCOPES, KINDS, catalogName, scopeLabel, kindLabel } from "@/lib/catalog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LibrarySearch = {
  q: string;
  autor: string;
  categoria: string;
  grau: number;
  tema: string;
  tipo: string;
  fav: boolean;
};

const ALL = "__all__";

type ViewMode = "grande" | "compacto" | "lista";

const VIEWS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: "grande", label: "Blocos", icon: LayoutGrid },
  { value: "compacto", label: "Compacto", icon: Grid2x2 },
  { value: "lista", label: "Lista", icon: List },
];

export const Route = createFileRoute("/_authenticated/biblioteca")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    q: typeof search['q'] === "string" ? search['q'] : "",
    autor: typeof search['autor'] === "string" ? search['autor'] : "",
    categoria: typeof search['categoria'] === "string" ? search['categoria'] : "",
    grau: Number(search['grau']) || 0,
    tema:
      search['tema'] === "maconico" || search['tema'] === "nao_maconico"
        ? (search['tema'] as string)
        : "",
    tipo: search['tipo'] === "livro" || search['tipo'] === "artigo" ? (search['tipo'] as string) : "",
    fav: search['fav'] === true || search['fav'] === "true",
  }),


  head: () => ({
    meta: [
      { title: "Acervo | Biblioteca Plenitude" },
      {
        name: "description",
        content: "Acervo maçônico disponível conforme o grau do irmão: Aprendiz, Companheiro e Mestre.",
      },
      { property: "og:title", content: "Acervo | Biblioteca Plenitude" },
      { property: "og:description", content: "Obras liberadas de acordo com o grau do irmão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Library,
});

function Library() {
  const { profile, isAdmin } = useSessionProfile();
  const navigate = useNavigate({ from: "/biblioteca" });
  const { q, autor, categoria, grau, tema, tipo, fav } = Route.useSearch();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState(q);
  const [view, setView] = useState<ViewMode>("grande");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("acervo-visualizacao");
    if (saved === "grande" || saved === "compacto" || saved === "lista") setView(saved);
  }, []);

  function changeView(v: ViewMode) {
    setView(v);
    if (typeof window !== "undefined") window.localStorage.setItem("acervo-visualizacao", v);
  }

  useEffect(() => {
    setTerm(q);
  }, [q]);

  // Debounce do campo de busca para a URL
  useEffect(() => {
    if (term === q) return;
    const id = setTimeout(() => {
      void navigate({ search: (prev: LibrarySearch) => ({ ...prev, q: term.slice(0, 100) }) });
    }, 300);
    return () => clearTimeout(id);
  }, [term, q, navigate]);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["reading-history"],
    queryFn: () => listHistory(),
  });

  const favMutation = useMutation({
    mutationFn: (vars: { bookId: string; favorite: boolean }) => toggleFavorite({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const clearMutation = useMutation({
    mutationFn: (vars: { bookId?: string }) => clearProgress({ data: vars }),
    onSuccess: (_res, vars) => {
      try {
        if (vars.bookId) {
          localStorage.removeItem(`plenitude:leitura:${vars.bookId}`);
        } else {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("plenitude:leitura:"))
            .forEach((k) => localStorage.removeItem(k));
        }
      } catch {
        /* ignore */
      }
      void queryClient.invalidateQueries({ queryKey: ["reading-history"] });
    },
  });

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const onToggleFavorite = (bookId: string, favorite: boolean) =>
    favMutation.mutate({ bookId, favorite });

  const authors = useMemo(
    () =>
      Array.from(new Set(books.map((b) => (b.author ?? "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [books],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(books.map((b) => (b.category ?? "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [books],
  );

  const matchesBase = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (b: (typeof books)[number]) => {
      const matchTerm =
        !t ||
        b.title.toLowerCase().includes(t) ||
        (b.author ?? "").toLowerCase().includes(t) ||
        (b.category ?? "").toLowerCase().includes(t) ||
        (b.description ?? "").toLowerCase().includes(t);
      const matchDegree = !grau || b.min_degree === grau;
      const matchAuthor = !autor || (b.author ?? "").trim() === autor;
      const matchCategory = !categoria || (b.category ?? "").trim() === categoria;
      const matchKind = !tipo || (b.kind ?? "livro") === tipo;
      const matchFav = !fav || favSet.has(b.id);
      return matchTerm && matchDegree && matchAuthor && matchCategory && matchKind && matchFav;
    };
  }, [q, grau, autor, categoria, tipo, fav, favSet]);


  const baseVisible = useMemo(() => books.filter(matchesBase), [books, matchesBase]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { maconico: 0, nao_maconico: 0 };
    for (const b of baseVisible) {
      const s = (b.scope ?? "maconico") as string;
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [baseVisible]);

  const kindCounts = useMemo(() => {
    const map: Record<string, number> = { livro: 0, artigo: 0 };
    for (const b of books.filter(matchesBase)) {
      const k = (b.kind ?? "livro") as string;
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [books, matchesBase]);

  const visible = useMemo(
    () => (tema ? baseVisible.filter((b) => (b.scope ?? "maconico") === tema) : baseVisible),
    [baseVisible, tema],
  );

  const sections = useMemo(
    () =>
      SCOPES.map((s) => ({
        ...s,
        books: baseVisible.filter((b) => (b.scope ?? "maconico") === s.value),
      })),
    [baseVisible],
  );

  const hasFilters = Boolean(q || autor || categoria || grau || tema || tipo || fav);

  // Filtros persistentes entre sessões
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasFilters) return;
    const saved = window.localStorage.getItem("acervo-filtros");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<LibrarySearch>;
      if (
        parsed &&
        (parsed.q ||
          parsed.autor ||
          parsed.categoria ||
          parsed.grau ||
          parsed.tema ||
          parsed.tipo ||
          parsed.fav)
      ) {
        void navigate({
          search: () => ({
            q: parsed.q ?? "",
            autor: parsed.autor ?? "",
            categoria: parsed.categoria ?? "",
            grau: Number(parsed.grau) || 0,
            tema: parsed.tema ?? "",
            tipo: parsed.tipo ?? "",
            fav: Boolean(parsed.fav),
          }),
          replace: true,
        });
      }
    } catch {
      /* ignora filtros inválidos */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "acervo-filtros",
      JSON.stringify({ q, autor, categoria, grau, tema, tipo, fav }),
    );
  }, [q, autor, categoria, grau, tema, tipo, fav]);





  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        fullName={profile?.full_name}
        degree={profile?.degree}
        isAdmin={isAdmin}
        userId={profile?.id}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl text-foreground sm:text-3xl">Acervo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile
                  ? `Irmão ${profile.full_name} — obras liberadas até o grau de ${degreeLabel(profile.degree)}.`
                  : "Carregando dados do irmão..."}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant="outline">
                {visible.length} obra{visible.length === 1 ? "" : "s"}
              </Badge>
              <div
                role="group"
                aria-label="Modo de visualização"
                className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5"
              >
                {VIEWS.map((v) => (
                  <Button
                    key={v.value}
                    type="button"
                    size="icon"
                    variant={view === v.value ? "default" : "ghost"}
                    className="h-7 w-7 rounded-full"
                    aria-label={`Visualizar em ${v.label.toLowerCase()}`}
                    aria-pressed={view === v.value}
                    title={v.label}
                    onClick={() => changeView(v.value)}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="gold-rule mt-4 h-px w-24" />
        </section>

        <section className="mt-5 space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem_13rem]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                type="search"
                aria-label="Buscar por título, autor ou categoria"
                placeholder="Buscar por título, autor ou categoria"
                value={term}
                maxLength={100}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>

            <Select
              value={autor || ALL}
              onValueChange={(v) =>
                void navigate({ search: (prev: LibrarySearch) => ({ ...prev, autor: v === ALL ? "" : v }) })
              }
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por autor">
                <SelectValue placeholder="Autor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os autores</SelectItem>
                {authors.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoria || ALL}
              onValueChange={(v) =>
                void navigate({ search: (prev: LibrarySearch) => ({ ...prev, categoria: v === ALL ? "" : v }) })
              }
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs uppercase tracking-wide text-muted-foreground">Tema</span>
            <Button
              variant={!tema ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tema: "" }) })}
            >
              Todos ({baseVisible.length})
            </Button>
            {SCOPES.map((s) => (
              <Button
                key={s.value}
                variant={tema === s.value ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() =>
                  void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tema: s.value }) })
                }
              >
                {s.label} ({counts[s.value] ?? 0})
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs uppercase tracking-wide text-muted-foreground">Tipo</span>
            <Button
              variant={!tipo ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tipo: "" }) })}
            >
              Todos
            </Button>
            {KINDS.map((k) => (
              <Button
                key={k.value}
                variant={tipo === k.value ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() =>
                  void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tipo: k.value }) })
                }
              >
                {k.label}s ({kindCounts[k.value] ?? 0})
              </Button>
            ))}
          </div>



          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs uppercase tracking-wide text-muted-foreground">Minhas</span>
            <Button
              variant={fav ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              aria-pressed={fav}
              onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, fav: !prev.fav }) })}
            >
              <Heart className={`mr-1.5 h-4 w-4 ${fav ? "fill-current" : ""}`} />
              Favoritas ({favorites.length})
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs uppercase tracking-wide text-muted-foreground">Grau</span>
            <Button
              variant={!grau ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, grau: 0 }) })}
            >
              Todos
            </Button>
            {DEGREES.filter((d) => !profile || d.value <= profile.degree).map((d) => (
              <Button
                key={d.value}
                variant={grau === d.value ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, grau: d.value }) })}
              >
                {d.label}
              </Button>
            ))}
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto rounded-full"
                onClick={() =>
                  void navigate({ search: { q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false } })
                }
              >
                <X className="mr-1 h-4 w-4" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </section>



        {history.length > 0 && !fav ? (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5" aria-labelledby="continuar-lendo">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h2 id="continuar-lendo" className="font-display text-lg text-foreground">
                  Continuar lendo
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs text-muted-foreground"
                disabled={clearMutation.isPending}
                onClick={() => {
                  if (!window.confirm("Deseja limpar todo o histórico de leitura?")) return;
                  clearMutation.mutate({});
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar tudo
              </Button>
            </div>
            <div className="gold-rule my-3 h-px w-24" />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {history.map((h) => (
                <div key={h.book_id} className="relative w-56 shrink-0">
                  <Link
                    to="/obra/$id"
                    params={{ id: h.book_id }}
                    className="flex gap-3 rounded-xl border border-border/60 bg-card p-2 pr-7 transition-colors hover:border-primary/40"
                  >
                    <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-secondary">
                      {h.cover_url ? (
                        <img src={h.cover_url} alt={`Capa da obra ${h.title}`} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary/50">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        {catalogName(h.author, h.title)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Pág. {h.last_page}
                        {h.total_pages ? `/${h.total_pages}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(h.updated_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${h.title} do histórico`}
                    disabled={clearMutation.isPending}
                    onClick={() => clearMutation.mutate({ bookId: h.book_id })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border/60 bg-card"
                aria-hidden
              >
                <div className="aspect-[3/4] w-full animate-pulse bg-secondary" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-4/5 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-2/5 animate-pulse rounded bg-secondary" />
                  <div className="h-8 w-full animate-pulse rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center">
            <BookOpen className="h-8 w-8 text-primary/60" />
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Nenhuma obra encontrada com os filtros aplicados."
                : "Nenhuma obra disponível para o seu grau no momento."}
            </p>
            {hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void navigate({ search: { q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false } })
                }
              >
                <X className="mr-1 h-4 w-4" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        ) : tema ? (
          <BookGrid books={visible} className="mt-8" favSet={favSet} onToggleFavorite={onToggleFavorite} />
        ) : (
          <div className="mt-8 space-y-10">
            {sections
              .filter((s) => s.books.length > 0)
              .map((s) => (
                <section key={s.value} aria-labelledby={`tema-${s.value}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2
                      id={`tema-${s.value}`}
                      className="font-display text-xl text-foreground"
                    >
                      {s.label}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {s.books.length} obra{s.books.length === 1 ? "" : "s"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void navigate({
                            search: (prev: LibrarySearch) => ({ ...prev, tema: s.value }),
                          })
                        }
                      >
                        Ver só {s.label.toLowerCase()}
                      </Button>
                    </div>
                  </div>
                  <div className="gold-rule my-3 h-px w-full" />
                  <BookGrid favSet={favSet} onToggleFavorite={onToggleFavorite} books={s.books} />
                </section>
              ))}
          </div>
        )}

      </main>
    </div>
  );
}

type BookItem = Awaited<ReturnType<typeof listBooks>>[number];

function BookGrid({
  books,
  className = "",
  favSet,
  onToggleFavorite,
}: {
  books: BookItem[];
  className?: string;
  favSet: Set<string>;
  onToggleFavorite: (bookId: string, favorite: boolean) => void;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {books.map((book) => (
        <Card key={book.id} className="group flex flex-col overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <div className="relative aspect-[3/4] w-full bg-secondary">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={favSet.has(book.id) ? "Remover dos favoritos" : "Marcar como favorita"}
              aria-pressed={favSet.has(book.id)}
              className="absolute right-1.5 top-1.5 z-10 h-8 w-8 rounded-full opacity-90"
              onClick={() => onToggleFavorite(book.id, !favSet.has(book.id))}
            >
              <Heart
                className={`h-4 w-4 ${favSet.has(book.id) ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            </Button>
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={`Capa da obra ${book.title}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-primary/50">
                <BookOpen className="h-8 w-8" />
              </div>
            )}
          </div>
          <CardHeader className="gap-1 p-3 pb-1">
            <div className="flex min-w-0 items-start justify-between gap-1.5">
              <CardTitle className="line-clamp-3 font-display text-sm leading-snug">
                {catalogName(book.author, book.title)}
              </CardTitle>
              <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">
                {degreeLabel(book.min_degree)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant={book.scope === "nao_maconico" ? "secondary" : "default"}
                className="w-fit px-1.5 text-[10px]"
              >
                {scopeLabel(book.scope)}
              </Badge>
              <Badge variant="outline" className="w-fit px-1.5 text-[10px]">
                {kindLabel(book.kind)}
              </Badge>
            </div>

          </CardHeader>
          <CardContent className="mt-auto space-y-2 p-3 pt-0">
            {book.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">{book.description}</p>
            ) : null}
            {book.category ? (
              <Badge variant="secondary" className="text-[10px]">
                {book.category}
              </Badge>
            ) : null}
            <Button asChild className="w-full" size="sm">
              <Link to="/obra/$id" params={{ id: book.id }}>
                <BookOpen className="mr-1.5 h-4 w-4" />
                Ler
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
