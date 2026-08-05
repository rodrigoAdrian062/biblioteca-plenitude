UPDATE public.books SET kind = 'outros' WHERE kind = 'trabalho_maconico';

ALTER TABLE public.books DROP CONSTRAINT books_kind_check;

ALTER TABLE public.books ADD CONSTRAINT books_kind_check 
CHECK (kind = ANY (ARRAY['livro'::text, 'artigo'::text, 'peca_arquitetura'::text, 'outros'::text]));