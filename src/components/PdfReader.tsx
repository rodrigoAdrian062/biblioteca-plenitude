import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  MoveVertical,
  MoveHorizontal,
  Maximize2,
  X,
  Download,
  BookOpen,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  url: string;
  watermark?: string | undefined;
  /** Identificador da obra: usado para lembrar a posição de leitura */
  storageKey?: string | undefined;
  /** Página inicial vinda do histórico salvo no servidor */
  initialPage?: number | undefined;
  /** Notifica a página atual para salvar o histórico */
   onProgress?: ((page: number, totalPages: number) => void) | undefined;
   /** Se o download está habilitado para esta obra */
   downloadEnabled?: boolean;
 };

type Mode = "horizontal" | "vertical";

type SavedPosition = { page: number; mode: Mode; scale: number };

function readSaved(key: string | undefined): SavedPosition | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`plenitude:leitura:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPosition>;
    if (!parsed || typeof parsed.page !== "number") return null;
    return {
      page: Math.max(1, Math.round(parsed.page)),
      mode: parsed.mode === "horizontal" ? "horizontal" : "vertical",
      scale: typeof parsed.scale === "number" ? parsed.scale : 1,
    };
  } catch {
    return null;
  }
}

export default function PdfReader({ url, watermark, storageKey, initialPage, onProgress, downloadEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(800);
  const [mode, setMode] = useState<Mode>("vertical");
  const [full, setFull] = useState(false);
  const [restored, setRestored] = useState(false);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const pendingPage = useRef<number | null>(null);

  // Restaura preferências salvas (modo/zoom) ao montar
  useEffect(() => {
    const saved = readSaved(storageKey);
    if (saved) {
      setMode(saved.mode);
      setScale(saved.scale);
      pendingPage.current = saved.page;
    }
    // O histórico salvo no servidor tem prioridade quando está mais adiante
    if (initialPage && initialPage > (pendingPage.current ?? 1)) {
      pendingPage.current = initialPage;
    }
  }, [storageKey, initialPage]);

  // Notifica o histórico de leitura (com atraso, para não salvar a cada rolagem)
  useEffect(() => {
    if (!onProgress || !numPages || !restored) return;
    const id = window.setTimeout(() => onProgress(page, numPages), 1500);
    return () => window.clearTimeout(id);
  }, [onProgress, page, numPages, restored]);



  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(Math.min(el.clientWidth - 24, full ? 1200 : 900));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [full]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [full]);

  const onLoad = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    const target = Math.min(Math.max(1, pendingPage.current ?? 1), total);
    setPage(target);
    if (target > 1) setResumedFrom(target);
  }, []);

  // Salva a posição de leitura
  useEffect(() => {
    if (!storageKey || !numPages) return;
    try {
      localStorage.setItem(
        `plenitude:leitura:${storageKey}`,
        JSON.stringify({ page, mode, scale } satisfies SavedPosition),
      );
    } catch {
      /* ignore */
    }
  }, [storageKey, page, mode, scale, numPages]);

  // Ao carregar (ou ao entrar/sair da tela cheia) volta exatamente para a página atual
  useEffect(() => {
    if (!numPages) return;
    const id = window.setTimeout(() => {
      if (mode === "vertical") {
        pageRefs.current[page]?.scrollIntoView({ block: "start" });
      }
      setRestored(true);
    }, 220);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, full, mode]);


  const goTo = useCallback(
    (next: number) => {
      const target = Math.min(Math.max(1, next), numPages || 1);
      setPage(target);
      if (mode === "vertical") {
        pageRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [mode, numPages],
  );

  // Track visible page while scrolling in vertical mode
  useEffect(() => {
    if (mode !== "vertical" || !numPages || !restored) return;
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const n = Number((visible.target as HTMLElement).dataset["page"]);
          if (n) setPage(n);
        }
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    Object.values(pageRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [mode, numPages, restored]);

  return (
    <div
      className={
        full
          ? "fixed inset-0 z-[60] flex min-w-0 flex-col bg-background"
          : "w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-border/60 bg-secondary/40"
      }
    >
      {full ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-2">
          <Button size="sm" onClick={() => setFull(false)} className="shrink-0">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <span className="truncate text-xs text-muted-foreground">
            {watermark ? `Leitura de ${watermark}` : "Leitura"}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Sair da tela cheia"
            onClick={() => setFull(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-2 py-2 sm:px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
            {numPages ? `${page} / ${numPages}` : "..."}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Próxima página"
            disabled={numPages === 0 || page >= numPages}
            onClick={() => goTo(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border/60 p-0.5">
            <Button
              variant={mode === "vertical" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              aria-label="Leitura vertical"
              onClick={() => setMode("vertical")}
            >
              <MoveVertical className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Vertical</span>
            </Button>
            <Button
              variant={mode === "horizontal" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2"
              aria-label="Leitura horizontal"
              onClick={() => setMode("horizontal")}
            >
              <MoveHorizontal className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Horizontal</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Reduzir zoom"
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 shrink-0 text-center text-xs text-muted-foreground sm:text-sm">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Ampliar zoom"
            onClick={() => setScale((s) => Math.min(2.4, +(s + 0.2).toFixed(2)))}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant={full ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-2"
            aria-label={full ? "Sair da tela cheia" : "Ler em tela cheia"}
            onClick={() => setFull((v) => !v)}
          >
            {full ? <X className="h-4 w-4 sm:mr-1" /> : <Maximize2 className="h-4 w-4 sm:mr-1" />}
            <span className="hidden sm:inline">{full ? "Sair" : "Tela cheia"}</span>
           </Button>
 
            {downloadEnabled && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10 border-green-500/30"
                aria-label="Baixar obra"
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
         </div>
       </div>

      {resumedFrom ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-accent/40 px-3 py-2 text-xs text-foreground">
          <span>Leitura retomada na página {resumedFrom}.</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                goTo(1);
                setResumedFrom(null);
              }}
            >
              Ir para o início
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Fechar aviso"
              onClick={() => setResumedFrom(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}



      <div
        ref={containerRef}
        className={`relative w-full max-w-full overflow-auto p-2 sm:p-3 ${
          full ? "flex-1 min-h-0" : "max-h-[80vh]"
        }`}
      >
        <Document
          file={url}
          onLoadSuccess={onLoad}
          loading={
            <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 animate-pulse text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Abrindo a obra...</p>
              <p className="mt-1 text-xs text-muted-foreground">Preparando as páginas para leitura</p>
            </div>
          }
          error={<p className="p-8 text-sm text-destructive">Não foi possível abrir a obra.</p>}
          className={
            mode === "vertical"
              ? "flex flex-col items-center gap-4"
              : "flex snap-x snap-mandatory items-start gap-4 overflow-x-auto"
          }
        >
          {mode === "vertical" ? (
            Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                data-page={n}
                ref={(el) => {
                  pageRefs.current[n] = el;
                }}
                className="shadow-sm"
              >
                <Page
                  pageNumber={n}
                  width={width}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            ))
          ) : (
            <div className="mx-auto snap-center shadow-sm">
              <Page
                pageNumber={page}
                width={width}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          )}
        </Document>

        {watermark ? (
          <div className="pointer-events-none sticky inset-x-0 bottom-1/2 flex items-center justify-center">
            <span className="rotate-[-25deg] text-2xl font-semibold tracking-widest text-primary/15">
              {watermark}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

