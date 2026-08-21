# Plano: Destacar Dica de Limpeza de Filtros

Melhorar a visibilidade do texto de dica "Limpe os filtros para ver todo o acervo" conforme solicitado, aumentando a fonte, o peso (bold 900) e garantindo que fique em uma única linha no celular.

## Alterações

### Frontend

- **Arquivo `src/routes/_authenticated/biblioteca.tsx`**
    - Localizar o elemento `span` que contém o texto "Dica: Limpe os filtros para ver todo o acervo".
    - Alterar as classes CSS:
        - De `text-[10px] font-semibold` para `text-xs sm:text-sm font-[900] whitespace-nowrap truncate`.
    - Ajustar o container pai (`div`) para garantir que o layout suporte a exibição em uma linha, possivelmente mudando de `flex-row` para `flex-col sm:flex-row` se o espaço for muito apertado, ou apenas garantindo o alinhamento.

## Detalhes Técnicos

- Utilização da classe `font-[900]` do Tailwind para o peso de fonte específico.
- Utilização de `whitespace-nowrap` e `truncate` para garantir que o texto não quebre linha em telas pequenas.
- Aumento da escala de fonte de `10px` para `12px` (`text-xs`) ou `14px` (`text-sm`).
