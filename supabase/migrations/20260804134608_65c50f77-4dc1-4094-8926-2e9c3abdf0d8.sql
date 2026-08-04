ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_kind_check;
ALTER TABLE public.books ADD CONSTRAINT books_kind_check CHECK (kind = ANY (ARRAY['livro'::text, 'artigo'::text, 'peca_arquitetura'::text, 'trabalho_maconico'::text, 'outros'::text]));
