---
title: Acessibilidade Visual
path: .lovable/plan.md
---

# Plano de Acessibilidade Visual

Implementar um sistema de acessibilidade para apoiar irmãos com problemas de visão, incluindo ajuste de fonte, alto contraste e leitura por voz, com persistência e suporte no leitor de PDF.

## 1. Infraestrutura e Estado Global
- Criar `src/hooks/useAccessibility.tsx` para gerenciar o estado global:
  - `fontSize`: 'normal', 'large', 'extra-large'.
  - `highContrast`: booleano.
  - `ttsEnabled`: booleano (Text-to-Speech).
- Criar `src/components/AccessibilityProvider.tsx` para envolver a aplicação.
- Atualizar `src/routes/__root.tsx` para incluir o provedor.

## 2. Interface e Controles
- Criar `src/components/AccessibilityMenu.tsx`:
  - Botões para alternar tamanhos de fonte.
  - Toggle para Modo de Alto Contraste.
  - Toggle para Leitura por Voz.
- Integrar o ícone de acessibilidade no `src/components/AppHeader.tsx` (desktop e mobile).

## 3. Estilização e Temas
- Adicionar variáveis e classes no `src/styles.css`:
  - `.font-large`, `.font-extra-large` para escalas de REM.
  - `.high-contrast` com fundo preto puro (#000) e texto ouro (#F6AC19) ou branco.
  - Ajustes de foco visual para navegação por teclado.

## 4. Funcionalidades Específicas
- **Leitura por Voz (TTS):** 
  - Usar a `Web Speech API`.
  - Adicionar ouvintes globais que leem o atributo `aria-label` ou texto de elementos ao passar o mouse/focar.
- **Leitor de PDF Acessível:**
  - No `src/components/PdfReader.tsx`, aplicar filtro `invert(1) hue-rotate(180deg)` no canvas do PDF quando o alto contraste estiver ativo.

## Detalhes Técnicos
- Persistência via `localStorage`.
- Uso de `useEffect` para aplicar as classes de acessibilidade diretamente no `document.documentElement`.
- Garantir que as alterações não quebrem o layout responsivo original.

Vamos por partes, começando pela infraestrutura e menu.