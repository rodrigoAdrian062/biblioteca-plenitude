import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import logo from "@/assets/logo.png";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-border/40 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          {/* Marca */}
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={logo}
                alt="Brasão A.R.L.S. Plenitude nº 4759"
                className="h-10 w-10 rounded-full object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-display text-lg tracking-wider text-foreground">
                Biblioteca Plenitude
              </span>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              Acervo digital maçônico com acesso restrito por grau, reservado aos
              irmãos da A.R.L.S. Plenitude nº 4759.
            </p>
          </div>

          {/* Aviso de download */}
          <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-center sm:items-start sm:text-left">
            <div className="flex items-center gap-2 text-primary">
              <Download className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">Precisa de download?</span>
            </div>
            <p className="text-xs leading-relaxed text-foreground">
              Entre em contato com o Mestre Bibliotecário{" "}
              <span className="font-semibold text-primary">Ir∴ Menezes</span> para
              solicitar o download de qualquer obra do acervo.
            </p>
          </div>
        </div>

        <div className="gold-rule mx-auto my-8 h-px w-32 opacity-40" />

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {year} Biblioteca Plenitude · A.R.L.S. Plenitude nº 4759. Todos os
            direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Credenciais gerenciadas pelo Mestre Bibliotecário{" "}
            <span className="text-primary font-semibold">Ir∴ Menezes</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
