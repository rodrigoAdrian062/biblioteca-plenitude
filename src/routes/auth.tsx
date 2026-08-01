import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Biblioteca Maçônica Digital" },
      {
        name: "description",
        content: "Acesso restrito aos irmãos com credenciais fornecidas pela administração da Loja.",
      },
      { property: "og:title", content: "Entrar | Biblioteca Maçônica Digital" },
      { property: "og:description", content: "Acesso restrito aos irmãos da Loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Credenciais inválidas ou acesso suspenso.");
      return;
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    setLoading(false);
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

          <CardTitle className="font-display text-2xl">Biblioteca Maçônica</CardTitle>
          <CardDescription>Acesso exclusivo aos irmãos cadastrados pela administração.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Esqueceu a senha? Solicite ao administrador da Loja.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
