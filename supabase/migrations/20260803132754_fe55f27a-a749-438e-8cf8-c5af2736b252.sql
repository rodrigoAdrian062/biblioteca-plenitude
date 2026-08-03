ALTER TABLE public.books ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'livro';
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_kind_check;
ALTER TABLE public.books ADD CONSTRAINT books_kind_check CHECK (kind IN ('livro','artigo'));