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
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/biblioteca" search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }} className="flex min-w-0 items-center gap-2">
          <img
            src={logo}
            alt="Logo A.R.L.S. Plenitude nº 4759"
            className="h-9 w-9 shrink-0 rounded-full object-contain"
          />
          <span className="truncate font-display text-lg tracking-wide text-foreground">
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

          {degree ? <Badge variant="outline">{degreeLabel(degree)}</Badge> : null}

          {fullName ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">{fullName}</span>
          ) : null}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/perfil">
              <UserCog className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Minha conta</span>
            </Link>
          </Button>
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
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>

      {/* Menu inferior no celular */}
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="grid grid-cols-4 items-stretch">
          <Link
            to="/biblioteca"
            search={{ q: "", autor: "", categoria: "", grau: 0, tema: "", tipo: "", fav: false }}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <Library className="h-5 w-5" />
            Acervo
          </Link>
          <Link
            to="/perfil"
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <UserCog className="h-5 w-5" />
            Conta
          </Link>
          {isAdmin ? (
            <Link
              to="/admin"
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground transition-colors [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          ) : userId ? (
            <NotificationsBell userId={userId} variant="menu" />
          ) : (
            <span aria-hidden />
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
