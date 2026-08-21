# Plano de Modernização Visual da Biblioteca Plenitude

O objetivo é deixar o sistema com um visual mais profissional, moderno e intuitivo, seguindo a referência visual enviada (tons escuros, bordas douradas, botões arredondados e elementos com brilho), sem alterar a funcionalidade principal.

## Melhorias Propostas

### 1. Identidade Visual e Temas
- Ajustar os tokens de cor no `src/styles.css` para garantir contraste moderno.
- No modo escuro, usar um fundo verde-azulado muito profundo (quase preto) com detalhes em dourado brilhante.
- Aplicar o efeito de "brilho dourado" (glow) em elementos ativos, como mostrado na imagem de referência.

### 2. Cabeçalho e Navegação
- Refinar o `AppHeader.tsx` para um visual mais "limpo" e premium.
- Melhorar os ícones e espaçamentos no menu mobile inferior.

### 3. Filtros da Biblioteca
- Redesenhar a seção de filtros em `src/routes/_authenticated/biblioteca.tsx` para alinhar com a imagem enviada:
    - Campo de busca com ícone integrado e bordas sutis.
    - Selects com visual mais integrado.
    - Botões de filtro (Tema, Tipo) em formato de "pill" (totalmente arredondados).
    - Indicadores de seleção com pequenas esferas brilhantes.
    - Contadores numéricos integrados aos botões.

### 4. Componentes UI (Shadcn)
- Atualizar `src/components/ui/button.tsx` e `src/components/ui/badge.tsx` para suportar variações mais arredondadas e efeitos de hover modernos.
- Ajustar `src/components/ui/input.tsx` para um visual mais minimalista.

## Detalhes Técnicos

- **Cores**: Utilização de `oklch` para cores vibrantes e gradientes sutis.
- **Bordas**: Uso de `border-primary/20` com `hover:border-primary/50` para interatividade premium.
- **Arredondamento**: Migração de `rounded-md` para `rounded-full` em botões de categoria.
- **Sombras**: Adição de `shadow-[0_0_10px_rgba(246,172,25,0.2)]` em elementos de destaque.
