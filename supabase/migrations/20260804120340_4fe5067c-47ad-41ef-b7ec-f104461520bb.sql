ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_kind_check;
ALTER TABLE public.books ADD CONSTRAINT books_kind_check CHECK (kind IN ('livro', 'artigo', 'peca_arquitetura', 'outros'));