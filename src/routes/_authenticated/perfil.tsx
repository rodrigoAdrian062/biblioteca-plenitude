import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { avisarErro, avisarSucesso } from "@/lib/avisos";
import { AppHeader } from "@/components/AppHeader";
import { useSessionProfile } from "@/hooks/useSessionProfile";
import { getOwnLogin, updateOwnCredentials } from "@/lib/admin.functions";
import { emailToLogin, isSharedTestAccount, loginToEmail } from "@/lib/credentials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Minha conta | Biblioteca Plenitude" },
      {
        name: "description",
        content: "Altere seu login e sua senha de acesso à Biblioteca Plenitude.",
      },
      { property: "og:title", content: "Minha conta | Biblioteca Plenitude" },
      { property: "og:description", content: "Gerencie suas credenciais de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, isAdmin } = useSessionProfile();
  const { data, refetch } = useQuery({ queryKey: ["own-login"], queryFn: () => getOwnLogin() });
  const bloqueado = isSharedTestAccount(data?.email ?? "");

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.email) setLogin(emailToLogin(data.email));
  }, [data?.email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) {
      avisarErro(
        "A conta BETA é compartilhada e não permite alterar login ou senha.",
        "Dica: solicite uma conta pessoal ao Ir∴ Menezes.",
      );
      return;
    }
    const current = emailToLogin(data?.email ?? "");
    if (password && password.length < 8) {
      avisarErro("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (password && password !== confirm) {
      avisarErro("As senhas não conferem.");
      return;
    }
    setSaving(true);
    try {
      await updateOwnCredentials({
        data: {
          ...(login.trim() && login.trim() !== current ? { email: loginToEmail(login) } : {}),
          ...(password ? { password } : {}),
        },
      });
      avisarSucesso(
        "Credenciais atualizadas.",
        "Dica: anote o novo login e senha. Você usará esses dados no próximo acesso.",
      );
      setPassword("");
      setConfirm("");
      await refetch();
    } catch (err) {
      avisarErro(err, "Não foi possível atualizar suas credenciais.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader fullName={profile?.full_name} degree={profile?.degree} isAdmin={isAdmin} userId={profile?.id} />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-display text-3xl">Minha conta</h1>
        <div className="gold-rule my-4 h-px w-32" />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-lg">Login e senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="p-login">Login</Label>
                <Input
                  id="p-login"
                  required
                  maxLength={40}
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pass">Nova senha</Label>
                <Input
                  id="p-pass"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Deixe em branco para manter a atual"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pass2">Confirmar nova senha</Label>
                <Input
                  id="p-pass2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
