import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Minus, Plus, MoveVertical, MoveHorizontal } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  url: string;
  watermark?: string | undefined;
};

type Mode = "horizontal" | "vertical";

export default function PdfReader({ url, watermark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [width, setWidth] = useState(800);
  const [mode, setMode] = useState<Mode>("vertical");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(Math.min(el.clientWidth - 24, 900));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLoad = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    setPage(1);
  }, []);

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
    if (mode !== "vertical" || !numPages) return;
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
  }, [mode, numPages]);

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {numPages ? `${page} / ${numPages}` : "..."}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próxima página"
            disabled={numPages === 0 || page >= numPages}
            onClick={() => goTo(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
            <Button
              variant={mode === "vertical" ? "default" : "ghost"}
              size="sm"
              aria-label="Leitura vertical"
              onClick={() => setMode("vertical")}
            >
              <MoveVertical className="mr-1 h-4 w-4" /> Vertical
            </Button>
            <Button
              variant={mode === "horizontal" ? "default" : "ghost"}
              size="sm"
              aria-label="Leitura horizontal"
              onClick={() => setMode("horizontal")}
            >
              <MoveHorizontal className="mr-1 h-4 w-4" /> Horizontal
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            aria-label="Reduzir zoom"
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Ampliar zoom"
            onClick={() => setScale((s) => Math.min(2.4, +(s + 0.2).toFixed(2)))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative max-h-[80vh] overflow-auto p-3 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <Document
          file={url}
          onLoadSuccess={onLoad}
          loading={<p className="p-8 text-sm text-muted-foreground">Abrindo a obra...</p>}
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

