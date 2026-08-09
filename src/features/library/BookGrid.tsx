import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Heart, LayoutGrid, List, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scopeLabel, kindLabel } from "@/lib/catalog";
import { degreeLabel } from "@/lib/masonic";

export type BookItem = {
  id: string;
  title: string;
  author: string | null;
  scope: string;
  kind: string;
  min_degree: number;
  cover_url: string | null;
  external_url: string | null;
};

interface BookGridProps {
  books: BookItem[];
  className?: string;
  favSet: Set<string>;
  onToggleFavorite: (bookId: string, favorite: boolean) => void;
}

export function BookGrid({
  books,
  className = "",
  favSet,
  onToggleFavorite,
}: BookGridProps) {
  const [limit, setLimit] = useState(15);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setLimit(5);
    }
  }, [isMobile]);

  const visibleBooks = books.slice(0, limit);
  const hasMore = books.length > limit;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant={viewMode === "grid" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("grid")}
          className="rounded-full h-8 w-8 p-0"
          title="Visualização em Grade"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
          className="rounded-full h-8 w-8 p-0"
          title="Visualização em Lista"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      <div className={viewMode === "grid" 
        ? `grid grid-cols-1 gap-3 md:grid-cols-3 ${className}`
        : `flex flex-col gap-2 ${className}`}>
        {visibleBooks.map((book) => (
          <div
            key={book.id}
            className={`flex items-center gap-3 rounded-xl border border-border/60 bg-card transition-colors hover:border-primary/40 ${viewMode === 'grid' ? 'p-2.5' : 'p-3'}`}
          >
            {viewMode === "grid" && (
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-secondary">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={`Capa da obra ${book.title}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-primary/50">
                    {book.kind === 'video' ? <Video className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col">
                <p className="line-clamp-1 font-display text-sm leading-snug text-foreground">
                  {book.title}
                </p>
                {book.author && (
                  <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {book.author}
                  </p>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge
                  variant={book.scope === "nao_maconico" ? "secondary" : "default"}
                  className="px-1.5 text-[10px]"
                >
                  {scopeLabel(book.scope)}
                </Badge>
                <Badge variant="outline" className="px-1.5 text-[10px]">
                  {kindLabel(book.kind)}
                </Badge>
                <Badge variant="outline" className="px-1.5 text-[10px]">
                  {degreeLabel(book.min_degree)}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={favSet.has(book.id) ? "Remover dos favoritos" : "Marcar como favorita"}
                aria-pressed={favSet.has(book.id)}
                className="h-8 w-8"
                onClick={() => onToggleFavorite(book.id, !favSet.has(book.id))}
              >
                <Heart
                  className={`h-4 w-4 ${favSet.has(book.id) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </Button>
              {book.external_url ? (
                <Button asChild size="sm">
                  <a href={book.external_url} target="_blank" rel="noopener noreferrer">
                    {book.kind === 'video' ? <Video className="h-4 w-4 sm:mr-1.5" /> : <BookOpen className="h-4 w-4 sm:mr-1.5" />}
                    <span className="hidden sm:inline">Acessar</span>
                  </a>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link 
                    to="/obra/$id" 
                    params={{ id: book.id }}
                    search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}
                  >
                    {book.kind === 'video' ? <Video className="h-4 w-4 sm:mr-1.5" /> : <BookOpen className="h-4 w-4 sm:mr-1.5" />}
                    <span className="hidden sm:inline">Ler</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button 
            variant="outline" 
            onClick={() => setLimit(prev => prev + (isMobile ? 5 : 15))}
            className="rounded-full px-8"
          >
            Carregar mais obras
          </Button>
        </div>
      )}
    </div>
  );
}
