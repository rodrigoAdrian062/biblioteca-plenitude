import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { listBooks } from "@/lib/library.functions";
import { DEGREES, degreeLabel } from "@/lib/masonic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Acervo | Biblioteca Maçônica Digital" },
      {
        name: "description",
        content: "Acervo maçônico disponível conforme o grau do irmão: Aprendiz, Companheiro e Mestre.",
      },
      { property: "og:title", content: "Acervo | Biblioteca Maçônica Digital" },
      { property: "og:description", content: "Obras liberadas de acordo com o grau do irmão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Library,
});

function Library() {
  const { profile, isAdmin } = useSessionProfile();
  const [term, setTerm] = useState("");
  const [degreeFilter, setDegreeFilter] = useState<number | null>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
  });

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return books.filter((b) => {
      const matchTerm =
        !t ||
        b.title.toLowerCase().includes(t) ||
        (b.author ?? "").toLowerCase().includes(t) ||
        (b.category ?? "").toLowerCase().includes(t);
      const matchDegree = degreeFilter === null || b.min_degree === degreeFilter;
      return matchTerm && matchDegree;
    });
  }, [books, term, degreeFilter]);


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

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por título, autor ou categoria"
              value={term}
              maxLength={100}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <Button
            variant={degreeFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setDegreeFilter(null)}
          >
            Todos
          </Button>
          {DEGREES.filter((d) => !profile || d.value <= profile.degree).map((d) => (
            <Button
              key={d.value}
              variant={degreeFilter === d.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDegreeFilter(d.value)}
            >
              {d.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Abrindo os trabalhos...</p>
        ) : visible.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Nenhuma obra disponível para o seu grau no momento.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((book) => (
              <Card key={book.id} className="flex flex-col overflow-hidden border-border/60">
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
                    <CardTitle className="line-clamp-2 font-display text-sm leading-snug">
                      {book.title}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">
                      {degreeLabel(book.min_degree)}
                    </Badge>
                  </div>
                  {book.author ? (
                    <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                  ) : null}
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

          </div>
        )}
      </main>
    </div>
  );
}
