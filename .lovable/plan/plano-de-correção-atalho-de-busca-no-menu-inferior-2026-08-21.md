# Plano de Correção: Atalho de Busca no Menu Inferior

O atalho de busca ("Buscar") foi implementado no menu inferior, mas o usuário reportou que ele não apareceu ou não está funcionando como esperado. A inspeção inicial via screenshots e logs do navegador confirma que o elemento existe no DOM, mas pode haver um problema de acessibilidade ou conflito de layout que impede sua visualização correta em certos dispositivos.

## Problemas Identificados
1.  **Visibilidade:** O item "Buscar" está presente no código de `AppHeader.tsx`, mas o usuário relata que ele não apareceu.
2.  **Comportamento:** O atalho tenta focar um input de busca global que pode não estar presente em todas as páginas, apenas na rota `/biblioteca`.

## Etapas de Implementação

### 1. Ajuste de Layout no Menu Inferior
*   Revisar o grid de colunas em `src/components/AppHeader.tsx` para garantir que as 4 colunas (Acervo, Buscar, Admin/Notificações, Sair) caibam perfeitamente sem overflow ou ocultação.
*   Garantir que o botão "Buscar" seja visível e tenha um tamanho de toque adequado (mínimo 44px).

### 2. Otimização do Comportamento do Atalho
*   Modificar a lógica do clique em "Buscar":
    *   Se o usuário já estiver na rota `/biblioteca`, focar o input de busca existente.
    *   Se estiver em outra rota, navegar para `/biblioteca` e automaticamente focar o campo de busca ao carregar.

### 3. Melhoria Visual do Ícone de Busca
*   Garantir que a cor do ícone e do texto siga o padrão do tema (Dourado/Verde Maçônico) quando ativo ou focado.

## Detalhes Técnicos
*   **Arquivo:** `src/components/AppHeader.tsx`
*   **Lógica:** Usar `useNavigate` para redirecionar caso o elemento de busca não seja encontrado no DOM atual.
*   **CSS:** Ajustar a classe `grid-cols-4` para garantir distribuição igualitária do espaço.

## Validação
*   Verificar em diferentes visualizações de celular (iPhone, Android) via Playwright.
*   Confirmar que o clique no atalho foca o campo de busca na biblioteca.
*   Confirmar que o atalho redireciona para a biblioteca se clicado a partir de outra página (ex: Perfil ou Admin).
