# Plano de Correção: Erro ao Cadastrar Vídeos

Identifiquei que o erro ao cadastrar obras do tipo "Vídeo" é causado por uma restrição no banco de dados que não permite esse valor. Vou atualizar a estrutura da tabela para aceitar vídeos.

## Ações Técnicas

### 1. Banco de Dados (Supabase)
- Criar uma nova migração para atualizar a restrição `books_kind_check` na tabela `public.books`.
- A nova restrição incluirá explicitamente o valor `'video'`, permitindo que o sistema salve obras deste tipo.

### 2. Verificação
- Validar se o arquivo `src/lib/catalog.ts` já contempla o valor `video` (confirmado: já está presente).
- O painel administrativo em `src/features/admin/BooksAdmin.tsx` já utiliza este catálogo, portanto a correção no banco é suficiente para resolver o erro de salvamento.

## Impacto
Esta mudança permite o cadastro bem-sucedido de vídeos no acervo, corrigindo o erro de "falha ao salvar" relatado.
