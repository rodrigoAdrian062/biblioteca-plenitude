import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Library, LogOut, Moon, Search, Shield, Sun, UserCog, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { degreeLabel } from "@/lib/masonic";
import { useTheme } from "@/hooks/useTheme";
import { listHistory } from "@/lib/reading.functions";
import { NotificationsBell } from "@/components/NotificationsBell";
import logo from "@/assets/logo.png";



export function AppHeader({
  fullName,
  degree,
  isAdmin,
  userId,
}: {
  fullName?: string | undefined;
  degree?: number | undefined;
  isAdmin?: boolean | undefined;
  userId?: string | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["reading-history"],
    queryFn: () => listHistory(),
    enabled: !!userId,
  });


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/40 bg-card/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }} className="flex min-w-0 items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={logo}
              alt="Logo A.R.L.S. Plenitude nº 4759"
              className="relative h-10 w-10 shrink-0 rounded-full object-contain transition-transform group-hover:scale-105"
            />
          </div>
          <span className="truncate font-display text-lg tracking-wider text-foreground sm:text-xl">
            Biblioteca Plenitude
          </span>
        </Link>

        {/* Busca removida do topo conforme solicitado */}


        <div className="ml-auto flex items-center gap-2">
          {userId && !isAdmin ? (
            <span className="hidden sm:inline-flex">
              <NotificationsBell userId={userId} />
            </span>
          ) : null}

          {/* Histórico / Livros Lidos */}
          {userId && (
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="Livros lidos"
                  title="Livros lidos"
                >
                  <History className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                  <span className="font-display text-sm tracking-wide">Livros Lidos</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setHistoryOpen(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <ScrollArea className="max-h-72">
                  {history.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      vc ainda não tem livro abertos ou lidos
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {history.map((h) => (
                        <li key={h.book_id} className="px-3 py-2 hover:bg-muted/30">
                          <Link
                            to="/obra/$id"
                            params={{ id: h.book_id }}
                            className="block min-w-0 text-left"
                            onClick={() => setHistoryOpen(false)}
                          >
                            <span className="line-clamp-1 text-sm text-foreground">{h.title}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                              {h.author || "Autor desconhecido"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
                {history.length > 0 && (
                  <div className="border-t border-border/60 p-2">
                    <Button asChild variant="ghost" size="sm" className="w-full text-xs" onClick={() => setHistoryOpen(false)}>
                      <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}>
                        Ver todo histórico
                      </Link>
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Configurações (Minha conta) */}
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link to="/perfil" title="Configurações">
              <UserCog className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo noturno"}
            title={theme === "dark" ? "Modo claro" : "Modo noturno"}
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {degree ? <Badge variant="outline" className="hidden xs:inline-flex">{degreeLabel(degree)}</Badge> : null}

          {isAdmin ? (
            <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Link to="/admin">
                <Shield className="mr-1 h-4 w-4" />
                Administração
              </Link>
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => void signOut()}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>

      {/* Menu inferior no celular */}
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.1)]"
      >
        <div className="grid grid-cols-3 items-stretch h-16">
          <Link
            to="/biblioteca"
            search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <Library className="h-5 w-5" />
            Acervo
          </Link>
          
          {isAdmin ? (
            <Link
              to="/admin"
              className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          ) : userId ? (
            <div className="flex items-center justify-center">
              <NotificationsBell userId={userId} variant="menu" />
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
