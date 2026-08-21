import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft, Heart, BookOpen, Save, Trash2, StickyNote, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { getBook, getGlobalSettings } from "@/lib/library.functions";
import { 
  listFavorites, 
  toggleFavorite, 
  listHistory, 
  saveProgress,
  getBookNote,
  saveBookNote
} from "@/lib/reading.functions";
import { degreeLabel } from "@/lib/masonic";
import { catalogName, scopeLabel, kindLabel } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
  const [noteContent, setNoteContent] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);

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

  const { data: note = "", isLoading: noteLoading } = useQuery({
    queryKey: ["book-note", id],
    queryFn: () => getBookNote({ data: { bookId: id } }),
  });

  useEffect(() => {
    if (note) setNoteContent(note);
  }, [note]);

  const noteMutation = useMutation({
    mutationFn: (content: string) => saveBookNote({ data: { bookId: id, content } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-note", id] });
      toast.success("Nota salva com sucesso!");
      setIsEditingNote(false);
    },
    onError: () => toast.error("Erro ao salvar nota."),
  });

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
          <Link 
            to="/biblioteca" 
            search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao acervo
          </Link>
        </Button>

        {isLoading ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-9 w-3/4 max-w-lg" />
                  <Skeleton className="h-4 w-1/2 max-w-xs opacity-60" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-lg" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              
              <div className="gold-rule my-4 h-px w-32 bg-primary/20" />
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>

              <div className="aspect-[3/4] sm:aspect-[4/3] w-full rounded-2xl border border-border/40 bg-card/40 flex flex-col items-center justify-center p-8 gap-4 shadow-inner">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border/60">
                    <BookOpen className="h-10 w-10 animate-pulse text-primary/40" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="font-display text-xl text-foreground/80">Abrindo acervo...</h2>
                  <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">Preparando ambiente de leitura segura para o Irmão.</p>
                </div>
                <div className="w-full max-w-xs space-y-2 mt-4">
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between px-1">
                    <Skeleton className="h-2 w-8 rounded-full opacity-40" />
                    <Skeleton className="h-2 w-12 rounded-full opacity-40" />
                  </div>
                </div>
              </div>
            </div>
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
                  {book.scope === "maconico" ? degreeLabel(book.min_degree) : scopeLabel(book.scope)}
                </Badge>
                <Badge variant="outline">{kindLabel(book.kind)}</Badge>

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
                    downloadEnabled={book.download_enabled}
                  />
                </Suspense>
              </ClientOnly>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta obra não possui arquivo disponível para leitura.
              </p>
            )}

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg text-foreground">Notas Pessoais</h2>
                </div>
                {!isEditingNote && note && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNote(true)}>
                    Editar nota
                  </Button>
                )}
              </div>
              
              {isEditingNote || !note ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
                  <Textarea
                    placeholder="Escreva aqui suas anotações privadas sobre esta obra..."
                    className="min-h-[120px] bg-background/50"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    {note && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setNoteContent(note);
                          setIsEditingNote(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => noteMutation.mutate(noteContent)}
                      disabled={noteMutation.isPending}
                    >
                      {noteMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Nota
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground italic">
                    "{note}"
                  </p>
                </div>
              )}
            </div>

            <p className={`mt-8 rounded-md px-3 py-2 text-xs font-medium ${book.download_enabled ? "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400" : "text-muted-foreground"}`}>
              {book.download_enabled 
                ? "Download e impressão liberados para esta obra."
                : "Leitura restrita: o download e a impressão desta obra não são permitidos."}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
