import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
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

export default function PdfReader({ url, watermark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [width, setWidth] = useState(800);

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

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
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
        className="relative flex max-h-[75vh] justify-center overflow-auto p-3 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <Document
          file={url}
          onLoadSuccess={onLoad}
          loading={<p className="p-8 text-sm text-muted-foreground">Abrindo a obra...</p>}
          error={<p className="p-8 text-sm text-destructive">Não foi possível abrir a obra.</p>}
        >
          <Page
            pageNumber={page}
            width={width}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>

        {watermark ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-25deg] text-2xl font-semibold tracking-widest text-primary/15">
              {watermark}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
