import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { getBook } from "@/lib/library.functions";
import { degreeLabel } from "@/lib/masonic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PdfReader = lazy(() => import("@/components/PdfReader"));

export const Route = createFileRoute("/_authenticated/obra/$id")({
  head: () => ({
    meta: [
      { title: "Leitura da obra | Biblioteca Maçônica Digital" },
      {
        name: "description",
        content: "Leitor embutido para leitura das obras do acervo maçônico, sem download.",
      },
      { property: "og:title", content: "Leitura da obra | Biblioteca Maçônica Digital" },
      { property: "og:description", content: "Leia a obra diretamente no navegador, sem download." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookReaderPage,
});

function BookReaderPage() {
  const { id } = Route.useParams();
  const { profile, isAdmin } = useSessionProfile();

  const { data: book, isLoading, error } = useQuery({
    queryKey: ["book", id],
    queryFn: () => getBook({ data: { id } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader fullName={profile?.full_name} degree={profile?.degree} isAdmin={isAdmin} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/biblioteca">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao acervo
          </Link>
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Abrindo os trabalhos...</p>
        ) : error || !book ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Obra indisponível para o seu grau."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl text-foreground">{book.title}</h1>
                {book.author ? (
                  <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                ) : null}
              </div>
              <Badge variant="outline">{degreeLabel(book.min_degree)}</Badge>
            </div>
            <div className="gold-rule my-4 h-px w-32" />
            {book.description ? (
              <p className="mb-6 text-sm text-muted-foreground">{book.description}</p>
            ) : null}

            {book.file_url ? (
              <ClientOnly fallback={<p className="text-sm text-muted-foreground">Carregando leitor...</p>}>
                <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando leitor...</p>}>
                  <PdfReader url={book.file_url} watermark={profile?.full_name} />
                </Suspense>
              </ClientOnly>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta obra não possui arquivo disponível para leitura.
              </p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Leitura restrita: o download e a impressão desta obra não são permitidos.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
