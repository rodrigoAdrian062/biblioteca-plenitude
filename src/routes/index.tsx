import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Layers, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { AppFooter } from "@/components/AppFooter";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Biblioteca Plenitude | Acervo por Grau" },
      {
        name: "description",
        content:
          "Acervo digital maçônico com acesso restrito por grau: Aprendiz, Companheiro e Mestre. Credenciais fornecidas pelo Mestre Bibliotecário Ir∴ Menezes.",
      },
      { property: "og:title", content: "Biblioteca Plenitude | Acervo por Grau" },
      {
        property: "og:description",
        content: "Acervo digital maçônico com acesso restrito por grau: Aprendiz, Companheiro e Mestre. Credenciais fornecidas pelo Mestre Bibliotecário Ir∴ Menezes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-4 right-4 z-50">
        <AccessibilityMenu />
      </div>

      {/* Elementos decorativos de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

      <section className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
        <div className="relative inline-block mb-8 group">
          <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <img
            src={logo}
            alt="Brasão A.R.L.S. Plenitude nº 4759"
            className="relative mx-auto h-32 w-32 object-contain drop-shadow-[0_0_15px_rgba(246,172,25,0.2)] transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        <h1 className="font-display text-4xl text-foreground sm:text-6xl tracking-tighter">Biblioteca Plenitude</h1>
        <div className="gold-rule mx-auto my-8 h-px w-48 opacity-60" />
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          Acervo reservado aos irmãos da Loja. Cada irmão acessa somente as obras compatíveis com o
          seu grau, com credenciais fornecidas pelo Mestre Bibliotecário <span className="text-primary font-semibold">Ir∴ Menezes</span>.
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
            <Link to="/auth">Entrar na biblioteca</Link>
          </Button>
        </div>

        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-5 py-3 text-sm text-foreground shadow-[0_0_20px_rgba(246,172,25,0.1)]">
          <Download className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">
            Precisa fazer o download de alguma obra? Entre em contato com o Mestre Bibliotecário <span className="text-primary font-semibold">Ir∴ Menezes</span>.
          </span>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-6 px-6 pb-32 sm:grid-cols-2">
        {[
          {
            icon: Layers,
            title: "Acervo por grau",
            text: "Aprendiz vê obras do 1º grau; Companheiro acumula o 2º; Mestre acessa tudo.",
          },
          {
            icon: KeyRound,
            title: "Acesso controlado",
            text: "Não há cadastro público. O Mestre Bibliotecário Ir∴ Menezes cria e gerencia cada credencial.",
          },
        ].map((f) => (
          <div key={f.title} className="group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-left transition-all hover:border-primary/40 hover:bg-card/60 hover:shadow-xl hover:shadow-black/10">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <f.icon className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl text-foreground">{f.title}</h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{f.text}</p>
          </div>
        ))}
      </section>

      <AppFooter />
    </div>
  );
}
