import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { getBook, getGlobalSettings } from "@/lib/library.functions";
import { listFavorites, toggleFavorite, listHistory, saveProgress } from "@/lib/reading.functions";
import { degreeLabel } from "@/lib/masonic";
import { catalogName, scopeLabel, kindLabel } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PdfReader = lazy(() => import("@/components/PdfReader"));

export const Route = createFileRoute("/_authenticated/obra/$id")({
  head: () => ({
    meta: [
      { title: "Leitura da obra | Biblioteca Plenitude" },
      {
        name: "description",
        content: "Leitor embutido para leitura das obras do acervo maçônico, sem download.",
      },
      { property: "og:title", content: "Leitura da obra | Biblioteca Plenitude" },
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

  const queryClient = useQueryClient();

  const { data: readerData, isLoading, error } = useQuery({
    queryKey: ["book-reader", id],
    queryFn: async () => {
      const [book, settings] = await Promise.all([
        getBook({ data: { id } }),
        getGlobalSettings(),
      ]);
      return { book, settings };
    },
  });

  const book = readerData?.book;
  const settings = readerData?.settings;

  const isWatermarkEnabled = settings?.["watermark_enabled"] === true && book?.watermark_enabled;


  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
  });
  const isFavorite = favorites.includes(id);

  const favMutation = useMutation({
    mutationFn: (favorite: boolean) => toggleFavorite({ data: { bookId: id, favorite } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["reading-history"],
    queryFn: () => listHistory(),
  });
  const entry = history.find((h) => h.book_id === id);

  const handleProgress = useCallback(
    (page: number, totalPages: number) => {
      void saveProgress({ data: { bookId: id, page, totalPages } }).then(() =>
        queryClient.invalidateQueries({ queryKey: ["reading-history"] }),
      );
    },
    [id, queryClient],
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppHeader fullName={profile?.full_name} degree={profile?.degree} isAdmin={isAdmin} userId={profile?.id} />

      <main className="mx-auto w-full max-w-5xl min-w-0 px-3 py-6 sm:px-4 sm:py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", fav: false }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao acervo
          </Link>
        </Button>

        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-px w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        ) : error || !book ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-medium text-destructive">
              {error instanceof Error ? error.message : "Obra indisponível para o seu grau."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}>Voltar ao acervo</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="break-words font-display text-2xl text-foreground sm:text-3xl">
                  {catalogName(book.author, book.title)}
                </h1>
                {book.author ? (
                  <p className="mt-1 break-words text-sm text-muted-foreground">{book.author}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isFavorite ? "default" : "outline"}
                  size="sm"
                  aria-pressed={isFavorite}
                  onClick={() => favMutation.mutate(!isFavorite)}
                  disabled={favMutation.isPending}
                >
                  <Heart className={`mr-1.5 h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "Favorita" : "Favoritar"}
                </Button>
                <Badge variant={book.scope === "nao_maconico" ? "secondary" : "default"}>
                  {scopeLabel(book.scope)}
                </Badge>
                <Badge variant="outline">{kindLabel(book.kind)}</Badge>
                <Badge variant="outline">{degreeLabel(book.min_degree)}</Badge>

              </div>
            </div>

            <div className="gold-rule my-4 h-px w-32" />
            {book.description ? (
              <p className="mb-6 text-sm text-muted-foreground">{book.description}</p>
            ) : null}

            {!historyLoading && entry && entry.last_page > 1 ? (
              <p className="mb-4 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                Você parou na página {entry.last_page}
                {entry.total_pages ? ` de ${entry.total_pages}` : ""} em{" "}
                {new Date(entry.updated_at).toLocaleDateString("pt-BR")}.
              </p>
            ) : null}

            {book.file_url ? (
              <ClientOnly fallback={<p className="text-sm text-muted-foreground">Carregando leitor...</p>}>
                <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando leitor...</p>}>
                  <PdfReader
                    url={book.file_url}
                    watermark={isWatermarkEnabled ? profile?.full_name : undefined}
                    storageKey={id}
                    initialPage={entry?.last_page}
                    onProgress={handleProgress}
                  />
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
