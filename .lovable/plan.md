# Plano de Ajuste dos Rótulos de Graus Maçônicos

O objetivo deste plano é remover o texto redundante "Maçônico" quando um grau (como "Mestre") já estiver sendo exibido, atendendo à solicitação do usuário para deixar apenas o grau.

## Alterações Propostas

### Frontend

#### 1. Biblioteca (Filtros e Cartões)
- **Filtros de Tema**: Em `src/routes/_authenticated/biblioteca.tsx`, ajustar o botão do filtro "Maçônico" para exibir apenas o nome do grau do usuário (ex: "Mestre") em vez de "Maçônico (Mestre)".
- **Cartões de Livro**: Em `src/features/library/BookGrid.tsx`, alterar o Badge do acervo para que, em obras maçônicas, exiba apenas o rótulo do grau (ex: "Mestre") em vez de "Maçônico (Mestre)".

#### 2. Detalhes da Obra e Admin
- **Página de Detalhes**: Revisar `src/routes/_authenticated/obra/$id.tsx` para garantir consistência na exibição do grau.
- **Painel Administrativo**: Revisar `src/routes/_authenticated/admin.tsx` caso a mesma redundância ocorra na listagem de obras ou membros.

## Detalhes Técnicos

### Arquivos afetados:
- `src/features/library/BookGrid.tsx`:
  - Remover `scopeLabel(book.scope)` quando `book.scope === 'maconico'`.
  - Remover os parênteses ao redor de `degreeLabel(book.min_degree)`.
- `src/routes/_authenticated/biblioteca.tsx`:
  - No mapeamento de `SCOPES`, para o valor 'maconico', exibir apenas `degreeLabel(degreeValue)` se este estiver presente, omitindo o rótulo "Maçônico".

## Verificação
- Validar visualmente na página da biblioteca se os Badges agora exibem apenas o grau (ex: "Mestre", "Aprendiz").
- Verificar se o filtro de tema na barra superior reflete a mesma mudança.
- Garantir que obras "Não-maçônicas" continuem exibindo seu rótulo corretamente.
