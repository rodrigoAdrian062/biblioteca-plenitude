import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { degreeLabel } from "@/lib/masonic";

export function AppHeader({
  fullName,
  degree,
  isAdmin,
}: {
  fullName?: string;
  degree?: number;
  isAdmin?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/biblioteca" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-display text-lg tracking-wide text-foreground">
            Biblioteca Maçônica
          </span>
        </Link>

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
