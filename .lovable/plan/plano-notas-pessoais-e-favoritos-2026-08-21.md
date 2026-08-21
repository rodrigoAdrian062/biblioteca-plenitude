# Plano: Notas Pessoais e Favoritos

Implementar a funcionalidade de anotações pessoais para cada obra e garantir que o sistema de favoritos esteja totalmente integrado e acessível.

## Alterações Sugeridas

### Banco de Dados
- Criar a tabela `book_notes` para armazenar as notas dos usuários.
  - Colunas: `id`, `user_id`, `book_id`, `content`, `created_at`, `updated_at`.
  - Habilitar RLS (Row Level Security) para que cada usuário veja apenas suas próprias notas.
  - Garantir privilégios para usuários autenticados.

### Backend (Server Functions)
- Criar funções em `src/lib/reading.functions.ts`:
  - `getBookNote`: Recuperar a nota de um usuário para uma obra específica.
  - `saveBookNote`: Criar ou atualizar a nota de um usuário para uma obra.
  - `deleteBookNote`: Remover a nota de um usuário.

### Frontend (UI/UX)
- **Detalhes da Obra (`src/routes/_authenticated/obra/$id.tsx`)**:
  - Adicionar uma seção de "Notas Pessoais" abaixo da descrição ou do leitor.
  - Implementar um campo de texto (Textarea) que salva automaticamente ou via botão.
  - Exibir um estado de carregamento/salvamento para feedback ao usuário.
- **Biblioteca (`src/routes/_authenticated/biblioteca.tsx`)**:
  - Garantir que o filtro de favoritos esteja funcionando corretamente (já parece estar integrado, mas vou validar).
  - Adicionar um ícone visual (coração) nos cards de livros que estão favoritados.

## Detalhes Técnicos
- Utilizar `TanStack Query` para gerenciar o estado das notas e favoritos.
- Manter o tema maçônico (Verde Escuro e Dourado) nos novos componentes.
- Garantir que as notas sejam privadas e seguras via RLS.

```sql
-- SQL para criação da tabela de notas
CREATE TABLE public.book_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, book_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_notes TO authenticated;
GRANT ALL ON public.book_notes TO service_role;

ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
ON public.book_notes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```
