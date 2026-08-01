import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Search, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { degreeLabel } from "@/lib/masonic";
import logo from "@/assets/logo.png";


export function AppHeader({
  fullName,
  degree,
  isAdmin,
}: {
  fullName?: string | undefined;
  degree?: number | undefined;
  isAdmin?: boolean | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/biblioteca" className="flex min-w-0 items-center gap-2">
          <img
            src={logo}
            alt="Logo A.R.L.S. Plenitude nº 4759"
            className="h-9 w-9 shrink-0 rounded-full object-contain"
          />
          <span className="truncate font-display text-lg tracking-wide text-foreground">
            Biblioteca Plenitude
          </span>
        </Link>

        <form
          className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({
              to: "/biblioteca",
              search: (prev) => ({ ...prev, q: q.trim().slice(0, 100) }),
            });
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              type="search"
              aria-label="Buscar obras"
              placeholder="Buscar obras..."
              value={q}
              maxLength={100}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {degree ? <Badge variant="outline">{degreeLabel(degree)}</Badge> : null}

          {fullName ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">{fullName}</span>
          ) : null}
          {isAdmin ? (
            <Button asChild variant="secondary" size="sm">
              <Link to="/admin">
                <Shield className="mr-1 h-4 w-4" />
                Administração
              </Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
