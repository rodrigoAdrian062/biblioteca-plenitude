ALTER TABLE public.books DROP CONSTRAINT books_min_degree_check;
ALTER TABLE public.books ADD CONSTRAINT books_min_degree_check CHECK (min_degree >= 0 AND min_degree <= 3);