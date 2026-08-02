import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Biblioteca Plenitude | Acervo por Grau" },
      {
        name: "description",
        content:
          "Acervo digital maçônico com acesso restrito por grau: Aprendiz, Companheiro e Mestre. Credenciais fornecidas pelo Mestre Bibliotecário Ir.∴ Menezes.",
      },
      { property: "og:title", content: "Biblioteca Plenitude | Acervo por Grau" },
      {
        property: "og:description",
        content: "Acervo digital maçônico com acesso restrito por grau: Aprendiz, Companheiro e Mestre. Credenciais fornecidas pelo Mestre Bibliotecário Ir.∴ Menezes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        <img
          src={logo}
          alt="Brasão A.R.L.S. Plenitude nº 4759"
          className="mx-auto mb-6 h-28 w-28 object-contain drop-shadow"
        />

        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Biblioteca Plenitude</h1>
        <div className="gold-rule mx-auto my-6 h-px w-40" />
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Acervo reservado aos irmãos da Loja. Cada irmão acessa somente as obras compatíveis com o
          seu grau, com credenciais fornecidas pelo Mestre Bibliotecário Ir.∴ Menezes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Entrar na biblioteca</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            icon: Layers,
            title: "Acervo por grau",
            text: "Aprendiz vê obras do 1º grau; Companheiro acumula o 2º; Mestre acessa tudo.",
          },
          {
            icon: KeyRound,
            title: "Acesso controlado",
            text: "Não há cadastro público. O Mestre Bibliotecário Ir.∴ Menezes cria e gerencia cada credencial.",
          },
          {
            icon: ShieldCheck,
            title: "Arquivos protegidos",
            text: "Documentos entregues por links temporários, com registro de leitura.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border/60 bg-card p-6 text-left">
            <f.icon className="mb-3 h-5 w-5 text-primary" />
            <h2 className="font-display text-lg text-card-foreground">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
