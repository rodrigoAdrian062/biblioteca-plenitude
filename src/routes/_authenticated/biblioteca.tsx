import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { listBooks } from "@/lib/library.functions";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { SCOPES, catalogName, scopeLabel } from "@/lib/catalog";

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
  const { q, autor, categoria, grau, tema } = Route.useSearch();
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

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });

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
      return matchTerm && matchDegree && matchAuthor && matchCategory;
    };
  }, [q, grau, autor, categoria]);

  const baseVisible = useMemo(() => books.filter(matchesBase), [books, matchesBase]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { maconico: 0, nao_maconico: 0 };
    for (const b of baseVisible) {
      const s = (b.scope ?? "maconico") as string;
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [baseVisible]);

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

  const hasFilters = Boolean(q || autor || categoria || grau || tema);

  // Filtros persistentes entre sessões
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasFilters) return;
    const saved = window.localStorage.getItem("acervo-filtros");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<LibrarySearch>;
      if (parsed && (parsed.q || parsed.autor || parsed.categoria || parsed.grau || parsed.tema)) {
        void navigate({
          search: () => ({
            q: parsed.q ?? "",
            autor: parsed.autor ?? "",
            categoria: parsed.categoria ?? "",
            grau: Number(parsed.grau) || 0,
            tema: parsed.tema ?? "",
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
      JSON.stringify({ q, autor, categoria, grau, tema }),
    );
  }, [q, autor, categoria, grau, tema]);




  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        fullName={profile?.full_name}
        degree={profile?.degree}
        isAdmin={isAdmin}
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl text-foreground">Acervo</h1>
        <div className="gold-rule my-4 h-px w-32" />
        <p className="text-sm text-muted-foreground">
          {profile
            ? `Irmão ${profile.full_name} — grau de ${degreeLabel(profile.degree)}. Obras liberadas até o seu grau.`
            : "Carregando dados do irmão..."}
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
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
              <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por autor">
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
              <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por categoria">
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
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Tema</span>
            <Button
              variant={!tema ? "default" : "outline"}
              size="sm"
              onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tema: "" }) })}
            >
              Todos ({baseVisible.length})
            </Button>
            {SCOPES.map((s) => (
              <Button
                key={s.value}
                variant={tema === s.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  void navigate({ search: (prev: LibrarySearch) => ({ ...prev, tema: s.value }) })
                }
              >
                {s.label} ({counts[s.value] ?? 0})
              </Button>
            ))}

          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Grau</span>
            <Button
              variant={!grau ? "default" : "outline"}
              size="sm"
              onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, grau: 0 }) })}
            >
              Todos
            </Button>
            {DEGREES.filter((d) => !profile || d.value <= profile.degree).map((d) => (
              <Button
                key={d.value}
                variant={grau === d.value ? "default" : "outline"}
                size="sm"
                onClick={() => void navigate({ search: (prev: LibrarySearch) => ({ ...prev, grau: d.value }) })}
              >
                {d.label}
              </Button>
            ))}
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigate({ search: { q: "", autor: "", categoria: "", grau: 0, tema: "" } })
                }
              >
                <X className="mr-1 h-4 w-4" />
                Limpar filtros
              </Button>
            ) : null}

            <span className="ml-auto text-xs text-muted-foreground">
              {visible.length} obra{visible.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>


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
                  void navigate({ search: { q: "", autor: "", categoria: "", grau: 0, tema: "" } })
                }
              >
                <X className="mr-1 h-4 w-4" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        ) : tema ? (
          <BookGrid books={visible} className="mt-8" />
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
                  <BookGrid books={s.books} />
                </section>
              ))}
          </div>
        )}

      </main>
    </div>
  );
}

type BookItem = Awaited<ReturnType<typeof listBooks>>[number];

function BookGrid({ books, className = "" }: { books: BookItem[]; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {books.map((book) => (
        <Card key={book.id} className="group flex flex-col overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <div className="aspect-[3/4] w-full bg-secondary">
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
            <Badge
              variant={book.scope === "nao_maconico" ? "secondary" : "default"}
              className="w-fit px-1.5 text-[10px]"
            >
              {scopeLabel(book.scope)}
            </Badge>
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
