import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { avisarErro } from "@/lib/avisos";
import { supabase } from "@/integrations/supabase/client";
import { loginToEmail } from "@/lib/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Biblioteca Plenitude" },
      {
        name: "description",
        content: "Acesso restrito aos irmãos com credenciais fornecidas pela administração da Loja.",
      },
      { property: "og:title", content: "Entrar | Biblioteca Plenitude" },
      { property: "og:description", content: "Acesso restrito aos irmãos da Loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const LOCK_KEY = "plenitude.login.attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type AttemptState = { count: number; first: number; lockedUntil: number };

function readAttempts(): AttemptState {
  if (typeof window === "undefined") return { count: 0, first: 0, lockedUntil: 0 };
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) return { count: 0, first: 0, lockedUntil: 0 };
    return JSON.parse(raw) as AttemptState;
  } catch {
    return { count: 0, first: 0, lockedUntil: 0 };
  }
}

function writeAttempts(state: AttemptState) {
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    /* storage indisponível */
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Lido apenas após a hidratação para não divergir do HTML renderizado no servidor.
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setLockedUntil(readAttempts().lockedUntil ?? 0);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) {
        setLockedUntil(0);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const isLocked = remaining > 0;

  function registerFailure() {
    const state = readAttempts();
    const fresh = !state.first || Date.now() - state.first > WINDOW_MS;
    const count = fresh ? 1 : state.count + 1;
    const first = fresh ? Date.now() : state.first;
    let until = 0;
    if (count >= MAX_ATTEMPTS) {
      const extra = count - MAX_ATTEMPTS;
      const minutes = Math.min(30, 1 * Math.pow(2, extra));
      until = Date.now() + minutes * 60 * 1000;
    }
    writeAttempts({ count, first, lockedUntil: until });
    if (until) {
      setLockedUntil(until);
      setNow(Date.now());
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) {
      avisarErro("Muitas tentativas de acesso. Aguarde o tempo indicado para tentar novamente.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginToEmail(login.trim()),
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      registerFailure();
      const left = Math.max(0, MAX_ATTEMPTS - readAttempts().count);
      avisarErro(
        left > 0 && left <= 2
          ? `Login ou senha incorretos. Restam ${left} tentativa(s) antes do bloqueio temporário.`
          : error?.message ?? "Login ou senha incorretos.",
      );
      return;
    }
    writeAttempts({ count: 0, first: 0, lockedUntil: 0 });

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .single();

    setLoading(false);
    const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Irmão';
    avisarSucesso(`Bem-vindo, Ir∴ ${firstName}!`, "Acesso autorizado à Biblioteca Plenitude.");
    
    navigate({ to: isAdmin ? "/admin" : "/biblioteca", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60">
        <CardHeader className="text-center">
          <img
            src={logo}
            alt="Brasão A.R.L.S. Plenitude nº 4759"
            className="mx-auto mb-2 h-20 w-20 object-contain"
          />

          <CardTitle className="font-display text-2xl">Biblioteca Plenitude</CardTitle>
          <CardDescription>Acesso exclusivo aos irmãos cadastrados pela administração.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                autoComplete="username"
                required
                maxLength={60}
                disabled={isLocked}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {isLocked ? (
                `Bloqueado (${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")})`
              ) : loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            {isLocked ? (
              <p className="text-center text-xs text-destructive">
                Muitas tentativas inválidas. Tente novamente após o tempo indicado.
              </p>
            ) : null}
            <p className="text-center text-xs text-muted-foreground">
              Esqueceu a senha? Solicite ao administrador da Loja.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
