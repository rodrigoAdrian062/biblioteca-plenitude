import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { BookOpen, Search, X, Heart, History, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { listBooks } from "@/lib/library.functions";
import { listFavorites, toggleFavorite, listHistory, clearProgress } from "@/lib/reading.functions";
import { DEGREES } from "@/lib/masonic";
import { SCOPES, KINDS, catalogName } from "@/lib/catalog";
import { BookGrid } from "@/features/library/BookGrid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    tipo: typeof search['tipo'] === "string" ? search['tipo'] : "",
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

  const { data: books = [], isLoading, error: booksError } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      console.log("[Library] Fetching books...");
      try {
        const result = await listBooks();
        console.log(`[Library] Fetched ${result.length} books successfully.`);
        return result;
      } catch (err) {
        console.error("[Library] Error fetching books:", err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutos
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

  const categories = useMemo(() => {
    const fromDb = books.map((b) => (b.category ?? "").trim()).filter(Boolean);
    const degreeNames = DEGREES.map((d) => d.label);
    return Array.from(new Set([...degreeNames, ...fromDb])).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [books]);

  const matchesBase = useMemo(() => {
    const t = q.trim().toLowerCase();
    const categoriaDegree = DEGREES.find((d) => d.label === categoria)?.value ?? null;
    return (b: (typeof books)[number]) => {
      const matchTerm =
        !t ||
        b.title.toLowerCase().includes(t) ||
        (b.author ?? "").toLowerCase().includes(t) ||
        (b.category ?? "").toLowerCase().includes(t) ||
        (b.description ?? "").toLowerCase().includes(t);
      // Grau exato: ao escolher Aprendiz, aparecem somente obras de Aprendiz
      const matchDegree = !grau || b.min_degree === grau;
      const matchAuthor = !autor || (b.author ?? "").trim() === autor;
      const matchCategory =
        !categoria ||
        (b.category ?? "").trim() === categoria ||
        (categoriaDegree !== null && b.min_degree === categoriaDegree);
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
    const map: Record<string, number> = {};
    KINDS.forEach(k => map[k.value] = 0);
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

  const grauSelecionado = DEGREES.find((d) => d.label === categoria)?.value ?? 0;
  const grauBloqueado = !isAdmin && grauSelecionado > (profile?.degree ?? 0);

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
        <section className="relative rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-xl text-foreground sm:text-2xl uppercase tracking-tight">Acervo</h1>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                {profile
                  ? `Ir∴ ${profile.full_name.split(' ')[0]} — Grau ${profile.degree}`
                  : "Carregando..."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="h-6 px-2 text-[10px]">
                {visible.length} {visible.length === 1 ? "obra" : "obras"}
              </Badge>
            </div>
          </div>
        </section>


        <section className="mt-6 space-y-6 rounded-2xl border border-border/40 bg-card/40 p-5 sm:p-6 backdrop-blur-sm shadow-xl shadow-black/20">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_14rem]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                className="pl-9 h-11 border-border/60 bg-background/40 hover:border-primary/30 transition-colors"
                type="search"
                inputMode="search"
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
              <SelectTrigger className="w-full h-11 border-border/60 bg-background/40" aria-label="Filtrar por autor">
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
              <SelectTrigger className="w-full h-11 border-border/60 bg-background/40" aria-label="Filtrar por categoria">
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

          <div className="space-y-5">
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">Tema do acervo</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={!tema ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full px-4 h-8 transition-all ${!tema ? 'shadow-[0_0_12px_rgba(246,172,25,0.3)]' : 'border-border/60 hover:border-primary/40'}`}
                  onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tema: "" }) })}
                >
                  Todos ({baseVisible.length})
                </Button>
                {SCOPES.map((s) => {
                  const degreeValue = s.value === 'maconico' ? (profile?.degree ?? 0) : null;
                  return (
                    <Button
                      key={s.value}
                      variant={tema === s.value ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full px-4 h-8 transition-all flex items-center gap-2 ${tema === s.value ? 'shadow-[0_0_12px_rgba(246,172,25,0.3)]' : 'border-border/60 hover:border-primary/40'}`}
                      onClick={() =>
                        void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tema: s.value }) })
                      }
                    >
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${tema === s.value ? 'bg-primary-foreground shadow-[0_0_8px_white]' : 'bg-muted-foreground/40'}`} />
                      {s.label}
                      {degreeValue !== null && (
                        <span className="ml-1 opacity-70 font-bold">({degreeValue})</span>
                      )}
                      <span className="ml-1 text-[10px] opacity-60">
                        ({counts[s.value] ?? 0})
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">Tipo</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={!tipo ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full px-4 h-8 transition-all ${!tipo ? 'shadow-[0_0_12px_rgba(246,172,25,0.3)]' : 'border-border/60 hover:border-primary/40'}`}
                  onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tipo: "" }) })}
                >
                  Todos
                </Button>
                {KINDS.map((k) => (
                  <Button
                    key={k.value}
                    variant={tipo === k.value ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full px-4 h-8 transition-all flex items-center gap-2 ${tipo === k.value ? 'shadow-[0_0_12px_rgba(246,172,25,0.3)]' : 'border-border/60 hover:border-primary/40'}`}
                    onClick={() =>
                      void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tipo: k.value }) })
                    }
                  >
                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${tipo === k.value ? 'bg-primary-foreground shadow-[0_0_8px_white]' : 'bg-muted-foreground/40'}`} />
                    {k.label} ({kindCounts[k.value] ?? 0})
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">Minhas</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={fav ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full px-4 h-8 transition-all flex items-center gap-2 ${fav ? 'shadow-[0_0_12px_rgba(246,172,25,0.3)]' : 'border-border/60 hover:border-primary/40'}`}
                  aria-pressed={fav}
                  onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, fav: !prev.fav }) })}
                >
                  <Heart className={`h-3.5 w-3.5 transition-all ${fav ? "fill-current scale-110" : ""}`} />
                  Favoritas ({favorites.length})
                </Button>
              </div>
            </div>
          </div>

          {hasFilters && (
            <div className="flex w-full items-center justify-between border-t border-border/20 pt-5">
              <span className="text-[10px] font-semibold text-primary/80 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                Dica: Limpe os filtros para ver todo o acervo
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30"
                onClick={() =>
                  void navigate({ search: { q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false } })
                }
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </div>
          )}
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
                <div key={h.book_id} className="relative w-56 shrink-0 group">
                  <Link
                    to="/obra/$id"
                      params={{ id: h.book_id }}
                      search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}
                      {...(h.download_enabled ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex gap-3 rounded-xl border border-border/60 bg-card p-2 pr-7 transition-colors hover:border-primary/40"
                  >
                    <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-secondary relative">
                      {h.cover_url ? (
                        <img 
                          src={h.cover_url} 
                          alt={`Capa da obra ${h.title}`} 
                          loading="lazy" 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x150?text=Capa';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] text-muted-foreground">Sem Capa</div>
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
                    className="absolute right-1 top-1 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
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

        {grauBloqueado ? (
          <div className="mt-8 rounded-xl border border-primary/40 bg-primary/10 p-5 text-center">
            <h3 className="font-display text-lg text-foreground">
              Acervo do grau de {categoria} ainda não liberado
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Meu Irmão, estas obras são reservadas aos Irmãos do grau de {categoria}. Elas ficarão
              disponíveis automaticamente assim que o seu grau for atualizado no sistema.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Se você já foi elevado ao grau de {categoria}, entre em contato com o Mestre
              Bibliotecário, Ir∴ Menezes, para atualizar o seu cadastro.
            </p>
          </div>
        ) : null}

        {booksError ? (
          <div className="mt-8 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center">
            <h3 className="text-lg font-medium text-destructive">Erro ao carregar obras</h3>
            <p className="mt-1 text-sm text-destructive/80">
              {booksError instanceof Error ? booksError.message : "Ocorreu um problema na comunicação com o banco de dados."}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                console.log("[Library] Retrying fetch...");
                void queryClient.invalidateQueries({ queryKey: ["books"] });
              }}
            >
              Tentar novamente
            </Button>
          </div>
        ) : isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3 animate-pulse">
                <Skeleton className="h-16 w-12 shrink-0 rounded bg-muted/20" />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-2.5 w-1/2 rounded opacity-60" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-3.5 w-10 rounded-full" />
                    <Skeleton className="h-3.5 w-12 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : grauBloqueado ? null : visible.length === 0 ? (
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
          tipo ? (
            <BookGrid books={visible} favSet={favSet} onToggleFavorite={onToggleFavorite} className="mt-8" showShare={fav} />
          ) : (
            <div className="mt-8 space-y-8">
              {KINDS.map((k) => {
                const list = visible.filter((b) => (b.kind ?? "livro") === k.value);
                if (list.length === 0) return null;
                return (
                  <section key={k.value} aria-labelledby={`tipo-${k.value}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 id={`tipo-${k.value}`} className="font-display text-lg text-foreground">
                        {k.label}
                      </h3>
                      <Badge variant="outline" className="text-[10px]">
                        {list.length} obra{list.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="gold-rule my-3 h-px w-full" />
                    <BookGrid favSet={favSet} onToggleFavorite={onToggleFavorite} books={list} showShare={fav} />
                  </section>
                );
              })}
            </div>
          )
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
                  {tipo ? (
                    <BookGrid favSet={favSet} onToggleFavorite={onToggleFavorite} books={s.books} showShare={fav} />
                  ) : (
                    <div className="space-y-6">
                      {KINDS.map((k) => {
                        const list = s.books.filter((b) => (b.kind ?? "livro") === k.value);
                        if (list.length === 0) return null;
                        return (
                          <div key={k.value}>
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                {k.label}
                              </h3>
                              <Badge variant="outline" className="text-[10px]">
                                {list.length}
                              </Badge>
                            </div>
                            <BookGrid favSet={favSet} onToggleFavorite={onToggleFavorite} books={list} showShare={fav} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
          </div>
        )}

      </main>
    </div>
  );
}

