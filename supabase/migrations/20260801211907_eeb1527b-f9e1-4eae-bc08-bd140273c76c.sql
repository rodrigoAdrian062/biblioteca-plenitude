ALTER TABLE public.books ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'maconico';
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_scope_check;
ALTER TABLE public.books ADD CONSTRAINT books_scope_check CHECK (scope IN ('maconico','nao_maconico'));
CREATE INDEX IF NOT EXISTS books_scope_idx ON public.books (scope);