import { Heart } from "lucide-react";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/40 bg-card/30 py-5 pb-24 text-center sm:pb-5">
      <div className="mx-auto max-w-6xl px-4">
        <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          Desenvolvido com
          <Heart className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
          e coração pelos irmãos
        </p>
        <p className="mt-1 text-xs tracking-wide text-muted-foreground/80">
          Maçonicamente — Mestre de Biblioteca Meneses e o Ir. Rodrigo
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Biblioteca Plenitude · {year}
        </p>
      </div>
    </footer>
  );
}
