import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminExists, bootstrapAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Primeira instalação | Biblioteca Maçônica" },
      {
        name: "description",
        content: "Criação da primeira conta de administrador da biblioteca maçônica digital.",
      },
      { property: "og:title", content: "Primeira instalação | Biblioteca Maçônica" },
      { property: "og:description", content: "Criação da conta inicial de administrador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => adminExists(),
  });
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await bootstrapAdmin({
        data: { ...form, email: form.email.trim(), degree: 3, lodge: null },
      });
      toast.success("Administrador criado. Faça login.");
      await refetch();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar administrador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/60">
        <CardHeader>
          <CardTitle className="font-display">Primeira instalação</CardTitle>
          <CardDescription>
            Crie a conta do Venerável administrador. Depois disso, todos os acessos serão criados por
            ele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Verificando...</p>
          ) : data?.exists ? (
            <p className="text-sm text-muted-foreground">
              Já existe um administrador cadastrado. Use a página de login.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  required
                  maxLength={120}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Criando..." : "Criar administrador"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
